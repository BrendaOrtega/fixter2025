#!/usr/bin/env npx tsx
/**
 * Recordatorio de la sesión 3 ("Memoria y estado") a los alumnos del taller
 * "Diseño de sistemas agénticos", con el short de las 4 memorias.
 *
 * Se manda el mismo día de la sesión, por la mañana. Va a los inscritos del
 * curso, no a la lista de marketing.
 *
 * Uso:
 *   npx tsx --env-file=.env scripts/send-taller-sesion-3.ts                  # dry-run
 *   npx tsx --env-file=.env scripts/send-taller-sesion-3.ts --prueba --send  # a mis cuentas
 *   npx tsx --env-file=.env scripts/send-taller-sesion-3.ts --send           # a los alumnos
 *   npx tsx --env-file=.env scripts/send-taller-sesion-3.ts --only x@y.com --send
 */
import { db } from "../app/.server/db";
import { sendTallerSession3Memoria } from "../app/mailSenders/sendTallerSession3Memoria";

const COURSE_SLUG = "sistemas-agenticos";

/** Las cuentas de bliss no son alumnos; sólo reciben la prueba. */
const CUENTAS_PROPIAS = new Set(["fixtergeek@gmail.com", "blissitos@gmail.com"]);
const PRUEBA = ["fixtergeek@gmail.com"];

/** Enviado el 8 sep 2026, 4:45 pm, a los 10 inscritos. Si el script se vuelve
 *  a correr sin esta lista, les llega dos veces. */
const YA_ENVIADO = new Set<string>([
  "bremin11.20.93@gmail.com",
  "foglzerika@gmail.com",
  "martin.melo.dev.97@gmail.com",
  "oswaldinho963@gmail.com",
  "ismaelfcom93@gmail.com",
  "jimmyegc@gmail.com",
  "donovan_64@hotmail.com",
  "alberto@ideashappy.com",
  "rfc.rossy@gmail.com",
  "serchcode@gmail.com",
]);

const arg = (flag: string) => {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : undefined;
};

const send = process.argv.includes("--send");
const prueba = process.argv.includes("--prueba");
const only = arg("--only");

/** La base trae "JIMMY" y "erika" tal cual; el saludo va con una sola mayúscula. */
const primerNombre = (nombre?: string | null) => {
  const pila = nombre?.trim().split(/\s+/)[0];
  if (!pila) return null;
  return pila.charAt(0).toLocaleUpperCase("es") + pila.slice(1).toLocaleLowerCase("es");
};

async function destinatarios() {
  if (only) {
    const u = await db.user.findUnique({
      where: { email: only },
      select: { email: true, displayName: true, username: true },
    });
    return u ? [u] : [{ email: only, displayName: null, username: null }];
  }
  const curso = await db.course.findFirst({
    where: { slug: COURSE_SLUG },
    select: { id: true },
  });
  if (!curso) throw new Error(`No existe el curso ${COURSE_SLUG}`);
  const users = await db.user.findMany({
    where: { courses: { has: curso.id } },
    select: { email: true, displayName: true, username: true },
  });
  if (prueba) return users.filter((u) => PRUEBA.includes(u.email));
  return users
    .filter((u) => !CUENTAS_PROPIAS.has(u.email.toLowerCase()))
    .filter((u) => !YA_ENVIADO.has(u.email.toLowerCase()));
}

async function main() {
  const lista = await destinatarios();
  console.log(`\n${prueba ? "PRUEBA" : "ENVÍO"} — ${lista.length} destinatario(s)\n`);
  for (const u of lista) {
    const nombre = primerNombre(u.displayName ?? u.username);
    console.log(`  ${send ? "→" : "·"} ${u.email}  (${nombre ?? "sin nombre"})`);
    if (!send) continue;
    await sendTallerSession3Memoria({ to: u.email, userName: nombre });
  }
  if (!send) console.log("\nDry-run. Agrega --send para enviar de verdad.\n");
}

main().finally(() => db.$disconnect());
