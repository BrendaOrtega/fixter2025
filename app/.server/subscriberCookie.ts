import { createCookie } from "react-router";

/**
 * La identidad de quien desbloqueó contenido con su correo, sin crear cuenta.
 *
 * Iba en texto plano: `fixtergeek_subscriber=alguien@correo.com`, sin firma.
 * El servidor le creía, así que escribir a mano el correo de otra persona en
 * las herramientas del navegador bastaba para que la trataran como esa
 * persona. No abría nada de pago —las compras cuelgan de `user.courses`, que
 * viene de la sesión, que sí va firmada— pero sí las entregas gratuitas, los
 * capítulos de suscriptor y el pong. Y sobre todo: es la pieza que decide
 * acceso en cuatro lugares distintos, así que no puede ser un dato que
 * cualquiera pueda escribir.
 *
 * Ahora va firmada con `SECRET`, igual que `fxg_member` y que la sesión.
 *
 * ─── Migración ───
 * Hay cookies viejas vivas en los navegadores de gente que desbloqueó hace
 * semanas. Si de golpe sólo se aceptaran las firmadas, todos ellos perderían
 * su acceso el mismo día y tendrían que volver a pedir un código por algo que
 * ya habían hecho. Así que durante la transición se acepta la vieja Y se
 * reemite firmada al vuelo: la siguiente visita ya viaja con la buena.
 *
 * Para cerrar la puerta —quitar `leerHeredada` y su uso en `subscriberEmail`—
 * conviene esperar a que pase el tiempo de vida de las viejas. Mientras siga
 * ahí, el agujero sigue abierto: es el precio de no echar a nadie de golpe.
 */
export const SUBSCRIBER_COOKIE = "fixtergeek_subscriber";

export const subscriberCookie = createCookie(SUBSCRIBER_COOKIE, {
  path: "/",
  // Sin `httpOnly`: hay pantallas que leen este correo desde el navegador para
  // prellenar formularios. Firmarla es lo que impide falsificarla; esconderla
  // no lo lograba y romper esas pantallas no compra nada.
  httpOnly: false,
  sameSite: "lax",
  secure: process.env.NODE_ENV !== "development",
  secrets: [process.env.SECRET || "fixtergeek"],
  maxAge: 60 * 60 * 24 * 365,
});

/** La forma vieja, sin firma. Sólo para la migración. */
const leerHeredada = (request: Request): string | null => {
  const raw = (request.headers.get("Cookie") || "")
    .split(";")
    .find((c) => c.trim().startsWith(`${SUBSCRIBER_COOKIE}=`))
    ?.split("=")
    .slice(1)
    .join("=");
  if (!raw) return null;
  const valor = decodeURIComponent(raw);
  // Las firmadas van en base64 con su firma detrás; las viejas son el correo
  // pelón. Si parece un correo, es de las viejas.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor) ? valor : null;
};

/**
 * El correo del suscriptor, o `null`.
 *
 * `heredada: true` avisa a quien llame que ese correo llegó por la cookie vieja
 * y conviene reemitirla firmada en la respuesta.
 */
export async function leerSubscriber(
  request: Request
): Promise<{ email: string | null; heredada: boolean }> {
  const firmada = await subscriberCookie.parse(request.headers.get("Cookie"));
  if (typeof firmada === "string" && firmada.includes("@")) {
    return { email: firmada, heredada: false };
  }
  const vieja = leerHeredada(request);
  return { email: vieja, heredada: !!vieja };
}

/** Sólo el correo, para quien no necesita saber de dónde salió. */
export const subscriberEmail = async (request: Request): Promise<string | null> =>
  (await leerSubscriber(request)).email;

export const setSubscriberCookie = (email: string) =>
  subscriberCookie.serialize(email);
