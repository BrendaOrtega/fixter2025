/**
 * Secuencia "Introducción a los agentes de IA" (comunidad /c/agentes).
 *
 * Crea las entregas 2, 3 y 4, que faltaban: quien se daba de alta recibía el
 * correo de bienvenida y nunca más.
 *
 * Los videos todavía no existen, así que cada correo lleva la card en modo
 * placeholder —misma forma que la de la entrega 1, con el póster en gris y sin
 * link— para que el hueco se vea y no se olvide. Cuando un video se publique,
 * se llena su entrada en VIDEOS y se vuelve a correr el script.
 *
 * Idempotente: upsert por `order`, se puede correr las veces que sea.
 *   npx tsx --env-file=.env scripts/update-agentes-sequence-3-4.ts
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
  3: { slug: null, titulo: "Memoria y base de datos", duracion: null, poster: null },
  // El video existe pero sigue sin publicar ni tener póster.
  4: { slug: null, titulo: "Sandboxing: la caja donde vive tu agente", duracion: null, poster: null },
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
    emailTeaser(
      { title: "Memoria y base de datos — dónde vive lo que el agente recuerda cuando cierras la pestaña." },
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
    h1("Dónde vive lo que el agente recuerda 🧠"),
    p(
      `Un agente no recuerda nada por su cuenta: en cada vuelta del loop le vuelves a mandar la conversación entera. Mientras eso vive en una variable, cerrar la pestaña —o reiniciar el servidor— lo borra todo.`
    ),
    videoCard(3),
    p(
      `Aquí la conversación se muda a la base de datos. El navegador deja de ser el dueño del estado y pasa a ser una vista: recargas, pides la sesión de vuelta y se repinta completa, con sus herramientas y sus resultados en el mismo orden.`
    ),
    emailCallout(
      `Guardar el historial y guardar la <strong>memoria</strong> son dos cosas distintas. El historial es lo que pasó en esta sesión; la memoria es lo que el agente debe seguir sabiendo en la siguiente. Si no las separas, en tres días le estás mandando un contexto que no cabe.`,
      { title: "La distinción que importa" },
      "light"
    ),
    repoButton("El código de la entrega", REPO_URL),
    emailTeaser(
      { title: "Ejecución durable y permisos — qué pasa cuando el agente tarda diez minutos." },
      "light"
    ),
    firma,
  ].join("\n"),
  {
    preheader: "La conversación se muda a la base de datos.",
    theme: "light",
  }
);

// ── Entrega 4 ──────────────────────────────────────────────────────────────
const entrega4 = wrapEmailHtml(
  [
    h1("Cuando el agente tarda, y cuando se pasa 🧱"),
    p(
      `Las entregas anteriores asumen que cada herramienta termina rápido. Le pides levantar un servidor de desarrollo y esa suposición se cae: la herramienta no regresa nunca y el chat se queda tieso.`
    ),
    videoCard(4),
    p(
      `La salida es separar lanzar de esperar. El agente arranca el proceso en segundo plano, recibe un identificador y sigue trabajando; lo consulta solo cuando necesita la URL o el error.`
    ),
    emailCallout(
      `Aquí también se decide qué <strong>no</strong> puede hacer: el agente escribe únicamente dentro de la carpeta de la app, con la ruta verificada en cada operación. Un agente que puede editar su propio arnés puede dejarte sin forma de corregirlo.`,
      { title: "Permisos" },
      "light"
    ),
    repoButton("Todo el repositorio", REPO_URL),
    p(
      `Con esto tienes el arnés completo: el loop, la interfaz, el contexto y la ejecución. Lo que sigue lo vemos en ${link(
        "la comunidad",
        COMUNIDAD_URL
      )} y en los webinars de los jueves, que son abiertos.`
    ),
    firma,
  ].join("\n"),
  {
    preheader: "Procesos que tardan, y lo que el agente no debería poder tocar.",
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
    subject: "Dónde vive lo que tu agente recuerda",
    content: entrega3,
    delayDays: 4,
  },
  {
    order: 4,
    subject: "Cuando el agente tarda diez minutos",
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

  const total = await db.sequenceEmail.count({
    where: { sequenceId: SEQUENCE_ID },
  });
  console.log(`\nLa secuencia queda con ${total} correos.`);
}

main().then(() => process.exit(0));
