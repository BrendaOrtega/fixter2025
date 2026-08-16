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

  // Solo rutas propias. No basta con exigir que empiece por "/": Chrome y
  // Firefox normalizan la barra invertida, así que "/\\evil.com" acaba siendo
  // "//evil.com" y sale del dominio. Se resuelve contra el origen y se compara.
  let seguro = "/";
  try {
    const candidato = new URL(destino, url.origin);
    if (candidato.origin === url.origin) {
      // Quien llega de un correo viene a VER un video concreto, así que la
      // barra lateral abre en la transcripción —con sus capítulos— y no en la
      // lista de videos, que es justo lo que menos necesita: ya sabe cuál
      // quiere. Si el video no tiene transcripción, el visor cae solo a la
      // primera pestaña disponible.
      const esVideoDeCurso = /^\/cursos\/[^/]+\/[^/]+$/.test(candidato.pathname);
      if (esVideoDeCurso && !candidato.searchParams.has("tab")) {
        candidato.searchParams.set("tab", "transcript");
      }
      seguro = candidato.pathname + candidato.search;
    }
  } catch {
    seguro = "/";
  }

  if (!token) return redirect(seguro);

  const { isValid, decoded } = validateAccessToken(token);
  if (!isValid || !decoded?.email) return redirect(seguro);

  // El token es prueba de identidad equivalente al código OTP: solo pudo salir
  // de un correo que mandamos a ese buzón. Si el destino es un video de curso
  // que se abre "con tu correo", se le da el tag de acceso aquí mismo — si no,
  // el link prometía un video y entregaba un formulario pidiendo el correo por
  // el que la persona acaba de entrar.
  const curso = seguro.match(/^\/cursos\/([^/?]+)/)?.[1];
  if (curso) {
    try {
      const { db } = await import("~/.server/db");
      const subscriber = await db.subscriber.findUnique({
        where: { email: decoded.email },
        select: { id: true, tags: true },
      });

      if (subscriber) {
        const tag = `${curso}-free-access`;
        if (!subscriber.tags.includes(tag)) {
          await db.subscriber.update({
            where: { id: subscriber.id },
            data: { tags: { push: tag }, confirmed: true },
          });
        }

        // Si el destino es un video que se abre con el avance de una secuencia,
        // hay que asegurarse de que esté inscrito: quien hace clic en el video
        // de SU correo no puede toparse con un formulario para suscribirse a lo
        // que ya está suscrito.
        const videoSlug = new URL(request.url).searchParams
          .get("to")
          ?.match(/videoSlug=([^&]+)/)?.[1];
        if (videoSlug) {
          const entrega = await db.sequenceEmail.findFirst({
            where: { videoSlug: decodeURIComponent(videoSlug) },
            select: { sequenceId: true },
          });
          if (entrega) {
            const { enrollSubscriberInSequence } = await import(
              "~/.server/sequences"
            );
            await enrollSubscriberInSequence(entrega.sequenceId, subscriber.id);
          }
        }
      }
    } catch (error) {
      // Que falle esto no debe costarle la entrada: sigue con sus cookies.
      console.error("📧 No se pudo marcar el acceso:", error);
    }
  }

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
