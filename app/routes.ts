import {
  type RouteConfig,
  index,
  prefix,
  route,
  layout,
} from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("perfil", "routes/perfil.tsx"),
  route("faq", "routes/faq.tsx"),
  route("mis-cursos", "routes/mis-cursos.tsx"),
  route("subscribe", "routes/subscribe.tsx"),
  // xmas
  route("feliz_2025/:nombre?", "routes/feliz_2025.tsx"),

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
  ]),

  // @todo redirects?
  // route("courses/:courseSlug/viewer", "routes/courseViewer.tsx"),
  // route("courses/:courseSlug/detail", "routes/courseDetail.tsx"),
  // route("courses", "routes/cursos.tsx"),
] satisfies RouteConfig;
