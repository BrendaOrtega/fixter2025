import { redirect } from "react-router";
import { canonicalUrlForLegacyPath } from "~/.server/resources";

// Ruta corta para pegar en el chat durante el webinar. A diferencia de
// /webinar-1/slides, el nombre dice de qué es; la canónica sigue siendo
// /cursos/:curso/:video/slides, que es la que mide quién lo abrió.
export const loader = async () => {
  const canonical = await canonicalUrlForLegacyPath("/sandboxing/slides");
  return redirect(canonical || "/slides/sandboxing-la-caja-donde-vive-tu-agente.html", canonical ? 301 : 302);
};
