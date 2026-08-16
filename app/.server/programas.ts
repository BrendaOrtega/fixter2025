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
/// desbloquear la grabación con el correo desde el reproductor.
///
/// TODO SIEMPRE por aquí: cualquier cosa que cuente audiencia —admin, correos
/// segmentados, exportaciones— usa esta lista con `hasSome`, nunca
/// `audienceTagFor` a secas. Si aparece una tercera puerta, se agrega aquí y
/// todo lo demás la hereda.
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
        // Se pedía con un sí explícito y no se veía en ningún lado: un permiso
        // que nadie puede consultar es un permiso desperdiciado.
        phone: true,
        whatsappOptIn: true,
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

  // Las compras del programa. Se cruzan por correo porque es la única llave que
  // comparten Stripe y el resto del sitio.
  const purchases = await db.purchaseEvent.findMany({
    where: { productKey: { contains: course.slug } },
    select: { email: true, amountTotal: true, createdAt: true, status: true },
  });

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

  /**
   * El embudo del programa: cuánta gente sobrevive a cada paso.
   *
   * El orden es este porque así funciona el producto: la grabación está detrás
   * del correo, así que nadie ve nada sin dejarlo primero.
   *
   * Cada paso se intersecta con el anterior a propósito. Contar cada uno por su
   * lado daba pasos que crecían —133% del anterior—, porque hay gente que se
   * registró en la landing y nunca abrió el video, y filas viejas con minutos
   * pero sin `playedAt`, que se empezó a guardar el 14 de agosto. Un embudo que
   * crece no es un embudo: es dos métricas distintas puestas en fila.
   *
   * Las definiciones quedan escritas aquí y no se renegocian: un embudo con
   * reglas que cambian no se puede comparar contra sí mismo, que es para lo que
   * existe.
   */
  const compradores = new Set(purchases.map((p) => key(p.email)).filter(Boolean));

  // Todo el que sabemos que existe: quien dejó correo y quien abrió el video sin
  // dejarlo. Los anónimos caen en el segundo paso, que es justo lo que se quiere
  // ver.
  const alcanzados = new Set<string>([
    ...subscribers.map((sub) => key(sub.email)),
    ...views.map((v) => key(v.email) || v.sessionId),
  ]);

  const conCorreo = new Set(subscribers.map((sub) => key(sub.email)));

  // El <video> marca el play aunque el drawer esté encima, así que un play de
  // cero segundos no es nadie viendo. Vale el `playedAt` o los segundos, porque
  // las filas anteriores al 14 de agosto no tienen lo primero.
  const vieron = new Set(
    views.filter((v) => v.watchedSeconds >= 5)
      .map((v) => key(v.email) || v.sessionId),
  );

  // Se quedó = una cuarta parte de la pieza. Por debajo de eso vio la intro.
  const seQuedaron = new Set(
    views.filter((v) => v.videoDuration && v.watchedSeconds / v.videoDuration >= 0.25)
      .map((v) => key(v.email) || v.sessionId),
  );

  const conMaterial = new Set([...materialesPor.keys()]);

  // La compra NO va como último eslabón de la cadena: a este producto se entra
  // también por la landing, y de hecho quien compró hasta hoy nunca abrió la
  // grabación. Colgarla del último paso la habría mostrado como cero. Va aparte,
  // con el dato que sí dice algo: cuántos de los que compraron venían de ver.
  //
  // El material tampoco es un eslabón: es una señal lateral, no un requisito
  // para comprar.
  const pasos: { paso: string; gente: Set<string> }[] = [
    { paso: "Alcanzados", gente: alcanzados },
    { paso: "Dejaron su correo", gente: conCorreo },
    { paso: "Vieron algo", gente: vieron },
    { paso: "Se quedaron (25% o más)", gente: seQuedaron },
  ];

  let anterior: Set<string> | null = null;
  const embudo = pasos.map(({ paso, gente }) => {
    const vivos = anterior
      ? new Set([...gente].filter((k) => anterior!.has(k)))
      : new Set(gente);
    const respectoAlAnterior =
      anterior && anterior.size ? Math.round((vivos.size / anterior.size) * 100) : null;
    anterior = vivos;
    return { paso, personas: vivos.size, respectoAlAnterior, fuera: false };
  });

  // La compra se muestra al final de la misma lista, pero medida contra quien
  // dejó su correo y no contra el último paso: a la landing del taller se llega
  // sin ver la grabación. Va marcada como fuera del camino para que nadie lea
  // ese porcentaje como si fuera la continuación del embudo.
  embudo.push({
    paso: "Compraron",
    personas: compradores.size,
    respectoAlAnterior: conCorreo.size
      ? Math.round((compradores.size / conCorreo.size) * 100)
      : null,
    fuera: true,
  });

  /**
   * El mismo embudo, cortado por canal. Contesta la pregunta que importa: qué
   * canal trae gente que se queda, no solo gente que entra.
   *
   * Se cuentan las dos señales por separado —el UTM y lo que la persona
   * contestó— porque miden cosas distintas: el UTM ve lo etiquetado, la
   * respuesta ve los mensajes privados y el boca a boca. Donde no coinciden
   * está el punto ciego.
   */
  const porCanal = (campo: "firstSource" | "selfReportedSource") => {
    const cubos = new Map<string, { registrados: number; vieron: number; compraron: number }>();
    for (const sub of subscribers) {
      const canal = (sub as any)[campo] || "sin dato";
      const cubo = cubos.get(canal) || { registrados: 0, vieron: 0, compraron: 0 };
      cubo.registrados++;
      if (seQuedaron.has(key(sub.email))) cubo.vieron++;
      if (compradores.has(key(sub.email))) cubo.compraron++;
      cubos.set(canal, cubo);
    }
    return [...cubos.entries()]
      .map(([canal, datos]) => ({ canal, ...datos }))
      .sort((a, b) => b.registrados - a.registrados);
  };

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
    embudo,
    canales: { medido: porCanal("firstSource"), preguntado: porCanal("selfReportedSource") },
    ventas: {
      total: compradores.size,
      ingreso: purchases.reduce((sum, p) => sum + (p.amountTotal || 0), 0),
      // De los que compraron, cuántos habían visto la grabación. Es lo que dice
      // si el webinar está vendiendo o si vende otra cosa.
      queVieron: [...compradores].filter((k) => seQuedaron.has(k)).length,
    },
    materiales: {
      abrieron: [...conMaterial].filter((k) => conCorreo.has(k)).length,
    },
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
