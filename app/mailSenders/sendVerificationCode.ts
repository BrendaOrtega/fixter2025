import { wrapEmailHtml } from "~/utils/emailShell";
import { getSesTransport, getSesRemitent } from "~/utils/sendGridTransport";

type Contexto = {
  /** El programa al que pertenece la pieza, para nombrar lo que se abre. */
  courseTitle?: string;
  /** Las piezas que quedan libres con este código. */
  unlocks?: string[];
};

/**
 * El correo del código de acceso.
 *
 * Va sobre `wrapEmailHtml`, el cascarón de la casa: logo, tipografía, footer y
 * el verde de marca (#85DDCB). Antes tenía su propio HTML con una paleta
 * inventada, que no era la del sitio.
 */
const verificationCodeInner = ({ code, courseTitle, unlocks = [] }: { code: string } & Contexto) => `
    <h1 style="margin:0 0 12px 0;font-size:22px;color:#19262A;">Tu código de acceso</h1>
    <p style="margin:0 0 20px 0;">
      Escríbelo en la pestaña que dejaste abierta${
        courseTitle ? ` y sigues viendo <strong>${courseTitle}</strong>` : ""
      }.
    </p>
    <div style="background:#19262A;border-radius:12px;padding:22px;text-align:center;margin:0 0 20px 0;">
      <span style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:34px;font-weight:bold;letter-spacing:10px;color:#85DDCB;">${code}</span>
    </div>
    ${
      unlocks.length
        ? `<p style="margin:0 0 8px 0;font-size:12px;text-transform:uppercase;letter-spacing:1.2px;color:#5c7076;">
      Con esto se te abre
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7faf9;border:1px solid #e2e8e8;border-radius:12px;padding:14px 16px;margin:0 0 20px 0;">
      ${unlocks
        .map(
          (title) => `<tr><td style="padding:5px 0;font-size:14px;color:#19262A;">
        <span style="color:#37ab93;font-weight:bold;">&#10003;</span>&nbsp; ${title}
      </td></tr>`,
        )
        .join("")}
    </table>`
        : ""
    }
    <p style="margin:0 0 4px 0;font-size:13px;color:#5c7076;">Expira en 10 minutos.</p>
    <p style="margin:0;font-size:13px;color:#5c7076;">
      Si no lo pediste tú, ignora este correo: sin el código nadie entra.
    </p>`;

export const sendVerificationCode = async (
  email: string,
  code: string,
  contexto: Contexto = {},
) => {
  // Sin footer promocional: esto no es una secuencia, es la llave para entrar.
  const htmlContent = wrapEmailHtml(verificationCodeInner({ code, ...contexto }), {
    preheader: `Tu código expira en 10 minutos.`,
    promoFooter: false,
  }).replace(/\{\{unsubscribe\}\}/g, "https://www.fixtergeek.com/secuencias");

  return getSesTransport()
    .sendMail({
      from: getSesRemitent(),
      to: email,
      subject: `${code} es tu código de acceso`,
      html: htmlContent,
    })
    .then((result: any) => {
      console.log(`Verification code sent to: ${email}`);
      return result;
    })
    .catch((error: any) => {
      console.error(`Error sending verification code to ${email}:`, error);
      throw error;
    });
};
