import { wrapEmailHtml, emailButton } from "~/.server/emailShell";
import { sendSesEmailDirect, getSesRemitent } from "~/utils/sesTransport";
import { generateSequenceSubscribeToken } from "~/utils/tokens";

const baseUrl =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://www.fixtergeek.com";

/**
 * Email de doble opt-in: pide confirmar la suscripción a una secuence.
 * El link lleva un token firmado que, al abrirse en /s/confirmar, confirma
 * al subscriber y crea el enrollment.
 */
export async function sendSequenceConfirmation({
  email,
  name,
  sequenceId,
  sequenceName,
}: {
  email: string;
  name?: string;
  sequenceId: string;
  sequenceName: string;
}) {
  const token = generateSequenceSubscribeToken(email, sequenceId, name);
  const link = `${baseUrl}/s/confirmar?token=${token}`;

  const inner = `
    <h1 style="margin:0 0 12px 0;font-size:22px;color:#19262A;">
      ${name ? `Hola ${name},` : "¡Casi listo!"}
    </h1>
    <p style="margin:0 0 16px 0;">
      Estás a un clic de suscribirte a <strong>${sequenceName}</strong>.
      Confirma tu correo para empezar a recibir los emails.
    </p>
    <div style="text-align:center;margin:24px 0;">
      ${emailButton("Confirmar suscripción", link)}
    </div>
    <p style="margin:16px 0 0 0;font-size:13px;color:#5b6b6f;">
      Si no solicitaste esto, ignora este correo. El enlace expira en 7 días.
    </p>`;

  return sendSesEmailDirect({
    to: email,
    from: getSesRemitent(),
    subject: `Confirma tu suscripción a ${sequenceName}`,
    htmlBody: wrapEmailHtml(inner, {
      preheader: `Confirma tu suscripción a ${sequenceName}`,
    }),
  });
}
