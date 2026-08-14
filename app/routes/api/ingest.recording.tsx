/**
 * Ingesta de grabaciones desde Ghosty Teams.
 *
 * Cierra a mano el último tramo del camino que ya recorre solo una grabación de webinar: la
 * caja del evento transcodifica el HLS, saca el storyboard y transcribe, y sube todo a
 * Tigris. Lo único que faltaba era que ALGUIEN creara la fila del `Video` y la cerrara —
 * hasta hoy eso eran dos scripts corriendo en una laptop (`create-webinar-01-video.ts` e
 * `import-transcript.ts`).
 *
 * Dos operaciones, y el orden importa:
 *   1. `draft` — crea el vídeo en BORRADOR y devuelve su id. Tiene que ser lo primero,
 *      porque el `videoId` va dentro de la llave de todos los objetos que se suben.
 *   2. `ready` — cierra la fila con el `m3u8` y guarda la transcripción.
 *
 * ⚠️ NO se reutiliza `/api/course`: ésa es la API del admin y su guard es de sesión. Este
 * endpoint lo llama una máquina, así que va firmado.
 */
import crypto from "crypto";
import type { Route } from "./+types/ingest.recording";
import { db } from "~/.server/db";
import type { Capitulo, Segmento } from "~/.server/transcript";

const VENTANA_S = 300;

/**
 * HMAC con secreto propio, no el de otra integración.
 *
 * Canonical `${ts}.${body}`, mismo formato que ya se usa contra Formmy. La ventana de 5
 * minutos es lo que impide reproducir una petición capturada; sin ella, quien viera una
 * llamada podría repetirla para siempre.
 */
function firmaValida(request: Request, raw: string): boolean {
  const secret = process.env.FIXTERGEEK_PARTNER_SECRET;
  if (!secret) return false;                       // sin secreto configurado no se abre nada
  const ts = request.headers.get("x-partner-timestamp") ?? "";
  const sig = request.headers.get("x-partner-signature") ?? "";
  if (!ts || !sig) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(ts)) > VENTANA_S) return false;
  const esperada = crypto.createHmac("sha256", secret).update(`${ts}.${raw}`).digest("hex");
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(esperada, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

export const action = async ({ request }: Route.ActionArgs) => {
  const raw = await request.text();
  if (!firmaValida(request, raw)) {
    return Response.json({ error: "firma inválida" }, { status: 401 });
  }
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw); } catch { return Response.json({ error: "json inválido" }, { status: 400 }); }

  // ── 1) Borrador ────────────────────────────────────────────────────────────
  if (body.intent === "draft") {
    const courseId = String(body.courseId ?? "");
    const title = String(body.title ?? "").trim();
    if (!courseId || !title) return Response.json({ error: "courseId y title" }, { status: 400 });

    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { id: true, slug: true, videoIds: true },
    }).catch(() => null);
    if (!course) return Response.json({ error: "ese taller no existe" }, { status: 404 });

    // ⚠️ El slug lleva fecha Y HORA. Con sólo la fecha, dos grabaciones del mismo día
    // caían en el mismo slug y la segunda SOBRESCRIBÍA a la primera —mismo `upsert`—,
    // dejando un vídeo apuntando al HLS de otro. Un ensayo por la mañana y la sesión buena
    // por la tarde es el caso normal, no el raro.
    //
    // Quien llama manda `slug` cuando quiere controlarlo (reintentos, correcciones): eso es
    // lo que mantiene la operación idempotente sin depender del reloj.
    const fecha = body.eventDate ? new Date(String(body.eventDate)) : new Date();
    const cuando = Number.isNaN(fecha.getTime()) ? new Date() : fecha;
    const dia = cuando.toISOString().slice(0, 10);
    const hora = cuando.toISOString().slice(11, 16).replace(":", "");
    const slug = String(body.slug ?? "") || `${slugify(title)}-${dia}-${hora}`;

    const video = await db.video.upsert({
      where: { slug },
      update: { title, eventDate: cuando },
      create: {
        slug,
        title,
        kind: "webinar",
        eventDate: cuando,
        moduleName: "Webinars",
        // ⚠️ `accessLevel` es lo que decide el acceso en el viewer, no `isPublic`.
        accessLevel: "subscriber",
        // Nace OCULTO: un webinar arranca con minutos de sala vacía y hay que mirarlo
        // antes de enseñarlo. Publicarlo es un clic en el admin.
        isPublic: false,
        processingStatus: "pending",
        processingStartedAt: new Date(),
        authorName: "Héctorbliss",
        courseIds: [course.id],
      },
      select: { id: true, slug: true, courseIds: true },
    });

    // ⚠️ La relación M-N de Mongo se guarda en los DOS lados. Sin el `push` en el curso, el
    // vídeo existe pero no aparece en él — y desde el admin parece que no se creó.
    if (!video.courseIds.includes(course.id)) {
      await db.video.update({ where: { id: video.id }, data: { courseIds: { push: course.id } } });
    }
    if (!course.videoIds.includes(video.id)) {
      await db.course.update({ where: { id: course.id }, data: { videoIds: { push: video.id } } });
    }

    return Response.json({
      videoId: video.id,
      slug: video.slug,
      viewerUrl: `/cursos/${course.slug}/viewer?videoSlug=${video.slug}`,
    });
  }

  // ── 2) Cierre ──────────────────────────────────────────────────────────────
  if (body.intent === "ready") {
    const videoId = String(body.videoId ?? "");
    if (!videoId) return Response.json({ error: "videoId" }, { status: 400 });
    const video = await db.video.findUnique({
      where: { id: videoId },
      select: { id: true, slug: true, title: true, courseIds: true },
    }).catch(() => null);
    if (!video) return Response.json({ error: "ese video no existe" }, { status: 404 });

    await db.video.update({
      where: { id: videoId },
      data: {
        ...(body.m3u8 ? { m3u8: String(body.m3u8) } : {}),
        ...(body.poster ? { poster: String(body.poster) } : {}),
        ...(body.durationMin ? { duration: String(body.durationMin) } : {}),
        processingStatus: "ready",
        processingCompletedAt: new Date(),
        processingMetadata: {
          qualities: ["1080p", "720p", "480p"],
          processedAt: new Date().toISOString(),
          note: "generado y subido por la caja del evento (livekit-svc)",
        },
      },
    });

    // La transcripción es opcional: whisper puede seguir trabajando cuando el vídeo ya
    // está listo, y en ese caso llega en una segunda llamada.
    const t = body.transcript as { segments?: Segmento[]; text?: string; language?: string } | undefined;
    let capitulos = 0;
    if (t?.segments?.length) {
      let chapters: Capitulo[] = [];
      try {
        const { generarCapitulos } = await import("~/.server/chapters");
        chapters = await generarCapitulos(t.segments, { titulo: video.title });
      } catch (e) {
        // Un fallo de los capítulos NO puede tirar la transcripción: sin capítulos se
        // puede leer, buscar y poner subtítulos; sin transcripción, nada de eso.
        console.error("[ingest] capítulos:", e);
      }
      capitulos = chapters.length;
      const datos = {
        courseId: video.courseIds[0] ?? null,
        language: t.language ?? "es",
        source: "ghosty-teams",
        segments: t.segments as unknown as object,
        text: t.text ?? t.segments.map((s) => s.texto).join(" "),
        ...(chapters.length ? { chapters: chapters as unknown as object } : {}),
      };
      await db.transcript.upsert({
        where: { videoId: video.id },
        create: { videoId: video.id, ...datos },
        update: datos,
      });
    }

    return Response.json({ ok: true, slug: video.slug, capitulos });
  }

  // ── 3) Borrado ─────────────────────────────────────────────────────────────
  // Quien borra la grabación en el room espera que desaparezca de todas partes. Sin esto,
  // el vídeo se queda publicado apuntando a un HLS que ya nadie va a mantener.
  if (body.intent === "delete") {
    const videoId = String(body.videoId ?? "");
    if (!videoId) return Response.json({ error: "videoId" }, { status: 400 });
    const video = await db.video.findUnique({
      where: { id: videoId },
      select: { id: true, courseIds: true, isPublic: true },
    }).catch(() => null);
    if (!video) return Response.json({ ok: true, yaNoEstaba: true });

    // ⚠️ Un vídeo YA PUBLICADO no se borra desde aquí: puede tener vistas, estar enlazado o
    // haberse editado a mano. Que lo quite quien lo publicó, desde el admin.
    if (video.isPublic) return Response.json({ ok: false, error: "ya está publicado" }, { status: 409 });

    await db.transcript.deleteMany({ where: { videoId: video.id } });
    await db.resource.deleteMany({ where: { videoId: video.id } });
    for (const cid of video.courseIds) {
      const c = await db.course.findUnique({ where: { id: cid }, select: { videoIds: true } });
      if (c) {
        await db.course.update({
          where: { id: cid },
          data: { videoIds: { set: c.videoIds.filter((v) => v !== video.id) } },
        });
      }
    }
    await db.video.delete({ where: { id: video.id } });
    return Response.json({ ok: true });
  }

  return Response.json({ error: "intent desconocido" }, { status: 400 });
};
