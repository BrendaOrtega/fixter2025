import { redirect, type LoaderFunctionArgs } from "react-router";
import { validateAccessToken } from "~/utils/tokens";
import { setMemberCookie } from "~/.server/memberCookie";
import { SUBSCRIBER_COOKIE } from "~/.server/videoAccess";

/**
 * Puerta de entrada desde un correo: `/e?t=<token>&to=/donde-sea`.
 *
 * Quien recibe una secuencia ya demostró que el buzón es suyo cuando la
 * confirmó. Pedirle el correo otra vez al hacer clic en un link del propio
 * correo es cobrarle dos veces la misma prueba, y ahí es donde se cae la gente:
 * abre el mail en el teléfono, cae en una pantalla que le pide su correo y un
 * código, y cierra.
 *
 * Esta ruta no muestra nada. Valida el token, siembra las dos cookies de
 * identidad y manda a su destino.
 *
 * `to` se limita a rutas internas: un token que sirviera para redirigir a
 * cualquier dominio es un open redirect firmado por nosotros, justo lo que un
 * phishing quisiera tener.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const token = url.searchParams.get("t");
  const destino = url.searchParams.get("to") || "/";

  // Solo rutas propias: nada de "//otro.com" ni "https://…".
  const seguro =
    destino.startsWith("/") && !destino.startsWith("//") ? destino : "/";

  if (!token) return redirect(seguro);

  const { isValid, decoded } = validateAccessToken(token);
  if (!isValid || !decoded?.email) return redirect(seguro);

  const headers = new Headers();
  headers.append("Set-Cookie", await setMemberCookie(decoded.email));
  headers.append(
    "Set-Cookie",
    `${SUBSCRIBER_COOKIE}=${encodeURIComponent(decoded.email)}; Path=/; Max-Age=${
      60 * 60 * 24 * 365
    }; SameSite=Lax`
  );

  return redirect(seguro, { headers });
};
