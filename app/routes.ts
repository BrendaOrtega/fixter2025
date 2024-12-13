import {
  type RouteConfig,
  index,
  prefix,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("api/user", "routes/api/user.tsx"),
  route("perfil", "routes/perfil.tsx"),
  route("mis-cursos", "routes/mis-cursos.tsx"),

  ...prefix("cursos", [
    index("routes/cursos.tsx"),
    route(":slug/viewer", "routes/viewer.tsx"),
  ]),
] satisfies RouteConfig;
