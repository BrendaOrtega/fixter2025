import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { db } from "~/.server/db";
import { getUserOrNull, getOrCreateAnonId } from "~/.server/dbGetters";
import {
  getOrCreateLearnerProfile,
  getOrCreateInterviewProfile,
  updateInterviewProfile,
  scoreSession,
  updateProfileScores,
  advanceDrillStage,
  addStoriesToBank,
  getSessionHistorySummary,
  getProfileSummary,
  getStorybankSummary,
} from "~/.server/services/coach.server";
import { buildProgrammingPrompt, buildInterviewPrompt } from "~/.server/services/coach-prompts.server";
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

      const sessionMode = body.mode || "programming";
      const session = await db.coachingSession.create({
        data: {
          profileId: profile.id,
          topic: body.topic || null,
          mode: sessionMode,
          phase: "KICKOFF",
          messages: [],
        },
      });

      // Generate per-session system prompt based on user profile
      let systemPrompt: string;
      if (sessionMode === "interview") {
        const interviewProfile = await getOrCreateInterviewProfile(userId);
        const storybank = (interviewProfile.storybank as any[]) || [];
        systemPrompt = buildInterviewPrompt({
          drillStage: interviewProfile.drillStage,
          targetRole: interviewProfile.targetRole || undefined,
          seniority: interviewProfile.seniority || undefined,
          dimensions: {
            substance: interviewProfile.substance,
            structure: interviewProfile.structure,
            relevance: interviewProfile.relevance,
            credibility: interviewProfile.credibility,
            differentiation: interviewProfile.differentiation,
          },
          totalSessions: profile.totalSessions,
          storyCount: storybank.length,
        });
      } else {
        systemPrompt = buildProgrammingPrompt({
          dimensions: {
            algorithms: profile.algorithms,
            syntaxFluency: profile.syntaxFluency,
            systemDesign: profile.systemDesign,
            debugging: profile.debugging,
            communication: profile.communication,
          },
          currentTopic: profile.currentTopic || undefined,
          totalSessions: profile.totalSessions,
        });
      }

      return Response.json({
        success: true,
        data: { sessionId: session.id, systemPrompt },
      });
    }

    // === CLOSE SESSION: save messages, score, consume credit ===
    if (intent === "close_session") {
      const { sessionId, messages: clientMessages, selfAssessment } = body;
      if (!sessionId) {
        return Response.json({ error: "sessionId required" }, { status: 400 });
      }

      const profile = await getOrCreateLearnerProfile(userId);
      const session = await db.coachingSession.findUnique({ where: { id: sessionId } });
      if (!session || session.profileId !== profile.id) {
        return Response.json({ error: "Session not found or unauthorized" }, { status: 403 });
      }

      // Save messages from client + self-assessment + endedAt
      await db.coachingSession.update({
        where: { id: sessionId },
        data: {
          endedAt: new Date(),
          messages: clientMessages || session.messages,
          ...(selfAssessment != null ? { selfAssessment: Number(selfAssessment) } : {}),
        },
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

      // Run scoring in background (non-blocking for the user)
      scoreSession(sessionId).then(async (result) => {
        if (!result) return;
        try {
          await db.coachingSession.update({
            where: { id: sessionId },
            data: {
              scoreDeltas: result.scoreDeltas,
              summary: result.summary,
              nextSteps: result.nextSteps,
              dimensionFeedback: result.dimensionFeedback,
            },
          });
          await updateProfileScores(profile.id, session.mode, result.scoreDeltas);

          // For interview sessions: extract stories and check drill stage advancement
          if (session.mode === "interview" && result.extractedStories?.length) {
            await addStoriesToBank(profile.userId, result.extractedStories);
            await advanceDrillStage(profile.userId);
          }
        } catch (err) {
          console.error("[close_session] Scoring save error:", err);
        }
      }).catch((err) => {
        console.error("[close_session] scoreSession error:", err);
      });

      const updatedCredits = user
        ? await getCredits(user.id)
        : { remaining: 0, total: 0, used: 0 };

      return Response.json({ success: true, credits: updatedCredits });
    }

    // === UPDATE PROFILE (onboarding capture) ===
    if (intent === "update_profile") {
      const { targetRole, seniority, currentTopic, mode: profileMode } = body;

      if (profileMode === "interview") {
        await getOrCreateInterviewProfile(userId);
        if (targetRole || seniority) {
          await updateInterviewProfile(userId, {
            ...(targetRole ? { targetRole } : {}),
            ...(seniority ? { seniority } : {}),
          });
        }
      }

      if (currentTopic) {
        const profile = await getOrCreateLearnerProfile(userId);
        await db.learnerProfile.update({
          where: { id: profile.id },
          data: { currentTopic },
        });
      }

      return Response.json({ success: true });
    }

    // === SELF ASSESSMENT (can be sent separately) ===
    if (intent === "self_assessment") {
      const { sessionId: saSessionId, rating } = body;
      if (!saSessionId || !rating) {
        return Response.json({ error: "sessionId and rating required" }, { status: 400 });
      }
      await db.coachingSession.update({
        where: { id: saSessionId },
        data: { selfAssessment: Number(rating) },
      });
      return Response.json({ success: true });
    }

    // === STORYBANK CRUD ===
    if (intent === "get_storybank") {
      const summary = await getStorybankSummary(userId);
      return Response.json({ success: true, data: summary });
    }

    if (intent === "update_story") {
      const { storyIndex, storyData } = body;
      const interview = await getOrCreateInterviewProfile(userId);
      const stories = (interview.storybank as any[]) || [];
      if (storyIndex < 0 || storyIndex >= stories.length) {
        return Response.json({ error: "Invalid story index" }, { status: 400 });
      }
      stories[storyIndex] = { ...stories[storyIndex], ...storyData };
      await db.interviewProfile.update({
        where: { userId },
        data: { storybank: stories },
      });
      return Response.json({ success: true });
    }

    if (intent === "delete_story") {
      const { storyIndex: delIndex } = body;
      const interview = await getOrCreateInterviewProfile(userId);
      const stories = (interview.storybank as any[]) || [];
      if (delIndex < 0 || delIndex >= stories.length) {
        return Response.json({ error: "Invalid story index" }, { status: 400 });
      }
      stories.splice(delIndex, 1);
      await db.interviewProfile.update({
        where: { userId },
        data: { storybank: stories },
      });
      return Response.json({ success: true });
    }

    // === VOICE TOOL: get_story_detail ===
    if (intent === "get_story_detail") {
      const { storyId } = body;
      if (!storyId) return Response.json({ error: "storyId required" }, { status: 400 });
      const interview = await getOrCreateInterviewProfile(userId);
      const stories = (interview.storybank as any[]) || [];
      const story = stories.find((s: any) => s.id === storyId);
      if (!story) return Response.json({ error: "Story not found" }, { status: 404 });
      const { situation, task, action, result, earnedSecret } = story;
      return Response.json({ success: true, data: { situation, task, action, result, earnedSecret } });
    }

    // === VOICE TOOL: save_story ===
    if (intent === "save_story") {
      const { title, situation, task, action, result, earnedSecret, primarySkill, strength } = body;
      if (!title || !situation || !primarySkill) {
        return Response.json({ error: "title, situation, and primarySkill required" }, { status: 400 });
      }
      await addStoriesToBank(userId, [{
        title,
        situation: situation || "",
        task: task || "",
        action: action || "",
        result: result || "",
        earnedSecret: earnedSecret || "",
        primarySkill,
        strength: strength || 3,
      }]);
      const updated = await getOrCreateInterviewProfile(userId);
      const bank = (updated.storybank as any[]) || [];
      const last = bank[bank.length - 1];
      return Response.json({ success: true, data: { storyId: last?.id } });
    }

    // === VOICE TOOL: get_session_history ===
    if (intent === "get_session_history") {
      const limit = body.limit || 3;
      const result = await getSessionHistorySummary(userId, limit);
      return Response.json({ success: true, data: result });
    }

    // === VOICE TOOL: get_profile ===
    if (intent === "get_profile") {
      const profileMode = body.mode || "programming";
      const result = await getProfileSummary(userId, profileMode);
      return Response.json({ success: true, data: result });
    }

    // === TRACK EVENT ===
    if (intent === "track_event") {
      const { event, sessionId: evtSessionId, metadata: evtMeta } = body;
      if (!event) {
        return Response.json({ error: "event required" }, { status: 400 });
      }
      await db.coachEvent.create({
        data: {
          event,
          sessionId: evtSessionId || null,
          userId: user?.id || null,
          metadata: evtMeta || null,
        },
      });
      return Response.json({ success: true });
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
