#!/usr/bin/env npx tsx
/**
 * Repara la inscripción de Martín en la secuencia de preparación.
 *
 * Se inscribió con `nitram-210397@hotmail.com` (la dirección que quedó en el
 * PurchaseEvent), pero el acceso al taller vive en `martin.melo.dev.97@gmail.com`.
 * Los correos 1 y 2 se entregaron al hotmail y nunca se abrieron: opened y
 * clicked quedaron vacíos.
 *
 * No se puede renombrar el subscriber del hotmail porque ya existe uno con el
 * gmail y el email es único; en su lugar se reapunta la inscripción al
 * subscriber correcto y se rebobina a cero para que reciba la secuencia
 * completa. Las métricas se limpian: son del envío a la dirección equivocada.
 *
 * Manda correo real a un cliente, así que exige --confirm.
 *
 *   npx tsx --env-file=.env scripts/fix-martin-enrollment.ts --confirm
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const ENROLLMENT_ID = "6a7b56efbe8af6bf856ac0c9";
const GOOD_SUBSCRIBER_ID = "6a79fc09cc2df5561aa4be7f"; // martin.melo.dev.97@gmail.com

async function main() {
  const confirm = process.argv.includes("--confirm");

  const before = await db.sequenceEnrollment.findUnique({
    where: { id: ENROLLMENT_ID },
  });
  const good = await db.subscriber.findUnique({
    where: { id: GOOD_SUBSCRIBER_ID },
  });
  const old = await db.subscriber.findUnique({
    where: { id: before!.subscriberId },
  });

  console.log(`De:    ${old?.email}  (índice ${before?.currentEmailIndex}, ${before?.emailsSent} enviados)`);
  console.log(`A:     ${good?.email}  (confirmado: ${good?.confirmed})`);

  // Que no quede duplicada: si el gmail ya tuviera inscripción en esta secuencia.
  const dupe = await db.sequenceEnrollment.findFirst({
    where: { sequenceId: before!.sequenceId, subscriberId: GOOD_SUBSCRIBER_ID },
  });
  if (dupe) {
    throw new Error(`El gmail ya tiene la inscripción ${dupe.id} en esta secuencia.`);
  }

  if (!confirm) {
    console.log("\n(dry-run) Pasa --confirm para aplicarlo. Al aplicarse, el cron manda el correo 1 en los próximos 5 minutos.");
    return;
  }

  const after = await db.sequenceEnrollment.update({
    where: { id: ENROLLMENT_ID },
    data: {
      subscriberId: GOOD_SUBSCRIBER_ID,
      currentEmailIndex: 0,
      nextEmailAt: new Date(),
      status: "active",
      emailsSent: 0,
      messageIds: [],
      delivered: [],
      opened: [],
      clicked: [],
      bounced: [],
      completedAt: null,
    },
  });

  console.log(
    `\n✅ Inscripción ${after.id} → ${good?.email} · índice ${after.currentEmailIndex} · siguiente envío ${after.nextEmailAt?.toISOString()}`
  );
  console.log("El cron corre cada 5 minutos: el correo 1 sale solo.");
}

main();
