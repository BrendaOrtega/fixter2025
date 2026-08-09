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
  /** inicio/fin en formato Google Calendar (hora local CDMX) */
  start: string;
  end: string;
};

export const WEBINAR_TITLE = "Por qué tu agente se rompe en producción";

export const WEBINAR_SLOTS: WebinarSlot[] = [
  {
    id: "2026-08-13",
    short: "Jueves 13 de agosto · 8:00 PM",
    label: "jueves 13 de agosto a las 8:00 PM (CDMX)",
    start: "20260813T200000",
    end: "20260813T210000",
  },
  {
    id: "2026-08-20",
    short: "Jueves 20 de agosto · 8:00 PM",
    label: "jueves 20 de agosto a las 8:00 PM (CDMX)",
    start: "20260820T200000",
    end: "20260820T210000",
  },
  {
    id: "2026-08-27",
    short: "Jueves 27 de agosto · 8:00 PM",
    label: "jueves 27 de agosto a las 8:00 PM (CDMX)",
    start: "20260827T200000",
    end: "20260827T210000",
  },
];

export const getWebinarSlot = (id?: string | null) =>
  WEBINAR_SLOTS.find((s) => s.id === id);

/** URL estable de la sala: redirige a WEBINAR_ROOM_URL cuando esté lista. */
export const WEBINAR_ROOM_PATH = "https://www.fixtergeek.com/webinar-en-vivo";

export const webinarGcalLink = (slot: WebinarSlot) => {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Webinar FixterGeek — ${WEBINAR_TITLE}`,
    dates: `${slot.start}/${slot.end}`,
    ctz: "America/Mexico_City",
    details: `Webinar gratuito de Héctorbliss. Acceso en vivo: ${WEBINAR_ROOM_PATH}`,
    location: WEBINAR_ROOM_PATH,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};
