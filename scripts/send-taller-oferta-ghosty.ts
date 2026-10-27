#!/usr/bin/env npx tsx
/**
 * Oferta de Ghosty para los inscritos al taller "Diseño de sistemas agénticos":
 * primer mes al 50 % (código TALLER50) en el plan personal o en un Space.
 * Vale hasta el 7-nov-2026 23:59 CDMX. Doc: docs/correos-trial-taller.md.
 *
 * Uso:
 *   npx tsx --env-file=.env scripts/send-taller-oferta-ghosty.ts                     # dry-run
 *   npx tsx --env-file=.env scripts/send-taller-oferta-ghosty.ts --prueba --send     # a las cuentas propias
 *   npx tsx --env-file=.env scripts/send-taller-oferta-ghosty.ts --send              # de verdad
 *   npx tsx --env-file=.env scripts/send-taller-oferta-ghosty.ts --only x@y.com --send
 *   npx tsx scripts/send-taller-oferta-ghosty.ts --preview <archivo.html>            # sólo el HTML
 */
import { writeFileSync } from "fs";
import { tallerOfertaGhostyEmail } from "../app/mailSenders/sendTallerOfertaGhosty";

const COURSE_SLUG = "sistemas-agenticos";

/** Las cuentas de bliss no son alumnos; sólo reciben la prueba. */
const CUENTAS_PROPIAS = new Set(["fixtergeek@gmail.com", "blissitos@gmail.com"]);
const PRUEBA = ["fixtergeek@gmail.com"];

/** Pasada la fecha la oferta ya no existe en Stripe: no se manda. */
const VENCE = new Date("2026-11-07T23:59:59-06:00");

const arg = (flag: string) => {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : undefined;
};

const send = process.argv.includes("--send");
const prueba = process.argv.includes("--prueba");
const only = arg("--only");
const preview = arg("--preview");

const primerNombre = (nombre?: string | null) => {
  const pila = nombre?.trim().split(/\s+/)[0];
  if (!pila) return null;
  return pila.charAt(0).toLocaleUpperCase("es") + pila.slice(1).toLocaleLowerCase("es");
};

async function main() {
  if (preview) {
    writeFileSync(preview, tallerOfertaGhostyEmail({ userName: "Héctor" }).html);
    console.log(preview);
    return;
  }
  if (send && Date.now() > VENCE.getTime()) throw new Error("La oferta TALLER50 ya venció (7-nov).");

  const { db } = await import("../app/.server/db");
  const { sendTallerOfertaGhosty } = await import("../app/mailSenders/sendTallerOfertaGhosty");
  try {
    let lista: { email: string; displayName: string | null; username: string | null }[];
    if (only) {
      const u = await db.user.findUnique({ where: { email: only }, select: { email: true, displayName: true, username: true } });
      lista = u ? [u] : [{ email: only, displayName: null, username: null }];
    } else {
      const curso = await db.course.findFirst({ where: { slug: COURSE_SLUG }, select: { id: true } });
      if (!curso) throw new Error(`No existe el curso ${COURSE_SLUG}`);
      const users = await db.user.findMany({
        where: { courses: { has: curso.id } },
        select: { email: true, displayName: true, username: true },
      });
      lista = prueba
        ? users.filter((u) => PRUEBA.includes(u.email))
        : users.filter((u) => !CUENTAS_PROPIAS.has(u.email.toLowerCase()));
    }

    console.log(`\n${prueba ? "PRUEBA" : "ENVÍO"} · oferta Ghosty TALLER50 — ${lista.length} destinatario(s)\n`);
    for (const u of lista) {
      const nombre = primerNombre(u.displayName ?? u.username);
      console.log(`  ${send ? "→" : "·"} ${u.email}  (${nombre ?? "sin nombre"})`);
      if (send) await sendTallerOfertaGhosty({ to: u.email, userName: nombre });
    }
    if (!send) console.log("\nDry-run. Agrega --send para enviar de verdad.\n");
  } finally {
    await db.$disconnect();
  }
}

main();
