/**
 * Recursos de la entrega 2 ("El agente construye su propia interfaz").
 *
 * Sin esto el viewer muestra Videos, Notas y Transcripción, pero la pestaña de
 * materiales sale vacía y el repo no aparece por ningún lado.
 *
 * Idempotente: upsert por la pareja (videoId, slug).
 *   npx tsx --env-file=.env scripts/add-resources-interfaz-web.ts
 */
import { db } from "../app/.server/db";

const VIDEO_SLUG = "grok-interfaz-web";
const REPO = "https://github.com/blissito/taller-arnes-grok";

const RECURSOS = [
  {
    slug: "repo",
    kind: "repo",
    title: "Empieza aquí: el andamio, con la página en blanco",
    externalUrl: `${REPO}/tree/main/entregas/02-interfaz-web`,
  },
  {
    slug: "referencia",
    kind: "repo",
    title: "A dónde se llega: el cajón ya construido",
    externalUrl: `${REPO}/tree/referencia/02-interfaz-web/entregas/02-interfaz-web`,
  },
  {
    slug: "spec",
    kind: "link",
    // El contrato que se le da al agente antes de ponerlo a trabajar: es el
    // centro de la sesión, no un anexo.
    title: "El spec que lee el agente antes de construir",
    externalUrl: `${REPO}/blob/main/entregas/02-interfaz-web/app/SPEC.md`,
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
      //
      // Insertar en crudo para evitar el rodeo NO sirve: `$runCommandRaw` deja
      // el `videoId` como objeto `{$oid}` en vez de ObjectId, y entonces Prisma
      // no encuentra el recurso — la pestaña de materiales se queda vacía sin
      // que nada falle.
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

  const total = await db.resource.count({ where: { videoId: video.id } });
  console.log(`\nLa entrega queda con ${total} materiales.`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exitCode = 1;
  })
  .finally(() => process.exit(0));
