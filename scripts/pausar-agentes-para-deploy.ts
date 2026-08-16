/**
 * Pausa las inscripciones vencidas de "Introducción a los agentes de IA" para
 * poder desplegar el fix del cron sin que salgan los correos atrasados.
 *
 * NO toca `nextEmailAt`: se conserva vencido a propósito, para que al reanudar
 * el motor los tome en la siguiente pasada (máximo 5 minutos).
 *
 *   npx tsx --env-file=.env scripts/pausar-agentes-para-deploy.ts          → pausa
 *   npx tsx --env-file=.env scripts/pausar-agentes-para-deploy.ts --reanudar → reanuda
 */
import { db } from "../app/.server/db";

const SEQ = "6a7df909e5a1dfc09e842fd3";
const reanudar = process.argv.includes("--reanudar");

async function main() {
  if (reanudar) {
    const pausadas = await db.sequenceEnrollment.findMany({
      where: { sequenceId: SEQ, status: "paused" },
      include: { subscriber: true },
    });
    for (const e of pausadas) {
      await db.sequenceEnrollment.update({
        where: { id: e.id },
        data: { status: "active" },
      });
      console.log(
        `▶️  ${e.subscriber.email} — le toca la entrega ${e.currentEmailIndex + 1}`
      );
    }
    return console.log(`\n${pausadas.length} inscripción(es) → active.`);
  }

  // 1. Las vencidas que aún no reciben nada: se pausan con su fecha intacta.
  const activas = await db.sequenceEnrollment.findMany({
    where: { sequenceId: SEQ, status: "active" },
    include: { subscriber: true },
  });
  for (const e of activas) {
    await db.sequenceEnrollment.update({
      where: { id: e.id },
      data: { status: "paused" }, // nextEmailAt intacto
    });
    console.log(
      `⏸  ${e.subscriber.email} — pendiente entrega ${e.currentEmailIndex + 1}`
    );
  }

  // 2. Las que quedaron `completed` cuando la secuencia tenía un solo correo.
  //    Se reinician desde cero: la bienvenida que recibieron fue reescrita
  //    después, así que la que leyeron ya no existe. Reciben la serie completa
  //    desde la entrega 1, como quien llega hoy.
  const completadas = await db.sequenceEnrollment.findMany({
    where: { sequenceId: SEQ, status: "completed" },
    include: { subscriber: true },
  });
  for (const e of completadas) {
    await db.sequenceEnrollment.update({
      where: { id: e.id },
      data: {
        status: "paused",
        currentEmailIndex: 0,
        emailsSent: 0,
        completedAt: null,
        nextEmailAt: new Date(), // vencida: al reanudar sale en la siguiente pasada
      },
    });
    console.log(
      `♻️  ${e.subscriber.email} — reiniciada desde la entrega 1 (traía ${e.emailsSent} enviado)`
    );
  }

  console.log(
    `\n${activas.length + completadas.length} inscripción(es) → paused.`
  );
}

main().then(() => process.exit(0));
