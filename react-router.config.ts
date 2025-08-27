import type { Config } from "@react-router/dev/config";
import { db } from "./app/.server/db";

export default {
  ssr: true,
  async prerender() {
    // Get posts that have an associated audio cache
    const postsWithAudio = await db.post.findMany({
      where: { 
        published: true,
        audioCache: { isNot: null } // Only posts with audio
      },
      select: { 
        slug: true,
        audioCache: {
          select: {
            audioUrl: true
          }
        }
      },
    });

    // Static routes that should always be pre-rendered
    const staticRoutes = [
      "/",
      "/cursos",
      "/subscribe",
      "/cursos/Introduccion-al-desarrollo-web-full-stack-con-React-Router/detalle"
    ];

    // Add blog post routes for posts with audio
    const postRoutes = postsWithAudio
      .filter(post => post.audioCache?.audioUrl) // Ensure audio URL exists
      .map(post => `/blog/${post.slug}`);

    return [...staticRoutes, ...postRoutes];
  },
} satisfies Config;
