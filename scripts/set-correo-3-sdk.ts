#!/usr/bin/env npx tsx
/**
 * Mete el short del AI SDK como entrega 3 de la secuencia de preparación y
 * empuja los hooks a la 4.
 *
 * El reordenamiento se hace intercambiando `order` y `delayDays` entre los dos
 * registros, no moviendo contenido: así el ritmo de la secuencia (0, 1, 2, 1, 2
 * días) se queda pegado a la POSICIÓN y no al registro. `@@index([sequenceId,
 * order])` es índice, no restricción única, así que el intercambio no necesita
 * valor temporal.
 *
 * Idempotente: se puede volver a correr.
 *
 *   npx tsx --env-file=.env scripts/set-correo-3-sdk.ts
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

const db = new PrismaClient();

const HOOKS_ID = "6a7a4e5a7f3a352906a318e1"; // era el 3, pasa a ser el 4
const SDK_ID = "6a7a4e5a7f3a352906a318e2"; // era el 4 vacío, pasa a ser el 3
const SLUG = "el-sdk-de-vercel";
const BASE = "https://wild-bird-2039.t3.storage.dev";

// El slug NO lleva número: el orden de las entregas ya se movió una vez y un
// `sesion-04-` que vive en la posición 3 miente para siempre.
const TITULO = "El día que tiré mi propio arnés";

async function main() {
  const content = readFileSync("docs/correo-3-sdk.html", "utf8");
  if (!content.includes("{{video}}")) {
    throw new Error("El cuerpo no trae {{video}} — la tarjeta acabaría fuera del <body>.");
  }

  const datos = {
    title: TITULO,
    duration: "0:44",
    poster: `${BASE}/videos/posters/${SLUG}.jpg`,
    posterWide: `${BASE}/videos/posters/${SLUG}-wide.jpg`,
    storageLink: `${BASE}/videos/${SLUG}.mp4`,
  };

  const video = await db.video.upsert({
    where: { slug: SLUG },
    update: datos,
    create: {
      ...datos,
      slug: SLUG,
      description:
        "Zod declarado una vez para el modelo, la validación y el tipo; tres streams por un mismo canal; y el caché automático que abarata treinta veces repetir el contexto.",
      isPublic: false,
      accessLevel: "subscriber",
      index: 3,
      authorName: "blissmo",
    },
  });
  console.log(`🎬 Video ${video.slug} · ${video.title}`);

  const hooks = await db.sequenceEmail.findUniqueOrThrow({ where: { id: HOOKS_ID } });
  const sdk = await db.sequenceEmail.findUniqueOrThrow({ where: { id: SDK_ID } });

  // El intercambio solo corre si todavía no se hizo. Sin esta guarda, correrlo
  // dos veces devuelve todo a su lugar original y parece que no pasó nada.
  const yaIntercambiado = sdk.order < hooks.order;
  const posSdk = yaIntercambiado ? sdk.order : hooks.order;
  const posHooks = yaIntercambiado ? hooks.order : sdk.order;
  const esperaSdk = yaIntercambiado ? sdk.delayDays : hooks.delayDays;
  const esperaHooks = yaIntercambiado ? hooks.delayDays : sdk.delayDays;

  // Los hooks se quedan con la posición y la espera que hoy tiene el hueco.
  await db.sequenceEmail.update({
    where: { id: HOOKS_ID },
    data: {
      order: posHooks,
      delayDays: esperaHooks,
      content: readFileSync("docs/correo-4-hooks.html", "utf8"),
    },
  });

  const email = await db.sequenceEmail.update({
    where: { id: SDK_ID },
    data: {
      order: posSdk,
      delayDays: esperaSdk,
      subject: TITULO,
      content,
      videoSlug: SLUG,
    },
  });
  console.log(
    `✉️  Correo #${email.order} "${email.subject}" · ${content.length} chars · video=${email.videoSlug} · espera ${email.delayDays}d`
  );
  console.log(`✉️  Hooks movido al #${posHooks} · espera ${esperaHooks}d`);
}

main().finally(() => db.$disconnect());
