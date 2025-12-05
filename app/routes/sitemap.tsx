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
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...staticItems,
    ...postItems,
    ...courseItems,
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
