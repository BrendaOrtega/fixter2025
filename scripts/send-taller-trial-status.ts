#!/usr/bin/env npx tsx
/**
 * Dos correos según el estado del trial de EasyBits entre los inscritos al
 * taller "Diseño de sistemas agénticos":
 *   - pendientes: no han reclamado el trial → recordatorio con los dos pasos.
 *   - activos: ya lo tienen corriendo → qué incluye y qué hacer con él.
 *
 * Uso:
 *   npx tsx --env-file=.env scripts/send-taller-trial-status.ts pendientes                  # dry-run
 *   npx tsx --env-file=.env scripts/send-taller-trial-status.ts activos --prueba --send     # a las cuentas propias
 *   npx tsx --env-file=.env scripts/send-taller-trial-status.ts activos --send              # de verdad
 *   npx tsx --env-file=.env scripts/send-taller-trial-status.ts pendientes --only x@y.com --send
 */
import { db } from "../app/.server/db";
import { sendTallerTrialPendiente } from "../app/mailSenders/sendTallerTrialPendiente";
import { sendTallerTrialActivo } from "../app/mailSenders/sendTallerTrialActivo";

const COURSE_SLUG = "sistemas-agenticos";

/** Las cuentas de bliss no son alumnos; sólo reciben la prueba. */
const CUENTAS_PROPIAS = new Set(["fixtergeek@gmail.com", "blissitos@gmail.com"]);

/** La prueba va sólo a las cuentas de bliss; el resto de la lista son alumnos. */
const PRUEBA = ["fixtergeek@gmail.com"];

/**
 * Quién NO ha reclamado el trial: Marco Antonio y Martín, sin cuenta en
 * EasyBits. Oswaldo salía aquí el 2 sep por no tener plan Mega, pero ya lo
 * subió. Actualizar esta lista contra el panel antes de cada envío.
 */
const PENDIENTES = new Set([
  "donovan_64@hotmail.com",
  "martin.melo.dev.97@gmail.com",
]);

const arg = (flag: string) => {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : undefined;
};

const grupo = process.argv[2];
const send = process.argv.includes("--send");
const prueba = process.argv.includes("--prueba");
const only = arg("--only");

if (grupo !== "pendientes" && grupo !== "activos") {
  console.error("Falta el grupo: pendientes | activos");
  process.exit(1);
}

/** El nombre de pila basta, y la base trae "JIMMY" o "erika" tal cual. */
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
  return alumnos.filter((u) =>
    grupo === "pendientes"
      ? PENDIENTES.has(u.email.toLowerCase())
      : !PENDIENTES.has(u.email.toLowerCase())
  );
}

async function main() {
  const lista = await destinatarios();
  console.log(`\n${prueba ? "PRUEBA" : "ENVÍO"} · ${grupo} — ${lista.length} destinatario(s)\n`);
  for (const u of lista) {
    const nombre = primerNombre(u.displayName ?? u.username);
    console.log(`  ${send ? "→" : "·"} ${u.email}  (${nombre ?? "sin nombre"})`);
    if (!send) continue;
    const enviar = grupo === "pendientes" ? sendTallerTrialPendiente : sendTallerTrialActivo;
    await enviar({ to: u.email, userName: nombre });
  }
  if (!send) console.log("\nDry-run. Agrega --send para enviar de verdad.\n");
}

main().finally(() => db.$disconnect());
