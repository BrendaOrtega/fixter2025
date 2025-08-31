import { db } from "~/.server/db";
import { COURSE_IDS } from "~/constants/webinar";

// Tags de webinars
export const WEBINAR_TAGS = {
  CLAUDE_AGOSTO: "webinar_agosto",
  CLAUDE_PAID: "claude-workshop-paid",
  GEMINI_SEPTIEMBRE: "gemini_webinar_septiembre",
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
}

/**
 * Obtiene todos los usuarios registrados a webinars o que compraron workshops
 */
export async function getWebinarRegistrants() {
  const webinarRegistrants = await db.user.findMany({
    where: {
      OR: [
        { tags: { has: WEBINAR_TAGS.CLAUDE_AGOSTO } },
        { tags: { has: WEBINAR_TAGS.CLAUDE_PAID } },
        { tags: { has: WEBINAR_TAGS.GEMINI_SEPTIEMBRE } },
        { webinar: { not: null } },
      ],
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
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return webinarRegistrants;
}

/**
 * Separa usuarios entre los que solo se registraron y los que compraron cursos
 */
export function categorizeUsers(users: WebinarUser[]) {
  const onlyRegistered = users.filter((user) => {
    if (!user.courses || user.courses.length === 0) return true;
    return (
      !user.courses.includes(COURSE_IDS.CLAUDE) &&
      !user.courses.includes(COURSE_IDS.GEMINI)
    );
  });

  const purchasedWorkshop = users.filter((user) => {
    if (!user.courses || user.courses.length === 0) return false;
    return (
      user.courses.includes(COURSE_IDS.CLAUDE) ||
      user.courses.includes(COURSE_IDS.GEMINI)
    );
  });

  return { onlyRegistered, purchasedWorkshop };
}

/**
 * Obtiene todas las tags únicas con sus conteos
 */
export function getTagsWithCounts(users: WebinarUser[]) {
  const tagCounts = new Map<string, number>();
  
  users.forEach(user => {
    if (Array.isArray(user.tags)) {
      user.tags.forEach(tag => {
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
export function calculateStats(onlyRegistered: WebinarUser[], purchasedWorkshop: WebinarUser[]) {
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
  
  return users.filter(user => {
    const userTags = Array.isArray(user.tags) ? user.tags : [];
    return userTags.includes(tagFilter);
  });
}

/**
 * Función helper para obtener toda la data del webinar procesada
 */
export async function getWebinarData() {
  const webinarRegistrants = await getWebinarRegistrants();
  const { onlyRegistered, purchasedWorkshop } = categorizeUsers(webinarRegistrants);
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