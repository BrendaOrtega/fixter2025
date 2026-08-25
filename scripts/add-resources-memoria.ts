/**
 * Materiales de la entrega 4 ("Dónde vive lo que el agente recuerda").
 *
 * Sin esto la pestaña de materiales sale vacía y el deck no aparece por ningún
 * lado. Las slides quedan además con ruta corta `/memoria/slides`, para pegar.
 *
 * Idempotente: upsert por la pareja (videoId, slug).
 *   npx tsx --env-file=.env scripts/add-resources-memoria.ts
 */
import { db } from "../app/.server/db";

const VIDEO_SLUG = "memoria-sqlite";
const REPO = "https://github.com/blissito/taller-arnes-grok";
const ENTREGA = `${REPO}/tree/main/entregas/04-memoria`;

const RECURSOS = [
  {
    slug: "slides",
    kind: "slides",
    title: "Slides de la entrega (17)",
    externalUrl: "/slides/agentes-que-recuerdan.html",
    // Ruta corta, como `/sandboxing/slides`. Al traerla desde el principio se
    // evita el segundo script que hizo falta con el webinar 2.
    legacyPath: "/memoria/slides",
  },
  {
    slug: "repo",
    kind: "repo",
    title: "El código de la entrega: memoria en markdown + índice SQLite",
    externalUrl: ENTREGA,
  },
];

async function main() {
  const video = await db.video.findUnique({
    where: { slug: VIDEO_SLUG },
    select: { id: true, title: true },
  });
  if (!video) throw new Error(`No existe el video ${VIDEO_SLUG}`);
  console.log(`🎬 ${video.title}`);

  for (const r of RECURSOS) {
    const existente = await db.resource.findFirst({
      where: { videoId: video.id, slug: r.slug },
    });
    if (existente) {
      await db.resource.update({ where: { id: existente.id }, data: r });
      console.log(`✏️  ${r.slug} — ${r.title}`);
      continue;
    }

    if ("legacyPath" in r) {
      await db.resource.create({ data: { ...r, videoId: video.id } });
      console.log(`✅ ${r.slug} — ${r.title}  ·  corta: ${r.legacyPath}`);
      continue;
    }

    // `legacyPath` es único y los recursos viejos NO traen el campo, mientras
    // que Prisma lo escribe como `null` explícito: el segundo `null` choca
    // contra el índice y revienta con P2002 hablando de una ruta legacy que
    // nadie pidió. Se crea con un valor único y de inmediato se le quita.
    const creado = await db.resource.create({
      data: { ...r, videoId: video.id, legacyPath: `tmp:${video.id}:${r.slug}` },
    });
    await db.$runCommandRaw({
      update: "Resource",
      updates: [
        { q: { _id: { $oid: creado.id } }, u: { $unset: { legacyPath: "" } } },
      ],
    });
    console.log(`✅ ${r.slug} — ${r.title}`);
  }

  // Se cuenta con Prisma, no con un `find` crudo: un insert en crudo deja el
  // videoId como `{$oid}` y Prisma no lo encuentra, sin que nada falle.
  const total = await db.resource.count({ where: { videoId: video.id } });
  console.log(`\nLa entrega queda con ${total} materiales.`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exitCode = 1;
  })
  .finally(() => process.exit(0));
