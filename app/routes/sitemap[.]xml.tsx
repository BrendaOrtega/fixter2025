import type { LoaderFunction } from "react-router";
import { db } from "~/.server/db";

export const loader: LoaderFunction = async ({ params, request }) => {
  const url = new URL(request.url);
  const allPosts = await db.post.findMany({
    where: { published: true },
  });

  const courses = await db.course.findMany({
    where: { published: true },
  });

  const courseItems = courses.map((course) => {
    return [
      `<url>`,
      `<loc>https://fixtergeek.com/courses/${course.slug}/detail</loc>`,
      `<lastmod>${course.updatedAt}</lastmod>`,
      `</url>`,
    ].join("");
  });

  const postItems = allPosts.map((post) => {
    return [
      `<url>`,
      `<loc>https://fixtergeek.com/blog/${post.slug}</loc>`,
      `<lastmod>${post.createdAt}</lastmod>`,
      `</url>`,
    ].join("");
  });

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    // Agregamos nuestras tres feeds a la lista de rutas (y cualquier otra ruta que quieras indexar)
    // `<url>`,
    // `<loc>https://fixtergeek.com/feed.xml</loc>`,
    // `<lastmod>${new Date()}</lastmod>`,
    // `</url>`,

    // `<url>`,
    // `<loc>https://fixtergeek.com/feed.json</loc>`,
    // `<lastmod>${new Date()}</lastmod>`,
    // `</url>`,

    // `<url>`,
    // `<loc>https://fixtergeek.com/feed.atom</loc>`,
    // `<lastmod>${new Date()}</lastmod>`,
    // `</url>`,
    // index page, or /blog page

    `<url>`,
    `<loc>${url.origin}/eventos</loc>`,
    `<lastmod>${new Date()}</lastmod>`,
    `</url>`,

    `<url>`,
    `<loc>${url.origin}/faq</loc>`,
    `<lastmod>${new Date()}</lastmod>`,
    `</url>`,

    `<url>`,
    `<loc>${url.origin}/guides</loc>`,
    `<lastmod>${new Date()}</lastmod>`,
    `</url>`,

    `<url>`,
    `<loc>${url.origin}/tutoriales</loc>`,
    `<lastmod>${new Date()}</lastmod>`,
    `</url>`,

    `<url>`,
    `<loc>${url.origin}/subscribe</loc>`,
    `<lastmod>${new Date()}</lastmod>`,
    `</url>`,

    `<url>`,
    `<loc>${url.origin}/subscribe</loc>`,
    `<lastmod>${new Date()}</lastmod>`,
    `</url>`,

    `<url>`,
    `<loc>${url.origin}/blog</loc>`,
    `<lastmod>${new Date()}</lastmod>`,
    `</url>`,

    ...postItems,

    `<url>`,
    `<loc>${url.origin}/cursos</loc>`,
    `<lastmod>${new Date()}</lastmod>`,
    `</url>`,

    `<url>`,
    `<loc>${url.origin}/courses</loc>`,
    `<lastmod>${new Date()}</lastmod>`,
    `</url>`,

    `<url>`,
    `<loc>${url.origin}/eventos/remix_oct_2023</loc>`,
    `<lastmod>${new Date()}</lastmod>`,
    `</url>`,

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
