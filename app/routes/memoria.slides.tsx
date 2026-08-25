import { redirect } from "react-router";
import { canonicalUrlForLegacyPath } from "~/.server/resources";

// Ruta corta para pegar en el chat o en el correo. La canónica sigue siendo
// /cursos/:curso/:video/slides, que es la que mide quién lo abrió.
export const loader = async () => {
  const canonical = await canonicalUrlForLegacyPath("/memoria/slides");
  return redirect(canonical || "/slides/agentes-que-recuerdan.html", canonical ? 301 : 302);
};
