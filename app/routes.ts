import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/login", "routes/login.tsx"),
  route("/api/user", "routes/api/user.tsx"),
  route("/perfil", "routes/perfil.tsx"),
  route("/mis-cursos", "routes/mis-cursos.tsx"),
  route("/cursos", "./routes/courses.tsx"),
  route("/detalle", "routes/detail.tsx"),
] satisfies RouteConfig;
