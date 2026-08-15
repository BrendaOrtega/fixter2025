import { db } from "./db";

/// Un "programa" es un Course visto por su ciclo de vida completo: se promociona
/// con webinars abiertos, se imparte en vivo, y termina siendo curso on-demand.
/// Todo eso vive en el mismo Course; lo que cambia es `stage` y las piezas que
/// se le van sumando.

/// El tag con el que se marcó a quien se registró a los webinars de este
/// programa. Hoy se escribe como `webinar-<slug>` en los actions de las landings
/// (`sistemas-agenticos.tsx`, `claude.tsx`, `gemini.tsx`).
export const audienceTagFor = (courseSlug: string) => `webinar-${courseSlug}`;

/// Al programa se entra por dos puertas: registrarse al webinar en vivo, o
/// desbloquear la grabación con el correo desde el reproductor —que escribe
/// `<slug>-free-access`—. Contar solo la primera dejaba fuera justo a la gente
/// que llega por difusión, que es la que más importa medir.
export const audienceTagsFor = (courseSlug: string) => [
  audienceTagFor(courseSlug),
  `${courseSlug}-free-access`,
];

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
        where: { tags: { hasSome: audienceTagsFor(course.slug) } },
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

  const tags = audienceTagsFor(course.slug);

  const [videos, transcripts, resources, subscribers, views] = await Promise.all([
    db.video.findMany({
      // Por `courseIds` y no por `course.videoIds`: la relación vive en los dos
      // lados y basta que uno se desincronice para que una pieza quede
      // invisible aquí pero visible en el reproductor — y sin forma de
      // borrarla. El viewer lista por este mismo criterio.
      where: { courseIds: { has: course.id } },
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
        poster: true,
        m3u8: true,
        storageLink: true,
      },
    }),
    db.transcript.findMany({
      where: { video: { courseIds: { has: course.id } } },
      // El texto completo son ~12 mil palabras por video: aquí solo interesa
      // si existe y qué tan trabajado está.
      select: { videoId: true, source: true, chapters: true, language: true },
    }),
    db.resource.findMany({
      where: {
        OR: [
          { courseId: course.id },
          { video: { courseIds: { has: course.id } } },
        ],
      },
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
      where: { tags: { hasSome: tags } },
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
        videoDuration: true,
        deviceType: true,
        completedAt: true,
        buckets: true,
        bucketSize: true,
        playedAt: true,
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

  // Por persona nos interesa lo más lejos que llegó, no la suma de sus sentadas:
  // quien vio media hora tres veces vio media hora, no hora y media.
  // Por persona y POR PIEZA: un porcentaje suelto no dice de qué video es, y
  // con tres piezas en el programa eso vale poco.
  const vistosPor = new Map<
    string,
    {
      completados: number;
      dispositivo: string | null;
      porVideo: Map<string, { segundos: number; duracion: number }>;
    }
  >();
  for (const view of views) {
    const k = key(view.email);
    if (!k) continue;
    const acc =
      vistosPor.get(k) ||
      { completados: 0, dispositivo: null, porVideo: new Map() };
    const v = acc.porVideo.get(view.videoId) || { segundos: 0, duracion: 0 };
    v.segundos = Math.max(v.segundos, view.watchedSeconds);
    v.duracion = Math.max(v.duracion, view.videoDuration || 0);
    acc.porVideo.set(view.videoId, v);
    acc.dispositivo = view.deviceType || acc.dispositivo;
    if (view.completedAt) acc.completados += 1;
    vistosPor.set(k, acc);
  }
  const tituloDeVideo = new Map(videos.map((v) => [v.id, v.title]));

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
    // Se muestra la pieza donde más avanzó, con su nombre: es lo que dice si
    // esta persona vale una invitación.
    const piezasVistas = visto
      ? [...visto.porVideo.entries()]
          .map(([videoId, v]) => ({
            titulo: tituloDeVideo.get(videoId) || "",
            minutos: Math.round(v.segundos / 60),
            porcentaje: v.duracion
              ? Math.min(100, Math.round((v.segundos / v.duracion) * 100))
              : null,
          }))
          .filter((p) => p.minutos > 0)
          .sort((a, b) => (b.porcentaje ?? 0) - (a.porcentaje ?? 0))
      : [];
    const mejor = piezasVistas[0];

    return {
      ...sub,
      minutosVistos: mejor?.minutos || 0,
      // Sin duración conocida no hay porcentaje que valga: mejor nada que un
      // número inventado.
      porcentaje: mejor?.porcentaje ?? null,
      piezaVista: mejor?.titulo || null,
      piezasVistas,
      dispositivo: visto?.dispositivo || null,
      videosCompletados: visto?.completados || 0,
      materiales,
      // Compromiso a ojo de pájaro, con lo que sí sabemos: se registró (1),
      // vio algo (2), terminó algo o bajó material (3).
      compromiso:
        (visto?.completados || 0) > 0 || materiales > 0
          ? 3
          : mejor
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
        // El mapa de calor de la pieza: cuánta gente siguió viendo en cada
        // tramo y cuánta lo repitió. Se fusiona por persona antes de contar,
        // porque quien la abrió veinte veces no son veinte espectadores.
        calor: (() => {
          const suyas = views.filter((v) => v.videoId === video.id);
          if (!suyas.length) return null;

          const porPersona = new Map<string, number[]>();
          for (const v of suyas) {
            if (!v.buckets?.length) continue;
            const k = key(v.email) || v.sessionId;
            const acc = porPersona.get(k) || [];
            for (let i = 0; i < v.buckets.length; i++) {
              acc[i] = Math.max(acc[i] || 0, v.buckets[i] || 0);
            }
            porPersona.set(k, acc);
          }
          if (!porPersona.size) return null;

          const tramos = Math.max(...[...porPersona.values()].map((b) => b.length));
          const audiencia: number[] = [];
          const repeticiones: number[] = [];
          for (let i = 0; i < tramos; i++) {
            let vieron = 0;
            let repitieron = 0;
            for (const b of porPersona.values()) {
              if ((b[i] || 0) > 0) vieron++;
              if ((b[i] || 0) > 1) repitieron++;
            }
            audiencia.push(vieron);
            repeticiones.push(repitieron);
          }
          // El eje tiene que ser el video entero, no hasta donde llegó el que
          // más vio: si no, un video de 75 minutos donde nadie pasó del primero
          // se dibuja como si durara un minuto.
          const bucketSize = suyas[0]?.bucketSize || 15;
          const duracion =
            Math.max(0, ...suyas.map((v) => v.videoDuration || 0)) ||
            (video.duration ? Number(video.duration) * 60 : 0);
          const tramosTotales = duracion
            ? Math.ceil(duracion / bucketSize)
            : tramos;
          while (audiencia.length < tramosTotales) {
            audiencia.push(0);
            repeticiones.push(0);
          }

          return {
            audiencia,
            repeticiones,
            personas: porPersona.size,
            bucketSize,
            duracion: duracion || tramos * bucketSize,
          };
        })(),
        // Cuántos llegaron al reproductor y cuántos le dieron play: entre los
        // dos está la gente que abrió y se fue sin ver nada.
        llegaron: views.filter((v) => v.videoId === video.id).length,
        dieronPlay: views.filter((v) => v.videoId === video.id && v.playedAt).length,
        transcript: (() => {
          const t = transcripts.find((x) => x.videoId === video.id);
          if (!t) return null;
          const caps = Array.isArray(t.chapters) ? t.chapters.length : 0;
          return { source: t.source, capitulos: caps, idioma: t.language };
        })(),
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
    // `index` es el orden puesto a mano y manda sobre todo lo demás.
    if ((a.index ?? 0) !== (b.index ?? 0)) return (a.index ?? 0) - (b.index ?? 0);
    if (a.eventDate && b.eventDate)
      return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
    if (a.eventDate) return -1;
    if (b.eventDate) return 1;
    return 0;
  });

  return {
    course,
    tags,
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
