/**
 * Materiales de la sesión 5 del taller. Van colgados del videoId.
 *
 * `legacyPath` es único y Prisma escribe null explícito: el segundo recurso sin
 * el campo revienta con P2002. Se crea con un valor único y se le quita después.
 *
 *   npx tsx --env-file=.env scripts/create-sesion-5-resources.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const VIDEO_SLUG = "sesion-5-un-backend-n-canales";

const ITEMS = [
  {
    slug: "repo-acp-agent-ui-s5",
    kind: "repo",
    title: "Repositorio del taller: acp-agent-ui",
    externalUrl: "https://github.com/blissito/acp-agent-ui",
  },
  {
    slug: "spec5-canales",
    kind: "link",
    title: "Spec de esta sesión: un backend, n canales (WhatsApp por Baileys)",
    externalUrl:
      "https://github.com/blissito/acp-agent-ui/blob/sesion-5-ensayo/docs/spec5-canales.md",
  },
  {
    slug: "spec5-operacion",
    kind: "link",
    title: "Spec 5 · Operación: hosteada en la caja, voz y la superficie del grupo",
    externalUrl:
      "https://github.com/blissito/acp-agent-ui/blob/sesion-5-ensayo/docs/spec5-operacion.md",
  },
  {
    slug: "whatsapp-server-s5",
    kind: "link",
    title: "app/.server/whatsapp.ts — Baileys: vincular, filtrar y un turno por mensaje",
    externalUrl:
      "https://github.com/blissito/acp-agent-ui/blob/sesion-5-ensayo/app/.server/whatsapp.ts",
  },
  {
    slug: "baileys-repo",
    kind: "link",
    title: "Baileys — la librería no oficial de WhatsApp Web",
    externalUrl: "https://github.com/WhiskeySockets/Baileys",
  },
];

async function main() {
  const video = await prisma.video.findUnique({
    where: { slug: VIDEO_SLUG },
    select: { id: true },
  });
  if (!video) throw new Error(`No existe el video ${VIDEO_SLUG}`);

  for (const item of ITEMS) {
    const created = await prisma.resource.upsert({
      where: { videoId_slug: { videoId: video.id, slug: item.slug } },
      update: { ...item, videoId: video.id },
      create: {
        ...item,
        videoId: video.id,
        legacyPath: `tmp-${item.slug}-${video.id}`,
      },
    });
    await prisma.$runCommandRaw({
      update: "Resource",
      updates: [
        {
          q: { _id: { $oid: created.id } },
          u: { $unset: { legacyPath: "" } },
        },
      ],
    });
    console.log(`✅ ${item.title}`);
  }

  const count = await prisma.resource.count({ where: { videoId: video.id } });
  console.log(`\nRecursos del video (contados con Prisma): ${count}`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
