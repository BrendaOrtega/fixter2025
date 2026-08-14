import { redirect } from "react-router";
import { canonicalUrlForLegacyPath } from "~/.server/resources";

// Ruta vieja, no semántica: "webinar-1" no dice de qué programa es, y vienen
// unos 36 webinars el próximo año. Se queda viva porque ya se compartió, pero
// manda a la canónica /cursos/:curso/:video/slides.
export const loader = async () => {
  const canonical = await canonicalUrlForLegacyPath("/webinar-1/slides");
  return redirect(canonical || "/webinar-1/slides.html", canonical ? 301 : 302);
};
