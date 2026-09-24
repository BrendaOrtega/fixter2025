import { wrapEmailHtml, emailButton } from "~/utils/emailShell";
import { sendSesEmailDirect } from "~/utils/sesTransport";
import { generateWaitlistConfirmToken } from "~/utils/tokens";

const baseUrl =
  process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://www.fixtergeek.com";

/**
 * Bienvenida a la lista de espera de Software Factory, con doble opt-in.
 *
 * Contenido FIJO a propósito: no lleva nombre ni ningún texto que haya escrito quien llenó el
 * formulario, así nadie puede usar nuestro remitente para colar su mensaje. Si alguien anotó un
 * correo ajeno, a esa persona le llega esto UNA vez (lo garantiza `claimEmailSend`) y, sin
 * confirmar, no le volvemos a escribir.
 */
export async function sendFactoryWaitlistWelcome(email: string, tag: string) {
  const link = `${baseUrl}/software-factory?confirmar=${generateWaitlistConfirmToken(email, tag)}`;

  const inner = `
    <h1 style="margin:0 0 12px 0;font-size:24px;">¡Bienvenido a la lista de Software Factory! 🏭</h1>
    <p style="margin:0 0 14px 0;">
      Es un taller en vivo para montar tu propia fábrica de software: agentes de código que toman
      tickets, abren PRs y despliegan mientras tú revisas, con el agente y el stack que ya usas.
    </p>
    <p style="margin:0 0 14px 0;">
      Confirma tu correo y serás de los primeros en saber fechas y precio de lanzamiento.
    </p>
    <div style="text-align:center;margin:24px 0;">
      ${emailButton("Confirmar mi lugar", link)}
    </div>
    <p style="margin:16px 0 0 0;font-size:13px;">
      ¿No fuiste tú? Ignora este correo: sin tu confirmación no te volveremos a escribir.
    </p>`;

  const htmlBody = wrapEmailHtml(inner, {
    preheader: "Confirma tu correo y te avisamos primero cuando abra el taller.",
    promoFooter: false,
  }).replace(/\{\{unsubscribe\}\}/g, `${baseUrl}/secuencias`);

  return sendSesEmailDirect({
    to: email,
    from: "FixterGeek <contacto@fixtergeek.com>",
    subject: "Bienvenido a la lista de Software Factory 🏭",
    htmlBody,
  });
}
