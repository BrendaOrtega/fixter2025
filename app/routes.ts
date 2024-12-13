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
  route("mis-cursos", "routes/mis-cursos.tsx"),

  ...prefix("cursos", [
    index("routes/cursos.tsx"),
    route(":courseSlug/viewer", "routes/courseViewer.tsx"),
    route(":courseSlug/detalle", "routes/courseDetail.tsx"),
  ]),

  ...prefix("api", [
    route("user", "routes/api/user.tsx"),
    route("course", "routes/api/course.tsx"),
  ]),

  // @todo redirects?
  // route("courses/:courseSlug/viewer", "routes/courseViewer.tsx"),
  // route("courses/:courseSlug/detail", "routes/courseDetail.tsx"),
  // route("courses", "routes/cursos.tsx"),
] satisfies RouteConfig;
