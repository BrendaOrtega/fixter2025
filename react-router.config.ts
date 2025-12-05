import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  // Prerender desactivado - requiere DB en build time
  // Todas las rutas se sirven con SSR
} satisfies Config;
