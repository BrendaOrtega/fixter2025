#!/usr/bin/env npx tsx
/**
 * Aviso de que la sesión 1 del taller "Diseño de sistemas agénticos" (1 de
 * septiembre, 8pm) sucede dentro del room Fixtergeek de Ghosty Teams.
 *
 * Uso:
 *   npx tsx --env-file=.env scripts/send-taller-session1-room.ts                  # dry-run
 *   npx tsx --env-file=.env scripts/send-taller-session1-room.ts --prueba --send  # a las cuentas propias
 *   npx tsx --env-file=.env scripts/send-taller-session1-room.ts --send           # a los inscritos
 *   npx tsx --env-file=.env scripts/send-taller-session1-room.ts --only x@y.com --send
 */
import { db } from "../app/.server/db";
import { sendTallerSession1Room } from "../app/mailSenders/sendTallerSession1Room";

const COURSE_SLUG = "sistemas-agenticos";

/** Las cuentas de bliss no son alumnos; sólo reciben la prueba. */
const CUENTAS_PROPIAS = new Set(["fixtergeek@gmail.com", "blissitos@gmail.com"]);

/** La prueba va sólo a las cuentas de bliss; el resto de la lista son alumnos. */
const PRUEBA = ["fixtergeek@gmail.com"];

/** Correo nuevo: nadie lo ha recibido todavía. */
const YA_ENVIADO = new Set<string>([]);

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
    await sendTallerSession1Room({ to: u.email, userName: nombre });
  }
  if (!send) console.log("\nDry-run. Agrega --send para enviar de verdad.\n");
}

main().finally(() => db.$disconnect());
