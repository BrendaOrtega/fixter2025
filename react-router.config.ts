import type { Config } from "@react-router/dev/config";
import { db } from "./app/.server/db";

export default {
  ssr: true,
  async prerender() {
    const posts = await db.post.findMany({
      where: { published: true },
      select: { slug: true },
    });
    const courses = await db.course.findMany({
      where: { published: true },
      select: { slug: true },
    });
    return ["/", "/cursos"]
      .concat(posts.map((post) => `/blog/${post.slug}`))
      .concat(courses.map((course) => `/cursos/${course.slug}/detalle`));
    // return ["/", "/blog", "/cursos"];
  },
} satisfies Config;
