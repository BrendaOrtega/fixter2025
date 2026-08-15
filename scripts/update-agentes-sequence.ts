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

// TODO(bliss): ajustar cuando el video esté publicado.
const VIDEO_URL = "https://www.fixtergeek.com/videos/minimo-arnes";
const VIDEO_POSTER = "https://i.imgur.com/mpzZhT9.png";
const VIDEO_DURATION = null; // p.ej. "18 min"
const REPO_URL = "https://github.com/blissito/taller-arnes-grok";
const PDF_URL = "https://www.fixtergeek.com/seis-piezas";
// Mark oficial de GitHub. PNG y no SVG: Gmail y Outlook no renderizan SVG.
const GITHUB_MARK = "https://github.githubassets.com/favicons/favicon.png";

const emailOne = {
  order: 1,
  schedulingType: "delay",
  delayDays: 0,
  subject: "Un agente es dos cosas, y solo una es el modelo",
  content: wrapEmailHtml(
    `
<h1 style="font-size:24px;margin:0 0 12px 0;color:#19262A;">Empezamos por la ecuación 🧩</h1>
<p style="margin:0 0 16px 0;">
  Bienvenido a <strong>Introducción a los agentes de IA</strong>. Aquí no hay
  prompts mágicos: vamos a construir un agente y a entender por qué se cae con
  el primer usuario real.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6fafa;border-radius:10px;border-left:4px solid #85DDCB;margin:0 0 24px 0;">
  <tr><td style="padding:16px 18px;">
    <strong style="color:#19262A;font-size:18px;">agente = modelo + harness</strong>
  </td></tr>
</table>

<p style="margin:0 0 16px 0;">
  El modelo lo compras: Claude, GPT, Grok. Cuesta lo mismo para ti que para tu
  competencia y mejora solo. El harness es todo lo demás — las herramientas que
  le das, cómo administras su contexto, qué pasa cuando la tarea dura 40
  minutos, cómo pide permiso antes de hacer algo irreversible.
</p>

<p style="margin:0 0 24px 0;">
  Cuando un agente falla, casi nunca es porque el modelo no supo. Es porque el
  harness no existía. Y el harness sí lo construyes tú.
</p>

${emailCallout(
  `Cada entrega trae <strong>un video</strong> con el código escrito en vivo y
   <strong>una carpeta del repositorio</strong> que puedes clonar y correr.`,
  { title: "Cómo funciona esto" },
  "light"
)}

<h3 style="margin:0 0 10px 0;color:#19262A;font-size:18px;">El camino</h3>
<ol style="margin:0 0 24px 0;padding-left:20px;color:#475569;">
  <li style="margin-bottom:6px;"><strong style="color:#19262A;">El mínimo arnés</strong> — la llamada cruda, la primera herramienta y el loop.</li>
  <li style="margin-bottom:6px;"><strong style="color:#19262A;">La interfaz web</strong> — sacar al agente de la terminal y meterlo al navegador.</li>
  <li style="margin-bottom:6px;">Contexto y memoria — que no pague dos veces lo que ya sabe.</li>
  <li>Ejecución durable y permisos — que aguante 40 minutos y no borre nada.</li>
</ol>

<p style="margin:0 0 8px 0;color:#475569;">
  Mientras llega el primer video, el PDF con las seis piezas:
</p>
<div style="margin:0 0 24px 0;">${emailButton(
      "Descargar las seis piezas",
      PDF_URL
    )}</div>

${emailTeaser(
  {
    title:
      "El mínimo arnés — un agente completo en menos de cien líneas, con video y repositorio.",
  },
  "light"
)}

<p style="color:#19262A;margin:16px 0 4px 0;">Abrazo. bliss.</p>
`,
    {
      preheader: "El modelo lo compras; el harness lo construyes. Ahí se decide todo.",
      theme: "light",
    }
  ),
};

const emailTwo = {
  order: 2,
  schedulingType: "delay",
  delayDays: 3,
  subject: "Un agente cabe en cien líneas (aquí está el código)",
  content: wrapEmailHtml(
    `
<h1 style="font-size:24px;margin:0 0 12px 0;color:#19262A;">El mínimo arnés 🔧</h1>

<p style="margin:0 0 16px 0;">
  La palabra "agente" carga mucho peso para lo que en realidad es. En este
  video lo escribimos completo, sin SDK y sin framework: un <code style="background:#f6fafa;padding:2px 6px;border-radius:4px;">fetch</code>
  a la API, una herramienta y un <code style="background:#f6fafa;padding:2px 6px;border-radius:4px;">while</code>.
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

<p style="margin:0 0 16px 0;">El ciclo es siempre el mismo 🔄</p>

<p style="margin:0 0 16px 0;">
  Le describes al modelo qué herramientas
  existen, él pide ejecutar una, tú la ejecutas y le devuelves el resultado,
  y vuelves a llamarlo con el historial completo. Cuando responde con texto en
  lugar de pedir otra herramienta, terminó. Eso es todo el arnés. Los
  frameworks de agentes son ese loop con adornos encima.
</p>

<p style="margin:0 0 16px 0;">
  Y la memoria del agente es el historial que le devuelves en cada vuelta: un arreglo.
</p>

${emailCallout(
  `El repositorio del taller crece con cada entrega. La primera trae cinco
   scripts numerados que se leen en orden, del <code>fetch</code> pelón al
   agente que abre un navegador y se mira a sí mismo.`,
  { title: "Para clonar y correr" },
  "light"
)}

<div style="margin:0 0 24px 0;">${emailButton(
      `<img src="${GITHUB_MARK}" alt="" width="18" height="18" style="width:18px;height:18px;vertical-align:middle;border:0;margin-right:8px;" />Ver el repositorio`,
      REPO_URL
    )}</div>

<p style="margin:0 0 24px 0;color:#475569;">
  Necesitas una llave de la API y Node. <code style="background:#f6fafa;padding:2px 6px;border-radius:4px;">npm install</code>,
  tu llave en el <code style="background:#f6fafa;padding:2px 6px;border-radius:4px;">.env</code> y ya está corriendo.
</p>

${emailTeaser(
  {
    title:
      "La interfaz web — el agente sale de la terminal y se muda al navegador, con streaming en vivo.",
  },
  "light"
)}

<p style="color:#19262A;margin:16px 0 4px 0;">Abrazo. bliss. 🔧🤖</p>
`,
    {
      preheader: "Sin SDK, sin framework: un fetch, una herramienta y un while.",
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
