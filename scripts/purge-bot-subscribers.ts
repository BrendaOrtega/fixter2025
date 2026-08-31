/**
 * Borra de la base los suscriptores que son altas automatizadas.
 *
 * Casi la mitad de la lista (57 de 122 el 27-ago-2026) nunca fue una persona:
 * los 26 del webinar del 27 con nombre de cadena aleatoria, los `@web-library.net`
 * con nombres de estafa cripto, y los dominios desechables. Mientras sigan ahí
 * inflan los conteos de audiencia y cualquier envío amplio los alcanza.
 *
 * Uso:
 *   npx tsx --env-file=.env scripts/purge-bot-subscribers.ts          # dry-run + respaldo
 *   npx tsx --env-file=.env scripts/purge-bot-subscribers.ts --borrar
 *
 * Siempre escribe el respaldo antes de tocar nada: el borrado es definitivo y
 * un falso positivo sólo se puede deshacer desde ese archivo.
 */
import { PrismaClient } from "@prisma/client";
import { checkSignupEmail } from "../app/.server/anti-bot";
import { writeFileSync } from "node:fs";

const db = new PrismaClient();
const borrar = process.argv.includes("--borrar");

const todos = await db.subscriber.findMany();
const bots = todos.filter((s) => checkSignupEmail(s.email, s.name).blocked);

console.log(`Suscriptores: ${todos.length}`);
console.log(`Altas automatizadas: ${bots.length}`);
for (const b of bots) console.log(`  · ${b.email} (${b.name ?? "sin nombre"})`);

const respaldo = `/tmp/subscribers-bots-${new Date().toISOString().slice(0, 10)}.json`;
writeFileSync(respaldo, JSON.stringify(bots, null, 2));
console.log(`\nRespaldo: ${respaldo}`);

if (!borrar) {
  console.log("\nDry-run. Agrega --borrar para borrarlos de verdad.");
  await db.$disconnect();
  process.exit(0);
}

const ids = bots.map((b) => b.id);

// Las inscripciones a secuencias caen solas (onDelete: Cascade), pero la
// relación con Tutorial es un array de ids: borrar al suscriptor deja el id
// colgando ahí. Se limpia antes, tutorial por tutorial.
const cursos = await db.tutorial.findMany({
  where: { subscriberIds: { hasSome: ids } },
  select: { id: true, subscriberIds: true },
});
for (const c of cursos) {
  await db.tutorial.update({
    where: { id: c.id },
    data: { subscriberIds: c.subscriberIds.filter((sid) => !ids.includes(sid)) },
  });
}
console.log(`Tutoriales limpiados: ${cursos.length}`);

const { count } = await db.subscriber.deleteMany({ where: { id: { in: ids } } });
console.log(`Borrados: ${count}`);
await db.$disconnect();
