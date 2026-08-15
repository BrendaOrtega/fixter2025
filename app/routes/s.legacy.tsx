import { redirect, type LoaderFunctionArgs } from "react-router";

/**
 * Alias de las rutas viejas `/s/*` hacia `/secuencias/*`.
 *
 * La letra suelta se entendía cuando había una sola serie; con varias, la URL
 * tiene que decir qué es. Pero `/s/video?token=…` y `/s/baja?token=…` viajan en
 * correos que ya se enviaron y no se pueden reescribir: romperlos dejaría a
 * gente sin poder ver su entrega ni darse de baja, que es lo único que un
 * correo está obligado a cumplir siempre.
 *
 * Se conserva la query completa —ahí van los tokens— y se responde 301 para que
 * los buscadores trasladen lo acumulado a la ruta nueva.
 */
export const loader = ({ request, params }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const resto = url.pathname.replace(/^\/s\/?/, "");
  return redirect(`/secuencias/${resto}${url.search}`, 301);
};
