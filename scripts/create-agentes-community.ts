/**
 * Crea la comunidad "Sistemas Agénticos" (/c/agentes) y su secuencia de
 * arranque, "Introducción a los agentes de IA".
 *
 * Idempotente: se puede correr varias veces sin duplicar nada. Correr con:
 *   npx tsx --env-file=.env scripts/create-agentes-community.ts
 */
import { db } from "../app/.server/db";
import { wrapEmailHtml, emailButton } from "../app/utils/emailShell";

const OWNER_EMAIL = "fixtergeek@gmail.com";
const COMMUNITY_SLUG = "agentes";
const COMMUNITY_TAG = "community:agentes";
// "Sistemas Agénticos" ya es el webinar y el taller: la comunidad necesita
// nombre propio para que no se confundan.
const COMMUNITY_NAME = "Comunidad Agéntica";
const SEQUENCE_NAME = "Introducción a los agentes de IA";

const firma = `<p style="color:#19262A;margin:16px 0 4px 0;">Abrazo. Blissmo. 🤓</p>`;

const email1 = {
  subject: "Un agente es dos cosas, y solo una es el modelo",
  content: wrapEmailHtml(
    `
<h1 style="font-size:24px;margin:0 0 12px 0;color:#19262A;">Empezamos por la ecuación 🧩</h1>
<p style="margin:0 0 16px 0;">
  Bienvenido a <strong>Introducción a los agentes de IA</strong>. Aquí no vamos
  a hablar de prompts mágicos. Vamos a hablar de por qué un agente que funciona
  perfecto en tu demo se cae con el primer usuario real.
</p>

<p style="margin:0 0 16px 0;">
  Todo arranca en una sola línea:
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6fafa;border-radius:10px;border-left:4px solid #85DDCB;margin:0 0 24px 0;">
  <tr><td style="padding:16px 18px;">
    <strong style="color:#19262A;font-size:18px;">agente = modelo + harness</strong>
  </td></tr>
</table>

<p style="margin:0 0 16px 0;">
  El modelo lo compras: Claude, GPT, Gemini. Cuesta lo mismo para ti que para
  tu competencia y mejora solo, sin que hagas nada. El harness es todo lo demás
  — las herramientas que le das, cómo administras su contexto, dónde guarda lo
  que aprende, qué pasa cuando la tarea dura 40 minutos, cómo pide permiso
  antes de hacer algo irreversible.
</p>

<p style="margin:0 0 24px 0;">
  Cuando un agente falla, casi nunca es porque el modelo no supo. Es porque el
  harness no existía. Y el harness sí lo construyes tú.
</p>

<h3 style="margin:0 0 10px 0;color:#19262A;font-size:18px;">Lo que viene</h3>
<p style="margin:0 0 24px 0;color:#475569;">
  En las siguientes entregas desarmamos las seis piezas del harness, una por
  una, con código y con casos de agentes que tenemos corriendo en producción:
  primitivas, contexto, ejecución durable, memoria, autenticación e interfaz.
</p>

<p style="margin:0 0 8px 0;color:#475569;">
  Mientras tanto, el PDF con las seis piezas a detalle:
</p>
<div style="margin:0 0 24px 0;">
  ${emailButton("Descargar las seis piezas", "https://www.fixtergeek.com/seis-piezas")}
</div>

<p style="margin:0 0 8px 0;color:#64748B;font-size:14px;">
  Responde este correo si quieres que cubra algo en particular. Lo leo yo.
</p>
${firma}`,
    {
      preheader:
        "El modelo lo compras; el harness lo construyes. Ahí se decide todo.",
      promoFooter: false,
    }
  ),
};

async function main() {
  const owner = await db.user.findUnique({ where: { email: OWNER_EMAIL } });
  if (!owner) throw new Error(`No existe el usuario ${OWNER_EMAIL}`);

  // 1. Secuencia de arranque
  let sequence = await db.sequence.findFirst({
    where: { name: SEQUENCE_NAME, ownerId: owner.id },
    include: { emails: { orderBy: { order: "asc" } } },
  });

  if (!sequence) {
    sequence = await db.sequence.create({
      data: {
        name: SEQUENCE_NAME,
        description:
          "Las seis piezas que separan un demo de un agente que aguanta usuarios reales.",
        ownerId: owner.id,
        trigger: "MANUAL",
        isActive: true,
        isFeatured: true,
      },
      include: { emails: { orderBy: { order: "asc" } } },
    });
    console.log(`✅ Secuencia creada: ${sequence.id}`);
  } else {
    console.log(`↻ Secuencia ya existía: ${sequence.id}`);
  }

  // 2. Entrega 1 — con cuerpo escrito: el motor pospone en silencio los vacíos
  const existing = sequence.emails.find((e) => e.order === 1);
  if (!existing) {
    await db.sequenceEmail.create({
      data: {
        sequenceId: sequence.id,
        order: 1,
        schedulingType: "delay",
        delayDays: 0, // sale en el siguiente ciclo del cron
        subject: email1.subject,
        content: email1.content,
        fromName: "Héctorbliss de FixterGeek",
        fromEmail: "secuencias@fixtergeek.com",
      },
    });
    console.log("✅ Entrega 1 creada");
  } else {
    await db.sequenceEmail.update({
      where: { id: existing.id },
      data: { subject: email1.subject, content: email1.content },
    });
    console.log("↻ Entrega 1 actualizada");
  }

  // 3. La comunidad
  const community = await db.community.upsert({
    where: { slug: COMMUNITY_SLUG },
    create: {
      slug: COMMUNITY_SLUG,
      name: COMMUNITY_NAME,
      tagline:
        "Cómo se construyen los agentes que aguantan usuarios reales. Un correo cuando hay algo que de verdad sirve.",
      description:
        "La comunidad de FixterGeek para quien construye con IA en serio.",
      tag: COMMUNITY_TAG,
      ownerId: owner.id,
      welcomeSequenceId: sequence.id,
      isActive: true,
    },
    update: { name: COMMUNITY_NAME, welcomeSequenceId: sequence.id, isActive: true },
  });

  // La secuencia de arranque cuelga de la comunidad
  await db.sequence.update({
    where: { id: sequence.id },
    data: { communityId: community.id },
  });

  console.log(`\n🎉 Listo: https://www.fixtergeek.com/c/${community.slug}`);
  console.log(`   Secuencia: ${sequence.id}`);
  console.log(`   Tag: ${COMMUNITY_TAG}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
