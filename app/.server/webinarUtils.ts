import { db } from "~/.server/db";

// Interfaz simple para suscriptores
export interface SubscriberData {
  id: string;
  email: string;
  name: string | null;
  tags: string[];
  confirmed: boolean;
  createdAt: Date;
}

/**
 * Obtiene todos los suscriptores
 */
export async function getAllSubscribers(): Promise<SubscriberData[]> {
  const subscribers = await db.subscriber.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      tags: true,
      confirmed: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return subscribers;
}

/**
 * Obtiene todos los tags únicos con sus conteos
 */
export async function getAllTagsWithCounts() {
  const subscribers = await db.subscriber.findMany({
    where: { tags: { isEmpty: false } },
    select: { tags: true },
  });

  const tagCounts = new Map<string, number>();

  subscribers.forEach((sub) => {
    sub.tags.forEach((tag) => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });
  });

  return Array.from(tagCounts.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([tag, count]) => ({ tag, count }));
}

/**
 * Filtra suscriptores por tag
 */
export function filterByTag(subscribers: SubscriberData[], tag: string) {
  const list = subscribers || [];
  if (!tag) return list;
  return list.filter((s) => s.tags.includes(tag));
}

/**
 * Función principal para obtener toda la data
 */
export async function getWebinarData() {
  const [subscribers, availableTags] = await Promise.all([
    getAllSubscribers(),
    getAllTagsWithCounts(),
  ]);

  return {
    subscribers,
    availableTags,
    stats: {
      total: subscribers.length,
      confirmed: subscribers.filter((s) => s.confirmed).length,
    },
  };
}
