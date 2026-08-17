/**
 * Recursos de la entrega 3 ("Un arnés más sólido: Vercel AI SDK").
 *
 * Sin esto el viewer muestra Videos, Notas y Transcripción, pero la pestaña de
 * materiales sale vacía y el repo no aparece por ningún lado.
 *
 * A diferencia de la entrega 2 aquí NO hay rama de referencia ni spec: esta
 * entrega no se construye paso a paso, se lee. El código ya está migrado en
 * `main` y lo que importa es el antes/después.
 *
 * Idempotente: upsert por la pareja (videoId, slug).
 *   npx tsx --env-file=.env scripts/add-resources-sdk-deepseek.ts
 */
import { db } from "../app/.server/db";

const VIDEO_SLUG = "sdk-deepseek";
const REPO = "https://github.com/blissito/taller-arnes-grok";
const ENTREGA = `${REPO}/tree/main/entregas/03-sdk-deepseek`;

const RECURSOS = [
  {
    slug: "repo",
    kind: "repo",
    title: "El código de la entrega, ya migrado al AI SDK",
    externalUrl: ENTREGA,
  },
  {
    slug: "lectura",
    kind: "link",
    // Trae la tabla de las ~500 líneas que se van y quién las hace ahora, que
    // es el dato que la gente busca después de ver el video.
    title: "Qué se borró y quién lo hace ahora",
    externalUrl: `${REPO}/blob/main/entregas/03-sdk-deepseek/README.md`,
  },
  {
    slug: "vision",
    kind: "link",
    // El segundo modelo mirando por el primero, con los tres proveedores
    // intercambiables. Es el archivo que mejor muestra qué se gana.
    title: "Los ojos prestados: Anthropic, Google u OpenAI",
    externalUrl: `${REPO}/blob/main/entregas/03-sdk-deepseek/src/vision.ts`,
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
    } else {
      // `legacyPath` es único y los recursos viejos NO traen el campo, mientras
      // que Prisma lo escribe como `null` explícito: el segundo `null` choca
      // contra el índice y revienta con P2002 hablando de una ruta legacy que
      // nadie pidió. Se crea con un valor único y de inmediato se le quita el
      // campo, que es como están los que ya funcionaban.
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
