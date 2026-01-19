import { db } from "~/.server/db";

interface AccessResult {
  hasAccess: boolean;
  userId?: string;
}

/**
 * Verifica si un usuario tiene acceso a un curso específico.
 * Un usuario tiene acceso si:
 * 1. Compró el curso (tiene el courseId en su array de courses)
 * 2. Es un suscriptor confirmado con el tag `{courseSlug}-free-access`
 */
export async function hasAccessToCourse(
  email: string,
  courseId: string,
  courseSlug: string
): Promise<AccessResult> {
  // 1. Verificar si usuario compró el curso
  const user = await db.user.findFirst({
    where: {
      email,
      courses: { has: courseId },
    },
    select: { id: true },
  });

  if (user) {
    return { hasAccess: true, userId: user.id };
  }

  // 2. Verificar suscriptor con tag específico del curso
  const tag = `${courseSlug}-free-access`;
  const subscriber = await db.subscriber.findFirst({
    where: {
      email,
      confirmed: true,
      tags: { has: tag },
    },
  });

  return { hasAccess: !!subscriber };
}
