/**
 * Pasa el programa "Diseño de sistemas agénticos" a on-demand.
 *
 * Una sola oferta con dos niveles ($3,490 / $4,990). Las secuencias que
 * regalaban las lecciones por correo se cierran: la compra es la puerta.
 * Solo UPDATEs; nada se borra. Correr con `npx tsx scripts/sistemas-agenticos-on-demand.ts`.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const COURSE_ID = "6a78ff744a8e00e3b2eea500";
const SEQUENCES_TO_CLOSE = [
  "6a7df909e5a1dfc09e842fd3", // Introducción a los agentes de IA
  "6a7a496344caa1db8e558fc3", // Preparación
  "6a8f63d1aafb501439ac504c", // ACP desde cero
];

// Bienvenida común: apunta al visor, no a fechas
const welcomeBlocks = (tuCaso: boolean) => [
  { type: "text", html: '<span style="font-family:inherit;font-size:26px;font-weight:bold;">¡Hola {{name}}! 🎉</span>' },
  { type: "text", html: "Ya tienes acceso completo a <strong>Diseño de sistemas agénticos</strong>: 17 horas de video, los repos y materiales de cada pieza, y la comunidad para construir tu agente." },
  { type: "button", label: "Entrar al programa →", href: "{{courseUrl}}" },
  { type: "text", html: "<strong>Qué sigue</strong>" },
  { type: "text", html: "<strong>1. Crea tu cuenta en EasyBits</strong> (easybits.cloud): el trial trae crédito para las cajas y el modelo mientras sigues el programa." },
  { type: "text", html: "<strong>2. Tu invitación a Ghosty Teams</strong> llega a este correo: ahí vive la comunidad del programa." },
  { type: "text", html: "<strong>3. Prepara tu entorno</strong> en 2 minutos, antes de la primera lección:" },
  { type: "button", label: "Instalar GhostyCode →", href: "https://www.fixtergeek.com/sistemas-agenticos#instalar" },
  ...(tuCaso
    ? [
        { type: "divider" },
        { type: "text", html: "<strong>Tu sesión 1-a-1.</strong> Cuando tengas tu agente corriendo, escríbeme por <a href=\"https://wa.me/527712412825\" style=\"color:#37AB93;\">WhatsApp</a> con el link a tu repo y agendamos los 60 minutos sobre tu caso." },
      ]
    : []),
  { type: "divider" },
  { type: "text", html: "¿Dudas? Escríbeme directo por <a href=\"https://wa.me/527712412825\" style=\"color:#37AB93;\">WhatsApp</a>." },
  { type: "text", html: "Abrazo. Blissmo. 🤓" },
];

async function main() {
  // 1. El curso
  await db.course.update({
    where: { id: COURSE_ID },
    data: { stage: "on-demand", basePrice: 3490, totalSessions: 5, isLive: false },
  });
  console.log("course → on-demand, $3,490");

  // 2. Lecciones: lo que se regalaba por secuencia ahora es de pago. Los
  //    webinars siguen "subscriber" (gratis con correo): son el embudo.
  const paid = await db.video.updateMany({
    where: { courseIds: { has: COURSE_ID }, accessLevel: "sequence", m3u8: { not: null } },
    data: { accessLevel: "paid", isPublic: true },
  });
  console.log(`videos sequence → paid: ${paid.count}`);
  await db.video.updateMany({
    where: { courseIds: { has: COURSE_ID }, slug: "acp-trailer" },
    data: { accessLevel: "public" }, // el trailer es el gancho del módulo
  });
  // Módulos con el nombre que se ve en el visor
  const modules: Record<string, string[]> = {
    "Preparación": ["grok-arnes-minimo", "grok-interfaz-web", "sdk-deepseek", "memoria-sqlite"],
    "Webinars": ["anatomia-de-un-sistema-agentico", "sandboxing-la-caja-donde-vive-tu-agente", "agentes-en-produccion"],
    "Las sesiones": ["sesion-1-de-stdio-a-la-caja", "sesion-2-la-ui-y-su-caja", "los-4-tipos-de-memoria-2026-09-09-0220", "sesion-4-permisos-y-extensiones"],
  };
  for (const [moduleName, slugs] of Object.entries(modules)) {
    await db.video.updateMany({ where: { courseIds: { has: COURSE_ID }, slug: { in: slugs } }, data: { moduleName } });
  }
  // Las sesiones son "sesion" aunque dos quedaron como "leccion" al subirlas
  await db.video.updateMany({
    where: { courseIds: { has: COURSE_ID }, slug: { in: modules["Las sesiones"] } },
    data: { kind: "sesion" },
  });

  // 3. Secuencias: dejan de ser puerta pública
  const seq = await db.sequence.updateMany({ where: { id: { in: SEQUENCES_TO_CLOSE } }, data: { isPrivate: true, isFeatured: false } });
  console.log(`secuencias privadas: ${seq.count}`);

  // 4. Productos: el existente se vuelve el nivel base; nace el de "Tu caso"
  await db.product.update({
    where: { key: "sistemas-agenticos-workshop" },
    data: {
      title: "Diseño de sistemas agénticos — Programa completo",
      priceMxn: 3490,
      sequences: [],
      welcome: {
        subject: "Ya tienes acceso a Diseño de sistemas agénticos 🎉",
        preheader: "17 horas de video, repos, materiales y tokens: todo en tu visor.",
        theme: "light",
        blocks: welcomeBlocks(false),
      },
    },
  });
  await db.product.upsert({
    where: { key: "sistemas-agenticos-tu-caso" },
    create: {
      key: "sistemas-agenticos-tu-caso",
      title: "Diseño de sistemas agénticos — Programa + Tu caso (1-a-1)",
      courseSlugs: ["sistemas-agenticos"],
      userTags: ["newsletter"],
      subscriberTags: ["sistemas-agenticos-paid", "sistemas-agenticos-1a1"],
      priceMxn: 4990,
      successPath: "/cursos/sistemas-agenticos/viewer",
      sequences: [],
      welcome: {
        subject: "Ya tienes acceso a Diseño de sistemas agénticos + tu sesión 1-a-1 🎉",
        preheader: "17 horas de video, repos, tokens, y una sesión privada sobre tu agente.",
        theme: "light",
        blocks: welcomeBlocks(true),
      },
    },
    update: { priceMxn: 4990, active: true },
  });
  console.log("productos listos");

  // Los `legacyPath` con prefijo tmp… se quedan: el índice único no es
  // sparse en Mongo y dos `null` chocan.
}

main().finally(() => db.$disconnect());
