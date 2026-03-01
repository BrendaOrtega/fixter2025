import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { db } from "~/.server/db";
import { getUserOrNull, getOrCreateAnonId } from "~/.server/dbGetters";
import { getOrCreateLearnerProfile } from "~/.server/services/coach.server";
import { getCredits, consumeSession, hasCredits } from "~/.server/services/coach-credits.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await getUserOrNull(request);
  const { anonId } = await getOrCreateAnonId(request);
  const userId = user?.id || anonId;
  const url = new URL(request.url);
  const intent = url.searchParams.get("intent");

  if (intent === "progress") {
    const profile = await getOrCreateLearnerProfile(userId);
    return Response.json({ success: true, data: profile });
  }

  if (intent === "credits") {
    if (!user) return Response.json({ success: true, data: { remaining: 0, total: 0, used: 0 } });
    const credits = await getCredits(user.id);
    return Response.json({ success: true, data: credits });
  }

  return Response.json({ error: "Invalid intent" }, { status: 400 });
};

const ANON_DAILY_LIMIT = 2;

async function getAnonSessionsToday(profileId: string): Promise<number> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return db.coachingSession.count({
    where: { profileId, startedAt: { gte: todayStart } },
  });
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const user = await getUserOrNull(request);
  const { anonId } = await getOrCreateAnonId(request);
  const userId = user?.id || anonId;
  const body = await request.json();
  const { intent } = body;

  try {
    // === CREATE SESSION: check limits, create DB record, return sessionId ===
    if (intent === "create_session") {
      const profile = await getOrCreateLearnerProfile(userId);

      // Anonymous: 2 free sessions per day
      if (!user) {
        const todayCount = await getAnonSessionsToday(profile.id);
        if (todayCount >= ANON_DAILY_LIMIT) {
          return Response.json(
            { error: "daily_limit", message: `Límite de ${ANON_DAILY_LIMIT} sesiones diarias alcanzado. Regresa mañana o inicia sesión.` },
            { status: 403 }
          );
        }
      }

      // Authenticated: first session free, then need credits
      if (user && profile.totalSessions >= 1) {
        const credits = await hasCredits(user.id);
        if (!credits) {
          return Response.json(
            { error: "no_credits", message: "Necesitas comprar sesiones para continuar." },
            { status: 402 }
          );
        }
      }

      const session = await db.coachingSession.create({
        data: {
          profileId: profile.id,
          topic: body.topic || null,
          mode: body.mode || "programming",
          phase: "KICKOFF",
          messages: [],
        },
      });

      return Response.json({
        success: true,
        data: { sessionId: session.id },
      });
    }

    // === CLOSE SESSION: mark endedAt, consume credit if >5min ===
    if (intent === "close_session") {
      const { sessionId } = body;
      if (!sessionId) {
        return Response.json({ error: "sessionId required" }, { status: 400 });
      }

      await db.coachingSession.update({
        where: { id: sessionId },
        data: { endedAt: new Date() },
      });

      // Consume a credit if authenticated user and session lasted > 5 min
      if (user) {
        const session = await db.coachingSession.findUnique({ where: { id: sessionId } });
        if (session) {
          const durationMs = new Date().getTime() - session.startedAt.getTime();
          if (durationMs > 5 * 60 * 1000) {
            await consumeSession(user.id);
          }
        }
      }

      // Increment totalSessions on profile
      const profile = await getOrCreateLearnerProfile(userId);
      await db.learnerProfile.update({
        where: { id: profile.id },
        data: { totalSessions: { increment: 1 } },
      });

      return Response.json({ success: true });
    }

    // === VOICE LATENCY REPORT ===
    if (intent === "voice_latency_report") {
      const { metrics } = body;
      console.log(`[Voice Latency Report] session=${body.sessionId} avg=${metrics?.avg}ms p90=${metrics?.p90}ms max=${metrics?.max}ms n=${metrics?.count}`);
      if (body.sessionId && metrics) {
        const existing = await db.coachingSession.findUnique({ where: { id: body.sessionId }, select: { scoreDeltas: true } }).catch(() => null);
        await db.coachingSession.update({
          where: { id: body.sessionId },
          data: {
            scoreDeltas: {
              ...((existing?.scoreDeltas as Record<string, any>) || {}),
              _voiceLatency: metrics,
            },
          },
        }).catch(() => {});
      }
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Invalid intent" }, { status: 400 });
  } catch (error) {
    console.error("Coach API error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return Response.json({ error: message }, { status: 500 });
  }
};
