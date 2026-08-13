#!/usr/bin/env npx tsx
/**
 * Inscribe manualmente a un comprador en la secuencia de preparación.
 *
 * Para los que ya compraron antes de que existiera la secuencia; los nuevos
 * entran solos: la secuencia está listada en el Product `sistemas-agenticos-workshop`
 * y el webhook la inscribe al cumplir la compra (scripts/create-sistemas-product.ts).
 * Esto queda para inscribir a alguien a mano cuando haga falta.
 *
 * Exige --confirm porque manda correo de verdad a un cliente real:
 *
 *   npx tsx --env-file=.env scripts/enroll-preparacion.ts --email x@y.com --confirm
 */
import { PrismaClient } from "@prisma/client";
import { enrollSubscriberInSequence } from "../app/.server/sequences";

const db = new PrismaClient();
const SEQUENCE_NAME = "Taller Sistemas Agénticos — Preparación";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const confirmed = process.argv.includes("--confirm");

  if (!email) {
    console.error("Falta --email <correo>");
    process.exit(1);
  }

  const sequence = await db.sequence.findFirst({
    where: { name: SEQUENCE_NAME },
    include: { emails: { orderBy: { order: "asc" } } },
  });
  if (!sequence) throw new Error(`No existe la secuencia "${SEQUENCE_NAME}"`);

  const subscriber = await db.subscriber.findUnique({ where: { email } });
  if (!subscriber) throw new Error(`No existe el subscriber ${email}`);

  const already = await db.sequenceEnrollment.findUnique({
    where: {
      sequenceId_subscriberId: {
        sequenceId: sequence.id,
        subscriberId: subscriber.id,
      },
    },
  });
  if (already) {
    console.log(`ℹ️  ${email} ya está inscrito (status: ${already.status})`);
    return;
  }

  if (!confirmed) {
    console.log(`Se inscribiría a ${email} en "${sequence.name}"`);
    console.log(`   ${sequence.emails.length} correo(s); el primero sale ya.`);
    console.log(`\n   Agrega --confirm para hacerlo de verdad.`);
    return;
  }

  await enrollSubscriberInSequence(sequence.id, subscriber.id, {
    immediate: true,
  });
  console.log(`✅ ${email} inscrito. Sale en el siguiente ciclo del cron.`);
}

main()
  .catch((error) => {
    console.error("❌", error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
