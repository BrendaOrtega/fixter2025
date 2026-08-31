/**
 * Recordatorio + link de acceso para los inscritos a un slot del webinar
 * "Anatomía de un sistema agéntico".
 *
 * Uso:
 *   npx tsx --env-file=.env scripts/send-webinar-reminder.ts            # dry-run del slot de hoy
 *   npx tsx --env-file=.env scripts/send-webinar-reminder.ts --send
 *   npx tsx --env-file=.env scripts/send-webinar-reminder.ts --slot 2026-08-20 --send
 *   npx tsx --env-file=.env scripts/send-webinar-reminder.ts --only tu@correo.com --send
 *   npx tsx --env-file=.env scripts/send-webinar-reminder.ts --audiencia --send   # todo el programa
 */
import { PrismaClient } from "@prisma/client";
import { sendSistemasWebinarReminder } from "../app/mailSenders/sendSistemasWebinarReminder";
import { getWebinarSlot, WEBINAR_SLOTS } from "../app/utils/webinarDates";
import { audienceTagsFor } from "../app/.server/programas";
import { checkSignupEmail } from "../app/.server/anti-bot";

const db = new PrismaClient();

/** Las cuentas de prueba de bliss no cuentan como audiencia. */
const esCuentaPropia = (email: string) =>
  /^fixtergeek\+/i.test(email) || CUENTAS_PROPIAS.has(email.toLowerCase());

const CUENTAS_PROPIAS = new Set([
  "fixtergeek@gmail.com",
  "blissitos@gmail.com",
  "contacto@fixter.org",
  "brenda@fixter.org",
]);

const arg = (flag: string) => {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : undefined;
};

const send = process.argv.includes("--send");
/**
 * Por defecto solo se avisa a quien eligió ESTA fecha. Con --audiencia va a todo
 * el programa: quien se apuntó a cualquier webinar de la serie y quien entró por
 * la grabación. Son las dos puertas de `audienceTagsFor`, con `hasSome` — contar
 * con un solo tag deja fuera a media lista.
 */
const audiencia = process.argv.includes("--audiencia");
/**
 * Suma a los suscritos al newsletter general. Sólo los CONFIRMADOS: el newsletter
 * es doble opt-in y quien no confirmó nunca dijo que sí — mandarle es lo que
 * ensucia la reputación del dominio en SES.
 */
const newsletter = process.argv.includes("--newsletter");
/**
 * Todo el que haya confirmado, con cualquier tag: los de otros cursos
 * (`pong-course`, `aisdk-waitlist`) y las listas de espera. Es el alcance máximo
 * de la base; sólo confirmados, por lo mismo que en `--newsletter`.
 */
const todos = process.argv.includes("--todos");
const only = arg("--only");
const slotId =
  arg("--slot") ??
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
  }).format(new Date());

const slot = getWebinarSlot(slotId);
if (!slot) {
  console.error(
    `No hay slot "${slotId}". Slots válidos: ${WEBINAR_SLOTS.map((s) => s.id).join(", ")}`
  );
  process.exit(1);
}

const subscribers: Array<{ email: string; name: string | null }> = await db.subscriber.findMany({
  where: {
    ...(audiencia
      ? { tags: { hasSome: audienceTagsFor("sistemas-agenticos") } }
      : {
          tags: { hasEvery: ["webinar-sistemas-agenticos", `webinar-${slot.id}`] },
        }),
    ...(only ? { email: only } : {}),
  },
  select: { email: true, name: true },
  orderBy: { createdAt: "asc" },
});

if ((newsletter || todos) && !only) {
  const yaEstan = new Set(subscribers.map((s) => s.email.toLowerCase()));
  const delNewsletter = await db.subscriber.findMany({
    where: { ...(todos ? {} : { tags: { has: "newsletter" } }), confirmed: true },
    select: { email: true, name: true },
    orderBy: { createdAt: "asc" },
  });
  for (const s of delNewsletter) {
    if (!yaEstan.has(s.email.toLowerCase())) subscribers.push(s);
  }
}

// Se filtra DESPUES de consultar para poder decir en pantalla a quién se dejó
// fuera y por qué: un descarte silencioso se lee igual que una lista corta.
const descartados: Array<{ email: string; motivo: string }> = [];
// Con `--only` se pide una dirección a mano — casi siempre la propia, para ver el
// correo recibido antes del envío real. Filtrarla ahí sería no mandar nada.
const destinatarios = subscribers.filter((s) => {
  if (only) return true;
  const { blocked, reason } = checkSignupEmail(s.email, s.name);
  const motivo = blocked
    ? reason === "generated-name"
      ? "alta automatizada"
      : "correo desechable"
    : esCuentaPropia(s.email)
      ? "cuenta propia"
      : null;
  if (motivo) descartados.push({ email: s.email, motivo });
  return !motivo;
});

console.log(`Slot: ${slot.short}`);
console.log(
  (audiencia ? "Alcance: toda la audiencia del programa" : "Alcance: solo inscritos a esta fecha") +
    (todos ? " + TODA la base confirmada" : newsletter ? " + newsletter confirmado" : "")
);
console.log(`Destinatarios: ${destinatarios.length}`);
destinatarios.forEach((s) => console.log(`  · ${s.email} (${s.name ?? "sin nombre"})`));

if (descartados.length) {
  console.log(`\nDescartados: ${descartados.length}`);
  for (const d of descartados) console.log(`  · ${d.email} — ${d.motivo}`);
}

if (!send) {
  console.log("\nDry-run. Agrega --send para enviar de verdad.");
  await db.$disconnect();
  process.exit(0);
}

let ok = 0;
for (const sub of destinatarios) {
  try {
    await sendSistemasWebinarReminder({
      to: sub.email,
      userName: sub.name,
      slot,
    });
    ok++;
  } catch {
    // el mailSender ya loggea el detalle del error
  }
  // SES limita a 14 envíos/segundo; con este volumen sobra, pero no cuesta
  await new Promise((r) => setTimeout(r, 300));
}

console.log(`\nEnviados: ${ok}/${destinatarios.length}`);
await db.$disconnect();
