import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { data, useLoaderData } from "react-router";
import { getUserOrNull, getOrCreateAnonId } from "~/.server/dbGetters";
import { getOrCreateLearnerProfile } from "~/.server/services/coach.server";
import { db } from "~/.server/db";
import { commitSession } from "~/sessions";
import { CoachInterface } from "~/components/coach/CoachInterface";
import { FormmyProvider } from "@formmy.app/chat/react";

export const meta: MetaFunction = () => [
  { title: "MentorIA | FixterGeek" },
  { name: "description", content: "Tu mentor de programación con IA y voz" },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await getUserOrNull(request);
  const { anonId, session, isNew } = await getOrCreateAnonId(request);
  const userId = user?.id || anonId;
  const profile = await getOrCreateLearnerProfile(userId);

  // Check for active session (no endedAt)
  const activeSession = await db.coachingSession.findFirst({
    where: { profileId: profile.id, endedAt: null },
    orderBy: { startedAt: "desc" },
  });

  // Get exercise if session has one
  let exercise = null;
  if (activeSession?.exerciseId) {
    exercise = await db.exercise.findUnique({
      where: { id: activeSession.exerciseId },
    });
  }

  // Get last completed session summary
  const lastSession = await db.coachingSession.findFirst({
    where: { profileId: profile.id, endedAt: { not: null } },
    orderBy: { endedAt: "desc" },
    select: { summary: true, topic: true, endedAt: true },
  });

  const headers: HeadersInit = {};
  if (isNew && !user) {
    headers["Set-Cookie"] = await commitSession(session);
  }

  return data({
    formmyConfig: {
      publishableKey: process.env.FORMMY_API_KEY || "",
      agentId: process.env.FORMMY_AGENT_ID || "6962b02ec232df8a06a9b7d6",
    },
    profile: {
      id: profile.id,
      algorithms: profile.algorithms,
      syntaxFluency: profile.syntaxFluency,
      systemDesign: profile.systemDesign,
      debugging: profile.debugging,
      communication: profile.communication,
      level: profile.level,
      streak: profile.streak,
      directnessLevel: profile.directnessLevel,
      currentTopic: profile.currentTopic,
      totalSessions: profile.totalSessions,
    },
    activeSession: activeSession
      ? {
          id: activeSession.id,
          phase: activeSession.phase,
          topic: activeSession.topic,
          messages: activeSession.messages as any[],
          exerciseId: activeSession.exerciseId,
        }
      : null,
    exercise: exercise
      ? {
          prompt: exercise.prompt,
          difficulty: exercise.difficulty,
          dimension: exercise.dimension,
          hints: exercise.hints,
          topic: exercise.topic,
        }
      : null,
    lastSession: lastSession
      ? {
          summary: lastSession.summary,
          topic: lastSession.topic,
          endedAt: lastSession.endedAt?.toISOString() || null,
        }
      : null,
    isAnonymous: !user,
  }, { headers });
};

export default function CoachPage() {
  const { profile, activeSession, exercise, lastSession, formmyConfig, isAnonymous } =
    useLoaderData<typeof loader>();

  return (
    <FormmyProvider publishableKey={formmyConfig.publishableKey}>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 pt-20">
        <CoachInterface
          profile={profile}
          activeSession={activeSession}
          exercise={exercise}
          lastSession={lastSession}
          formmyConfig={formmyConfig}
          isAnonymous={isAnonymous}
        />
      </div>
    </FormmyProvider>
  );
}
