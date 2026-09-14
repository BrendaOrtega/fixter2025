#!/usr/bin/env npx tsx
/**
 * Regalo de 10M tokens extra a los alumnos del taller "Diseño de sistemas
 * agénticos", para el fin de semana.
 *
 * El grant ya se hizo aparte (easybits: scripts/grant-llm-tokens.ts 10000000 …).
 * Esto SOLO avisa. Manda primero el grant, luego el correo: nada peor que
 * "te regalé tokens" y que el 402 siga ahí.
 *
 * Uso:
 *   npx tsx --env-file=.env scripts/send-taller-weekend-tokens.ts                  # dry-run
 *   npx tsx --env-file=.env scripts/send-taller-weekend-tokens.ts --prueba --send  # a mis cuentas
 *   npx tsx --env-file=.env scripts/send-taller-weekend-tokens.ts --send           # a los alumnos
 *   npx tsx --env-file=.env scripts/send-taller-weekend-tokens.ts --only x@y.com --send
 */
import { db } from "../app/.server/db";
import { sendTallerWeekendTokens } from "../app/mailSenders/sendTallerWeekendTokens";

const COURSE_SLUG = "sistemas-agenticos";

/** Las cuentas de bliss no son alumnos; sólo reciben la prueba. */
const CUENTAS_PROPIAS = new Set(["fixtergeek@gmail.com", "blissitos@gmail.com"]);
const PRUEBA = ["fixtergeek@gmail.com"];

/**
 * Sin cuenta de EasyBits al momento del grant: sus 10M quedan apartados, no
 * acreditados, y el correo se los dice en vez de prometer algo que no existe.
 */
const SIN_CUENTA_EASYBITS = new Set(["donovan_64@hotmail.com"]);

/** Correo nuevo: nadie lo ha recibido todavía. */
const YA_ENVIADO = new Set<string>([]);

const arg = (flag: string) => {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : undefined;
};

const send = process.argv.includes("--send");
const prueba = process.argv.includes("--prueba");
const only = arg("--only");

/** El saludo es "Erika, un regalito": la base trae "JIMMY" y "erika" tal cual. */
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
  const curso = await db.course.findFirst({ where: { slug: COURSE_SLUG }, select: { id: true } });
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
    const pendiente = SIN_CUENTA_EASYBITS.has(u.email.toLowerCase());
    console.log(`  ${send ? "→" : "·"} ${u.email}  (${nombre ?? "sin nombre"})${pendiente ? "  [sin cuenta EasyBits]" : ""}`);
    if (!send) continue;
    await sendTallerWeekendTokens({ to: u.email, userName: nombre, pendiente });
  }
  if (!send) console.log("\nDry-run. Agrega --send para enviar de verdad.\n");
}

main().finally(() => db.$disconnect());
