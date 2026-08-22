import { db } from "~/.server/db";

/**
 * Nombre visible de cada serie. El slug vive en el campo `serie` del post; el
 * título aquí, para no repetirlo en cada registro y poder cambiarlo en un solo
 * lugar.
 */
export const SERIES: Record<string, { title: string; description: string }> = {
  "gtm-engineer": {
    title: "Conviértete en GTM Engineer",
    description:
      "El puesto que automatiza los sistemas de ingresos de una empresa: qué construye, qué perfil pide, con qué herramientas y cómo te contratan desde fuera de México.",
  },
};

export const getSerie = (serie: string) => SERIES[serie];

const SERIE_SELECT = {
  title: true,
  slug: true,
  metaImage: true,
  coverImage: true,
  metaDescription: true,
  orden: true,
  createdAt: true,
} as const;

/**
 * Las notas de una serie, en el orden en que se leen. Ordena por `orden` y no
 * por fecha: una parte 3 publicada antes que la 2 seguiría leyéndose tercera.
 */
export const getSeriesPosts = async (serie: string) =>
  db.post.findMany({
    where: { serie, published: true },
    orderBy: { orden: "asc" },
    select: SERIE_SELECT,
  });

/** Vecinos de un post dentro de su serie, para la navegación al pie. */
export const getSeriesNav = async (post: {
  slug: string;
  serie: string | null;
}) => {
  if (!post.serie) return null;
  const posts = await getSeriesPosts(post.serie);
  const index = posts.findIndex((p) => p.slug === post.slug);
  if (index === -1) return null;
  return {
    serie: post.serie,
    meta: getSerie(post.serie) ?? { title: post.serie, description: "" },
    posts,
    index,
    prev: posts[index - 1] ?? null,
    next: posts[index + 1] ?? null,
  };
};
