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
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const bonusToday = profile.dailyBonusDate && new Date(profile.dailyBonusDate) >= todayStart
        ? profile.dailyBonusSessions
        : 0;

      if (!user) {
        // Anonymous: daily limit + bonus
        const todayCount = await getAnonSessionsToday(profile.id);
        const effectiveLimit = ANON_DAILY_LIMIT + bonusToday;
        if (todayCount >= effectiveLimit) {
          return Response.json(
            { error: "daily_limit", message: `Límite de ${effectiveLimit} sesiones diarias alcanzado. Regresa mañana o inicia sesión.` },
            { status: 403 }
          );
        }
      } else {
        // Authenticated: bonus slots first, then credits after first free session
        const todayCount = await getAnonSessionsToday(profile.id);
        const hasBonusSlot = bonusToday > 0 && todayCount < bonusToday;
        if (!hasBonusSlot && profile.totalSessions >= 1) {
          const credits = await hasCredits(user.id);
          if (!credits) {
            return Response.json(
              { error: "no_credits", message: "Necesitas comprar sesiones para continuar." },
              { status: 402 }
            );
          }
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

      // Verify ownership: the session must belong to the current user's profile
      const profile = await getOrCreateLearnerProfile(userId);
      const session = await db.coachingSession.findUnique({ where: { id: sessionId } });
      if (!session || session.profileId !== profile.id) {
        return Response.json({ error: "Session not found or unauthorized" }, { status: 403 });
      }

      await db.coachingSession.update({
        where: { id: sessionId },
        data: { endedAt: new Date() },
      });

      // Consume a credit if authenticated user and session lasted > 5 min
      if (user) {
        const durationMs = new Date().getTime() - session.startedAt.getTime();
        if (durationMs > 5 * 60 * 1000) {
          await consumeSession(user.id);
        }
      }

      // Increment totalSessions on profile
      await db.learnerProfile.update({
        where: { id: profile.id },
        data: { totalSessions: { increment: 1 } },
      });

      // Return updated credits so UI can refresh
      const updatedCredits = user
        ? await getCredits(user.id)
        : { remaining: 0, total: 0, used: 0 };

      return Response.json({ success: true, credits: updatedCredits });
    }

    // === VOICE LATENCY REPORT ===
    if (intent === "voice_latency_report") {
      const { metrics } = body;
      console.log(`[Voice Latency Report] session=${body.sessionId} avg=${metrics?.avg}ms p90=${metrics?.p90}ms max=${metrics?.max}ms n=${metrics?.count}`);
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Invalid intent" }, { status: 400 });
  } catch (error) {
    console.error("Coach API error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return Response.json({ error: message }, { status: 500 });
  }
};
