#!/usr/bin/env npx tsx
/**
 * Correo de preparación del entorno para los inscritos al taller
 * "Diseño de sistemas agénticos" (sesión 1: 1 de septiembre, 8pm).
 *
 * Uso:
 *   npx tsx --env-file=.env scripts/send-taller-trial-setup.ts                  # dry-run
 *   npx tsx --env-file=.env scripts/send-taller-trial-setup.ts --prueba --send  # a las cuentas propias
 *   npx tsx --env-file=.env scripts/send-taller-trial-setup.ts --send           # a los inscritos
 *   npx tsx --env-file=.env scripts/send-taller-trial-setup.ts --only x@y.com --send
 */
import { db } from "../app/.server/db";
import { sendTallerTrialSetup } from "../app/mailSenders/sendTallerTrialSetup";

const COURSE_SLUG = "sistemas-agenticos";

/** Las cuentas de bliss no son alumnos; sólo reciben la prueba. */
const CUENTAS_PROPIAS = new Set(["fixtergeek@gmail.com", "blissitos@gmail.com"]);

/** La prueba va sólo a las cuentas de bliss; el resto de la lista son alumnos. */
const PRUEBA = ["fixtergeek@gmail.com"];

/**
 * Quien ya tiene el correo en su bandeja, fuera del envío general del 30 de
 * agosto. Bremin lo recibió ese día en un envío de prueba equivocado; Rosalba,
 * Oswaldo y Sergio a mano, porque pagaron después de que salió el general. A
 * cualquiera de ellos se le manda con --only si el contenido cambia.
 */
const YA_ENVIADO = new Set([
  "bremin11.20.93@gmail.com",
  "rfc.rossy@gmail.com",
  "oswaldinho963@gmail.com",
  "serchcode@gmail.com",
]);

const arg = (flag: string) => {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : undefined;
};

const send = process.argv.includes("--send");
const prueba = process.argv.includes("--prueba");
const only = arg("--only");

/**
 * El nombre de pila basta: el saludo es "Héctor, prepara tu terminal". La base
 * trae nombres tal como los escribió cada quien —"JIMMY", "erika"—, y ninguno
 * de los dos se ve bien encabezando el correo.
 */
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
    select: { id: true, title: true },
  });
  if (!curso) throw new Error(`No existe el curso ${COURSE_SLUG}`);

  const users = await db.user.findMany({
    where: { courses: { has: curso.id } },
    select: { email: true, displayName: true, username: true },
  });

  if (prueba) return users.filter((u) => PRUEBA.includes(u.email));
  const alumnos = users.filter((u) => !CUENTAS_PROPIAS.has(u.email.toLowerCase()));
  // A quien ya le llegó no se le manda dos veces.
  return alumnos.filter((u) => !YA_ENVIADO.has(u.email.toLowerCase()));
}

async function main() {
  const lista = await destinatarios();
  console.log(`\n${prueba ? "PRUEBA" : "ENVÍO"} — ${lista.length} destinatario(s)\n`);
  for (const u of lista) {
    const nombre = primerNombre(u.displayName ?? u.username);
    console.log(`  ${send ? "→" : "·"} ${u.email}  (${nombre ?? "sin nombre"})`);
    if (!send) continue;
    await sendTallerTrialSetup({ to: u.email, userName: nombre });
  }
  if (!send) console.log("\nDry-run. Agrega --send para enviar de verdad.\n");
}

main().finally(() => db.$disconnect());
