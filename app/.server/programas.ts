import { db } from "./db";

/// Un "programa" es un Course visto por su ciclo de vida completo: se promociona
/// con webinars abiertos, se imparte en vivo, y termina siendo curso on-demand.
/// Todo eso vive en el mismo Course; lo que cambia es `stage` y las piezas que
/// se le van sumando.

/// El tag con el que se marcó a quien se registró a los webinars de este
/// programa. Hoy se escribe como `webinar-<slug>` en los actions de las landings
/// (`sistemas-agenticos.tsx`, `claude.tsx`, `gemini.tsx`).
export const audienceTagFor = (courseSlug: string) => `webinar-${courseSlug}`;

export const getProgramas = async () => {
  const courses = await db.course.findMany({
    where: { tipo: { not: "proximamente" } },
    select: {
      id: true,
      slug: true,
      title: true,
      stage: true,
      tipo: true,
      isLive: true,
      startDate: true,
      videoIds: true,
      icon: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  // Un solo count por programa: la lista es un índice, no un tablero.
  const audiencias = await Promise.all(
    courses.map((course) =>
      db.subscriber.count({
        where: { tags: { has: audienceTagFor(course.slug) } },
      }),
    ),
  );

  return courses.map((course, i) => ({
    ...course,
    piezas: course.videoIds.length,
    audiencia: audiencias[i],
  }));
};

/// La vista "de un vistazo": cada pieza con su material, y cada persona con lo
/// que de verdad hizo. Las tres señales de compromiso ya existían por separado
/// (VideoView, ResourceAccess, tags); esto solo las junta por correo.
export const getPrograma = async (slug: string) => {
  const course = await db.course.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      stage: true,
      tipo: true,
      isLive: true,
      startDate: true,
      basePrice: true,
      landingUrl: true,
      videoIds: true,
    },
  });
  if (!course) return null;

  const tag = audienceTagFor(course.slug);

  const [videos, resources, subscribers, views] = await Promise.all([
    db.video.findMany({
      where: { id: { in: course.videoIds } },
      select: {
        id: true,
        slug: true,
        title: true,
        kind: true,
        eventDate: true,
        index: true,
        duration: true,
        accessLevel: true,
        isPublic: true,
        processingStatus: true,
      },
    }),
    db.resource.findMany({
      where: { OR: [{ courseId: course.id }, { videoId: { in: course.videoIds } }] },
      select: {
        id: true,
        slug: true,
        kind: true,
        title: true,
        videoId: true,
        legacyPath: true,
        externalUrl: true,
        s3Key: true,
      },
    }),
    db.subscriber.findMany({
      where: { tags: { has: tag } },
      select: {
        id: true,
        email: true,
        name: true,
        tags: true,
        confirmed: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    db.videoView.findMany({
      where: { courseId: course.id },
      select: {
        email: true,
        videoId: true,
        sessionId: true,
        watchedSeconds: true,
        completedAt: true,
      },
    }),
  ]);

  const accesses = resources.length
    ? await db.resourceAccess.findMany({
        where: { resourceId: { in: resources.map((r) => r.id) } },
        select: { email: true, resourceId: true },
      })
    : [];

  // Índices por correo, en minúsculas: el mismo correo llega escrito de las dos
  // formas según por dónde entró la persona.
  const key = (email?: string | null) => (email || "").trim().toLowerCase();

  const vistosPor = new Map<string, { segundos: number; completados: number }>();
  for (const view of views) {
    const k = key(view.email);
    if (!k) continue;
    const acc = vistosPor.get(k) || { segundos: 0, completados: 0 };
    acc.segundos += view.watchedSeconds;
    if (view.completedAt) acc.completados += 1;
    vistosPor.set(k, acc);
  }

  const materialesPor = new Map<string, Set<string>>();
  for (const access of accesses) {
    const k = key(access.email);
    if (!k) continue;
    const set = materialesPor.get(k) || new Set<string>();
    set.add(access.resourceId);
    materialesPor.set(k, set);
  }

  const audiencia = subscribers.map((sub) => {
    const k = key(sub.email);
    const visto = vistosPor.get(k);
    const materiales = materialesPor.get(k)?.size || 0;
    return {
      ...sub,
      minutosVistos: visto ? Math.round(visto.segundos / 60) : 0,
      videosCompletados: visto?.completados || 0,
      materiales,
      // Compromiso a ojo de pájaro, con lo que sí sabemos: se registró (1),
      // vio algo (2), terminó algo o bajó material (3).
      compromiso:
        (visto?.completados || 0) > 0 || materiales > 0
          ? 3
          : visto
            ? 2
            : 1,
    };
  });

  const porVideo = new Map(
    videos.map((video) => [
      video.id,
      {
        ...video,
        materiales: resources.filter((r) => r.videoId === video.id),
        // Personas, no filas: hasta que se acotó por ventana de media hora,
        // cada recarga abría un registro nuevo. Se cuenta por navegador.
        espectadores: new Set(
          views.filter((v) => v.videoId === video.id).map((v) => v.sessionId),
        ).size,
        reproducciones: views.filter((v) => v.videoId === video.id).length,
      },
    ]),
  );

  // Línea de tiempo: primero lo que tiene fecha de evento, luego por índice.
  const piezas = [...porVideo.values()].sort((a, b) => {
    if (a.eventDate && b.eventDate)
      return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
    if (a.eventDate) return -1;
    if (b.eventDate) return 1;
    return (a.index ?? 0) - (b.index ?? 0);
  });

  return {
    course,
    tag,
    piezas,
    // Material del programa completo (temario, repo), no de una pieza.
    materialesDelCurso: resources.filter((r) => !r.videoId),
    audiencia,
    stats: {
      registrados: audiencia.length,
      confirmados: audiencia.filter((a) => a.confirmed).length,
      vieron: audiencia.filter((a) => a.compromiso >= 2).length,
      comprometidos: audiencia.filter((a) => a.compromiso === 3).length,
    },
  };
};
