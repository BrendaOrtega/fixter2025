/**
 * Webinars de venta del taller "Diseño de sistemas agénticos".
 * Datos puros (sin imports de servidor) para poder usarse igual en el
 * componente de la landing, en el action y en los mailSenders.
 */

export type WebinarSlot = {
  /** id estable: se usa como tag del subscriber y como llave de la secuencia */
  id: "2026-08-13" | "2026-08-20" | "2026-08-27";
  /** etiqueta corta para el <select> */
  short: string;
  /** etiqueta completa para correos */
  label: string;
  /**
   * Tema de ESTA fecha. Cada webinar de la serie es distinto, así que el título
   * vive en el slot y no en una constante: cuando era global, la landing y el
   * correo de confirmación anunciaban el del 20 de agosto con el tema del 13.
   */
  title: string;
  /** bajada que acompaña al título en la landing y en los correos */
  subtitle: string;
  /** párrafo de la sección de registro en la landing */
  blurb: string;
  /** lo que se va a ver, en la landing. 3-4 líneas, la última suele ser el regalo */
  bullets: string[];
  /** inicio/fin en formato Google Calendar (hora local CDMX) */
  start: string;
  end: string;
};

export const WEBINAR_SLOTS: WebinarSlot[] = [
  {
    id: "2026-08-13",
    short: "Jueves 13 de agosto · 8:00 PM",
    label: "jueves 13 de agosto a las 8:00 PM (CDMX)",
    title: "Anatomía de un sistema agéntico",
    subtitle: "Construyendo un agente que sobrevive a producción",
    blurb:
      "Desarmamos en vivo las seis piezas que separan un agente que funciona en una demo de uno que aguanta usuarios reales, con sistemas nuestros que hoy corren en producción por dentro. Tres demos sobre un mismo agente y Q&A al final.",
    bullets: [
      "La ecuación: agente = modelo + harness (y por qué el harness es tuyo)",
      "Contexto, ejecución durable, memoria y autenticación",
      "La interfaz: la única pieza que el usuario ve",
      "🎁 Al minuto 30, el PDF de las seis piezas — gratis, compres o no",
    ],
    start: "20260813T200000",
    end: "20260813T210000",
  },
  {
    id: "2026-08-20",
    short: "Jueves 20 de agosto · 8:00 PM",
    label: "jueves 20 de agosto a las 8:00 PM (CDMX)",
    title: "Sandboxing: ¿en qué computadora corre tu agente?",
    subtitle: "Dónde se ejecuta el código que escribe tu agente",
    blurb:
      "Un agente se vuelve potente cuando le das una computadora. La pregunta es cuál, exactamente. Empezamos por un escape real de julio de 2026 y bajamos los cuatro escalones del aislamiento —del devcontainer a Firecracker—, con precios verificados y demos en vivo.",
    bullets: [
      "Por qué aislar y dar permisos resuelven cosas distintas",
      "Los contenedores comparten el kernel del host: qué implica eso",
      "Firecracker, lo que usa AWS Lambda, y qué cuesta cada escalón",
      "Demo: levantar una caja y tratar de salirse de ella",
    ],
    start: "20260820T200000",
    end: "20260820T210000",
  },
  {
    id: "2026-08-27",
    short: "Jueves 27 de agosto · 8:00 PM",
    label: "jueves 27 de agosto a las 8:00 PM (CDMX)",
    // TODO(bliss): falta decidir el tema del tercero. Mientras, el de la serie.
    title: "Diseño de sistemas agénticos",
    subtitle: "Construyendo un agente que sobrevive a producción",
    blurb:
      "Una hora en vivo sobre cómo se construyen los agentes que aguantan usuarios reales, con sistemas nuestros que hoy corren en producción por dentro. Demos sobre un agente de verdad y Q&A al final.",
    bullets: [
      "La ecuación: agente = modelo + harness (y por qué el harness es tuyo)",
      "Contexto, ejecución durable, memoria y autenticación",
      "Demos en vivo sobre un agente real, no slides genéricas",
    ],
    start: "20260827T200000",
    end: "20260827T210000",
  },
];

export const getWebinarSlot = (id?: string | null) =>
  WEBINAR_SLOTS.find((s) => s.id === id);

/**
 * Los webinars a los que todavía se puede uno apuntar. Un webinar deja de estar
 * disponible cuando termina (21:00 CDMX), no cuando empieza.
 *
 * Existe porque el <select> de la landing listaba las tres fechas y arrancaba en la
 * primera: cuatro días después del primer webinar seguía inscribiendo gente a uno que
 * ya había pasado. La fecha se saca de los datos, nunca a mano.
 *
 * Devuelve `[]` cuando ya pasaron todos: quien llama decide qué enseñar entonces
 * (normalmente, la grabación).
 */
export const webinarsDisponibles = (ahora: Date = new Date()) =>
  WEBINAR_SLOTS.filter(
    (s) => new Date(`${s.id}T21:00:00-06:00`).getTime() > ahora.getTime()
  );

/** El siguiente webinar que todavía no ocurre, o `undefined` si ya pasaron todos. */
export const proximoWebinar = (ahora: Date = new Date()) =>
  webinarsDisponibles(ahora)[0];

/** URL estable de la sala: redirige a WEBINAR_ROOM_URL cuando esté lista. */
export const WEBINAR_ROOM_PATH = "https://www.fixtergeek.com/webinar-en-vivo";

export const webinarGcalLink = (slot: WebinarSlot) => {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Webinar FixterGeek — ${slot.title}`,
    dates: `${slot.start}/${slot.end}`,
    ctz: "America/Mexico_City",
    details: `Webinar gratuito de Héctorbliss. Acceso en vivo: ${WEBINAR_ROOM_PATH}`,
    location: WEBINAR_ROOM_PATH,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};
