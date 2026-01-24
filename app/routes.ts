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
  // Video streaming endpoint (legacy format)
  route("videos", "routes/videos.tsx"),
  // Playlist routes for animaciones course (HLS streaming)
  route("playlist/:storageKey.m3u8", "routes/playlist.$storageKey.m3u8.tsx"),
  route("playlist/:storageKey/:segment", "routes/playlist.$storageKey.$segment.tsx"),
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
  // Pong con Vanilla JS - Classic Course
  route("pong", "routes/pong.tsx"),
  route("pong/viewer", "routes/pong-viewer.tsx"),
  // Testing con Jest - Redirect to course detail
  route("testing", "routes/testing.tsx"),
  // Libros
  route("libros", "routes/libros.tsx"),
  // Libro interactivo
  route("libros/domina_claude_code", "routes/libros/domina_claude_code.tsx"),
  // Libro LlamaIndex Agent Workflows
  route("libros/llamaindex", "routes/libros/llamaindex.tsx"),
  // Libro IA aplicada con React y TypeScript
  route("libros/ai_sdk", "routes/libros/ai_sdk.tsx"),
  // groups
  ...prefix("admin", [
    index("routes/admin/dash.tsx"),
    route("cursos", "routes/admin/courses.tsx"),
    route("posts", "routes/admin/postList.tsx"),
    route("talleres", "routes/admin/talleres.tsx"),
    route("webinar", "routes/admin/webinar.tsx"),
    route("sequences", "routes/admin/sequences.tsx"),
    route("libros", "routes/admin/libros.tsx"),
    route("newsletter", "routes/admin/newsletter.tsx"),
    route("analytics", "routes/admin/analytics.tsx"),
    route("heatmap/:postId", "routes/admin/heatmap.$postId.tsx"),
    route("ratings", "routes/admin/ratings.tsx"),
    route("send", "routes/admin/send.tsx"),
    route("backups", "routes/admin/backups.tsx"),
    route("404s", "routes/admin/404s.tsx"),
  ]),
  // Analytics moved to admin section
  // testing WebRTC
  route("live_session", "routes/talleres/live_session.tsx"),
  ...prefix("cursos", [
    index("routes/cursos.tsx"),
    route("pong-vanilla-js", "routes/cursos.pong-vanilla-js._index.tsx"),
    route("testing-en-react-con-jest-y-testing-library/detail", "routes/cursos.testing-en-react-con-jest-y-testing-library.detail.tsx"),
    route("minimo-js-para-react/detail", "routes/cursos.minimo-js-para-react.detail.tsx"),
    route(":courseSlug/viewer", "routes/courseViewer.tsx"),
    route(":courseSlug/detalle", "routes/courseDetail.tsx"),
    route(":courseSlug/rating", "routes/cursos.$courseSlug.rating.tsx"),
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
    route("video-analytics", "routes/api/video-analytics.ts"),
    route("sequences/start", "routes/api.sequences.start.ts"),
    route("sequences/process", "routes/api.sequences.process.ts"),
    route("video-preview-dynamic", "routes/api/video-preview-dynamic.tsx"),
    route("hls-proxy", "routes/api/hls-proxy.tsx"),
    route("book-epub", "routes/api/book-epub.tsx"),
    route("ratings", "routes/api/ratings.ts"),
    route("backup-download", "routes/api/backup-download.tsx"),
    // route("clean", "routes/api/cleaun_up.tsx"), // dev only
  ]),
  // @todo remove?
  route("courses/*", "routes/courses.tsx"),
  // AWS sns, ses
  route("/sns", "routes/api/sns.tsx"),
  route("/api/send-stream", "routes/api/send-stream.tsx"),
  // 404 & marketing
  route("*", "routes/404.tsx"),
] satisfies RouteConfig;
