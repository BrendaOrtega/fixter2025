import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { db } from "~/.server/db";
import { getUserOrNull, getOrCreateAnonId } from "~/.server/dbGetters";
import {
  getOrCreateLearnerProfile,
  startSession,
  addMessage,
  generateCoachResponse,
  prepareCoachStream,
  finalizeCoachResponse,
  evaluateResponse,
  updateScores,
  endSession,
  advancePhase,
} from "~/.server/services/coach.server";
import { TTSServiceLive } from "~/.server/services/tts";
import { Effect } from "effect";

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

  return Response.json({ error: "Invalid intent" }, { status: 400 });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const user = await getUserOrNull(request);
  const { anonId } = await getOrCreateAnonId(request);
  const userId = user?.id || anonId;
  const body = await request.json();
  const { intent } = body;

  try {
    if (intent === "start_session") {
      const profile = await getOrCreateLearnerProfile(userId);
      const result = await startSession(profile.id, body.topic);

      // Return session with greeting already included
      return Response.json({
        success: true,
        data: {
          session: result.session,
          exercise: result.exercise,
          triage: result.triage,
        },
      });
    }

    if (intent === "send_message") {
      const { sessionId, message } = body;
      if (!sessionId || !message) {
        return Response.json(
          { error: "sessionId and message required" },
          { status: 400 }
        );
      }

      const profile = await getOrCreateLearnerProfile(userId);

      // Save user message
      await addMessage(sessionId, "user", message);

      // Handle commands
      if (message.startsWith("/")) {
        const command = message.toLowerCase().trim();

        if (command === "/progreso") {
          const text = `Tu progreso:\n- Algoritmos: ${profile.algorithms}/100\n- Fluidez Sintáctica: ${profile.syntaxFluency}/100\n- Diseño de Sistemas: ${profile.systemDesign}/100\n- Debugging: ${profile.debugging}/100\n- Comunicación: ${profile.communication}/100\n\nNivel: ${profile.level} | Racha: ${profile.streak} sesiones`;
          await addMessage(sessionId, "assistant", text);
          return Response.json({ success: true, data: { response: text } });
        }

        if (command === "/siguiente") {
          await advancePhase(sessionId);
        }
      }

      // Check directness adjustment
      const lowerMsg = message.toLowerCase();
      if (lowerMsg.includes("más directo") || lowerMsg.includes("mas directo")) {
        const newLevel = Math.min(5, profile.directnessLevel + 1);
        await db.learnerProfile.update({
          where: { id: profile.id },
          data: { directnessLevel: newLevel },
        });
        profile.directnessLevel = newLevel;
      } else if (lowerMsg.includes("más amable") || lowerMsg.includes("mas amable")) {
        const newLevel = Math.max(1, profile.directnessLevel - 1);
        await db.learnerProfile.update({
          where: { id: profile.id },
          data: { directnessLevel: newLevel },
        });
        profile.directnessLevel = newLevel;
      }

      // Generate AI response with full profile context
      const result = await generateCoachResponse(sessionId, message, {
        id: profile.id,
        directnessLevel: profile.directnessLevel,
        currentTopic: profile.currentTopic,
        algorithms: profile.algorithms,
        syntaxFluency: profile.syntaxFluency,
        systemDesign: profile.systemDesign,
        debugging: profile.debugging,
        communication: profile.communication,
        level: profile.level,
        totalSessions: profile.totalSessions,
      });

      await addMessage(sessionId, "assistant", result.text);

      // If auto-evaluation happened, include it
      if (result.evaluation) {
        const evalText = `Evaluación (${result.evaluation.score}/10): ${result.evaluation.feedback}`;
        await addMessage(sessionId, "assistant", evalText);
      }

      // Get updated profile scores if evaluation happened
      let updatedScores = null;
      if (result.evaluation) {
        const updatedProfile = await db.learnerProfile.findUniqueOrThrow({
          where: { id: profile.id },
        });
        updatedScores = {
          algorithms: updatedProfile.algorithms,
          syntaxFluency: updatedProfile.syntaxFluency,
          systemDesign: updatedProfile.systemDesign,
          debugging: updatedProfile.debugging,
          communication: updatedProfile.communication,
        };
      }

      return Response.json({
        success: true,
        data: {
          response: result.text,
          phase: result.phase,
          evaluation: result.evaluation,
          updatedScores,
        },
      });
    }

    if (intent === "stream_message") {
      const { sessionId, message } = body;
      if (!sessionId || !message) {
        return Response.json(
          { error: "sessionId and message required" },
          { status: 400 }
        );
      }

      const profile = await getOrCreateLearnerProfile(userId);
      await addMessage(sessionId, "user", message);

      // Handle commands (non-streaming)
      if (message.startsWith("/")) {
        const command = message.toLowerCase().trim();
        if (command === "/progreso") {
          const text = `Tu progreso:\n- Algoritmos: ${profile.algorithms}/100\n- Fluidez Sintáctica: ${profile.syntaxFluency}/100\n- Diseño de Sistemas: ${profile.systemDesign}/100\n- Debugging: ${profile.debugging}/100\n- Comunicación: ${profile.communication}/100\n\nNivel: ${profile.level} | Racha: ${profile.streak} sesiones`;
          await addMessage(sessionId, "assistant", text);
          return Response.json({ success: true, data: { response: text } });
        }
        if (command === "/siguiente") {
          await advancePhase(sessionId);
        }
      }

      // Directness adjustment
      const lowerMsg = message.toLowerCase();
      if (lowerMsg.includes("más directo") || lowerMsg.includes("mas directo")) {
        const newLevel = Math.min(5, profile.directnessLevel + 1);
        await db.learnerProfile.update({ where: { id: profile.id }, data: { directnessLevel: newLevel } });
        profile.directnessLevel = newLevel;
      } else if (lowerMsg.includes("más amable") || lowerMsg.includes("mas amable")) {
        const newLevel = Math.max(1, profile.directnessLevel - 1);
        await db.learnerProfile.update({ where: { id: profile.id }, data: { directnessLevel: newLevel } });
        profile.directnessLevel = newLevel;
      }

      const { result } = await prepareCoachStream(sessionId, message, {
        id: profile.id,
        directnessLevel: profile.directnessLevel,
        currentTopic: profile.currentTopic,
        algorithms: profile.algorithms,
        syntaxFluency: profile.syntaxFluency,
        systemDesign: profile.systemDesign,
        debugging: profile.debugging,
        communication: profile.communication,
        level: profile.level,
        totalSessions: profile.totalSessions,
      });

      // Create a TransformStream to intercept the full text
      let fullText = "";
      const textStream = result.textStream;

      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of textStream) {
              fullText += chunk;
              controller.enqueue(new TextEncoder().encode(chunk));
            }

            // After stream completes, finalize (save message, phase transitions, eval)
            const finalData = await finalizeCoachResponse(
              sessionId,
              fullText,
              message,
              profile.id,
            );

            // Send metadata as a final SSE-style line
            controller.enqueue(
              new TextEncoder().encode(
                "\n__META__" + JSON.stringify(finalData)
              )
            );
            controller.close();
          } catch (err) {
            console.error("Stream error:", err);
            controller.error(err);
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Transfer-Encoding": "chunked",
          "Cache-Control": "no-cache",
        },
      });
    }

    if (intent === "evaluate") {
      const { sessionId, response } = body;
      const profile = await getOrCreateLearnerProfile(userId);

      const evaluation = await evaluateResponse(sessionId, response);

      if (evaluation.deltas) {
        await updateScores(profile.id, evaluation.deltas);
      }

      const evalText = `Evaluación (${evaluation.score}/10): ${evaluation.feedback}`;
      await addMessage(sessionId, "assistant", evalText);

      // Get updated scores
      const updatedProfile = await db.learnerProfile.findUniqueOrThrow({
        where: { id: profile.id },
      });

      return Response.json({
        success: true,
        data: {
          ...evaluation,
          updatedScores: {
            algorithms: updatedProfile.algorithms,
            syntaxFluency: updatedProfile.syntaxFluency,
            systemDesign: updatedProfile.systemDesign,
            debugging: updatedProfile.debugging,
            communication: updatedProfile.communication,
          },
        },
      });
    }

    if (intent === "end_session") {
      const { sessionId } = body;
      const result = await endSession(sessionId);
      return Response.json({ success: true, data: result });
    }

    if (intent === "tts") {
      const { text } = body;
      if (!text) {
        return Response.json({ error: "text required" }, { status: 400 });
      }

      const audioBuffer = await Effect.runPromise(
        TTSServiceLive.generateSpeech(text, {
          voiceName: body.voice || "es-US-Neural2-A",
          speakingRate: 1.05,
        })
      );

      return new Response(audioBuffer, {
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    return Response.json({ error: "Invalid intent" }, { status: 400 });
  } catch (error) {
    console.error("Coach API error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return Response.json({ error: message }, { status: 500 });
  }
};
