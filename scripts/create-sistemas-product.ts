#!/usr/bin/env npx tsx
/**
 * El taller de sistemas agénticos, descrito como datos.
 *
 * Hasta ahora este taller se cumplía con una rama escrita a mano en el webhook
 * que conocía dos ObjectId de secuencia: uno literal en el código y otro detrás
 * de `PREPARACION_SEQUENCE_ID`. Si esa variable no estaba puesta —y no lo
 * estaba— el comprador no entraba a la secuencia de preparación y había que
 * inscribirlo a mano.
 *
 * Con este registro, `resolveProduct` lo encuentra por `metadata.type` (la
 * landing ya manda ese string), `fulfillPurchase` entrega todo y el webhook
 * termina ahí. Agregar o quitar una secuencia es editar este registro.
 *
 * Es un upsert por `key`: se puede correr las veces que haga falta.
 *
 *   npx tsx --env-file=.env scripts/create-sistemas-product.ts
 */
import { PrismaClient } from "@prisma/client";
import type { WelcomeSpec } from "~/mailSenders/sendProductWelcome";

const db = new PrismaClient();

const KEY = "sistemas-agenticos-workshop";

// Las secuencias que hoy viven hardcodeadas en stripeWebhook.ts.
const SEQ_PRIMERA_EDICION = "6a790319d7dfe60e8edcb5cd";
const SEQ_PREPARACION = "6a7a496344caa1db8e558fc3";

const CAL_DETAILS =
  "Sesión en vivo del taller Diseño de sistemas agénticos (FixterGeek). La sala es dentro de Ghosty Teams — revisa tu correo de bienvenida.";

const SESSIONS = [
  {
    label: "Sesión 1 · El harness",
    date: "Martes 1 de septiembre · 8:00–10:00 PM (CDMX)",
    start: "20260901T200000",
    end: "20260901T220000",
  },
  {
    label: "Sesión 2 · Contexto y memoria",
    date: "Jueves 3 de septiembre · 8:00–10:00 PM (CDMX)",
    start: "20260903T200000",
    end: "20260903T220000",
  },
  {
    label: "Sesión 3 · Producción",
    date: "Martes 8 de septiembre · 8:00–10:00 PM (CDMX)",
    start: "20260908T200000",
    end: "20260908T220000",
  },
  {
    label: "Sesión 4 · La interfaz",
    date: "Jueves 10 de septiembre · 8:00–10:00 PM (CDMX)",
    start: "20260910T200000",
    end: "20260910T220000",
  },
].map((s) => ({
  ...s,
  calendarTitle: `Taller Sistemas Agénticos — ${s.label}`,
  calendarDetails: CAL_DETAILS,
}));

// El mismo correo que mandaba sendSistemasWelcome.ts, ahora como bloques.
const welcome: WelcomeSpec = {
  subject: "Tu lugar en Diseño de sistemas agénticos está confirmado 🎉",
  preheader:
    "Tu lugar está confirmado — fechas, calendario y lo que sigue antes del arranque.",
  theme: "light",
  blocks: [
    {
      type: "text",
      html: '<span style="font-family:inherit;font-size:26px;font-weight:bold;">¡Hola {{name}}! 🎉</span>',
    },
    {
      type: "text",
      html: "Tu lugar en el taller <strong>Diseño de sistemas agénticos</strong> está confirmado. Vas a construir tu agente personal production-ready — del harness a la interfaz — en 2 semanas intensivas.",
    },
    { type: "sessions", title: "Las cuatro sesiones", items: SESSIONS },
    {
      type: "text",
      html: "<strong>Qué sigue</strong>",
    },
    {
      type: "text",
      html: "<strong>1. Tu invitación a Ghosty Teams</strong> llegará a este correo — ahí vive la comunidad del taller y ahí ocurren las sesiones en vivo. Si no la ves para el 28 de agosto, escríbeme por WhatsApp.",
    },
    {
      type: "text",
      html: "<strong>2. Tu API key de EasyBits</strong> con todos los tokens de DeepSeek v4 Pro que vas a necesitar te llega en un correo especial antes del arranque, con instrucciones paso a paso.",
    },
    {
      type: "text",
      html: "<strong>3. El repo con la UI inicial</strong> de tu agente se comparte en Ghosty Teams antes de la sesión 1.",
    },
    {
      type: "text",
      html: "Mientras tanto, puedes dejar tu entorno listo (toma 2 minutos):",
    },
    {
      type: "button",
      label: "Instalar GhostyCode →",
      href: "https://www.fixtergeek.com/sistemas-agenticos#instalar",
    },
    {
      type: "text",
      html: "Las grabaciones de cada sesión quedarán para siempre en tu viewer:",
    },
    { type: "button", label: "Mi curso en FixterGeek", href: "{{courseUrl}}" },
    { type: "divider" },
    {
      type: "text",
      html: '¿Dudas? Escríbeme directo por <a href="https://wa.me/527712412825" style="color:#37AB93;">WhatsApp</a>.',
    },
    {
      type: "text",
      html: "Nos vemos el martes 1 de septiembre.<br/>Abrazo. bliss.",
    },
  ],
};

async function main() {
  // Que no se cree un producto apuntando a secuencias que no existen.
  for (const id of [SEQ_PRIMERA_EDICION, SEQ_PREPARACION]) {
    const seq = await db.sequence.findUnique({ where: { id } });
    if (!seq) throw new Error(`La secuencia ${id} no existe`);
    console.log(`   ✓ ${seq.name}`);
  }

  const data = {
    title: "Taller: Diseño de sistemas agénticos",
    active: true,
    courseSlugs: ["sistemas-agenticos"],
    userTags: ["newsletter"],
    subscriberTags: ["sistemas-agenticos-paid"],
    createsUser: true,
    createsSubscriber: true,
    sequences: [
      { sequenceId: SEQ_PRIMERA_EDICION, label: "1ª edición" },
      // El correo 1 de preparación tiene delayDays 0: sale al comprar.
      { sequenceId: SEQ_PREPARACION, immediate: true, label: "preparación" },
    ],
    welcome: welcome as never,
    successPath: "/cursos/sistemas-agenticos/viewer",
  };

  const product = await db.product.upsert({
    where: { key: KEY },
    create: { key: KEY, ...data },
    update: data,
  });

  console.log(`\n📦 ${product.key} · ${product.title}`);
  console.log(`   cursos:     ${product.courseSlugs.join(", ") || "—"}`);
  console.log(
    `   secuencias: ${product.sequences
      .map((s) => `${s.label}${s.immediate ? " (inmediata)" : ""}`)
      .join(" + ")}`
  );
  console.log(`   bienvenida: ${welcome.blocks.length} bloques`);
}

main();
