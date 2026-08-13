import { wrapEmailHtml, emailButton } from "~/utils/emailShell";
import { sendSesEmailDirect } from "~/utils/sesTransport";
import { generateCommunitySubscribeToken } from "~/utils/tokens";

const SEQUENCE_FROM = "FixterGeek <secuencias@fixtergeek.com>";

const baseUrl =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://www.fixtergeek.com";

/**
 * Doble opt-in para entrar a una comunidad. El link lleva un token firmado
 * que, al abrirse en /c/confirmar, confirma al subscriber, le pone el tag de
 * la comunidad y lo enrola en la secuencia de bienvenida.
 */
export async function sendCommunityConfirmation({
  email,
  name,
  communityId,
  communityName,
  sequenceName,
}: {
  email: string;
  name?: string;
  communityId: string;
  communityName: string;
  sequenceName?: string | null;
}) {
  const token = generateCommunitySubscribeToken(email, communityId, name);
  const link = `${baseUrl}/c/confirmar?token=${token}`;

  const inner = `
    <h1 style="margin:0 0 12px 0;font-size:22px;color:#19262A;">
      ${name ? `${name}, falta un clic` : "Falta un clic"}
    </h1>
    <p style="margin:0 0 16px 0;">
      Confirma tu correo para entrar a <strong>${communityName}</strong>.
      ${
        sequenceName
          ? `En cuanto lo hagas te llega la primera entrega de <strong>${sequenceName}</strong>.`
          : ""
      }
    </p>
    <div style="text-align:center;margin:24px 0;">
      ${emailButton("Confirmar mi correo", link)}
    </div>
    <p style="margin:16px 0 0 0;font-size:13px;color:#5b6b6f;">
      Si no fuiste tú, ignora este correo. El enlace expira en 7 días.
    </p>`;

  // Todavía no hay enrollment, así que el placeholder de baja apunta a la
  // gestión de suscripciones.
  const htmlBody = wrapEmailHtml(inner, {
    preheader: `Confirma tu correo para entrar a ${communityName}`,
    promoFooter: false,
  }).replace(/\{\{unsubscribe\}\}/g, `${baseUrl}/secuencias`);

  return sendSesEmailDirect({
    to: email,
    from: SEQUENCE_FROM,
    subject: `Confirma tu correo — ${communityName}`,
    htmlBody,
  });
}
