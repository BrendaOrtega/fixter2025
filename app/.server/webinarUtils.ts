import { db } from "~/.server/db";
import { COURSE_IDS } from "~/constants/webinar";

// Tags de webinars
export const WEBINAR_TAGS = {
  CLAUDE_AGOSTO: "webinar_agosto",
  CLAUDE_PAID: "claude-workshop-paid",
  GEMINI_SOLICITUD: "gemini_webinar_solicitud",
  GEMINI_SEPTIEMBRE: "webinar_gemini_septiembre",
  LLAMAINDEX_COURSE: "llamaindex_course",
  AISDK_COURSE: "aisdk_course",
  // Tags de AI SDK en Subscriber
  AISDK_WEBINAR_PENDING: "aisdk-webinar-pending",
  AISDK_WEBINAR_REGISTERED: "aisdk-webinar-registered",
} as const;

export interface WebinarUser {
  id: string;
  email: string;
  displayName: string | null;
  phoneNumber: string | null;
  createdAt: Date;
  tags: string[];
  webinar: any;
  courses: string[];
  metadata: any;
}

/**
 * Obtiene todos los usuarios registrados a webinars o que compraron workshops
 */
export async function getWebinarRegistrants() {
  // Filtrar solo los tags que existen para evitar undefined
  const validTags = [
    WEBINAR_TAGS.CLAUDE_AGOSTO,
    WEBINAR_TAGS.CLAUDE_PAID,
    WEBINAR_TAGS.GEMINI_SEPTIEMBRE,
    WEBINAR_TAGS.LLAMAINDEX_COURSE,
    WEBINAR_TAGS.AISDK_COURSE,
  ].filter(Boolean); // Eliminar valores undefined/null

  const orConditions = [
    ...validTags.map((tag) => ({ tags: { has: tag } })),
    // { webinar: { not: null } },
  ];

  // Buscar en User (sistema antiguo)
  const webinarRegistrants = await db.user.findMany({
    where: {
      OR: orConditions,
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      phoneNumber: true,
      createdAt: true,
      tags: true,
      webinar: true,
      courses: true,
      metadata: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  // Buscar en Subscriber (sistema nuevo para AI SDK webinar)
  const aisdkSubscribers = await db.subscriber.findMany({
    where: {
      OR: [
        { tags: { has: WEBINAR_TAGS.AISDK_WEBINAR_PENDING } },
        { tags: { has: WEBINAR_TAGS.AISDK_WEBINAR_REGISTERED } },
      ],
    },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      tags: true,
      confirmed: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Convertir subscribers a formato WebinarUser
  const subscribersAsUsers: WebinarUser[] = aisdkSubscribers.map((sub) => ({
    id: sub.id,
    email: sub.email,
    displayName: sub.name,
    phoneNumber: null,
    createdAt: sub.createdAt,
    tags: sub.tags,
    webinar: {
      confirmed: sub.confirmed,
      registeredAt: sub.createdAt.toISOString(),
      webinarType: sub.tags.includes(WEBINAR_TAGS.AISDK_WEBINAR_REGISTERED)
        ? "aisdk-webinar-confirmed"
        : "aisdk-webinar-pending",
    },
    courses: [],
    metadata: null,
  }));

  // Combinar y eliminar duplicados por email
  const allUsers = [...webinarRegistrants, ...subscribersAsUsers];
  const uniqueByEmail = allUsers.reduce((acc, user) => {
    if (!acc.find((u) => u.email === user.email)) {
      acc.push(user);
    }
    return acc;
  }, [] as WebinarUser[]);

  return uniqueByEmail;
}

/**
 * Separa usuarios entre los que solo se registraron y los que compraron cursos
 */
export function categorizeUsers(users: WebinarUser[]) {
  // Debug: log usuarios con tag aisdk_course
  const aisdkUsers = users.filter((u) => u.tags?.includes("aisdk_course"));

  const onlyRegistered = users.filter((user) => {
    if (!user.courses || user.courses.length === 0) return true;
    return (
      !user.courses.includes(COURSE_IDS.CLAUDE) &&
      !user.courses.includes(COURSE_IDS.GEMINI) &&
      !user.courses.includes(COURSE_IDS.LLAMAINDEX) &&
      !user.courses.includes(COURSE_IDS.AISDK)
    );
  });

  const purchasedWorkshop = users.filter((user) => {
    if (!user.courses || user.courses.length === 0) return false;
    return (
      user.courses.includes(COURSE_IDS.CLAUDE) ||
      user.courses.includes(COURSE_IDS.GEMINI) ||
      user.courses.includes(COURSE_IDS.LLAMAINDEX) ||
      user.courses.includes(COURSE_IDS.AISDK)
    );
  });

  return { onlyRegistered, purchasedWorkshop };
}

/**
 * Obtiene todas las tags únicas con sus conteos
 */
export function getTagsWithCounts(users: WebinarUser[]) {
  const tagCounts = new Map<string, number>();

  users.forEach((user) => {
    if (Array.isArray(user.tags)) {
      user.tags.forEach((tag) => {
        const tagStr = String(tag);
        tagCounts.set(tagStr, (tagCounts.get(tagStr) || 0) + 1);
      });
    }
  });

  const availableTags = Array.from(tagCounts.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([tag, count]) => ({ tag, count }));

  return availableTags;
}

/**
 * Calcula estadísticas de conversión
 */
export function calculateStats(
  onlyRegistered: WebinarUser[],
  purchasedWorkshop: WebinarUser[]
) {
  const totalRegistrants = onlyRegistered.length + purchasedWorkshop.length;

  return {
    totalRegistrants,
    onlyRegistered: onlyRegistered.length,
    purchased: purchasedWorkshop.length,
    conversionRate:
      totalRegistrants > 0
        ? ((purchasedWorkshop.length / totalRegistrants) * 100).toFixed(1)
        : "0",
  };
}

/**
 * Filtra usuarios por tag
 */
export function filterUsersByTag(users: WebinarUser[], tagFilter: string) {
  if (!tagFilter) return users;

  return users.filter((user) => {
    const userTags = Array.isArray(user.tags) ? user.tags : [];
    return userTags.includes(tagFilter);
  });
}

/**
 * Función helper para obtener toda la data del webinar procesada
 */
export async function getWebinarData() {
  const webinarRegistrants = await getWebinarRegistrants();
  const { onlyRegistered, purchasedWorkshop } =
    categorizeUsers(webinarRegistrants);
  const availableTags = getTagsWithCounts(webinarRegistrants);
  const stats = calculateStats(onlyRegistered, purchasedWorkshop);

  return {
    webinarRegistrants,
    onlyRegistered,
    purchasedWorkshop,
    availableTags,
    stats,
  };
}
