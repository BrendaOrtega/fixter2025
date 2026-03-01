import { db } from "~/.server/db";
import { generateText, streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import {
  COACH_SYSTEM_PROMPT,
  EVALUATION_PROMPT,
  SUMMARY_PROMPT,
} from "./coach-prompts.server";
import type { CoachingPhase } from "@prisma/client";

// === Profile ===

export async function getOrCreateLearnerProfile(userId: string) {
  return db.learnerProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
    include: { sessions: { orderBy: { startedAt: "desc" }, take: 1 } },
  });
}

// === Sessions ===

export async function startSession(profileId: string, topic?: string) {
  const profile = await db.learnerProfile.findUniqueOrThrow({
    where: { id: profileId },
  });

  const isNewUser =
    profile.algorithms === 0 &&
    profile.syntaxFluency === 0 &&
    profile.systemDesign === 0 &&
    profile.debugging === 0 &&
    profile.communication === 0;

  // Only triage if user has scores
  const triage = isNewUser ? null : triageEngine(profile);

  // Find an appropriate exercise (only if not new user)
  let exercise = null;
  if (triage) {
    exercise = await db.exercise.findFirst({
      where: {
        topic: topic || profile.currentTopic || "javascript",
        dimension: triage.weakestDimension,
        difficulty: {
          gte: triage.suggestedDifficulty - 1,
          lte: triage.suggestedDifficulty + 1,
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  const sessionTopic = topic || profile.currentTopic || "javascript";

  const session = await db.coachingSession.create({
    data: {
      profileId,
      topic: sessionTopic,
      exerciseId: exercise?.id,
      phase: "KICKOFF",
      messages: [],
    },
  });

  // Update profile topic
  if (topic) {
    await db.learnerProfile.update({
      where: { id: profileId },
      data: { currentTopic: topic },
    });
  }

  // Generate coach greeting as first message
  const greeting = await generateCoachGreeting(session.id, profile, sessionTopic);
  await addMessage(session.id, "assistant", greeting);

  // Re-fetch session with the greeting message
  const updatedSession = await db.coachingSession.findUniqueOrThrow({
    where: { id: session.id },
  });

  return { session: updatedSession, exercise, triage };
}

async function generateCoachGreeting(
  sessionId: string,
  profile: {
    id: string;
    algorithms: number;
    syntaxFluency: number;
    systemDesign: number;
    debugging: number;
    communication: number;
    level: string;
    directnessLevel: number;
    totalSessions: number;
    currentTopic: string | null;
  },
  topic: string
) {
  const isNewUser =
    profile.algorithms === 0 &&
    profile.syntaxFluency === 0 &&
    profile.systemDesign === 0 &&
    profile.debugging === 0 &&
    profile.communication === 0;

  const systemPrompt = COACH_SYSTEM_PROMPT({
    phase: "KICKOFF",
    directnessLevel: profile.directnessLevel,
    topic,
    scores: {
      algorithms: profile.algorithms,
      syntaxFluency: profile.syntaxFluency,
      systemDesign: profile.systemDesign,
      debugging: profile.debugging,
      communication: profile.communication,
    },
    level: profile.level,
    sessionNumber: profile.totalSessions + 1,
  });

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: isNewUser
          ? `El usuario acaba de iniciar su primera sesión. Tema elegido: ${topic}. Salúdalo y calibra su nivel.`
          : `El usuario regresa para una nueva sesión. Tema: ${topic}. Salúdalo brevemente y prepáralo para practicar.`,
      },
    ],
  });

  return text;
}

export function triageEngine(profile: {
  algorithms: number;
  syntaxFluency: number;
  systemDesign: number;
  debugging: number;
  communication: number;
  level: string;
}) {
  const dimensions = {
    algorithms: profile.algorithms,
    syntaxFluency: profile.syntaxFluency,
    systemDesign: profile.systemDesign,
    debugging: profile.debugging,
    communication: profile.communication,
  };

  const weakest = Object.entries(dimensions).reduce((min, [key, val]) =>
    val < min[1] ? [key, val] : min
  );

  const level = profile.level;
  const suggestedDifficulty =
    level === "beginner" ? 1 : level === "intermediate" ? 3 : 4;

  return {
    weakestDimension: weakest[0],
    weakestScore: weakest[1],
    suggestedDifficulty: Math.max(
      1,
      Math.min(5, suggestedDifficulty)
    ),
  };
}

// === Message handling ===

export async function addMessage(
  sessionId: string,
  role: "user" | "assistant",
  content: string
) {
  const session = await db.coachingSession.findUniqueOrThrow({
    where: { id: sessionId },
  });

  const messages = (session.messages as any[]) || [];
  messages.push({ role, content, timestamp: new Date().toISOString() });

  return db.coachingSession.update({
    where: { id: sessionId },
    data: { messages },
  });
}

// Code detection heuristic
function looksLikeCode(text: string): boolean {
  const codeIndicators = [
    /```/,
    /function\s+\w/,
    /const\s+\w/,
    /let\s+\w/,
    /var\s+\w/,
    /=>/,
    /def\s+\w/,
    /class\s+\w/,
    /import\s+/,
    /console\.log/,
    /return\s+/,
    /if\s*\(/,
    /for\s*\(/,
    /while\s*\(/,
  ];
  const matches = codeIndicators.filter((re) => re.test(text)).length;
  return matches >= 2;
}

export async function generateCoachResponse(
  sessionId: string,
  userMessage: string,
  profile: {
    id: string;
    directnessLevel: number;
    currentTopic: string | null;
    algorithms: number;
    syntaxFluency: number;
    systemDesign: number;
    debugging: number;
    communication: number;
    level: string;
    totalSessions: number;
  }
) {
  const session = await db.coachingSession.findUniqueOrThrow({
    where: { id: sessionId },
  });

  // Get exercise if exists
  let exercisePrompt: string | undefined;
  if (session.exerciseId) {
    const exercise = await db.exercise.findUnique({
      where: { id: session.exerciseId },
    });
    if (exercise) {
      exercisePrompt = `${exercise.prompt}\nDificultad: ${exercise.difficulty}/5\nDimensión: ${exercise.dimension}`;
    }
  }

  const messages = (session.messages as any[]) || [];
  const conversationHistory = messages.map((m: any) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const systemPrompt = COACH_SYSTEM_PROMPT({
    phase: session.phase,
    directnessLevel: profile.directnessLevel,
    topic: session.topic || profile.currentTopic || "javascript",
    scores: {
      algorithms: profile.algorithms,
      syntaxFluency: profile.syntaxFluency,
      systemDesign: profile.systemDesign,
      debugging: profile.debugging,
      communication: profile.communication,
    },
    level: profile.level,
    exercisePrompt,
    sessionNumber: profile.totalSessions + 1,
  });

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    system: systemPrompt,
    messages: [
      ...conversationHistory,
      { role: "user", content: userMessage },
    ],
  });

  // Auto phase transitions
  const newPhase = await detectPhaseTransition(session, messages, userMessage, text);

  // Auto-evaluate if in PRACTICE and user sent code
  let evaluation = null;
  if (session.phase === "PRACTICE" && looksLikeCode(userMessage)) {
    evaluation = await evaluateResponse(sessionId, userMessage);
    if (evaluation.deltas) {
      await updateScores(profile.id, evaluation.deltas);
    }
    // Save code
    await db.coachingSession.update({
      where: { id: sessionId },
      data: { codeResponse: userMessage },
    });
    // Move to REVIEW
    await db.coachingSession.update({
      where: { id: sessionId },
      data: { phase: "REVIEW" },
    });
  } else if (newPhase && newPhase !== session.phase) {
    await db.coachingSession.update({
      where: { id: sessionId },
      data: { phase: newPhase },
    });
  }

  // Fetch updated session for phase
  const updatedSession = await db.coachingSession.findUniqueOrThrow({
    where: { id: sessionId },
  });

  return { text, evaluation, phase: updatedSession.phase };
}

// === Streaming version ===

export async function prepareCoachStream(
  sessionId: string,
  userMessage: string,
  profile: {
    id: string;
    directnessLevel: number;
    currentTopic: string | null;
    algorithms: number;
    syntaxFluency: number;
    systemDesign: number;
    debugging: number;
    communication: number;
    level: string;
    totalSessions: number;
  }
) {
  const session = await db.coachingSession.findUniqueOrThrow({
    where: { id: sessionId },
  });

  let exercisePrompt: string | undefined;
  if (session.exerciseId) {
    const exercise = await db.exercise.findUnique({
      where: { id: session.exerciseId },
    });
    if (exercise) {
      exercisePrompt = `${exercise.prompt}\nDificultad: ${exercise.difficulty}/5\nDimensión: ${exercise.dimension}`;
    }
  }

  const messages = (session.messages as any[]) || [];
  const conversationHistory = messages.map((m: any) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const systemPrompt = COACH_SYSTEM_PROMPT({
    phase: session.phase,
    directnessLevel: profile.directnessLevel,
    topic: session.topic || profile.currentTopic || "javascript",
    scores: {
      algorithms: profile.algorithms,
      syntaxFluency: profile.syntaxFluency,
      systemDesign: profile.systemDesign,
      debugging: profile.debugging,
      communication: profile.communication,
    },
    level: profile.level,
    exercisePrompt,
    sessionNumber: profile.totalSessions + 1,
  });

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: systemPrompt,
    messages: [
      ...conversationHistory,
      { role: "user", content: userMessage },
    ],
  });

  return { result, session };
}

export async function finalizeCoachResponse(
  sessionId: string,
  fullText: string,
  userMessage: string,
  profileId: string,
) {
  const session = await db.coachingSession.findUniqueOrThrow({
    where: { id: sessionId },
  });
  const messages = (session.messages as any[]) || [];

  await addMessage(sessionId, "assistant", fullText);

  const newPhase = await detectPhaseTransition(session, messages, userMessage, fullText);

  let evaluation = null;
  if (session.phase === "PRACTICE" && looksLikeCode(userMessage)) {
    evaluation = await evaluateResponse(sessionId, userMessage);
    if (evaluation.deltas) {
      await updateScores(profileId, evaluation.deltas);
    }
    await db.coachingSession.update({
      where: { id: sessionId },
      data: { codeResponse: userMessage },
    });
    await db.coachingSession.update({
      where: { id: sessionId },
      data: { phase: "REVIEW" },
    });
  } else if (newPhase && newPhase !== session.phase) {
    await db.coachingSession.update({
      where: { id: sessionId },
      data: { phase: newPhase },
    });
  }

  const updatedSession = await db.coachingSession.findUniqueOrThrow({
    where: { id: sessionId },
  });

  let updatedScores = null;
  if (evaluation) {
    const updatedProfile = await db.learnerProfile.findUniqueOrThrow({
      where: { id: profileId },
    });
    updatedScores = {
      algorithms: updatedProfile.algorithms,
      syntaxFluency: updatedProfile.syntaxFluency,
      systemDesign: updatedProfile.systemDesign,
      debugging: updatedProfile.debugging,
      communication: updatedProfile.communication,
    };
  }

  return { phase: updatedSession.phase, evaluation, updatedScores };
}

async function detectPhaseTransition(
  session: { phase: CoachingPhase; exerciseId: string | null },
  messages: any[],
  userMessage: string,
  aiResponse: string
): Promise<CoachingPhase | null> {
  const userMessages = messages.filter((m: any) => m.role === "user");

  switch (session.phase) {
    case "KICKOFF":
      // After 2+ user messages, move to ASSESSMENT
      if (userMessages.length >= 1) return "ASSESSMENT";
      break;

    case "ASSESSMENT":
      // When AI responds with JSON level suggestion
      if (aiResponse.includes('"suggestedLevel"')) return "PRACTICE";
      break;

    case "PRACTICE":
      // Code detection handled in generateCoachResponse
      break;

    case "REVIEW": {
      const lower = userMessage.toLowerCase();
      if (
        lower.includes("terminar") ||
        lower.includes("fin") ||
        lower.includes("suficiente")
      ) {
        return "SUMMARY";
      }
      // If user wants another exercise, go back to PRACTICE
      if (
        lower.includes("otro") ||
        lower.includes("siguiente") ||
        lower.includes("más")
      ) {
        return "PRACTICE";
      }
      break;
    }
  }

  return null;
}

// === Evaluation ===

export async function evaluateResponse(
  sessionId: string,
  response: string
) {
  const session = await db.coachingSession.findUniqueOrThrow({
    where: { id: sessionId },
  });

  let exercisePrompt = "ejercicio general";
  if (session.exerciseId) {
    const exercise = await db.exercise.findUnique({
      where: { id: session.exerciseId },
    });
    if (exercise) exercisePrompt = exercise.prompt;
  }

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    system: EVALUATION_PROMPT,
    messages: [
      {
        role: "user",
        content: `Ejercicio: ${exercisePrompt}\n\nRespuesta del estudiante: ${response}`,
      },
    ],
  });

  try {
    return JSON.parse(text);
  } catch {
    return {
      score: 5,
      feedback: text,
      deltas: {
        algorithms: 0,
        syntaxFluency: 0,
        systemDesign: 0,
        debugging: 0,
        communication: 0,
      },
      strengths: [],
      improvements: [],
    };
  }
}

// === Score updates ===

export async function updateScores(
  profileId: string,
  deltas: Record<string, number>
) {
  const profile = await db.learnerProfile.findUniqueOrThrow({
    where: { id: profileId },
  });

  const clamp = (val: number) => Math.max(0, Math.min(100, val));

  const updated = await db.learnerProfile.update({
    where: { id: profileId },
    data: {
      algorithms: clamp(profile.algorithms + (deltas.algorithms || 0)),
      syntaxFluency: clamp(profile.syntaxFluency + (deltas.syntaxFluency || 0)),
      systemDesign: clamp(profile.systemDesign + (deltas.systemDesign || 0)),
      debugging: clamp(profile.debugging + (deltas.debugging || 0)),
      communication: clamp(profile.communication + (deltas.communication || 0)),
    },
  });

  // Recalculate level
  const avg =
    (updated.algorithms +
      updated.syntaxFluency +
      updated.systemDesign +
      updated.debugging +
      updated.communication) /
    5;

  const level = avg < 35 ? "beginner" : avg < 70 ? "intermediate" : "advanced";

  if (level !== updated.level) {
    await db.learnerProfile.update({
      where: { id: profileId },
      data: { level },
    });
  }

  return updated;
}

// === End session ===

export async function endSession(sessionId: string) {
  const session = await db.coachingSession.findUniqueOrThrow({
    where: { id: sessionId },
    include: { profile: true },
  });

  const messages = (session.messages as any[]) || [];

  // Generate summary
  let summary = "Sesión completada.";
  if (messages.length > 2) {
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      system: SUMMARY_PROMPT,
      messages: [
        {
          role: "user",
          content: `Conversación de la sesión:\n${messages.map((m: any) => `${m.role}: ${m.content}`).join("\n")}`,
        },
      ],
    });
    summary = text;
  }

  // Update session
  await db.coachingSession.update({
    where: { id: sessionId },
    data: {
      phase: "SUMMARY",
      summary,
      endedAt: new Date(),
    },
  });

  // Update profile stats
  await db.learnerProfile.update({
    where: { id: session.profileId },
    data: {
      totalSessions: { increment: 1 },
      streak: { increment: 1 },
    },
  });

  return { summary };
}

// === Phase management ===

const PHASE_ORDER: CoachingPhase[] = [
  "KICKOFF",
  "ASSESSMENT",
  "PRACTICE",
  "REVIEW",
  "SUMMARY",
];

export async function advancePhase(sessionId: string) {
  const session = await db.coachingSession.findUniqueOrThrow({
    where: { id: sessionId },
  });

  const currentIndex = PHASE_ORDER.indexOf(session.phase);
  const nextPhase = PHASE_ORDER[Math.min(currentIndex + 1, PHASE_ORDER.length - 1)];

  return db.coachingSession.update({
    where: { id: sessionId },
    data: { phase: nextPhase },
  });
}
