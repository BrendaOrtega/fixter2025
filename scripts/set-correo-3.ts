#!/usr/bin/env npx tsx
/**
 * Crea el registro Video de la sesión 3 y escribe el correo 3 de la secuencia
 * de preparación, dejándolo listo para que el cron lo mande.
 *
 * El cuerpo vive en `docs/correo-3-hooks.html` para poder abrirlo en el
 * navegador antes de guardarlo: un correo de secuencia es un documento HTML
 * completo y el marcador {{video}} tiene que quedar DENTRO del <body>.
 *
 *   npx tsx --env-file=.env scripts/set-correo-3.ts
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

const db = new PrismaClient();

const EMAIL_ID = "6a7a4e5a7f3a352906a318e1"; // correo 3 de la secuencia
const SLUG = "sesion-03-los-hooks";
const BASE = "https://wild-bird-2039.t3.storage.dev";

async function main() {
  const content = readFileSync("docs/correo-3-hooks.html", "utf8");

  if (!content.includes("{{video}}")) {
    throw new Error("El cuerpo no trae {{video}} — la tarjeta acabaría fuera del <body>.");
  }

  const video = await db.video.upsert({
    where: { slug: SLUG },
    update: {
      title: "Aquí no decide el modelo",
      duration: "2:10",
      poster: `${BASE}/videos/posters/${SLUG}-v2.jpg`,
      posterWide: `${BASE}/videos/posters/${SLUG}-wide-v2.jpg`,
      storageLink: `${BASE}/videos/${SLUG}.mp4`,
    },
    create: {
      slug: SLUG,
      title: "Aquí no decide el modelo",
      duration: "2:10",
      description:
        "El hook es el lugar del ciclo donde corre tu código; el guardrail es la regla que escribes dentro. El único control que no depende de que el modelo obedezca, en Claude Code, LangGraph y el OpenAI Agents SDK.",
      poster: `${BASE}/videos/posters/${SLUG}-v2.jpg`,
      posterWide: `${BASE}/videos/posters/${SLUG}-wide-v2.jpg`,
      storageLink: `${BASE}/videos/${SLUG}.mp4`,
      isPublic: false,
      accessLevel: "subscriber",
      index: 2,
      authorName: "blissmo",
    },
  });
  console.log(`🎬 Video ${video.slug} · ${video.title}`);

  const email = await db.sequenceEmail.update({
    where: { id: EMAIL_ID },
    data: {
      subject: "La regla que tu agente puede ignorar",
      content,
      videoSlug: SLUG,
    },
  });
  console.log(
    `✉️  Correo #${email.order} "${email.subject}" · ${content.length} chars · video=${email.videoSlug}`
  );
}

main();
