#!/usr/bin/env npx tsx
/**
 * Inspecciona la secuencia de preparación y los videos que usa, para no
 * escribir a ciegas sobre correos ya enviados.
 *
 *   npx tsx --env-file=.env scripts/inspect-preparacion.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const SEQUENCE_ID = "6a7a496344caa1db8e558fc3";

async function main() {
  const videos = await db.video.findMany({
    where: { slug: { startsWith: "sesion-0" } },
    select: {
      slug: true,
      title: true,
      duration: true,
      poster: true,
      posterWide: true,
      storageLink: true,
      isPublic: true,
      accessLevel: true,
      index: true,
      description: true,
    },
    orderBy: { slug: "asc" },
  });
  console.log("=== VIDEOS ===");
  console.log(JSON.stringify(videos, null, 2));

  const seq = await db.sequence.findUnique({
    where: { id: SEQUENCE_ID },
    include: { emails: { orderBy: { order: "asc" } } },
  });

  console.log("\n=== CORREOS ===");
  for (const e of seq?.emails ?? []) {
    console.log(
      `#${e.order} [${e.id}] "${e.subject}" · espera ${e.delayDays}d · video=${
        e.videoSlug ?? "—"
      } · cuerpo ${e.content?.length ?? 0} chars`
    );
  }
}

main();
