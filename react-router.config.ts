import type { Config } from "@react-router/dev/config";
import { db } from "./app/.server/db";

export default {
  ssr: true,
  async prerender() {
    const posts = await db.post.findMany({
      where: { published: true },
      select: { slug: true },
    });
    return ["/", "/cursos", "/subscribe"].concat(
      posts.map((post) => `/blog/${post.slug}`)
    );
  },
} satisfies Config;
