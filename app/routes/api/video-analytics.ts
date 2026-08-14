import type { ActionFunction } from "react-router";
import { db } from "~/.server/db";

// Genera sessionId basado en user-agent e IP (para usuarios anónimos)
function generateSessionId(request: Request): string {
  const userAgent = request.headers.get("user-agent") || "";
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const hash = Buffer.from(`${userAgent}-${ip}-${Date.now()}`).toString(
    "base64"
  );
  return hash.substring(0, 16);
}

// Detecta tipo de dispositivo desde user-agent
function getDeviceType(request: Request): string {
  const userAgent = request.headers.get("user-agent") || "";
  if (/tablet|ipad/i.test(userAgent)) return "tablet";
  if (/mobile|android|iphone/i.test(userAgent)) return "mobile";
  return "desktop";
}

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Handle both JSON and sendBeacon (text/plain)
    const contentType = request.headers.get("content-type") || "";
    let body;

    if (contentType.includes("application/json")) {
      body = await request.json();
    } else {
      // sendBeacon sends as text/plain
      const text = await request.text();
      body = JSON.parse(text);
    }

    const { intent } = body;

    // Los crawlers y los previews de enlaces (WhatsApp, Slack, Discord) tocan
    // la página y ejecutan lo suficiente para abrir una vista. Contarlos como
    // espectadores ensucia justo la métrica que se va a mirar con tráfico real.
    const ua = (request.headers.get("user-agent") || "").toLowerCase();
    const esBot =
      !ua ||
      /bot|crawler|spider|crawling|preview|facebookexternalhit|whatsapp|slackbot|discordbot|telegrambot|twitterbot|linkedinbot|embedly|quora|pinterest|bitlybot|vkshare|redditbot|applebot|bingbot|googlebot|yandex|duckduckbot|semrush|ahrefs|headless|lighthouse|python-requests|curl|wget|axios|node-fetch/.test(
        ua,
      );
    if (esBot) {
      return new Response(JSON.stringify({ ok: true, ignorado: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Intent: start - Crear nuevo registro de visualización
    if (intent === "start") {
      const { videoId, videoSlug, courseId, userId, email, duration } = body;

      if (!videoId || !videoSlug) {
        return new Response(
          JSON.stringify({ error: "videoId y videoSlug son requeridos" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const sessionId =
        typeof body.sessionId === "string" && body.sessionId.length > 0
          ? body.sessionId
          : generateSessionId(request);
      const deviceType = getDeviceType(request);

      // `sessionId` es un id de navegador que vive en localStorage, así que es
      // estable para siempre: sin esta ventana, cada recarga de la página abría
      // una fila nueva y el conteo de vistas medía refrescadas, no personas.
      // Media hora es la ventana: recargar cuenta como la misma sentada; volver
      // al día siguiente cuenta como otra.
      const VENTANA_MS = 30 * 60 * 1000;
      const reciente = await db.videoView.findFirst({
        where: {
          videoId,
          sessionId,
          startedAt: { gte: new Date(Date.now() - VENTANA_MS) },
        },
        orderBy: { startedAt: "desc" },
        select: { id: true },
      });

      const view = reciente
        ? await db.videoView.update({
            where: { id: reciente.id },
            // el correo puede llegar hasta que se desbloquea, ya empezada la vista
            data: {
              email: email || undefined,
              userId: userId || undefined,
              videoDuration: duration ? Math.floor(duration) : undefined,
            },
          })
        : await db.videoView.create({
            data: {
              videoId,
              videoSlug,
              courseId: courseId || null,
              userId: userId || null,
              email: email || null,
              sessionId,
              deviceType,
              videoDuration: duration ? Math.floor(duration) : null,
            },
          });

      return new Response(JSON.stringify({ viewId: view.id }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Intent: progress - Actualizar segundos vistos
    if (intent === "progress") {
      const { viewId, watchedSeconds } = body;

      if (!viewId) {
        return new Response(JSON.stringify({ error: "viewId requerido" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Al reusar una vista, el reproductor nuevo arranca su contador en cero:
      // si se escribiera tal cual, una recarga borraría lo ya visto.
      const actual = await db.videoView.findUnique({
        where: { id: viewId },
        select: { watchedSeconds: true },
      });
      await db.videoView.update({
        where: { id: viewId },
        data: {
          watchedSeconds: Math.max(
            actual?.watchedSeconds || 0,
            Math.floor(watchedSeconds || 0),
          ),
        },
      });

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Intent: identify — el correo llegó a mitad de la sesión
    if (intent === "identify") {
      const { viewId, email } = body;
      if (!viewId || !email) {
        return new Response(JSON.stringify({ error: "viewId y email requeridos" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      await db.videoView.update({
        where: { id: viewId },
        data: { email: String(email) },
      });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Intent: heatmap — el mapa de calor de esta sentada
    if (intent === "heatmap") {
      const { viewId, buckets, bucketSize, played, watchedSeconds, videoDuration } =
        body;

      if (!viewId || !Array.isArray(buckets)) {
        return new Response(
          JSON.stringify({ error: "viewId y buckets requeridos" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const actual = await db.videoView.findUnique({
        where: { id: viewId },
        select: { buckets: true, watchedSeconds: true, playedAt: true },
      });
      if (!actual) {
        return new Response(JSON.stringify({ error: "Vista no encontrada" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Máximo casilla por casilla, no suma: el cliente manda el acumulado
      // completo, así que un beacon repetido es inofensivo y uno que llega
      // tarde no puede pisar lo que ya estaba.
      const previos = actual.buckets || [];
      const largo = Math.max(previos.length, buckets.length);
      const fusionados: number[] = [];
      for (let i = 0; i < largo; i++) {
        fusionados[i] = Math.max(previos[i] || 0, Number(buckets[i]) || 0);
      }

      await db.videoView.update({
        where: { id: viewId },
        data: {
          buckets: fusionados,
          bucketSize: Number(bucketSize) || 15,
          watchedSeconds: Math.max(
            actual.watchedSeconds || 0,
            Math.floor(Number(watchedSeconds) || 0)
          ),
          // se marca una sola vez: es el instante del primer play
          ...(played && !actual.playedAt ? { playedAt: new Date() } : {}),
          // La duración del elemento manda sobre la que se capturó al publicar
          ...(Number(videoDuration) > 0
            ? { videoDuration: Math.round(Number(videoDuration)) }
            : {}),
        },
      });

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Intent: complete - Marcar como completado
    if (intent === "complete") {
      const { viewId, watchedSeconds } = body;

      if (!viewId) {
        return new Response(JSON.stringify({ error: "viewId requerido" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      await db.videoView.update({
        where: { id: viewId },
        data: {
          completedAt: new Date(),
          watchedSeconds: Math.max(0, Math.floor(watchedSeconds || 0)),
        },
      });

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Intent no reconocido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[video-analytics] Error:", error);
    return new Response(
      JSON.stringify({ error: "Error procesando evento de video" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

// GET no permitido
export const loader = () => {
  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  });
};
