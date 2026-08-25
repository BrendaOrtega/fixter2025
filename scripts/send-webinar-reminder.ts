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

const db = new PrismaClient();

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

const subscribers = await db.subscriber.findMany({
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

console.log(`Slot: ${slot.short}`);
console.log(audiencia ? "Alcance: toda la audiencia del programa" : "Alcance: solo inscritos a esta fecha");
console.log(`Destinatarios: ${subscribers.length}`);
subscribers.forEach((s) => console.log(`  · ${s.email} (${s.name ?? "sin nombre"})`));

if (!send) {
  console.log("\nDry-run. Agrega --send para enviar de verdad.");
  await db.$disconnect();
  process.exit(0);
}

let ok = 0;
for (const sub of subscribers) {
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

console.log(`\nEnviados: ${ok}/${subscribers.length}`);
await db.$disconnect();
