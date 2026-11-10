import { db } from "~/.server/db";
import { isMembershipActive } from "~/.server/services/membership.server";

// Muro de una comunidad de pago (10-nov-2026). Todos los miembros publican y
// comentan; el dueño o un ADMIN modera. Las publicaciones públicas son la
// vitrina para quien todavía no es miembro.

export const POST_MAX = 5000;
export const COMMENT_MAX = 2000;
/** Tope por hora por persona. Una comunidad viva publica mucho menos que esto. */
export const LIMITS = { post: 10, comment: 60 } as const;

type Viewer = { id: string; role?: string | null } | null;
type MembershipLike = { status: string; currentPeriodEnd: Date | null } | null;

// ── Reglas puras (probadas en __tests__/wall.test.ts) ─────────────────────────

export function canModerate(viewer: Viewer, community: { ownerId: string }) {
  if (!viewer) return false;
  return viewer.role === "ADMIN" || viewer.id === community.ownerId;
}

export function canParticipate(
  viewer: Viewer,
  membership: MembershipLike,
  community: { ownerId: string },
  now = new Date()
) {
  if (!viewer) return false;
  return canModerate(viewer, community) || isMembershipActive(membership, now);
}

export function underLimit(kind: keyof typeof LIMITS, countLastHour: number) {
  return countLastHour < LIMITS[kind];
}

/** Limpia y valida el texto; `null` si no sirve. */
export function cleanBody(raw: unknown, max: number) {
  const body = String(raw ?? "").replace(/\r\n/g, "\n").trim();
  if (!body || body.length > max) return null;
  return body;
}

/**
 * Imágenes: el cliente sube a `wall/<userId>/…` con `api/wall-image` y manda
 * sólo la llave. Se acepta únicamente una llave del propio autor.
 */
export function isOwnImageKey(key: string, userId: string) {
  return /^wall\/[a-f0-9]{24}\/\d+-[\w.-]{1,80}$/.test(key) && key.startsWith(`wall/${userId}/`);
}

export const imageUrlFor = (key: string) => `/api/wall-image?key=${encodeURIComponent(key)}`;

export type LinkPreview = { url: string; title: string; description: string; image: string | null };

/** Primer enlace del texto, sin la puntuación que lo cierra. */
export function firstUrl(body: string) {
  const m = body.match(/https?:\/\/[^\s)<>\]]+/);
  return m ? m[0].replace(/[.,;:!?»"']+$/, "") : null;
}

/** Slug de un post de nuestro blog (fixtergeek.com/blog/<slug>), o null. */
export function blogSlugFromUrl(url: string) {
  const m = url.match(/^https?:\/\/(?:www\.)?fixtergeek\.com\/blog\/([\w-]+)\/?(?:[?#].*)?$/);
  return m ? m[1] : null;
}

/**
 * Vista previa del primer enlace. Por ahora sólo posts del blog (portada,
 * título y descripción salen de la base); los sitios externos van después.
 */
export async function buildLinkPreview(body: string): Promise<LinkPreview | null> {
  const url = firstUrl(body);
  const slug = url && blogSlugFromUrl(url);
  if (!url || !slug) return null;
  const post = await db.post.findFirst({
    where: { slug, published: true },
    select: { title: true, metaDescription: true, coverImage: true, metaImage: true },
  });
  if (!post) return null;
  return {
    url,
    title: post.title,
    description: post.metaDescription ?? "",
    image: post.coverImage || post.metaImage || null,
  };
}

// ── Consultas ────────────────────────────────────────────────────────────────

// ⚠️ En Mongo, Prisma no escribe un opcional que no se manda: `hiddenAt` no
// existe en lo nunca ocultado, y `hiddenAt: null` sólo empata el null explícito.
const notHidden = { OR: [{ hiddenAt: null }, { hiddenAt: { isSet: false } }] };

const authorSelect = {
  id: true,
  displayName: true,
  username: true,
  photoURL: true,
  email: true,
} as const;

/**
 * El muro como lo ve cada quien. El miembro ve todo lo no oculto; quien no es
 * miembro sólo las públicas, más cuántas hay adentro para el candado.
 */
export async function getWall({
  communityId,
  isInside,
  canMod,
  viewerId = null,
  take = 30,
}: {
  communityId: string;
  isInside: boolean;
  canMod: boolean;
  viewerId?: string | null;
  take?: number;
}) {
  const where = {
    communityId,
    ...(canMod ? {} : notHidden),
    ...(isInside ? {} : { isPublic: true }),
  };
  const posts = await db.communityPost.findMany({
    where,
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take,
    include: {
      author: { select: authorSelect },
      comments: {
        where: canMod ? {} : notHidden,
        orderBy: { createdAt: "asc" },
        take: 50,
        include: { author: { select: authorSelect } },
      },
    },
  });
  const liked = viewerId
    ? new Set(
        (
          await db.communityReaction.findMany({
            where: { userId: viewerId, postId: { in: posts.map((p) => p.id) } },
            select: { postId: true },
          })
        ).map((r) => r.postId)
      )
    : new Set<string>();
  const lockedCount = isInside
    ? 0
    : await db.communityPost.count({
        where: { communityId, isPublic: false, ...notHidden },
      });
  return {
    posts: posts.map((p) => ({ ...publicShape(p), likedByMe: liked.has(p.id) })),
    lockedCount,
  };
}

function displayName(a: { displayName: string | null; username: string; email: string }) {
  return a.displayName || a.username || a.email.split("@")[0];
}

// El correo nunca sale al cliente: sólo nombre y foto.
function publicShape(p: Awaited<ReturnType<typeof db.communityPost.findMany>>[number] & {
  author: { id: string; displayName: string | null; username: string; photoURL: string | null; email: string };
  comments: Array<{ id: string; body: string; hiddenAt: Date | null; createdAt: Date; author: { id: string; displayName: string | null; username: string; photoURL: string | null; email: string } }>;
}) {
  return {
    id: p.id,
    body: p.body,
    imageUrl: p.imageUrl,
    link: (p.link as LinkPreview | null) ?? null,
    likeCount: p.likeCount,
    isPublic: p.isPublic,
    isPinned: p.isPinned,
    hidden: !!p.hiddenAt,
    createdAt: p.createdAt.toISOString(),
    author: { id: p.author.id, name: displayName(p.author), photoURL: p.author.photoURL },
    comments: p.comments.map((c) => ({
      id: c.id,
      body: c.body,
      hidden: !!c.hiddenAt,
      createdAt: c.createdAt.toISOString(),
      author: { id: c.author.id, name: displayName(c.author), photoURL: c.author.photoURL },
    })),
  };
}

export type WallPost = ReturnType<typeof publicShape>;

const hourAgo = () => new Date(Date.now() - 60 * 60 * 1000);

export async function createPost(input: {
  communityId: string;
  authorId: string;
  body: string;
  imageUrl?: string | null;
}) {
  const recent = await db.communityPost.count({
    where: { authorId: input.authorId, createdAt: { gte: hourAgo() } },
  });
  if (!underLimit("post", recent)) return { error: "Vas muy rápido. Intenta en un rato." };
  const post = await db.communityPost.create({
    data: {
      communityId: input.communityId,
      authorId: input.authorId,
      body: input.body,
      imageUrl: input.imageUrl || null,
      link: (await buildLinkPreview(input.body)) ?? undefined,
    },
  });
  return { post };
}

export async function createComment(input: {
  communityId: string;
  postId: string;
  authorId: string;
  body: string;
}) {
  const post = await db.communityPost.findFirst({
    where: { id: input.postId, communityId: input.communityId, ...notHidden },
    select: { id: true },
  });
  if (!post) return { error: "La publicación ya no existe." };
  const recent = await db.communityComment.count({
    where: { authorId: input.authorId, createdAt: { gte: hourAgo() } },
  });
  if (!underLimit("comment", recent)) return { error: "Vas muy rápido. Intenta en un rato." };
  const comment = await db.communityComment.create({
    data: { postId: post.id, authorId: input.authorId, body: input.body },
  });
  await db.communityPost.update({
    where: { id: post.id },
    data: { commentCount: { increment: 1 } },
  });
  return { comment };
}

/** Moderación y borrado propio. `authorId` permite al autor ocultar lo suyo. */
export async function moderatePost(
  communityId: string,
  postId: string,
  change: "pin" | "unpin" | "public" | "private" | "hide" | "unhide"
) {
  const data = {
    pin: { isPinned: true },
    unpin: { isPinned: false },
    public: { isPublic: true },
    private: { isPublic: false },
    hide: { hiddenAt: new Date() },
    unhide: { hiddenAt: null },
  }[change];
  return db.communityPost.updateMany({ where: { id: postId, communityId }, data });
}

export async function hideOwnPost(communityId: string, postId: string, authorId: string) {
  return db.communityPost.updateMany({
    where: { id: postId, communityId, authorId },
    data: { hiddenAt: new Date() },
  });
}

export async function hideComment(
  communityId: string,
  commentId: string,
  opts: { authorId?: string }
) {
  const c = await db.communityComment.findUnique({
    where: { id: commentId },
    select: { id: true, authorId: true, hiddenAt: true, post: { select: { id: true, communityId: true } } },
  });
  if (!c || c.post.communityId !== communityId || c.hiddenAt) return null;
  if (opts.authorId && c.authorId !== opts.authorId) return null;
  await db.communityComment.update({ where: { id: c.id }, data: { hiddenAt: new Date() } });
  await db.communityPost.update({
    where: { id: c.post.id },
    data: { commentCount: { decrement: 1 } },
  });
  return c;
}

/** La próxima llamada (o la que está en curso). */
export async function getNextEvent(communityId: string, now = new Date()) {
  return db.communityEvent.findFirst({
    where: { communityId, endsAt: { gt: now } },
    orderBy: { startsAt: "asc" },
    select: { id: true, title: true, startsAt: true, endsAt: true },
  });
}

/** Se puede entrar 15 minutos antes y hasta que termina. */
export function isCallOpen(event: { startsAt: Date; endsAt: Date } | null, now = new Date()) {
  if (!event) return false;
  return now.getTime() >= event.startsAt.getTime() - 15 * 60 * 1000 && now < event.endsAt;
}

/** 👍: si ya lo dio, se quita. Regresa si quedó dado. */
export async function toggleLike(communityId: string, postId: string, userId: string) {
  const post = await db.communityPost.findFirst({
    where: { id: postId, communityId, ...notHidden },
    select: { id: true },
  });
  if (!post) return null;
  const existing = await db.communityReaction.findUnique({
    where: { postId_userId: { postId, userId } },
  });
  if (existing) {
    await db.communityReaction.delete({ where: { id: existing.id } });
    await db.communityPost.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } });
    return false;
  }
  await db.communityReaction.create({ data: { postId, userId } });
  await db.communityPost.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } });
  return true;
}
