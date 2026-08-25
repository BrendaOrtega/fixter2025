/**
 * Secuencia "Introducción a los agentes de IA" (comunidad /c/agentes).
 *
 * Crea las entregas 2 a 4: quien se daba de alta recibía el correo de
 * bienvenida y nunca más.
 *
 * **El 25 de agosto la serie se cerró en la entrega 4** (memoria). La 5
 * —ejecución durable y permisos— se cayó: puede grabarse más adelante, pero sin
 * prometerlo en el correo. Un teaser que promete algo que no llega se paga
 * caro, así que la 4 cierra mandando a la comunidad y a los webinars.
 *
 * **El 17 de agosto la entrega del SDK se metió en el 3** —es el video que se
 * grabó— y memoria y sandboxing se corrieron a 4 y 5. Nadie había recibido
 * todavía el correo 3, así que el cambio no le movió el piso a nadie. El orden
 * queda igual al del repo del taller, donde `03-sdk-deepseek` va antes que la
 * memoria.
 *
 * Los videos de las últimas entregas todavía no existen, así que su correo
 * lleva la card en modo placeholder —misma forma, con el póster en gris y sin
 * link— para que el hueco se vea y no se olvide. Cuando un video se publique,
 * se llena su entrada en VIDEOS y se vuelve a correr el script.
 *
 * Idempotente: upsert por `order`, se puede correr las veces que sea.
 *   npx tsx --env-file=.env scripts/update-agentes-sequence-2-5.ts
 */
import { db } from "../app/.server/db";
import {
  wrapEmailHtml,
  emailVideoCard,
  emailCallout,
  emailTeaser,
} from "../app/utils/emailShell";

const SEQUENCE_ID = "6a7df909e5a1dfc09e842fd3";
const FROM_NAME = "Héctorbliss de FixterGeek";
const FROM_EMAIL = "secuencias@fixtergeek.com";

const REPO_URL = "https://github.com/blissito/taller-arnes-grok";
const YOUTUBE_URL = "https://www.youtube.com/@fixtergeek?sub_confirmation=1";
const COMUNIDAD_URL = "https://www.fixtergeek.com/c/agentes";
const VIEWER = (slug: string) =>
  `https://www.fixtergeek.com/cursos/sistemas-agenticos/viewer?videoSlug=${slug}`;

// Mark oficial de GitHub. PNG y no SVG: Gmail y Outlook no renderizan SVG.
const GITHUB_ICON = "https://github.githubassets.com/favicons/favicon.png";

/**
 * El video de cada entrega. Mientras `slug` sea null la card sale en
 * placeholder; en cuanto exista el video se llenan los cuatro campos y se
 * vuelve a correr el script — no hay que tocar el cuerpo del correo.
 */
const VIDEOS: Record<
  number,
  { slug: string | null; titulo: string; duracion: string | null; poster: string | null }
> = {
  2: {
    slug: "grok-interfaz-web",
    titulo: "El agente construye su propia interfaz",
    duracion: "40 min",
    // Póster con ACL público: en un correo no hay quien firme una URL.
    poster:
      "https://wild-bird-2039.fly.storage.tigris.dev/fixtergeek/videos/6a78ff744a8e00e3b2eea500/6a82179a444b718b605e2a1c/poster-yt-v2.jpg",
  },
  3: {
    slug: "sdk-deepseek",
    titulo: "Un arnés más sólido: Vercel AI SDK",
    duracion: "7 min",
    poster: "https://wild-bird-2039.t3.storage.dev/videos/posters/sdk-deepseek.jpg",
  },
  4: {
    slug: "memoria-sqlite",
    titulo: "Dónde vive lo que el agente recuerda",
    duracion: "45 min",
    poster: "https://wild-bird-2039.t3.storage.dev/videos/posters/memoria-sqlite-v2.jpg",
  },
};

/**
 * Card del video. Con slug es la misma de la entrega 1; sin slug es un hueco
 * declarado: mismo tamaño y misma posición, en gris y sin botón, para que el
 * correo no cambie de forma cuando el video llegue.
 */
function videoCard(order: number): string {
  const v = VIDEOS[order];
  if (v.slug && v.poster) {
    return emailVideoCard(
      {
        posterUrl: v.poster,
        href: VIEWER(v.slug),
        title: v.titulo,
        duration: v.duracion,
      },
      "light"
    );
  }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px 0;background:#f7faf9;border:1px dashed #cbd8d8;border-radius:12px;">
  <tr><td style="padding:28px 16px;text-align:center;color:#7e9499;font-size:14px;line-height:1.5;">
    🎬 <strong style="color:#5c7076;">${v.titulo}</strong><br/>
    El video de esta entrega está en edición.
  </td></tr>
</table>`;
}

const h1 = (text: string) =>
  `<h1 style="font-size:24px;margin:0 0 12px 0;color:#19262A;">${text}</h1>`;
const p = (html: string) => `<p style="margin:0 0 20px 0;">${html}</p>`;
const code = (text: string) =>
  `<code style="background:#f6fafa;padding:2px 6px;border-radius:4px;">${text}</code>`;
const link = (text: string, href: string) =>
  `<a href="${href}" target="_blank" rel="noopener" style="color:#0E8F79;font-weight:bold;text-decoration:underline;">${text}</a>`;
const firma = `<p style="color:#19262A;margin:16px 0 4px 0;">Abrazo. Blissmo. 🤓</p>`;

/**
 * Lista de bullets. El video lleva el contenido y el correo solo lo enmarca:
 * cuatro líneas se leen de un vistazo, cuatro párrafos no se leen.
 */
const bullets = (items: string[]) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px 0;">
${items
  .map(
    (t) =>
      `  <tr><td style="padding:0 0 8px 0;color:#19262A;font-size:15px;line-height:1.5;"><span style="color:#0E8F79;">▸</span> ${t}</td></tr>`
  )
  .join("\n")}
</table>`;

/** Botón al repositorio, con el mark de GitHub adentro (igual que la entrega 1). */
function repoButton(label: string, href: string): string {
  return `<div style="margin:0 0 24px 0;"><a href="${href}" target="_blank" rel="noopener" style="display:inline-block;background:#85DDCB;color:#0E1317;text-decoration:none;padding:12px 24px;border-radius:24px;font-size:16px;font-weight:bold;margin:8px 0;white-space:nowrap;"><span style="display:inline-block;vertical-align:middle;white-space:nowrap;"><img src="${GITHUB_ICON}" alt="" width="18" height="18" style="width:18px;height:18px;display:inline-block;vertical-align:middle;border:0;margin-right:8px;" /><span style="display:inline-block;vertical-align:middle;">${label}</span></span></a></div>`;
}

// ── Entrega 2 ──────────────────────────────────────────────────────────────
const entrega2 = wrapEmailHtml(
  [
    h1("El agente sale de la terminal 🪟"),
    p(
      `Le pides desde la consola que <strong>construya su propia interfaz</strong>. Pero antes de ponerlo a trabajar le entregas un <em>spec</em>: la arquitectura, los endpoints, los eventos y hasta las trampas que ya sabes que existen. Es spec-driven, y le ahorra al agente atorarse donde tú ya te atoraste.`
    ),
    videoCard(2),
    emailCallout(
      `La frase que abre el spec: <strong>«si algo aquí no se cumple, está mal aunque funcione»</strong>. Un agente sin contrato construye algo que corre y no sirve.`,
      { title: "La regla" },
      "light"
    ),
    p(
      `El patrón que lo cambia todo es <strong>Agent Native</strong>: las tools dejan de ser tools y se vuelven <em>acciones</em>. Una acción se declara una sola vez —nombre, parámetros, etiqueta y ejecución— y de ahí comen todas las superficies: la interfaz, el agente, HTTP, el CLI. El agente puede disparar lo mismo que dispara un clic.`
    ),
    p(
      `En ${code("main")} está el andamio con la página vacía —eso es lo que construyes— y en la rama ${code(
        "referencia/02-interfaz-web"
      )}, a dónde se llega.`
    ),
    repoButton("Ver el código", `${REPO_URL}/tree/main/entregas/02-interfaz-web`),
    // Sin tema concreto a propósito: la entrega 3 se decide después, y un
    // teaser que promete algo distinto a lo que llega se paga caro.
    emailTeaser(
      {
        title:
          "Seguimos construyendo sobre este mismo agente. Te aviso en cuanto esté lista.",
        when: "en unos días",
      },
      "light"
    ),
    firma,
  ].join("\n"),
  {
    preheader: "Spec-driven y acciones: el agente construye su propia interfaz.",
    theme: "light",
  }
);

// ── Entrega 3 ──────────────────────────────────────────────────────────────
const entrega3 = wrapEmailHtml(
  [
    h1("Cambiamos el arnés por uno más sólido 🌉"),
    p(
      `Escribir el loop a mano fue lo que te dejó entender qué hace un agente por dentro. Mantenerlo ya no enseña nada, así que debajo del mismo agente pusimos el <strong>AI SDK de Vercel</strong>, y de paso cambiamos Grok por DeepSeek. 🎬`
    ),
    videoCard(3),
    p(`Lo que ganamos en el cambio, en 7 minutos:`),
    bullets([
      `<strong>500 líneas borradas</strong>: el buffer de NDJSON, el parseo del stream a mano y el protocolo que yo mismo inventé para hablarle a la interfaz.`,
      `Un esquema en Zod, y de ahí salen el tipo, la validación y lo que ve el modelo.`,
      `Tres streams por un mismo canal, y <strong>uno es tuyo</strong>: eso es lo que hace posibles los artefactos.`,
      `Los ojos son intercambiables: pones la llave de Anthropic, Google u OpenAI y otro modelo mira por DeepSeek.`,
    ]),
    p(
      `Lo que no cambió es Agent Native: las acciones se siguen declarando una sola vez en ${code(
        "actions.ts"
      )}.`
    ),
    repoButton(
      "El código de la entrega",
      `${REPO_URL}/tree/main/entregas/03-sdk-deepseek`
    ),
    emailTeaser(
      {
        title:
          "Dónde vive lo que tu agente recuerda — hoy reinicias el servidor y no se acuerda de nada.",
      },
      "light"
    ),
    firma,
  ].join("\n"),
  {
    preheader: "500 líneas menos, tres streams por un canal y el caché 30× más barato.",
    theme: "light",
  }
);

// ── Entrega 4 ──────────────────────────────────────────────────────────────
// Cierra la serie. Sin teaser a propósito: la entrega 5 se cayó y prometer un
// video que quizá se grabe dentro de un mes deja a la gente esperando.
const entrega4 = wrapEmailHtml(
  [
    h1("Dónde vive lo que el agente recuerda 🧠"),
    p(
      `Reinicias el servidor y te saluda como si no te conociera. En esta última entrega le damos memoria de verdad: <strong>archivos de markdown en disco</strong>, y un índice de SQLite encima. 🎬`
    ),
    videoCard(4),
    p(`Lo que se construye:`),
    bullets([
      `Cada recuerdo es un ${code(".md")} que <strong>abres con tu editor</strong>. Si el agente aprendió mal, lo corriges a mano; y ${code(
        "git diff"
      )} te dice qué aprendió esta semana.`,
      `<strong>El índice es desechable.</strong> Lo borras, se reconstruye desde los archivos y vuelve idéntico. Es el ${code(
        "dist/"
      )} de tu memoria.`,
      `<strong>Búsqueda híbrida</strong>: FTS5 encuentra la palabra exacta y los vectores encuentran el significado. Las dos viven en el mismo archivo.`,
      `Y <strong>sobrevive a la caja</strong>: el sandbox muere, los ${code(
        ".md"
      )} se sincronizan y el índice se rehace al arrancar.`,
    ]),
    emailCallout(
      `SQLite viene <strong>dentro de Node 22</strong>, con FTS5 compilado. Cero ${code(
        "npm install"
      )}, y la memoria entera cabe en un archivo que copias con ${code("cp")}.`,
      { title: "Sin infraestructura" },
      "light"
    ),
    repoButton("El código de la entrega", `${REPO_URL}/tree/main/entregas/04-memoria`),
    p(
      `Con esto el arnés está completo: el loop, la interfaz, el SDK y la memoria. Lo que sigue lo vemos en ${link(
        "la comunidad",
        COMUNIDAD_URL
      )} y en los webinars de los jueves, que son abiertos. 🤓`
    ),
    firma,
  ].join("\n"),
  {
    preheader: "Markdown en disco, SQLite como índice, y vectores incluidos.",
    theme: "light",
  }
);

// ── Alta ───────────────────────────────────────────────────────────────────
const entregas = [
  {
    order: 2,
    subject: "La interfaz web: el agente sale de la terminal",
    content: entrega2,
    delayDays: 3,
  },
  {
    order: 3,
    subject: "Cambiamos el arnés por uno más sólido",
    content: entrega3,
    delayDays: 4,
  },
  {
    order: 4,
    subject: "Dónde vive lo que tu agente recuerda",
    content: entrega4,
    delayDays: 4,
  },
];

async function main() {
  const seq = await db.sequence.findUnique({
    where: { id: SEQUENCE_ID },
    include: { emails: true },
  });
  if (!seq) throw new Error(`No existe la secuencia ${SEQUENCE_ID}`);

  for (const e of entregas) {
    const existente = seq.emails.find((x) => x.order === e.order);
    const data = {
      sequenceId: SEQUENCE_ID,
      order: e.order,
      schedulingType: "delay",
      delayDays: e.delayDays,
      subject: e.subject,
      content: e.content,
      videoSlug: VIDEOS[e.order].slug,
      fromName: FROM_NAME,
      fromEmail: FROM_EMAIL,
    };

    if (existente) {
      // `delayDays` NO se toca al actualizar: es el dato que se acomoda a mano
      // desde el riel, y pisarlo aquí borraba en silencio el ajuste que acababa
      // de hacerse en la UI cada vez que se corregía un texto.
      const { delayDays: _ignorado, ...sinEspera } = data;
      await db.sequenceEmail.update({
        where: { id: existente.id },
        data: sinEspera,
      });
      console.log(
        `✏️  actualizada #${e.order} — ${e.subject} (espera intacta: ${existente.delayDays}d)`
      );
    } else {
      await db.sequenceEmail.create({ data });
      console.log(`✅ creada #${e.order} — ${e.subject}`);
    }
  }

  // La entrega 5 se cayó: si quedó creada de una corrida anterior, se borra.
  // Solo si nadie la recibió — con envíos de por medio hay eventos apuntando a
  // su id, y borrarla los deja huérfanos sin que nada avise.
  const sobrante = seq.emails.find((x) => x.order === 5);
  if (sobrante) {
    const enviados = await db.sequenceEmailEvent.count({
      where: { sequenceEmailId: sobrante.id, type: "sent" },
    });
    if (enviados > 0) {
      console.log(
        `⚠️  la #5 ya se envió a ${enviados} persona(s): se deja en su lugar. Bórrala desde el panel si de verdad quieres perder sus métricas.`
      );
    } else {
      await db.sequenceEmail.delete({ where: { id: sobrante.id } });
      console.log(`🗑️  borrada #5 — ${sobrante.subject} (nadie la había recibido)`);
    }
  }

  const total = await db.sequenceEmail.count({
    where: { sequenceId: SEQUENCE_ID },
  });
  console.log(`\nLa secuencia queda con ${total} correos.`);
}

main().then(() => process.exit(0));
