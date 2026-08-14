import { redirect } from "react-router";
import { canonicalUrlForLegacyPath } from "~/.server/resources";

// Link corto para proyectar o pegar en el chat durante el webinar del 20 de
// agosto. Resuelve contra `Resource.legacyPath` y manda a la URL canónica, que
// es la que registra quién abrió el material.
export const loader = async () => {
  const canonical = await canonicalUrlForLegacyPath("/webinar-2/slides");
  return redirect(canonical || "/webinar-2/slides.html", canonical ? 301 : 302);
};
