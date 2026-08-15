#!/usr/bin/env npx tsx
/**
 * Secuencia de preparación del taller de sistemas agénticos.
 *
 * A diferencia de las notificaciones de fecha fija (create-sistemas-sequence),
 * esta corre con delays relativos: cada quien la recibe desde el día que
 * compra. Es el perk que se menciona en el marketing.
 *
 * Es idempotente Y actualiza: se puede re-correr para refrescar el copy
 * mientras se itera, sin duplicar secuencia ni correos.
 *
 *   npx tsx --env-file=.env scripts/create-preparacion-sequence.ts
 */
import { PrismaClient } from "@prisma/client";
import {
  wrapEmailHtml,
  emailHero,
  emailCallout,
  emailDivider,
  emailProgress,
  emailTeaser,
} from "../app/utils/emailShell";

const db = new PrismaClient();

const SEQUENCE_NAME = "Taller Sistemas Agénticos — Preparación";
const OWNER_EMAIL = "fixtergeek@gmail.com"; // sin ownerId, /secuencias/:id redirige
const TOTAL_EMAILS = 5; // para la barra de progreso, aunque aún no existan todos

const ANTHROPIC = "https://www.anthropic.com/engineering/building-effective-agents";

const email1 = {
  order: 1,
  subject: "El loop del agente",
  preheader: "Cuatro pasos que se repiten, y por qué el cuarto es el caro.",
  videoSlug: "sesion-01-el-loop",
  // {{video}} lo sustituye el motor por la card con el poster real.
  inner: `
${emailProgress(1, TOTAL_EMAILS)}
${emailHero({ kicker: "Preparación para el taller", title: "El loop del agente" })}

<p style="margin:0 0 14px;">Hola,</p>

<p style="margin:0 0 16px;">Anthropic separa dos cosas que suelen mezclarse: los <em>workflows</em>, donde el código orquesta pasos previstos, y los agentes, que son sistemas donde el modelo dirige su propio proceso y decide qué herramientas usar. Lo segundo es un loop: el modelo decide, se ejecuta la tool, el resultado vuelve, el historial crece.</p>

{{video}}

<p style="margin:0 0 16px;">Ese cuarto paso es el que cambia los números. En cada vuelta se reenvía el historial completo, así que cada llamada paga también todas las anteriores. Un agente de doce llamadas cuesta doce historiales, cada uno más largo que el anterior.</p>

<p style="margin:0 0 16px;">De ahí que el <em>prompt caching</em> se volviera estándar durante 2024, y que buena parte del trabajo de diseñar agentes hoy sea decidir qué NO va en el historial.</p>

${emailCallout(
  `<a href="${ANTHROPIC}" style="color:#85DDCB;text-decoration:underline;font-weight:bold;">Building effective agents</a>, de Anthropic (dic 2024). Corto, y la referencia que usa medio mundo. Un detalle que suele sorprender: cuentan que dedicaron más tiempo a afinar las herramientas que los prompts.`,
  { title: "Para leer · 15 minutos" }
)}

<p style="margin:0 0 16px;">Nos vemos el 1 de septiembre. En la sesión 1 construiremos este loop desde cero, con tus primeras tools. 🔧🤖</p>

${emailDivider()}
${emailTeaser({ title: "Las cuatro piezas de un harness.", when: "En 2 días" })}

<p style="margin:18px 0 0;color:#8FA5A9;font-size:14px;">Abrazo. Blissmo. 🤓</p>
`,
};

/**
 * Los siguientes cuatro existen desde el día uno aunque su cuerpo esté por
 * escribirse: sin ellos, "el camino" de /s/video no tiene nada que mostrar
 * bloqueado, y ver lo que falta es justo lo que hace volver.
 *
 * delayDays es relativo al correo ANTERIOR, no al alta: 0, 2, 3, 4, 4 dan
 * días 0, 2, 5, 9 y 13 desde la compra.
 */
const proximos = [
  { order: 2, delayDays: 2, subject: "Las cuatro piezas de un harness" },
  { order: 3, delayDays: 3, subject: "Qué NO va en el historial" },
  { order: 4, delayDays: 4, subject: "Cuánto cuesta de verdad un agente" },
  { order: 5, delayDays: 4, subject: "Lo que vas a construir" },
];

async function main() {
  const owner = await db.user.findUnique({ where: { email: OWNER_EMAIL } });
  if (!owner) throw new Error(`No existe el usuario ${OWNER_EMAIL}`);

  const existing = await db.sequence.findFirst({
    where: { name: SEQUENCE_NAME },
  });

  const sequence = existing
    ? await db.sequence.update({
        where: { id: existing.id },
        data: { isActive: true, ownerId: owner.id },
      })
    : await db.sequence.create({
        data: {
          name: SEQUENCE_NAME,
          description:
            "Preparación para el taller: una pieza cada pocos días desde la compra. Delays relativos, no fechas fijas.",
          trigger: "MANUAL", // el webhook de Stripe inscribe explícitamente
          isActive: true,
          ownerId: owner.id,
        },
      });

  const html = wrapEmailHtml(email1.inner, {
    theme: "dark",
    promoFooter: false, // es un perk pagado: el promo de Secuencias sobra
    preheader: email1.preheader,
  });

  const data = {
    subject: email1.subject,
    content: html,
    schedulingType: "delay",
    delayDays: 0, // sale al inscribirse
    specificDate: null,
    videoSlug: email1.videoSlug,
    fromName: "FixterGeek",
    fromEmail: "secuencias@fixtergeek.com",
  };

  const current = await db.sequenceEmail.findFirst({
    where: { sequenceId: sequence.id, order: email1.order },
  });

  const saved = current
    ? await db.sequenceEmail.update({ where: { id: current.id }, data })
    : await db.sequenceEmail.create({
        data: { sequenceId: sequence.id, order: email1.order, ...data },
      });

  // Esqueleto de los siguientes: se crean si faltan, y NUNCA se sobrescriben
  // (para no borrar el cuerpo cuando ya se haya escrito).
  for (const next of proximos) {
    const already = await db.sequenceEmail.findFirst({
      where: { sequenceId: sequence.id, order: next.order },
    });
    if (already) continue;
    await db.sequenceEmail.create({
      data: {
        sequenceId: sequence.id,
        order: next.order,
        subject: next.subject,
        content: "",
        schedulingType: "delay",
        delayDays: next.delayDays,
        fromName: "FixterGeek",
        fromEmail: "secuencias@fixtergeek.com",
      },
    });
    console.log(`   + borrador ${next.order}: "${next.subject}"`);
  }

  console.log(`${existing ? "♻️  Actualizada" : "✅ Creada"}: ${SEQUENCE_NAME}`);
  console.log(`   sequenceId: ${sequence.id}`);
  console.log(`   email ${saved.order}: "${saved.subject}" (${html.length} bytes)`);
  console.log(`\n   Editor: https://www.fixtergeek.com/secuencias/${sequence.id}`);
  console.log(
    `   Para engancharla a la compra, agrégala a Product.sequences: ${sequence.id}`
  );
}

main()
  .catch((error) => {
    console.error("❌", error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
