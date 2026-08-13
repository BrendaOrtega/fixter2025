import { db } from "~/.server/db";
import { enrollSubscriberInSequence } from "~/.server/sequences";

/** Solo las comunidades activas tienen alta pública. */
export const getCommunityBySlug = (slug: string) =>
  db.community.findFirst({ where: { slug, isActive: true } });

/** Los miembros son Subscribers marcados con el tag; hay índice en `tags`. */
export const getCommunityMemberCount = (tag: string) =>
  db.subscriber.count({ where: { tags: { has: tag } } });

/**
 * La secuencia de bienvenida, si existe y está publicada. Devuelve null en
 * silencio si apunta a una secuencia borrada o en borrador: una comunidad sin
 * secuencia sigue siendo utilizable.
 */
export async function getWelcomeSequence(welcomeSequenceId?: string | null) {
  if (!welcomeSequenceId) return null;
  const sequence = await db.sequence.findUnique({
    where: { id: welcomeSequenceId },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      _count: { select: { emails: true } },
      emails: {
        orderBy: { order: "asc" },
        take: 1,
        select: { subject: true },
      },
    },
  });
  return sequence?.isActive ? sequence : null;
}

/**
 * Alta efectiva: confirma el correo, marca al subscriber con el tag de la
 * comunidad y lo enrola en la secuencia de bienvenida.
 *
 * Idempotente de punta a punta — entrar dos veces por el mismo link no
 * duplica el tag ni reinicia la secuencia.
 */
export async function joinCommunity({
  communityId,
  email,
  name,
}: {
  communityId: string;
  email: string;
  name?: string;
}): Promise<{
  sequenceId: string | null;
  communityName: string;
  communitySlug: string;
} | null> {
  const community = await db.community.findUnique({
    where: { id: communityId },
  });
  if (!community || !community.isActive) return null;

  const subscriber = await db.subscriber.upsert({
    where: { email },
    create: {
      email,
      name,
      confirmed: true,
      confirmedAt: new Date(),
      tags: [community.tag],
    },
    update: { confirmed: true, confirmedAt: new Date() },
  });

  // Mongo no tiene addToSet en Prisma: leer y empujar solo si falta.
  if (!subscriber.tags.includes(community.tag)) {
    await db.subscriber.update({
      where: { id: subscriber.id },
      data: { tags: { push: community.tag } },
    });
  }

  const welcome = await getWelcomeSequence(community.welcomeSequenceId);
  if (welcome) {
    await enrollSubscriberInSequence(welcome.id, subscriber.id);
  }

  return {
    sequenceId: welcome?.id ?? null,
    communityName: community.name,
    communitySlug: community.slug,
  };
}

/**
 * Las secuencias que publica la comunidad, con el estado del miembro en cada
 * una. Sin `email` devuelve el catálogo pelón (visitante anónimo).
 */
export async function getCommunitySequences(
  communityId: string,
  email?: string | null
) {
  const sequences = await db.sequence.findMany({
    where: { communityId, isActive: true, isPrivate: false },
    select: {
      id: true,
      name: true,
      description: true,
      _count: { select: { emails: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!email) return sequences.map((s) => ({ ...s, status: null, progress: 0 }));

  const subscriber = await db.subscriber.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!subscriber)
    return sequences.map((s) => ({ ...s, status: null, progress: 0 }));

  const enrollments = await db.sequenceEnrollment.findMany({
    where: {
      subscriberId: subscriber.id,
      sequenceId: { in: sequences.map((s) => s.id) },
    },
    select: { sequenceId: true, status: true, currentEmailIndex: true },
  });

  return sequences.map((s) => {
    const e = enrollments.find((x) => x.sequenceId === s.id);
    return {
      ...s,
      status: e?.status ?? null,
      progress: e?.currentEmailIndex ?? 0,
    };
  });
}

/** ¿Este correo ya es miembro de esta comunidad? */
export async function isMember(tag: string, email?: string | null) {
  if (!email) return false;
  const s = await db.subscriber.findUnique({
    where: { email },
    select: { tags: true },
  });
  return !!s?.tags.includes(tag);
}
