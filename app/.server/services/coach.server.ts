import { db } from "~/.server/db";

// === Profile ===

export async function getOrCreateLearnerProfile(userId: string) {
  return db.learnerProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
    include: { sessions: { orderBy: { startedAt: "desc" }, take: 1 } },
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

  return {
    id: session.id,
    mode: session.mode,
    topic: session.topic,
    summary: session.summary,
    scoreDeltas: session.scoreDeltas as Record<string, number> | null,
    scores,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt?.toISOString() || null,
    messageCount: (session.messages as any[])?.length || 0,
  };
}
