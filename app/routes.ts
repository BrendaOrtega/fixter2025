import {
  type RouteConfig,
  index,
  prefix,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("logout", "routes/logout.tsx"),
  route("perfil", "routes/perfil.tsx"),
  route("faq", "routes/faq.tsx"),
  route("mis-cursos", "routes/mis-cursos.tsx"),
  route("subscribe", "routes/subscribe.tsx"),
  route("newsletters", "routes/newsletters.tsx"),
  route("guides", "routes/guides.tsx"),
  route("tutoriales", "routes/tutoriales.tsx"),
  route("audio-demo", "routes/audio-demo.tsx"),
  route("aviso-de-privacidad", "routes/aviso.tsx"),
  route("terminos-y-condiciones", "routes/terms.tsx"),
  route("sitemap.xml", "routes/sitemap.tsx"),
  //stripe webhook
  route("stripe/webhook", "routes/stripeWebhook.ts"),
  // xmas
  route("feliz_2025/:nombre?", "routes/feliz_2025.tsx"),
  // Claude Code Workshop
  route("claude", "routes/claude.tsx"),
  // Agentes IA No-Code Course
  route("agentes", "routes/agentes.tsx"),
  // AI SDK TypeScript Course
  route("ai-sdk", "routes/ai-sdk.tsx"),
  // Libros
  route("libros", "routes/libros.tsx"),
  // Libro interactivo
  route("libros/domina_claude_code", "routes/libros/domina_claude_code.tsx"),
  // Libro LlamaIndex Agent Workflows
  route("libros/llamaindex", "routes/libros/llamaindex.tsx"),
  // groups
  ...prefix("admin", [
    index("routes/admin/dash.tsx"),
    route("cursos", "routes/admin/courses.tsx"),
    route("posts", "routes/admin/postList.tsx"),
    route("talleres", "routes/admin/talleres.tsx"),
    route("webinar", "routes/admin/webinar.tsx"),
    route("sequences", "routes/admin/sequences.tsx"),
    route("newsletter", "routes/admin/newsletter.tsx"),
    route("analytics", "routes/admin/analytics.tsx"),
    route("heatmap/:postId", "routes/admin/heatmap.$postId.tsx"),
    route("send", "routes/admin/send.tsx"),
  ]),
  // Analytics moved to admin section
  // testing WebRTC
  route("live_session", "routes/talleres/live_session.tsx"),
  ...prefix("cursos", [
    index("routes/cursos.tsx"),
    route(":courseSlug/viewer", "routes/courseViewer.tsx"),
    route(":courseSlug/detalle", "routes/courseDetail.tsx"),
  ]),
  ...prefix("blog", [
    index("routes/blog.tsx"),
    route(
      "aws-ses-features-ocultos",
      "routes/blog.aws-ses-features-ocultos.tsx"
    ),
    route(":postSlug", "routes/post.tsx"),
  ]),
  ...prefix("api", [
    route("user", "routes/api/user.tsx"),
    route("course", "routes/api/course.tsx"),
    route("stripe", "routes/api/stripe.tsx"),
    route("file", "routes/api/file.tsx"),
    route("sockets", "routes/api/sockets.tsx"),
    route("audio", "routes/api/audio.tsx"),
    route("analytics", "routes/api.analytics.tsx"),
    route("sequences/start", "routes/api.sequences.start.ts"),
    route("sequences/process", "routes/api.sequences.process.ts"),
    // route("clean", "routes/api/cleaun_up.tsx"), // dev only
  ]),
  // @todo remove?
  route("courses/*", "routes/courses.tsx"),
  // AWS sns, ses
  route("/sns", "routes/api/sns.tsx"),
  // 404 & marketing
  route("*", "routes/404.tsx"),
] satisfies RouteConfig;
