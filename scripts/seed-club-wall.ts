/**
 * Contenido inicial del muro del Club de Agentes de IA (10-nov-2026): la
 * primera llamada en vivo (hoy 7 pm CDMX), su anuncio fijado y público, y tres
 * publicaciones públicas con posts reales del blog. Nada inventado: el autor
 * es el dueño de la comunidad y los textos salen del blog.
 *
 * Idempotente. Sin flags sólo muestra lo que haría:
 *   npx tsx --env-file=.env scripts/seed-club-wall.ts
 *   npx tsx --env-file=.env scripts/seed-club-wall.ts --write
 */
import { db } from "../app/.server/db";
import { buildLinkPreview } from "../app/.server/services/wall.server";

const SLUG = "club-de-agentes";
const write = process.argv.includes("--write");

// 10-nov-2026, 19:00–20:30 en CDMX (UTC−6).
const CALL = {
  title: "Primera llamada del Club de Agentes de IA",
  startsAt: new Date("2026-11-11T01:00:00Z"),
  endsAt: new Date("2026-11-11T02:30:00Z"),
};

const ANNOUNCEMENT = `## 🎙 Hoy a las 7 pm (CDMX): primera llamada del club

Abrimos el Club de Agentes de IA con una llamada en vivo. Trae el agente que estás construyendo o la duda que se te atoró: la llamada es para eso.

- **Cuándo:** hoy, martes 10 de noviembre, 7:00 pm hora del centro de México.
- **Dónde:** aquí mismo. El botón **«Entrar a la llamada»** de arriba se enciende 15 minutos antes.
- **Quién entra:** los miembros del club. Si compraste un curso en FixterGeek, activa tus 3 meses gratis y entras.

Nos vemos adentro.`;

const BLOG_SLUGS = [
  "busqueda-exacta-sin-vectores",
  "agente-acp-en-una-caja",
  "npx-skills-vercel-ghosty-studio",
];

async function main() {
  const community = await db.community.findUnique({ where: { slug: SLUG } });
  if (!community) throw new Error(`No existe la comunidad ${SLUG}`);
  const authorId = community.ownerId;

  const posts = await db.post.findMany({
    where: { slug: { in: BLOG_SLUGS }, published: true },
    select: { slug: true, title: true, metaDescription: true },
  });
  const blogBodies = BLOG_SLUGS.map((slug) => posts.find((p) => p.slug === slug))
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map(
      (p) =>
        `📖 Lectura recomendada para el club: [${p.title}](https://www.fixtergeek.com/blog/${p.slug})`
    );

  console.log(`Llamada: ${CALL.title} · ${CALL.startsAt.toISOString()}`);
  console.log(`Anuncio fijado + ${blogBodies.length} posts del blog`);
  if (!write) {
    console.log("Modo vista. Corre con --write para escribir.");
    return;
  }

  const existingEvent = await db.communityEvent.findFirst({
    where: { communityId: community.id, startsAt: CALL.startsAt },
  });
  if (!existingEvent) {
    await db.communityEvent.create({ data: { communityId: community.id, ...CALL } });
  }

  // Idempotencia: no se repite un cuerpo que ya existe en el muro.
  const upsertPost = async (body: string, extra: { isPinned?: boolean }) => {
    const found = await db.communityPost.findFirst({
      where: { communityId: community.id, body },
      select: { id: true },
    });
    if (found) return false;
    await db.communityPost.create({
      data: {
        communityId: community.id,
        authorId,
        body,
        isPublic: true,
        link: (await buildLinkPreview(body)) ?? undefined,
        ...extra,
      },
    });
    return true;
  };

  // Las del blog ya creadas reciben su tarjeta (portada, título, descripción).
  const existing = await db.communityPost.findMany({
    where: { communityId: community.id, link: { isSet: false } },
    select: { id: true, body: true },
  });
  for (const p of existing) {
    const link = await buildLinkPreview(p.body);
    if (link) await db.communityPost.update({ where: { id: p.id }, data: { link } });
  }

  // Se crean del más viejo al más nuevo para que el anuncio quede arriba.
  let created = 0;
  for (const body of [...blogBodies].reverse()) {
    if (await upsertPost(body, {})) created++;
  }
  if (await upsertPost(ANNOUNCEMENT, { isPinned: true })) created++;
  console.log(`✓ Evento listo y ${created} publicaciones nuevas`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
