/**
 * Crea una secuencia de recordatorios por cada fecha de webinar (13, 20 y 27
 * de agosto 2026). Cada una manda 3 correos con fecha fija:
 *   1. Día anterior 10:00 AM  — "mañana nos vemos"
 *   2. Día del webinar 4:00 PM — "hoy a las 8, aquí está el link"
 *   3. Día siguiente 10:00 AM — grabación + oferta del taller
 *
 * Idempotente por nombre. Correr con:
 *   npx tsx --env-file=.env scripts/create-webinar-sequences.ts
 */
import { db } from "../app/.server/db";
import { wrapEmailHtml, emailButton } from "../app/utils/emailShell";
import {
  WEBINAR_SLOTS,
  WEBINAR_TITLE,
  WEBINAR_ROOM_PATH,
  type WebinarSlot,
} from "../app/utils/webinarDates";

const LANDING = "https://www.fixtergeek.com/sistemas-agenticos";
const whats = `<p style="color:#64748B;font-size:14px;margin:24px 0 8px 0;">¿Dudas? Escríbeme por <a href="https://wa.me/527712412825" style="color:#37AB93;">WhatsApp</a>.</p>`;
const firma = `<p style="color:#19262A;margin:16px 0 4px 0;">Abrazo. bliss.</p>`;

// Fechas en UTC. CDMX es UTC-6 fijo (sin horario de verano desde 2022).
const at = (isoDay: string, utcHour: number) =>
  new Date(`${isoDay}T${String(utcHour).padStart(2, "0")}:00:00Z`);

const dayBefore = (id: string) => {
  const d = new Date(`${id}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};
const dayAfter = (id: string) => {
  const d = new Date(`${id}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

const emailsFor = (slot: WebinarSlot) => [
  {
    order: 1,
    specificDate: at(dayBefore(slot.id), 16), // 10:00 AM CDMX
    subject: `Mañana: ${WEBINAR_TITLE}`,
    content: wrapEmailHtml(
      `
<h1 style="font-size:24px;margin:0 0 12px 0;color:#19262A;">Mañana nos vemos 👋</h1>
<p style="margin:0 0 16px 0;">Te espero mañana <strong>${slot.label}</strong> en el webinar <strong>${WEBINAR_TITLE}</strong>. Dura una hora.</p>
<p style="margin:0 0 8px 0;color:#475569;">Voy a enseñarte, en vivo, un agente que funciona perfecto y luego se rompe con un usuario real — y las piezas que le faltan para no romperse. Nada de slides genéricas: sistemas que hoy tenemos corriendo en producción.</p>
<div style="margin:16px 0 24px 0;">${emailButton("Guardar el link de la sala", WEBINAR_ROOM_PATH)}</div>
<p style="margin:0 0 8px 0;color:#475569;">Trae tu pregunta — la última parte es puro Q&amp;A.</p>
${whats}
${firma}`,
      { preheader: `Mañana ${slot.short} — una hora, en vivo, con Q&A al final.` }
    ),
  },
  {
    order: 2,
    specificDate: at(slot.id, 22), // 4:00 PM CDMX, 4 horas antes
    subject: `Hoy a las 8:00 PM — aquí está tu link`,
    content: wrapEmailHtml(
      `
<h1 style="font-size:24px;margin:0 0 12px 0;color:#19262A;">Hoy a las 8:00 PM 🔴</h1>
<p style="margin:0 0 16px 0;">En unas horas arrancamos. La sala abre 10 minutos antes:</p>
<div style="margin:0 0 24px 0;">${emailButton("Entrar al webinar", WEBINAR_ROOM_PATH)}</div>
<p style="margin:0 0 8px 0;color:#475569;">Se ve mejor desde computadora (vamos a leer código). Si te lo pierdes, respóndeme a este correo y te mando la grabación.</p>
${whats}
${firma}`,
      { preheader: "La sala abre 10 minutos antes. Guarda este link." }
    ),
  },
  {
    order: 3,
    specificDate: at(dayAfter(slot.id), 16), // 10:00 AM CDMX del día siguiente
    subject: "La grabación + tu lugar en el taller",
    content: wrapEmailHtml(
      `
<h1 style="font-size:24px;margin:0 0 12px 0;color:#19262A;">Gracias por venir 🙌</h1>
<p style="margin:0 0 16px 0;">Si te lo perdiste o quieres repasarlo, respóndeme a este correo y te paso la grabación del webinar.</p>
<p style="margin:0 0 16px 0;color:#475569;">Lo que vimos ayer es el mapa. El taller es donde lo construyes tú: <strong>Diseño de sistemas agénticos</strong>, 2 semanas intensivas (martes y jueves, del 1 al 10 de septiembre, 8:00 PM), para terminar con tu agente personal production-ready — harness, memoria, checkpoints, aprobación humana y una interfaz agent-native.</p>
<p style="margin:0 0 16px 0;color:#475569;">Incluye la UI inicial desde la primera sesión, GhostyCode y todos los tokens de DeepSeek v4 Pro que vas a necesitar. Precio de primera edición: <strong>$2,490 MXN</strong> — en siguientes ediciones sube a $3,490.</p>
<div style="margin:0 0 24px 0;">${emailButton("Ver el taller y apartar mi lugar", LANDING)}</div>
<p style="margin:0 0 8px 0;color:#475569;">El cupo es limitado porque las sesiones son en vivo y trabajamos el código de cada quien.</p>
${whats}
${firma}`,
      { preheader: "¿Te lo perdiste? Te paso la grabación — y el taller arranca el 1 de septiembre." }
    ),
  },
];

async function main() {
  const ids: Record<string, string> = {};

  for (const slot of WEBINAR_SLOTS) {
    const name = `Webinar Sistemas Agénticos — ${slot.short}`;
    const existing = await db.sequence.findFirst({ where: { name } });
    if (existing) {
      ids[slot.id] = existing.id;
      console.log(`ya existía  ${slot.id} → ${existing.id}`);
      continue;
    }

    const sequence = await db.sequence.create({
      data: {
        name,
        description: `Recordatorios del webinar del ${slot.short}. Inscripción automática desde el form de /sistemas-agenticos#webinar.`,
        trigger: "MANUAL",
        isActive: true,
        isFeatured: false,
        emails: {
          create: emailsFor(slot).map((e) => ({
            order: e.order,
            schedulingType: "specific_date",
            specificDate: e.specificDate,
            subject: e.subject,
            content: e.content,
            fromName: "FixterGeek",
            fromEmail: "secuencias@fixtergeek.com",
          })),
        },
      },
    });
    ids[slot.id] = sequence.id;
    console.log(`creada      ${slot.id} → ${sequence.id}`);
  }

  console.log("\nWEBINAR_SEQUENCES =", JSON.stringify(ids, null, 2));
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error(e);
    db.$disconnect();
    process.exit(1);
  });
