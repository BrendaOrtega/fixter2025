import { db } from "~/.server/db";

// Insignias del club (10-nov-2026). Se calculan de lo que ya pasa en el muro y
// en la membresía; no hay tabla de insignias. Simples a propósito: cuando haya
// niveles que desbloqueen cosas, esto se vuelve el punto de partida.

export type Badge = { key: string; icon: string; label: string; hint: string };

export type MemberStats = {
  posts: number;
  comments: number;
  likesReceived: number;
  joinedAt: Date | null;
  isStudentGift: boolean;
  isHost: boolean;
};

/** El club abrió el 10-nov-2026; quien entra en su primer mes es fundador. */
export const FOUNDERS_UNTIL = new Date("2026-12-10T06:00:00Z");
export const THRESHOLDS = { comments: 10, likes: 10 } as const;

export function badgesFor(s: MemberStats): Badge[] {
  const out: Badge[] = [];
  if (s.isHost) out.push({ key: "host", icon: "🎙", label: "Anfitrión", hint: "Dirige el club" });
  if (s.joinedAt && s.joinedAt < FOUNDERS_UNTIL) {
    out.push({ key: "founder", icon: "🏗", label: "Fundador", hint: "Entró en el primer mes del club" });
  }
  if (s.isStudentGift) {
    out.push({ key: "student", icon: "🎓", label: "Estudiante", hint: "Ya era estudiante de FixterGeek" });
  }
  if (s.posts >= 1) {
    out.push({ key: "first-post", icon: "✍️", label: "Primera publicación", hint: "Ya publicó en el muro" });
  }
  if (s.comments >= THRESHOLDS.comments) {
    out.push({ key: "talker", icon: "💬", label: "Conversador", hint: `${THRESHOLDS.comments}+ comentarios` });
  }
  if (s.likesReceived >= THRESHOLDS.likes) {
    out.push({ key: "helper", icon: "🙌", label: "Ayudador", hint: `${THRESHOLDS.likes}+ 👍 recibidos` });
  }
  return out;
}

/** Insignias de varios miembros a la vez (los autores visibles en el muro). */
export async function badgesForMembers(
  community: { id: string; ownerId: string },
  userIds: string[]
): Promise<Record<string, Badge[]>> {
  const ids = [...new Set(userIds)];
  if (ids.length === 0) return {};

  const [posts, memberships, users, postIds] = await Promise.all([
    db.communityPost.groupBy({
      by: ["authorId"],
      where: { communityId: community.id, authorId: { in: ids } },
      _count: { _all: true },
      _sum: { likeCount: true },
    }),
    db.membership.findMany({
      where: { communityId: community.id, userId: { in: ids } },
      select: { userId: true, provider: true, createdAt: true },
    }),
    db.user.findMany({ where: { id: { in: ids } }, select: { id: true, role: true } }),
    db.communityPost.findMany({ where: { communityId: community.id }, select: { id: true } }),
  ]);
  const comments = await db.communityComment.groupBy({
    by: ["authorId"],
    where: { authorId: { in: ids }, postId: { in: postIds.map((p) => p.id) } },
    _count: { _all: true },
  });

  const out: Record<string, Badge[]> = {};
  for (const id of ids) {
    const p = posts.find((x) => x.authorId === id);
    const m = memberships.find((x) => x.userId === id);
    const u = users.find((x) => x.id === id);
    out[id] = badgesFor({
      posts: p?._count._all ?? 0,
      likesReceived: p?._sum.likeCount ?? 0,
      comments: comments.find((x) => x.authorId === id)?._count._all ?? 0,
      joinedAt: m?.createdAt ?? null,
      isStudentGift: m?.provider === "grant",
      isHost: id === community.ownerId || u?.role === "ADMIN",
    });
  }
  return out;
}
