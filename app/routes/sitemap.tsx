import type { LoaderFunctionArgs } from "react-router";
import { db } from "~/.server/db";

// Helper para formatear fecha ISO correctamente
const formatDate = (date: Date | null | undefined): string => {
  if (!date) return new Date().toISOString().split("T")[0];
  return new Date(date).toISOString().split("T")[0];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const baseUrl = "https://www.fixtergeek.com";

  const allPosts = await db.post.findMany({
    where: { published: true },
  });

  const courses = await db.course.findMany({
    where: { published: true },
  });

  // Cursos dinámicos - URL corregida: /cursos/{slug}/detalle
  const courseItems = courses.map((course) => {
    return [
      `<url>`,
      `<loc>${baseUrl}/cursos/${course.slug}/detalle</loc>`,
      `<lastmod>${formatDate(course.updatedAt)}</lastmod>`,
      `<changefreq>monthly</changefreq>`,
      `<priority>0.8</priority>`,
      `</url>`,
    ].join("");
  });

  // Vídeos públicos de cada programa. Sin esto, las clases —que son el contenido con
  // más sustancia del sitio— no existían para los buscadores: sólo se listaba la
  // landing del curso. Se incluye el `video:video` de Google, que es lo que las mete a
  // los carruseles de vídeo.
  const videos = await db.video.findMany({
    where: {
      isPublic: true,
      courseIds: { hasSome: courses.map((c) => c.id) },
      OR: [{ accessLevel: "public" }, { accessLevel: "subscriber" }],
    },
    select: {
      slug: true,
      title: true,
      description: true,
      poster: true,
      duration: true,
      updatedAt: true,
      courseIds: true,
    },
  });

  const cursoPorId = new Map(courses.map((c) => [c.id, c.slug]));
  const escapar = (t: string) =>
    t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const videoItems = videos.flatMap((v) => {
    const cursoSlug = v.courseIds.map((id) => cursoPorId.get(id)).find(Boolean);
    if (!cursoSlug) return [];
    const loc = `${baseUrl}/cursos/${cursoSlug}/viewer?videoSlug=${v.slug}`;
    return [
      [
        `<url>`,
        `<loc>${escapar(loc)}</loc>`,
        `<lastmod>${formatDate(v.updatedAt)}</lastmod>`,
        `<changefreq>monthly</changefreq>`,
        `<priority>0.8</priority>`,
        `<video:video>`,
        `<video:thumbnail_loc>${escapar(v.poster || `${baseUrl}/cover.png`)}</video:thumbnail_loc>`,
        `<video:title>${escapar(v.title)}</video:title>`,
        `<video:description>${escapar((v.description || v.title).slice(0, 2000))}</video:description>`,
        `<video:player_loc>${escapar(loc)}</video:player_loc>`,
        ...(v.duration
          ? [`<video:duration>${Math.round(Number(v.duration) * 60)}</video:duration>`]
          : []),
        `<video:family_friendly>yes</video:family_friendly>`,
        `</video:video>`,
        `</url>`,
      ].join(""),
    ];
  });

  // Posts del blog
  const postItems = allPosts.map((post) => {
    return [
      `<url>`,
      `<loc>${baseUrl}/blog/${post.slug}</loc>`,
      `<lastmod>${formatDate(post.updatedAt || post.createdAt)}</lastmod>`,
      `<changefreq>monthly</changefreq>`,
      `<priority>0.7</priority>`,
      `</url>`,
    ].join("");
  });

  // Páginas estáticas incluyendo landing pages de talleres
  const staticPages = [
    { path: "", priority: "1.0", changefreq: "weekly" },
    { path: "/blog", priority: "0.9", changefreq: "daily" },
    { path: "/cursos", priority: "0.9", changefreq: "weekly" },
    // Landing pages de talleres (importantes para LLMs)
    { path: "/ai-sdk", priority: "0.9", changefreq: "weekly" },
    { path: "/claude", priority: "0.9", changefreq: "weekly" },
    { path: "/agentes", priority: "0.9", changefreq: "weekly" },
    // Libros
    { path: "/libros", priority: "0.8", changefreq: "monthly" },
    { path: "/libros/domina_claude_code", priority: "0.8", changefreq: "weekly" },
    { path: "/libros/llamaindex", priority: "0.8", changefreq: "weekly" },
    // Otras páginas
    { path: "/faq", priority: "0.5", changefreq: "monthly" },
    { path: "/guides", priority: "0.6", changefreq: "monthly" },
    { path: "/tutoriales", priority: "0.6", changefreq: "monthly" },
    { path: "/subscribe", priority: "0.4", changefreq: "yearly" },
  ];

  const today = new Date().toISOString().split("T")[0];

  const staticItems = staticPages.map(({ path, priority, changefreq }) =>
    [
      `<url>`,
      `<loc>${baseUrl}${path}</loc>`,
      `<lastmod>${today}</lastmod>`,
      `<changefreq>${changefreq}</changefreq>`,
      `<priority>${priority}</priority>`,
      `</url>`,
    ].join("")
  );

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">`,
    ...staticItems,
    ...postItems,
    ...courseItems,
    ...videoItems,
    `</urlset>`,
  ];

  return new Response(xml.join(""), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "x-content-type-options": "nosniff",
      "Cache-Control": "max-age=300, s-maxage=3600",
    },
  });
};
