import type { Config } from "@react-router/dev/config";
import { db } from "./app/.server/db";

export default {
  ssr: true,
  async prerender() {
    const posts = await db.post.findMany({
      where: { published: true },
      select: { slug: true },
    });
    return [
      "/",
      "/cursos",
      "/subscribe",
      "/cursos/Introduccion-al-desarrollo-web-full-stack-con-React-Router/detalle",
    ].concat(posts.map((post) => `/blog/${post.slug}`));
  },
} satisfies Config;
