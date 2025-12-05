import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  async prerender() {
    // Solo rutas estáticas - los posts se sirven con SSR
    return [
      "/",
      "/cursos",
      "/subscribe",
      "/cursos/Introduccion-al-desarrollo-web-full-stack-con-React-Router/detalle"
    ];
  },
} satisfies Config;
