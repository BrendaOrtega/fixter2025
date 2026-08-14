import { redirect } from "react-router";
import { canonicalUrlForLegacyPath } from "~/.server/resources";

// Link corto que se pegó en el chat del webinar y viaja en correos ya enviados.
// No se puede romper, pero tampoco tiene que seguir siendo la fuente de verdad:
// resuelve contra `Resource.legacyPath` y manda a la URL canónica, que es la que
// registra quién abrió el material.
const FALLBACK =
  "https://easybits-public.t3.storage.dev/699f35cbc8ad86037eda62b1/XlxD89MrMQSp";

export const loader = async () => {
  const canonical = await canonicalUrlForLegacyPath("/seis-piezas");
  return redirect(canonical || FALLBACK, canonical ? 301 : 302);
};
