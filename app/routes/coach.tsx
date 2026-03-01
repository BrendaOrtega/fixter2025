import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { data, useLoaderData } from "react-router";
import { getUserOrNull, getOrCreateAnonId } from "~/.server/dbGetters";
import { getOrCreateLearnerProfile } from "~/.server/services/coach.server";
import { getCredits } from "~/.server/services/coach-credits.server";
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

  const headers: HeadersInit = {};
  if (isNew && !user) {
    headers["Set-Cookie"] = await commitSession(session);
  }

  return data({
    formmyConfig: {
      publishableKey: process.env.FORMMY_API_KEY || "",
      agentId: process.env.FORMMY_AGENT_ID || "6962b02ec232df8a06a9b7d6",
      interviewAgentId: process.env.FORMMY_INTERVIEW_AGENT_ID || "",
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
    isAnonymous: !user,
    credits: user ? await getCredits(user.id) : { remaining: 0, total: 0, used: 0 },
  }, { headers });
};

export default function CoachPage() {
  const { profile, formmyConfig, isAnonymous, credits } = useLoaderData<typeof loader>();

  return (
    <FormmyProvider publishableKey={formmyConfig.publishableKey}>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 pt-20">
        <CoachInterface
          profile={profile}
          formmyConfig={formmyConfig}
          isAnonymous={isAnonymous}
          credits={credits}
        />
      </div>
    </FormmyProvider>
  );
}
