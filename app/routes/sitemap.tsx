import type { LoaderFunctionArgs } from "react-router";
import { db } from "~/.server/db";

export const loader = async ({ request }: LoaderFunctionArgs) => {
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
      `<loc>${url.origin}/courses/${course.slug}/detail</loc>`,
      `<lastmod>${course.updatedAt}</lastmod>`,
      `<changefreq>monthly</changefreq>`,
      `<priority>0.8</priority>`,
      `</url>`,
    ].join("");
  });

  const postItems = allPosts.map((post) => {
    return [
      `<url>`,
      `<loc>${url.origin}/blog/${post.slug}</loc>`,
      `<lastmod>${post.updatedAt || post.createdAt}</lastmod>`,
      `<changefreq>monthly</changefreq>`,
      `<priority>0.7</priority>`,
      `</url>`,
    ].join("");
  });

  const staticPages = [
    { path: "", priority: "1.0", changefreq: "weekly" },
    { path: "/blog", priority: "0.9", changefreq: "daily" },
    { path: "/cursos", priority: "0.9", changefreq: "weekly" },
    { path: "/eventos", priority: "0.6", changefreq: "monthly" },
    { path: "/faq", priority: "0.5", changefreq: "monthly" },
    { path: "/guides", priority: "0.6", changefreq: "monthly" },
    { path: "/tutoriales", priority: "0.6", changefreq: "monthly" },
    { path: "/subscribe", priority: "0.4", changefreq: "yearly" },
  ];

  const staticItems = staticPages.map(({ path, priority, changefreq }) =>
    [
      `<url>`,
      `<loc>${url.origin}${path}</loc>`,
      `<lastmod>${new Date().toISOString()}</lastmod>`,
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
