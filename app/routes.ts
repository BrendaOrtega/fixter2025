import {
  type RouteConfig,
  index,
  prefix,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("perfil", "routes/perfil.tsx"),
  route("faq", "routes/faq.tsx"),
  route("mis-cursos", "routes/mis-cursos.tsx"),
  route("subscribe", "routes/subscribe.tsx"),
  route("guides", "routes/guides.tsx"),
  route("tutoriales", "routes/tutoriales.tsx"),
  route("sitemap.xml", "routes/sitemap.tsx"),
  //stripe webhook
  route("stripe/webhook", "routes/stripeWebhook.ts"),
  // xmas
  route("feliz_2025/:nombre?", "routes/feliz_2025.tsx"),
  // groups
  ...prefix("admin", [
    index("routes/admin/dash.tsx"),
    route("cursos", "routes/admin/courses.tsx"),
    route("posts", "routes/admin/postList.tsx"),
  ]),
  ...prefix("cursos", [
    index("routes/cursos.tsx"),
    route(":courseSlug/viewer", "routes/courseViewer.tsx"),
    route(":courseSlug/detalle", "routes/courseDetail.tsx"),
  ]),
  ...prefix("blog", [
    index("routes/blog.tsx"),
    route(":postSlug", "routes/post.tsx"),
  ]),
  ...prefix("api", [
    route("user", "routes/api/user.tsx"),
    route("course", "routes/api/course.tsx"),
    route("stripe", "routes/api/stripe.tsx"),
    route("file", "routes/api/file.tsx"),
    // route("clean", "routes/api/cleaun_up.tsx"), // dev only
  ]),
  // @todo remove?
  route("courses/*", "routes/courses.tsx"),
  // 404
  route("*", "routes/404.tsx"),
] satisfies RouteConfig;
