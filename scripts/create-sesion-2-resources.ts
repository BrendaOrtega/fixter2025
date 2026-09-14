/**
 * Materiales de la sesión 2 del taller. Van colgados del videoId.
 *
 * `legacyPath` es único y Prisma escribe null explícito: el segundo recurso sin
 * el campo revienta con P2002. Se crea con un valor único y se le quita después.
 *
 *   npx tsx --env-file=.env scripts/create-sesion-2-resources.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const VIDEO_SLUG = "sesion-2-la-ui-y-su-caja";

const ITEMS = [
  {
    slug: "repo-acp-agent-ui-s2",
    kind: "repo",
    title: "Repositorio del taller: acp-agent-ui",
    externalUrl: "https://github.com/blissito/acp-agent-ui",
  },
  {
    slug: "spec2-ui-solida",
    kind: "link",
    title: "Spec de esta sesión: una UI sólida",
    externalUrl:
      "https://github.com/blissito/acp-agent-ui/blob/main/docs/spec2-ui-solida.md",
  },
  {
    slug: "ghosty-lite-docs",
    kind: "link",
    title: "EasyBits · Ghosty Lite, el agente en la caja",
    externalUrl: "https://www.easybits.cloud/docs#ghosty-lite",
  },
  {
    slug: "acp-server-s2",
    kind: "link",
    title: "app/.server/acp.ts — el puente ACP y la tarjeta de tool",
    externalUrl:
      "https://github.com/blissito/acp-agent-ui/blob/main/app/.server/acp.ts",
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
