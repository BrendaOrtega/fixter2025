/**
 * Secuencia "Introducción a los agentes de IA" (comunidad /c/agentes).
 *
 * Reescribe la entrega 1 (bienvenida) para que anuncie el formato —video +
 * repo por entrega— y crea la entrega 2, la del mínimo arnés.
 *
 * Idempotente: hace upsert por `order`, se puede correr las veces que sea.
 *   npx tsx --env-file=.env scripts/update-agentes-sequence.ts
 */
import { db } from "../app/.server/db";
import {
  wrapEmailHtml,
  emailButton,
  emailVideoCard,
  emailCallout,
  emailTeaser,
} from "../app/utils/emailShell";

const SEQUENCE_ID = "6a7df909e5a1dfc09e842fd3";
const FROM_NAME = "Héctorbliss de FixterGeek";
const FROM_EMAIL = "secuencias@fixtergeek.com";

// El video vive en el curso on-demand: la card del correo lleva al reproductor
// de la secuencia (/s/video), que es quien sabe si esta entrega ya te tocaba.
const VIDEO_SLUG = "grok-arnes-minimo";
const VIDEO_URL =
  "https://www.fixtergeek.com/cursos/sistemas-agenticos/viewer?videoSlug=grok-arnes-minimo";
// Póster del video: un frame real del código con el play quemado encima —
// superponerlo con CSS se descuadra en Outlook. Vive junto al HLS, con ACL
// público porque en un correo no hay quien firme una URL.
const VIDEO_POSTER =
  "https://wild-bird-2039.fly.storage.tigris.dev/fixtergeek/videos/6a78ff744a8e00e3b2eea500/6a809b70f13d797a474a6916/poster.png";
const VIDEO_DURATION = "48 min";
const REPO_URL = "https://github.com/blissito/taller-arnes-grok";
const PDF_URL = "https://www.fixtergeek.com/seis-piezas";
// El reproductor donde se van juntando las entregas. Hoy ya tiene el webinar,
// así que la bienvenida no manda a una sala vacía.
const VIEWER_URL =
  "https://www.fixtergeek.com/cursos/sistemas-agenticos/viewer?videoSlug=anatomia-de-un-sistema-agentico";
// Mark oficial de GitHub. PNG y no SVG: Gmail y Outlook no renderizan SVG.
const GITHUB_MARK = "https://github.githubassets.com/favicons/favicon.png";

const emailOne = {
  order: 1,
  schedulingType: "delay",
  delayDays: 0,
  // La primera entrega ES el primer video. Suscribirse tiene que pagar de
  // inmediato: un correo de bienvenida que solo promete lo que vendrá deja a la
  // persona con la mano estirada.
  videoSlug: VIDEO_SLUG,
  subject: "Tu primera entrega: un agente en cien líneas",
  content: wrapEmailHtml(
    `
<h1 style="font-size:24px;margin:0 0 12px 0;color:#19262A;">Empezamos 🧰</h1>

<p style="margin:0 0 20px 0;">
  Esta serie no explica agentes: los escribe. Aquí está la primera entrega —
  un agente completo, sin SDK y sin framework: un
  <code style="background:#f6fafa;padding:2px 6px;border-radius:4px;">fetch</code>,
  una herramienta y un
  <code style="background:#f6fafa;padding:2px 6px;border-radius:4px;">while</code>.
</p>

${emailVideoCard(
  {
    posterUrl: VIDEO_POSTER,
    href: VIDEO_URL,
    title: "El mínimo arnés",
    duration: VIDEO_DURATION,
    label: "▶ Ver el video",
  },
  "light"
)}

<p style="margin:0 0 16px 0;">
  El ciclo es siempre el mismo 🔄: le describes al modelo qué herramientas
  existen, él pide ejecutar una, tú la ejecutas y le devuelves el resultado, y
  vuelves a llamarlo con el historial completo. Cuando responde con texto en
  lugar de pedir otra herramienta, terminó. Los frameworks de agentes son ese
  loop con adornos encima.
</p>

<div style="margin:0 0 24px 0;">${emailButton(
      `<span style="display:inline-block;vertical-align:middle;white-space:nowrap;"><img src="${GITHUB_MARK}" alt="" width="18" height="18" style="width:18px;height:18px;display:inline-block;vertical-align:middle;border:0;margin-right:8px;" /><span style="display:inline-block;vertical-align:middle;">Clonar el repositorio</span></span>`,
      REPO_URL
    )}</div>

<h3 style="margin:0 0 8px 0;color:#19262A;font-size:18px;">Lo que sigue</h3>
<ol style="margin:0 0 24px 0;padding-left:20px;color:#475569;">
  <li style="margin-bottom:4px;"><strong style="color:#19262A;">La interfaz web</strong> — el agente sale de la terminal.</li>
  <li style="margin-bottom:4px;">Contexto y memoria.</li>
  <li>Ejecución durable y permisos.</li>
</ol>

${emailTeaser(
  {
    title:
      "Los materiales del webinar: el PDF de las seis piezas y la grabación completa.",
  },
  "light"
)}

<p style="color:#19262A;margin:16px 0 4px 0;">Abrazo. Blissmo. 🤓</p>
`,
    {
      preheader: "Un agente completo en cien líneas: video y repositorio, ya.",
      theme: "light",
    }
  ),
};

const emailTwo = {
  order: 2,
  schedulingType: "delay",
  delayDays: 3,
  subject: "Las seis piezas (y el webinar completo)",
  content: wrapEmailHtml(
    `
<h1 style="font-size:24px;margin:0 0 12px 0;color:#19262A;">Las seis piezas 🧩</h1>

<p style="margin:0 0 16px 0;">
  Ya tienes el loop corriendo. Lo que separa ese agente de uno que aguanta
  usuarios reales son seis piezas: herramientas, contexto, ejecución durable,
  memoria, permisos e interfaz.
</p>

<p style="margin:0 0 16px 0;">
  Están a detalle en este PDF de 23 páginas, y en la grabación del webinar donde
  se arma un sistema agéntico completo — los dos salieron de los webinars en
  vivo de los jueves, que son abiertos y gratuitos.
</p>

<div style="margin:0 0 10px 0;">${emailButton(
      "Descargar las seis piezas",
      PDF_URL
    )}</div>
<p style="margin:0 0 24px 0;">
  <a href="${VIEWER_URL}" target="_blank" rel="noopener" style="color:#0E8F79;font-weight:bold;text-decoration:underline;">
    ▶ Ver el webinar completo
  </a>
</p>

${emailTeaser(
  {
    title:
      "La interfaz web — el agente sale de la terminal y se muda al navegador, con streaming en vivo.",
  },
  "light"
)}

<p style="color:#19262A;margin:16px 0 4px 0;">Abrazo. Blissmo. 🤓</p>
`,
    {
      preheader: "Lo que separa un demo de un agente que aguanta usuarios reales.",
      theme: "light",
    }
  ),
};

/** Sin --write solo escupe los HTML a /tmp para revisarlos en el navegador. */
async function preview() {
  const { writeFile } = await import("node:fs/promises");
  for (const email of [emailOne, emailTwo]) {
    const path = `/tmp/agentes-entrega-${email.order}.html`;
    await writeFile(path, email.content);
    console.log(`👀 ${path} — ${email.subject}`);
  }
}

async function main() {
  for (const email of [emailOne, emailTwo]) {
    const existing = await db.sequenceEmail.findFirst({
      where: { sequenceId: SEQUENCE_ID, order: email.order },
    });

    if (existing) {
      await db.sequenceEmail.update({
        where: { id: existing.id },
        data: {
          subject: email.subject,
          content: email.content,
          schedulingType: email.schedulingType,
          delayDays: email.delayDays,
          videoSlug: (email as { videoSlug?: string }).videoSlug ?? null,
        },
      });
      console.log(`✏️  entrega ${email.order} actualizada — ${email.subject}`);
    } else {
      await db.sequenceEmail.create({
        data: {
          sequenceId: SEQUENCE_ID,
          ...email,
          fromName: FROM_NAME,
          fromEmail: FROM_EMAIL,
        },
      });
      console.log(`✨ entrega ${email.order} creada — ${email.subject}`);
    }
  }
}

if (process.argv.includes("--write")) main();
else preview();
