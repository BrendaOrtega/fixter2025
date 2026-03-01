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
  const assistantMessages = messages.filter((m: any) => m.role === "assistant");
  let newPhase = session.phase;

  if (session.phase === "KICKOFF" && userMessages.length >= 2) {
    newPhase = "PRACTICE";
  }

  // Check for debrief triggers — explicit user request
  const lower = userMessage.toLowerCase();
  if (
    lower.includes("terminar") ||
    lower.includes("debrief") ||
    lower.includes("cómo me fue") ||
    lower.includes("como me fue") ||
    lower.includes("feedback") ||
    lower.includes("evalúa") ||
    lower.includes("evalua")
  ) {
    newPhase = "REVIEW"; // We use REVIEW phase for DEBRIEF
  }

  // Auto-trigger debrief suggestion after 4-5 Q&A pairs in PRACTICE
  // The agent's prompt already tells it to suggest debrief after 4-5 questions,
  // but we also detect if the assistant suggested it and user agreed
  if (
    session.phase === "PRACTICE" &&
    (lower.includes("sí") || lower.includes("si") || lower.includes("dale") || lower.includes("va")) &&
    assistantMessages.length > 0
  ) {
    const lastAssistant = assistantMessages[assistantMessages.length - 1]?.content?.toLowerCase() || "";
    if (lastAssistant.includes("feedback detallado") || lastAssistant.includes("debrief") || lastAssistant.includes("¿quieres que te dé")) {
      newPhase = "REVIEW";
    }
  }

  if (newPhase !== session.phase) {
    await db.coachingSession.update({
      where: { id: sessionId },
      data: { phase: newPhase as any },
    });
  }

  // Score extraction: prefer JSON evaluation over regex parsing
  let updatedScores = null;
  if (newPhase === "REVIEW" || fullText.includes("SCORECARD:")) {
    // Try structured JSON evaluation first
    try {
      const conversationForEval = messages
        .filter((m: any) => m.role === "user")
        .map((m: any) => m.content)
        .join("\n---\n");

      const evalResult = await generateText({
        model: openai("gpt-4o-mini"),
        system: INTERVIEW_EVALUATION_PROMPT,
        messages: [
          {
            role: "user",
            content: `Evalúa todas las respuestas del candidato en esta sesión:\n${conversationForEval}`,
          },
        ],
      });
      const parsed = JSON.parse(evalResult.text);
      if (parsed.substance && parsed.structure) {
        updatedScores = {
          substance: Math.round(parsed.substance * 20),
          structure: Math.round(parsed.structure * 20),
          relevance: Math.round(parsed.relevance * 20),
          credibility: Math.round(parsed.credibility * 20),
          differentiation: Math.round(parsed.differentiation * 20),
        };
        await db.interviewProfile.update({
          where: { id: interviewProfile.id },
          data: updatedScores,
        });

        // Save STAR story if detected
        if (parsed.starStory) {
          await db.interviewProfile.update({
            where: { id: interviewProfile.id },
            data: { storybank: { push: parsed.starStory } },
          });
        }
      }
    } catch {
      // Fallback to regex parsing
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

  // Update profile stats + advance drillStage if scores are good enough
  const avgScore =
    (interviewProfile.substance +
      interviewProfile.structure +
      interviewProfile.relevance +
      interviewProfile.credibility +
      interviewProfile.differentiation) / 5;
  // Scores are stored as 0-100, so 60 = 3/5 average
  const shouldAdvance = avgScore >= 60 && interviewProfile.drillStage < 4;

  await db.interviewProfile.update({
    where: { id: interviewProfile.id },
    data: {
      totalSessions: { increment: 1 },
      ...(shouldAdvance ? { drillStage: interviewProfile.drillStage + 1 } : {}),
    },
  });

  // Also update learner profile session count
  await db.learnerProfile.updateMany({
    where: { userId },
    data: { totalSessions: { increment: 1 }, streak: { increment: 1 } },
  });

  return { summary };
}
