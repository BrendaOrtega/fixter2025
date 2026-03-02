import { db } from "~/.server/db";
import Anthropic from "@anthropic-ai/sdk";
import {
  SCORING_PROMPT_PROGRAMMING,
  SCORING_PROMPT_INTERVIEW,
} from "./coach-prompts.server";

// === Profile ===

export async function getOrCreateLearnerProfile(userId: string) {
  return db.learnerProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
    include: { sessions: { orderBy: { startedAt: "desc" }, take: 1 } },
  });
}

export async function getOrCreateInterviewProfile(userId: string) {
  return db.interviewProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

export async function updateInterviewProfile(
  userId: string,
  data: { targetRole?: string; seniority?: string }
) {
  return db.interviewProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}

// === Scoring ===

interface ScoringResult {
  scoreDeltas: Record<string, number>;
  summary: string;
  nextSteps: string[];
  dimensionFeedback: Record<string, string | null>;
  extractedStories?: Array<{
    title: string;
    situation: string;
    task: string;
    action: string;
    result: string;
    earnedSecret: string;
    primarySkill: string;
    strength: number;
  }>;
}

export async function scoreSession(sessionId: string): Promise<ScoringResult | null> {
  const session = await db.coachingSession.findUnique({
    where: { id: sessionId },
  });
  if (!session) return null;

  const messages = (session.messages as Array<{ role: string; content: string }>) || [];
  if (messages.length < 2) {
    return {
      scoreDeltas: {},
      summary: "Sesión muy corta para evaluar.",
      nextSteps: ["Intenta tener una conversación más larga en la próxima sesión."],
      dimensionFeedback: {},
    };
  }

  const transcript = messages
    .map((m) => `${m.role === "user" ? "Usuario" : "Coach"}: ${m.content}`)
    .join("\n\n");

  const scoringPrompt =
    session.mode === "interview"
      ? SCORING_PROMPT_INTERVIEW
      : SCORING_PROMPT_PROGRAMMING;

  try {
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `${scoringPrompt}\n\n--- TRANSCRIPT ---\n${transcript}`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed: ScoringResult = JSON.parse(text);
    return parsed;
  } catch (err) {
    console.error("[scoreSession] Error:", err);
    return {
      scoreDeltas: {},
      summary: "No se pudo generar el scoring automáticamente.",
      nextSteps: [],
      dimensionFeedback: {},
    };
  }
}

export async function updateProfileScores(
  profileId: string,
  mode: string,
  deltas: Record<string, number>
) {
  if (mode === "interview") {
    // Find the profile by learner profile → userId → interview profile
    const learner = await db.learnerProfile.findUnique({ where: { id: profileId } });
    if (!learner) return;

    const interview = await db.interviewProfile.findUnique({
      where: { userId: learner.userId },
    });
    if (!interview) return;

    const clamp = (v: number) => Math.max(0, Math.min(100, v));
    await db.interviewProfile.update({
      where: { id: interview.id },
      data: {
        substance: clamp(interview.substance + (deltas.substance || 0)),
        structure: clamp(interview.structure + (deltas.structure || 0)),
        relevance: clamp(interview.relevance + (deltas.relevance || 0)),
        credibility: clamp(interview.credibility + (deltas.credibility || 0)),
        differentiation: clamp(interview.differentiation + (deltas.differentiation || 0)),
      },
    });
  } else {
    const profile = await db.learnerProfile.findUnique({ where: { id: profileId } });
    if (!profile) return;

    const clamp = (v: number) => Math.max(0, Math.min(100, v));
    await db.learnerProfile.update({
      where: { id: profileId },
      data: {
        algorithms: clamp(profile.algorithms + (deltas.algorithms || 0)),
        syntaxFluency: clamp(profile.syntaxFluency + (deltas.syntaxFluency || 0)),
        systemDesign: clamp(profile.systemDesign + (deltas.systemDesign || 0)),
        debugging: clamp(profile.debugging + (deltas.debugging || 0)),
        communication: clamp(profile.communication + (deltas.communication || 0)),
      },
    });
  }
}

export async function advanceDrillStage(userId: string) {
  const interview = await db.interviewProfile.findUnique({ where: { userId } });
  if (!interview || interview.drillStage >= 8) return;

  // Check last 3 sessions average
  const learner = await db.learnerProfile.findUnique({ where: { userId } });
  if (!learner) return;

  const recentSessions = await db.coachingSession.findMany({
    where: { profileId: learner.id, mode: "interview", endedAt: { not: null } },
    orderBy: { endedAt: "desc" },
    take: 3,
  });

  if (recentSessions.length < 3) return;

  const avgScores = recentSessions.map((s) => {
    const deltas = (s.scoreDeltas as Record<string, number>) || {};
    const values = Object.values(deltas).filter((v) => v !== 0);
    return values.length > 0
      ? values.reduce((a, b) => a + b, 0) / values.length
      : 0;
  });

  const overallAvg = avgScores.reduce((a, b) => a + b, 0) / avgScores.length;
  if (overallAvg > 3.5) {
    await db.interviewProfile.update({
      where: { userId },
      data: { drillStage: interview.drillStage + 1 },
    });
  }
}

// === Storybank ===

export async function addStoriesToBank(
  userId: string,
  stories: Array<{
    title: string;
    situation: string;
    task: string;
    action: string;
    result: string;
    earnedSecret: string;
    primarySkill: string;
    strength: number;
  }>
) {
  if (stories.length === 0) return;

  const interview = await db.interviewProfile.findUnique({ where: { userId } });
  if (!interview) return;

  const existing = (interview.storybank as any[]) || [];
  const newStories = stories.map((s, i) => ({
    id: `S${String(existing.length + i + 1).padStart(3, "0")}`,
    ...s,
    useCount: 0,
    lastUsed: null,
  }));

  await db.interviewProfile.update({
    where: { userId },
    data: { storybank: [...existing, ...newStories] },
  });
}

// === Scorecard ===

export async function getSessionScorecard(sessionId: string) {
  const session = await db.coachingSession.findUnique({
    where: { id: sessionId },
    include: { profile: true },
  });
  if (!session) return null;

  // Get the interview profile if it's an interview session
  let interviewProfile = null;
  if (session.mode === "interview") {
    interviewProfile = await db.interviewProfile.findUnique({
      where: { userId: session.profile.userId },
    });
  }

  const scores =
    session.mode === "interview" && interviewProfile
      ? {
          substance: interviewProfile.substance,
          structure: interviewProfile.structure,
          relevance: interviewProfile.relevance,
          credibility: interviewProfile.credibility,
          differentiation: interviewProfile.differentiation,
        }
      : {
          algorithms: session.profile.algorithms,
          syntaxFluency: session.profile.syntaxFluency,
          systemDesign: session.profile.systemDesign,
          debugging: session.profile.debugging,
          communication: session.profile.communication,
        };

  // Get previous session for comparison
  const previousSession = await db.coachingSession.findFirst({
    where: {
      profileId: session.profileId,
      mode: session.mode,
      endedAt: { not: null },
      id: { not: session.id },
      startedAt: { lt: session.startedAt },
    },
    orderBy: { startedAt: "desc" },
  });

  return {
    id: session.id,
    mode: session.mode,
    topic: session.topic,
    summary: session.summary,
    scoreDeltas: session.scoreDeltas as Record<string, number> | null,
    scores,
    selfAssessment: session.selfAssessment,
    nextSteps: session.nextSteps,
    dimensionFeedback: session.dimensionFeedback as Record<string, string | null> | null,
    previousScoreDeltas: previousSession?.scoreDeltas as Record<string, number> | null,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt?.toISOString() || null,
    messageCount: (session.messages as any[])?.length || 0,
  };
}

// === Session History ===

export async function getSessionHistory(
  userId: string,
  mode?: string,
  limit = 20
) {
  const profile = await db.learnerProfile.findUnique({ where: { userId } });
  if (!profile) return [];

  const where: any = { profileId: profile.id, endedAt: { not: null } };
  if (mode && mode !== "all") where.mode = mode;

  return db.coachingSession.findMany({
    where,
    orderBy: { startedAt: "desc" },
    take: limit,
    select: {
      id: true,
      mode: true,
      topic: true,
      summary: true,
      scoreDeltas: true,
      selfAssessment: true,
      startedAt: true,
      endedAt: true,
      messages: true,
    },
  });
}

// === Analytics ===

export async function getCoachAnalytics() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [totalSessions, completedSessions, events, recentUsers] = await Promise.all([
    db.coachingSession.count({ where: { startedAt: { gte: thirtyDaysAgo } } }),
    db.coachingSession.count({ where: { startedAt: { gte: thirtyDaysAgo }, endedAt: { not: null } } }),
    db.coachEvent.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      orderBy: { createdAt: "desc" },
    }),
    db.coachingSession.findMany({
      where: { startedAt: { gte: sevenDaysAgo } },
      select: { profileId: true, startedAt: true },
    }),
  ]);

  // Calculate return rate (users with >1 session in 7 days)
  const userSessionCounts = new Map<string, number>();
  for (const s of recentUsers) {
    userSessionCounts.set(s.profileId, (userSessionCounts.get(s.profileId) || 0) + 1);
  }
  const totalUsers = userSessionCounts.size;
  const returningUsers = Array.from(userSessionCounts.values()).filter((c) => c > 1).length;

  // Event funnel
  const eventCounts: Record<string, number> = {};
  for (const e of events) {
    eventCounts[e.event] = (eventCounts[e.event] || 0) + 1;
  }

  return {
    totalSessions,
    completedSessions,
    completionRate: totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0,
    totalUsers,
    returningUsers,
    returnRate: totalUsers > 0 ? Math.round((returningUsers / totalUsers) * 100) : 0,
    eventCounts,
  };
}
