import { wrapEmailHtml, emailButton } from "~/utils/emailShell";
import { sendSesEmailDirect } from "~/utils/sesTransport";
import { generateAccessToken } from "~/utils/tokens";

const baseUrl =
  process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://www.fixtergeek.com";

/**
 * Link para entrar con tu correo a una página que antes te reconocía sólo con escribirlo.
 *
 * Escribir el correo de un suscriptor confirmado bastaba para recibir SU cookie de miembro
 * (panel de comunidad, videos, secuencias). Ahora, si la petición no trae ya la identidad de
 * ese correo, se manda este link: sólo quien abre ese buzón entra. Pasa por `/e`, que valida
 * el token, siembra las cookies de identidad y redirige sólo a rutas propias.
 *
 * Contenido fijo (sin nombre ni texto del visitante), como toda plantilla que dispara un form.
 */
export async function sendAccessLink(email: string, to: string) {
  const link = `${baseUrl}/e?t=${generateAccessToken(email)}&to=${encodeURIComponent(to)}`;

  const inner = `
    <h1 style="margin:0 0 12px 0;font-size:22px;">Tu link para entrar</h1>
    <p style="margin:0 0 16px 0;">
      Alguien (ojalá tú) pidió entrar a FixterGeek con este correo. Da clic para continuar
      justo donde estabas.
    </p>
    <div style="text-align:center;margin:24px 0;">
      ${emailButton("Entrar", link)}
    </div>
    <p style="margin:16px 0 0 0;font-size:13px;">
      ¿No fuiste tú? Ignora este correo: sin este link nadie entra con tu dirección.
    </p>`;

  const htmlBody = wrapEmailHtml(inner, { preheader: "Tu link para entrar a FixterGeek." }).replace(
    /\{\{unsubscribe\}\}/g,
    `${baseUrl}/secuencias`,
  );

  return sendSesEmailDirect({
    to: email,
    from: "FixterGeek <contacto@fixtergeek.com>",
    subject: "Tu link para entrar a FixterGeek",
    htmlBody,
  });
}
