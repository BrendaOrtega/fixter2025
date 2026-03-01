import { db } from "~/.server/db";
import { generateText, streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import {
  INTERVIEW_SYSTEM_PROMPT,
  INTERVIEW_EVALUATION_PROMPT,
  INTERVIEW_SUMMARY_PROMPT,
  type InterviewPromptConfig,
} from "./interview-prompts.server";

// === Interview Profile ===

export async function getOrCreateInterviewProfile(userId: string) {
  const existing = await db.interviewProfile.findUnique({ where: { userId } });
  if (existing) return existing;
  return db.interviewProfile.create({ data: { userId } });
}

// === Start Interview Session ===

export async function startInterviewSession(
  profileId: string,
  topic: string, // "frontend-mid", "backend-senior", etc.
  userId: string,
) {
  const [role, seniority] = topic.split("-");
  const interviewProfile = await getOrCreateInterviewProfile(userId);

  // Update profile with target
  await db.interviewProfile.update({
    where: { id: interviewProfile.id },
    data: { targetRole: role, seniority },
  });

  const session = await db.coachingSession.create({
    data: {
      profileId,
      topic,
      mode: "interview",
      phase: "KICKOFF",
      messages: [],
    },
  });

  // Generate greeting
  const config: InterviewPromptConfig = {
    phase: "KICKOFF",
    drillStage: interviewProfile.drillStage,
    targetRole: role || "fullstack",
    seniority: seniority || "mid",
    directness: interviewProfile.directness,
    scores: {
      substance: interviewProfile.substance,
      structure: interviewProfile.structure,
      relevance: interviewProfile.relevance,
      credibility: interviewProfile.credibility,
      differentiation: interviewProfile.differentiation,
    },
    totalSessions: interviewProfile.totalSessions,
    storybank: interviewProfile.storybank as any[],
  };

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    system: INTERVIEW_SYSTEM_PROMPT(config),
    messages: [
      {
        role: "user",
        content: `Nueva sesión de entrevista. Rol: ${role}, Seniority: ${seniority}. Saluda y empieza.`,
      },
    ],
  });

  // Save greeting
  await db.coachingSession.update({
    where: { id: session.id },
    data: {
      messages: [{ role: "assistant", content: text, timestamp: new Date().toISOString() }],
    },
  });

  const updatedSession = await db.coachingSession.findUniqueOrThrow({
    where: { id: session.id },
  });

  return { session: updatedSession, interviewProfile };
}

// === Stream Interview Message ===

export async function prepareInterviewStream(
  sessionId: string,
  userMessage: string,
  userId: string,
) {
  const session = await db.coachingSession.findUniqueOrThrow({
    where: { id: sessionId },
  });
  const interviewProfile = await getOrCreateInterviewProfile(userId);

  const [role, seniority] = (session.topic || "fullstack-mid").split("-");
  const messages = (session.messages as any[]) || [];
  const conversationHistory = messages.map((m: any) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const config: InterviewPromptConfig = {
    phase: session.phase,
    drillStage: interviewProfile.drillStage,
    targetRole: role,
    seniority: seniority,
    directness: interviewProfile.directness,
    scores: {
      substance: interviewProfile.substance,
      structure: interviewProfile.structure,
      relevance: interviewProfile.relevance,
      credibility: interviewProfile.credibility,
      differentiation: interviewProfile.differentiation,
    },
    totalSessions: interviewProfile.totalSessions,
    storybank: interviewProfile.storybank as any[],
  };

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: INTERVIEW_SYSTEM_PROMPT(config),
    messages: [
      ...conversationHistory,
      { role: "user", content: userMessage },
    ],
  });

  return { result, session, interviewProfile };
}

// === Finalize Interview Response ===

export async function finalizeInterviewResponse(
  sessionId: string,
  fullText: string,
  userMessage: string,
  userId: string,
) {
  const session = await db.coachingSession.findUniqueOrThrow({
    where: { id: sessionId },
  });
  const interviewProfile = await getOrCreateInterviewProfile(userId);
  const messages = (session.messages as any[]) || [];

  // Save messages
  messages.push(
    { role: "user", content: userMessage, timestamp: new Date().toISOString() },
    { role: "assistant", content: fullText, timestamp: new Date().toISOString() },
  );
  await db.coachingSession.update({
    where: { id: sessionId },
    data: { messages },
  });

  // Detect STAR story in response
  if (fullText.includes("[STAR_STORY]")) {
    // Try to extract and save the story
    try {
      const evalResult = await generateText({
        model: openai("gpt-4o-mini"),
        system: INTERVIEW_EVALUATION_PROMPT,
        messages: [
          { role: "user", content: `Respuesta del candidato: ${userMessage}` },
        ],
      });
      const parsed = JSON.parse(evalResult.text);
      if (parsed.starStory) {
        await db.interviewProfile.update({
          where: { id: interviewProfile.id },
          data: {
            storybank: { push: parsed.starStory },
          },
        });
      }
    } catch {}
  }

  // Phase transitions for interview mode
  const userMessages = messages.filter((m: any) => m.role === "user");
  let newPhase = session.phase;

  if (session.phase === "KICKOFF" && userMessages.length >= 2) {
    newPhase = "PRACTICE";
  }

  // Check for debrief triggers
  const lower = userMessage.toLowerCase();
  if (
    lower.includes("terminar") ||
    lower.includes("debrief") ||
    lower.includes("cómo me fue") ||
    lower.includes("como me fue")
  ) {
    newPhase = "REVIEW"; // We use REVIEW phase for DEBRIEF
  }

  if (newPhase !== session.phase) {
    await db.coachingSession.update({
      where: { id: sessionId },
      data: { phase: newPhase as any },
    });
  }

  // Parse scorecard from debrief response
  let updatedScores = null;
  if (fullText.includes("SCORECARD:")) {
    const scorecard = parseScorecard(fullText);
    if (scorecard) {
      await db.interviewProfile.update({
        where: { id: interviewProfile.id },
        data: scorecard,
      });
      updatedScores = scorecard;
    }
  }

  return {
    phase: newPhase,
    updatedScores,
    evaluation: null,
  };
}

function parseScorecard(text: string): Record<string, number> | null {
  const dims = ["substance", "structure", "relevance", "credibility", "differentiation"];
  const result: Record<string, number> = {};
  let found = 0;

  for (const dim of dims) {
    const regex = new RegExp(`${dim}:\\s*(\\d)`, "i");
    const match = text.match(regex);
    if (match) {
      // Scale 1-5 to 0-100
      result[dim] = Math.round(parseInt(match[1]) * 20);
      found++;
    }
  }

  return found >= 3 ? result : null;
}

// === End Interview Session ===

export async function endInterviewSession(sessionId: string, userId: string) {
  const session = await db.coachingSession.findUniqueOrThrow({
    where: { id: sessionId },
  });
  const interviewProfile = await getOrCreateInterviewProfile(userId);
  const messages = (session.messages as any[]) || [];

  let summary = "Sesión de entrevista completada.";
  if (messages.length > 2) {
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      system: INTERVIEW_SUMMARY_PROMPT,
      messages: [
        {
          role: "user",
          content: `Conversación:\n${messages.map((m: any) => `${m.role}: ${m.content}`).join("\n")}`,
        },
      ],
    });
    summary = text;
  }

  await db.coachingSession.update({
    where: { id: sessionId },
    data: { phase: "SUMMARY", summary, endedAt: new Date() },
  });

  // Update profile stats
  await db.interviewProfile.update({
    where: { id: interviewProfile.id },
    data: { totalSessions: { increment: 1 } },
  });

  // Also update learner profile session count
  await db.learnerProfile.updateMany({
    where: { userId },
    data: { totalSessions: { increment: 1 }, streak: { increment: 1 } },
  });

  return { summary };
}
