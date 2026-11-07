// Academia Ghosty (/academia): catálogo de cursos gratis en video.
// Es la ÚNICA fuente de datos de la academia: las tres rutas, el sitemap y el JSON-LD leen de aquí.
// Para sumar o reemplazar una lección: sube el MP4 y su póster a `img.ghosty.studio/academia/`
// (bucket `ghosty-public`, llave `<nombre>-<sha256 corto>.<ext>`) y llena `video` y `music`.
// Una lección sin `video` sale como «Próximamente» y no enlaza a ningún reproductor.
// Regla: ningún precio de planes ni de Meta en estos textos.

export type LessonVideo = {
  src: string;
  poster: string;
  /** Duración en segundos (alimenta la etiqueta «1 min» y el JSON-LD). */
  seconds: number;
};

export type MusicCredit = { title: string; author: string; url: string };

export type Lesson = {
  n: number;
  slug: string;
  title: string;
  summary: string;
  video?: LessonVideo;
  music?: MusicCredit;
};

export type CourseSection = { title: string; lessons: Lesson[] };

export type Course = {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  /** Imagen 16:9 del curso (la misma de Udemy). */
  image: string;
  imageAlt: string;
  level: string;
  /** Liga a Udemy; vacía mientras el curso sea borrador (se oculta). */
  udemyUrl: string;
  kit?: { url: string; label: string; contents: string[] };
  published: string;
  sections: CourseSection[];
};

/** Cursos que todavía no tienen página: tarjeta apagada en la portada. */
export type UpcomingCourse = { title: string; tagline: string };

const LICENSE = "CC BY 3.0";
export const LICENSE_URL = "https://creativecommons.org/licenses/by/3.0/";
export { LICENSE as MUSIC_LICENSE };

const whatsapp: Course = {
  slug: "agente-de-ia-que-vende-por-whatsapp",
  title: "Crea tu agente de IA que vende por WhatsApp, sin programar",
  tagline:
    "Arma un agente de ventas en Ghosty Studio, conéctalo a WhatsApp, a tu sitio web y a Messenger, y dale seguimiento a cada venta.",
  description:
    "26 lecciones de poco más de un minuto. Construyes el agente de Químicos Valdora, una distribuidora de químicos para productos de limpieza inventada para el curso: le enseñas el negocio, lo conectas a tu número de WhatsApp y a tu sitio, y sigues cada cotización en el tablero de Ghosty Ventas.",
  image: "https://img.ghosty.studio/academia/curso-whatsapp-portada-cfaf18a1d3.jpg",
  imageAlt: "Ghosty junto a un teléfono con mensajes de WhatsApp y Héctor señalándolo",
  level: "Para dueños de negocio · sin programar",
  udemyUrl: "",
  kit: {
    url: "https://img.ghosty.studio/academia/kit-del-curso-8cc484aa44.zip",
    label: "Descarga el kit del curso",
    contents: [
      "Instrucciones del agente listas para pegar",
      "Catálogo de Químicos Valdora (PDF)",
      "Hoja de seguridad de ejemplo (PDF)",
      "Cotización de ejemplo (PDF)",
      "Contactos de ejemplo (CSV)",
    ],
  },
  published: "2026-11-06",
  sections: [
    {
      title: "Tu agente contesta su primer mensaje",
      lessons: [
        {
          n: 1,
          slug: "que-vas-a-construir",
          title: "Qué vas a construir en este curso",
          summary:
            "Conoces el recorrido completo con Químicos Valdora, la distribuidora de químicos del curso. Ves cómo Ghosty Studio arma al agente, lo conecta a WhatsApp, a la web y a Messenger y le da seguimiento a cada venta desde el navegador. Al terminar, el siguiente mensaje que llegue a tu negocio lo contesta tu agente al momento.",
        },
        {
          n: 2,
          slug: "abre-tu-espacio",
          title: "Abre tu espacio en Ghosty Studio con la prueba de 30 días",
          summary:
            "Creas tu cuenta, le pones nombre a tu negocio y Ghosty Studio abre tu espacio con 30 días de prueba. Desde el primer día tienes a MiniGhosty, un agente que ya contesta en el chat. El calendario de la prueba empieza a correr ese mismo día.",
        },
        {
          n: 3,
          slug: "agente-desde-plantilla",
          title: "Crea tu agente desde una plantilla y pruébalo en el chat",
          summary:
            "Conviertes a MiniGhosty en el agente de ventas de tu negocio: le cambias el nombre y pegas en Instrucciones el texto de la plantilla «Ventas por WhatsApp». Después lo pruebas en la Vista previa de su ficha, como un cliente que pregunta a cómo está el texapón.",
        },
      ],
    },
    {
      title: "Enséñale el negocio a tu agente",
      lessons: [
        {
          n: 4,
          slug: "instrucciones",
          title: "Las instrucciones: quién es tu agente, qué vende y cómo atiende",
          summary:
            "Las Instrucciones son la hoja que tu agente lee antes de cada respuesta: quién es, qué vende, en qué horario atiende y cómo trata al cliente. Las editas por secciones, como le explicarías el negocio a un vendedor nuevo. En la sección «Qué NO haces» le prohíbes recomendar mezclas de químicos y lo mandas a la hoja de seguridad.",
        },
        {
          n: 5,
          slug: "productos-precios-faq",
          title: "Productos, precios y preguntas frecuentes",
          summary:
            "Decides dónde vive cada dato. Los productos de siempre van en Instrucciones con su presentación; el catálogo largo, las hojas de seguridad y las fórmulas se suben en Documentos. Las preguntas frecuentes van en Instrucciones con la respuesta que daría el dueño.",
        },
        {
          n: 6,
          slug: "herramientas-cotizaciones-agenda-cobros",
          title: "Dale herramientas: cotizaciones en PDF, agenda y cobros",
          summary:
            "Le das a tu agente herramientas para hacer trabajo de verdad. Cotizar en PDF viene incluido con el tablero de Ghosty Ventas; la agenda y los cobros se encienden en Conectores. Cada herramienta se puede apagar por canal.",
        },
        {
          n: 7,
          slug: "prueba-y-corrige-respuestas",
          title: "Prueba con conversaciones reales y corrige respuestas",
          summary:
            "Pruebas al agente en la Vista previa con preguntas reales copiadas de tu WhatsApp. Si da un precio equivocado, lo corriges en Instrucciones, y las reglas cortas las guardas en Memoria. Cuando un cliente de verdad pregunte por un tambo de hipoclorito, el agente contesta con el precio de tu lista.",
        },
      ],
    },
    {
      title: "Conecta tu agente a WhatsApp, web y Messenger",
      lessons: [
        {
          n: 8,
          slug: "chat-en-tu-sitio-web",
          title: "Pon el chat del agente en tu sitio web",
          summary:
            "Configuras el Widget web desde Canales y lo enciendes para tu sitio. El chat sólo carga en los dominios que tú autorizas y cada conversación entra a Ghosty Ventas. El visitante que ve un producto le pregunta el precio al agente y aparta su pedido ahí mismo.",
        },
        {
          n: 9,
          slug: "conecta-whatsapp-business",
          title: "Conecta WhatsApp Business desde Ghosty Ventas",
          summary:
            "Conectas tu número de WhatsApp Business una vez por espacio, desde Ghosty Ventas y con la ventana oficial de Meta. Puedes usar el número de siempre. El número queda conectado con la respuesta automática apagada y sus mensajes empiezan a caer en el tablero.",
        },
        {
          n: 10,
          slug: "enciende-respuesta-automatica",
          title: "Enciende la respuesta automática del número",
          summary:
            "Con el número ya conectado, en Canales del agente decides qué número contesta y a quién no le responde. Enciendes la respuesta automática y el siguiente cliente que escriba por primera vez recibe respuesta al momento.",
        },
      ],
    },
    {
      title: "Da seguimiento a las ventas",
      lessons: [
        {
          n: 11,
          slug: "tablero-ghosty-ventas",
          title: "El tablero de Ghosty Ventas",
          summary:
            "Cada conversación del agente es una tarjeta en el tablero de Ghosty Ventas. Abres la tarjeta, lees la plática, ves lo que hizo el agente y la mueves de columna. Al cerrar la semana sabes cuántos clientes pidieron precio y cuántos ya compraron.",
        },
        {
          n: 12,
          slug: "pausa-y-contesta-tu",
          title: "Pausa al agente y contesta tú",
          summary:
            "Cuando un cliente pide precio especial de mayoreo o quiere hablar con una persona, pausas al agente en esa conversación, por un rato o de forma permanente. Lo que contestas tú queda en el mismo hilo mientras el agente espera.",
        },
        {
          n: 13,
          slug: "seguimiento-de-cotizaciones",
          title: "Seguimiento automático de cotizaciones",
          summary:
            "Cada cotización que manda el agente recibe hasta tres toques de seguimiento por WhatsApp. El agente para solo cuando el cliente contesta o paga, y las cotizaciones de mayoreo dejan de quedarse olvidadas.",
        },
      ],
    },
    {
      title: "Haz crecer tus ventas con Ghosty Studio",
      lessons: [
        {
          n: 14,
          slug: "contactos-y-listas",
          title: "Importa tus contactos y arma listas",
          summary:
            "Juntas en Contactos a los clientes que tenías regados entre tu WhatsApp, una libreta y una hoja de Excel. Con casillas y filtros armas listas, que son las que usarás en tu primera campaña.",
        },
        {
          n: 15,
          slug: "campanas-whatsapp",
          title: "Manda campañas de WhatsApp a tus listas",
          summary:
            "Una campaña es una plantilla aprobada por Meta que mandas a una lista de contactos. Primero la pruebas contigo y luego tú apruebas el envío. Al terminar ves quién recibió el aviso.",
        },
        {
          n: 16,
          slug: "equipo-y-plan",
          title: "Suma a tu equipo y elige tu plan de Ghosty Studio",
          summary:
            "Invitas a tu equipo por correo y decides qué tablero ve cada quien. Cuando el agente pasa una conversación, alguien de tu equipo la toma desde el tablero. Al final eliges el plan de Ghosty Ventas según cuántas conversaciones al mes atiende tu negocio.",
        },
      ],
    },
    {
      title: "Bonus: más herramientas para vender",
      lessons: [
        {
          n: 17,
          slug: "reglas-con-memoria",
          title: "Enséñale reglas nuevas con Memoria",
          summary:
            "Le enseñas a tu agente una regla corta, como que los sábados no hay entregas a domicilio, desde el chat o en la página Memoria. En «Aplica en» decides si vale para todo el agente o para un solo canal. Desde ese momento el agente la aplica con cada cliente.",
        },
        {
          n: 18,
          slug: "precios-google-sheets",
          title: "Conecta tu lista de precios de Google Sheets",
          summary:
            "Conectas Google Drive en Conectores y eliges la hoja de precios que el agente puede leer. Cuando cambias un precio en la hoja, el agente contesta con el precio nuevo. También decides en qué canales la consulta y si puede anotar pedidos en otra hoja.",
        },
        {
          n: 19,
          slug: "link-de-pago-mercado-pago",
          title: "Cobra el anticipo con un link de Mercado Pago",
          summary:
            "Conectas tu cuenta de Mercado Pago con su llave de acceso y el agente manda links de pago en el mismo chat. Cada link queda ligado a la tarjeta del cliente en Ghosty Ventas. Cuando Mercado Pago confirma el pago, la actividad de la tarjeta dice Pagado y el seguimiento de esa cotización se detiene.",
        },
        {
          n: 20,
          slug: "cotiza-envios-rastrea-guia",
          title: "Cotiza envíos por paquetería y rastrea la guía",
          summary:
            "Conectas Skydropx y el agente cotiza envíos con el código postal, el peso y las medidas del paquete. Le pides la guía desde tu chat con el agente y tú apruebas la compra. Cuando el cliente pregunta por su pedido, el agente le dice el estado y el historial del envío.",
        },
        {
          n: 21,
          slug: "conecta-messenger",
          title: "Conecta Messenger",
          summary:
            "En Canales del agente conectas la página de Facebook de tu negocio con la cuenta que la administra. El agente contesta los mensajes de la página y cada conversación cae en el tablero de Ghosty Ventas junto a las de WhatsApp. Messenger sólo deja escribirle a alguien hasta 24 horas después de su último mensaje.",
        },
        {
          n: 22,
          slug: "comentarios-de-anuncios",
          title: "Contesta los comentarios de tus anuncios de Facebook",
          summary:
            "Con tu página conectada, el agente contesta corto en público y manda la respuesta completa por mensaje privado. En Configurar columnas marcas qué etapas del tablero cuentan como Lead calificado y como Venta. Así Meta aprende quién sí te compra y busca gente parecida.",
        },
        {
          n: 23,
          slug: "audios-fotos-y-pdfs",
          title: "Audios, fotos y PDFs de tus clientes",
          summary:
            "Tu agente de WhatsApp transcribe notas de voz, ve fotos si su modelo tiene visión y lee PDFs, aunque sean escaneos. Cada archivo queda en la sección Archivos de la conversación. Con la tarjeta de ElevenLabs en Conectores, el agente también contesta con nota de voz.",
        },
        {
          n: 24,
          slug: "respuestas-rapidas",
          title: "Contesta más rápido con respuestas rápidas",
          summary:
            "Guardas los mensajes que más repites como respuestas rápidas para todo el tablero y los eliges desde el hilo de la conversación. Con «Pedir respuesta al bot» el agente le contesta al cliente siguiendo tu instrucción, también con la conversación en pausa.",
        },
        {
          n: 25,
          slug: "ficha-del-cliente",
          title: "La ficha del cliente: lo que tu agente anota",
          summary:
            "Cada tarjeta de Ghosty Ventas trae la ficha del cliente, con el giro, la ciudad, el RFC y la dirección de entrega que el cliente le dijo al agente. Tú agregas etiquetas, eliges al encargado y revisas sus órdenes. Con «Agregar lead» das de alta a quien llega por teléfono o al mostrador.",
        },
        {
          n: 26,
          slug: "recorrido-completo",
          title: "Bonus: recorrido completo, de la primera pregunta al pago",
          summary:
            "Sigues un pedido de punta a punta: Limpieza Express pregunta por un tambo de hipoclorito a las diez de la noche y el agente lo cotiza en PDF. Ves la tarjeta en el tablero, el seguimiento, el cobro con Mercado Pago, el paso a una persona y la siguiente campaña de WhatsApp.",
        },
      ],
    },
  ],
};

// Video, póster y crédito musical (CC BY pide crédito) por número de lección.
// Una lección nueva: agrega su renglón aquí cuando su MP4 esté en img.ghosty.studio.
const MEDIA_BY_LESSON: Record<number, { video: LessonVideo; music: MusicCredit }> = {
  1: {
    video: { src: "https://img.ghosty.studio/academia/l01-f5592f5dd9.mp4", poster: "https://img.ghosty.studio/academia/l01-poster-69fb087a12.jpg", seconds: 65 },
    music: { title: "LESAT Theme", author: "Daniel Bautista", url: "https://www.jamendo.com/track/1501647" },
  },
  2: {
    video: { src: "https://img.ghosty.studio/academia/l02-39b5672d28.mp4", poster: "https://img.ghosty.studio/academia/l02-poster-a029c68a52.jpg", seconds: 69 },
    music: { title: "Uplifting Corporate", author: "Soundrider/Dope", url: "https://www.jamendo.com/track/1670597" },
  },
  3: {
    video: { src: "https://img.ghosty.studio/academia/l03-7af2fdd65b.mp4", poster: "https://img.ghosty.studio/academia/l03-poster-935aa1b92d.jpg", seconds: 83 },
    music: { title: "The Corporate Upbeat", author: "Soundrider/Dope", url: "https://www.jamendo.com/track/1670594" },
  },
  4: {
    video: { src: "https://img.ghosty.studio/academia/l04-a13b149def.mp4", poster: "https://img.ghosty.studio/academia/l04-poster-5230561bb1.jpg", seconds: 86 },
    music: { title: "Jaunt [Jazz]", author: "Hardcore Scm", url: "https://www.jamendo.com/track/1348205" },
  },
  5: {
    video: { src: "https://img.ghosty.studio/academia/l05-353edd9904.mp4", poster: "https://img.ghosty.studio/academia/l05-poster-8cb4b03699.jpg", seconds: 84 },
    music: { title: "Be Happy", author: "Tioben Neenot", url: "https://www.jamendo.com/track/1732250" },
  },
  6: {
    video: { src: "https://img.ghosty.studio/academia/l06-81b4115bc6.mp4", poster: "https://img.ghosty.studio/academia/l06-poster-d1ccafd4e9.jpg", seconds: 83 },
    music: { title: "Fresh Flowers in a Vase", author: "Helen Langfort", url: "https://www.jamendo.com/track/2327679" },
  },
  7: {
    video: { src: "https://img.ghosty.studio/academia/l07-29f648c040.mp4", poster: "https://img.ghosty.studio/academia/l07-poster-c42ae8a161.jpg", seconds: 82 },
    music: { title: "Morning Light in My Kitchen", author: "Helen Langfort", url: "https://www.jamendo.com/track/2327677" },
  },
  8: {
    video: { src: "https://img.ghosty.studio/academia/l08-7e5316747c.mp4", poster: "https://img.ghosty.studio/academia/l08-poster-0c1dee30c7.jpg", seconds: 76 },
    music: { title: "New Hope", author: "Milestep", url: "https://www.jamendo.com/track/1842817" },
  },
  9: {
    video: { src: "https://img.ghosty.studio/academia/l09-0002503b2a.mp4", poster: "https://img.ghosty.studio/academia/l09-poster-15bb750e27.jpg", seconds: 77 },
    music: { title: "Lost and Found (Instrumental)", author: "VITNE", url: "https://www.jamendo.com/track/1419658" },
  },
  10: {
    video: { src: "https://img.ghosty.studio/academia/l10-aa8acb53b8.mp4", poster: "https://img.ghosty.studio/academia/l10-poster-a69bfbce6a.jpg", seconds: 67 },
    music: { title: "Pop dawn", author: "PequenasAlegrias", url: "https://www.jamendo.com/track/1213980" },
  },
  11: {
    video: { src: "https://img.ghosty.studio/academia/l11-d6ab7f08e7.mp4", poster: "https://img.ghosty.studio/academia/l11-poster-90b0471cfc.jpg", seconds: 61 },
    music: { title: "Guitar variation 2(remastered)", author: "Blik", url: "https://www.jamendo.com/track/497843" },
  },
  12: {
    video: { src: "https://img.ghosty.studio/academia/l12-d33af62fb1.mp4", poster: "https://img.ghosty.studio/academia/l12-poster-1416c66750.jpg", seconds: 60 },
    music: { title: "Positive Backgroundl", author: "Soundrider/Dope", url: "https://www.jamendo.com/track/1671032" },
  },
  13: {
    video: { src: "https://img.ghosty.studio/academia/l13-f423f7f03e.mp4", poster: "https://img.ghosty.studio/academia/l13-poster-745f463642.jpg", seconds: 69 },
    music: { title: "Upbeat Lounge Background", author: "Soundrider/Dope", url: "https://www.jamendo.com/track/1670563" },
  },
  14: {
    video: { src: "https://img.ghosty.studio/academia/l14-1a83fc0cc2.mp4", poster: "https://img.ghosty.studio/academia/l14-poster-d640012653.jpg", seconds: 70 },
    music: { title: "Lucky Acoustic", author: "Jesse Keller", url: "https://www.jamendo.com/track/1540859" },
  },
  15: {
    video: { src: "https://img.ghosty.studio/academia/l15-92d6376c81.mp4", poster: "https://img.ghosty.studio/academia/l15-poster-22ee162582.jpg", seconds: 60 },
    music: { title: "The Bottom (Instrumental)", author: "Josh Woodward (Instrumental Versions)", url: "https://www.jamendo.com/track/625683" },
  },
  16: {
    video: { src: "https://img.ghosty.studio/academia/l16-8be8d36fbc.mp4", poster: "https://img.ghosty.studio/academia/l16-poster-e8d759d31e.jpg", seconds: 58 },
    music: { title: "Walking and Smiling", author: "Helen Langfort", url: "https://www.jamendo.com/track/2327678" },
  },
  17: {
    video: { src: "https://img.ghosty.studio/academia/l17-d1389b775c.mp4", poster: "https://img.ghosty.studio/academia/l17-poster-a82b1b0b9a.jpg", seconds: 86 },
    music: { title: "Saturday (Instrumental)", author: "Josh Woodward (Instrumental Versions)", url: "https://www.jamendo.com/track/625679" },
  },
  18: {
    video: { src: "https://img.ghosty.studio/academia/l18-2e2f318a8e.mp4", poster: "https://img.ghosty.studio/academia/l18-poster-4d03cc2e86.jpg", seconds: 81 },
    music: { title: "Trip Around The World - FREE MUSIC", author: "ANtarcticbreeze", url: "https://www.jamendo.com/track/1210830" },
  },
  19: {
    video: { src: "https://img.ghosty.studio/academia/l19-8dfca644f8.mp4", poster: "https://img.ghosty.studio/academia/l19-poster-c27303a52b.jpg", seconds: 81 },
    music: { title: "Super Power Pop Rock", author: "Kara Square", url: "https://www.jamendo.com/track/1163228" },
  },
  20: {
    video: { src: "https://img.ghosty.studio/academia/l20-04e55a87a9.mp4", poster: "https://img.ghosty.studio/academia/l20-poster-4cb96ae238.jpg", seconds: 82 },
    music: { title: "Universal folk", author: "Kreaten", url: "https://www.jamendo.com/track/695463" },
  },
  21: {
    video: { src: "https://img.ghosty.studio/academia/l21-e184155e71.mp4", poster: "https://img.ghosty.studio/academia/l21-poster-98030f9c5f.jpg", seconds: 78 },
    music: { title: "Ballast", author: "Blue Dot Sessions", url: "https://www.jamendo.com/track/1366268" },
  },
  22: {
    video: { src: "https://img.ghosty.studio/academia/l22-6674fda28d.mp4", poster: "https://img.ghosty.studio/academia/l22-poster-39196e5017.jpg", seconds: 78 },
    music: { title: "BARCELONA (acoustic)", author: "Bane Djakovic", url: "https://www.jamendo.com/track/994896" },
  },
  23: {
    video: { src: "https://img.ghosty.studio/academia/l23-6eea97eca9.mp4", poster: "https://img.ghosty.studio/academia/l23-poster-2a8e1ce6ff.jpg", seconds: 83 },
    music: { title: "Acoustic-A", author: "EVIDENCE", url: "https://www.jamendo.com/track/546754" },
  },
  24: {
    video: { src: "https://img.ghosty.studio/academia/l24-25eedd483c.mp4", poster: "https://img.ghosty.studio/academia/l24-poster-8087f8f973.jpg", seconds: 79 },
    music: { title: "Piano Jams", author: "Razvan Veina", url: "https://www.jamendo.com/track/1275148" },
  },
  25: {
    video: { src: "https://img.ghosty.studio/academia/l25-5aeba5b19c.mp4", poster: "https://img.ghosty.studio/academia/l25-poster-f86bab05ac.jpg", seconds: 80 },
    music: { title: "Inspire Motivation", author: "Soundrider/Dope", url: "https://www.jamendo.com/track/1670485" },
  },
  26: {
    video: { src: "https://img.ghosty.studio/academia/l26-f800664ad2.mp4", poster: "https://img.ghosty.studio/academia/l26-poster-186a2f9017.jpg", seconds: 78 },
    music: { title: "guitars mix 1 (master)", author: "Stellar Art Wars Free License", url: "https://www.jamendo.com/track/405774" },
  },
};

for (const s of whatsapp.sections) {
  for (const l of s.lessons) {
    const m = MEDIA_BY_LESSON[l.n];
    if (m) Object.assign(l, m);
  }
}

export const COURSES: Course[] = [whatsapp];

export const UPCOMING: UpcomingCourse[] = [
  {
    title: "Software Factory",
    tagline: "El segundo curso de la serie, en preparación.",
  },
];

// ── Ayudantes ──────────────────────────────────────────────────────────────

export function getCourse(slug: string): Course | undefined {
  return COURSES.find((c) => c.slug === slug);
}

export function allLessons(course: Course): (Lesson & { section: string })[] {
  return course.sections.flatMap((s) => s.lessons.map((l) => ({ ...l, section: s.title })));
}

export function findLesson(course: Course, slug: string) {
  const list = allLessons(course);
  const i = list.findIndex((l) => l.slug === slug);
  if (i < 0) return undefined;
  return { lesson: list[i], prev: list[i - 1], next: list[i + 1], total: list.length };
}

export function courseUrl(course: Course) {
  return `/academia/${course.slug}`;
}

export function lessonUrl(course: Course, lesson: Pick<Lesson, "slug">) {
  return `/academia/${course.slug}/${lesson.slug}`;
}

export function courseStats(course: Course) {
  const list = allLessons(course);
  const ready = list.filter((l) => l.video);
  const seconds = ready.reduce((t, l) => t + (l.video?.seconds ?? 0), 0);
  return { lessons: list.length, ready: ready.length, minutes: Math.max(1, Math.round(seconds / 60)) };
}

/** «1 min», «2 min»… redondeado hacia arriba a partir de 1:10. */
export function formatMinutes(seconds: number) {
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

/** ISO 8601 (`PT1M5S`) para el JSON-LD de VideoObject. */
export function isoDuration(seconds: number) {
  const s = Math.round(seconds);
  return `PT${Math.floor(s / 60)}M${s % 60}S`;
}
