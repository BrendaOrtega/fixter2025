import { getSesTransport, getSesRemitent } from "~/utils/sendGridTransport";

type Props = {
  email: string;
  code: string;
};

/**
 * El correo del código de acceso.
 *
 * Tabla y estilos en línea porque los clientes de correo no aplican CSS moderno,
 * y fondo claro a propósito: Gmail en modo oscuro invierte los fondos claros de
 * forma predecible, mientras que un fondo oscuro propio le queda a medio camino.
 */
type Contexto = {
  /** El programa al que pertenece la pieza, para nombrar lo que se abre. */
  courseTitle?: string;
  /** Las piezas que quedan libres con este código. */
  unlocks?: string[];
};

const verificationCodeTemplate = ({ code, courseTitle, unlocks = [] }: { code: string } & Contexto) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Tu código de acceso</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f7;">
  <!-- Se ve en la vista previa de la bandeja, antes de abrir. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    Tu código expira en 10 minutos.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="max-width:440px;background:#ffffff;border-radius:16px;overflow:hidden;
                    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
        <tr><td style="background:#0b0b0f;padding:22px 28px;">
          <span style="color:#ffffff;font-size:19px;font-weight:700;letter-spacing:-0.4px;">Fixter<span style="color:#7c3aed;">geek</span></span>
        </td></tr>
        <tr><td style="padding:32px 28px 8px 28px;">
          <h1 style="margin:0 0 8px 0;font-size:22px;line-height:1.3;color:#0b0b0f;">Tu código de acceso</h1>
          <p style="margin:0;font-size:15px;line-height:1.6;color:#5b5b6b;">
            Escríbelo en la pestaña que dejaste abierta${courseTitle ? ` y sigues viendo <strong style="color:#0b0b0f;">${courseTitle}</strong>` : " y sigues viendo"}.
          </p>
        </td></tr>
        <tr><td style="padding:24px 28px;">
          <div style="background:#0b0b0f;border-radius:12px;padding:22px;text-align:center;">
            <span style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:34px;font-weight:700;
                         letter-spacing:10px;color:#ffffff;">${code}</span>
          </div>
        </td></tr>
${unlocks.length ? `
        <tr><td style="padding:0 28px 4px 28px;">
          <p style="margin:0 0 10px 0;font-size:13px;text-transform:uppercase;letter-spacing:1.2px;color:#8a8a9a;">
            Con esto se te abre
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                 style="background:#f7f6fb;border-radius:12px;padding:14px 16px;">
            ${unlocks
              .map(
                (title) => `<tr><td style="padding:5px 0;font-size:14px;color:#2b2b3a;">
              <span style="color:#7c3aed;font-weight:700;">&#10003;</span>&nbsp; ${title}
            </td></tr>`,
              )
              .join("")}
          </table>
        </td></tr>` : ""}
        <tr><td style="padding:24px 28px 28px 28px;">
          <p style="margin:0 0 6px 0;font-size:13px;color:#8a8a9a;">Expira en 10 minutos.</p>
          <p style="margin:0;font-size:13px;line-height:1.6;color:#8a8a9a;">
            Si no lo pediste tú, ignora este correo: sin el código nadie entra.
          </p>
        </td></tr>
        <tr><td style="background:#f4f4f7;padding:16px 28px;">
          <p style="margin:0;font-size:12px;color:#9a9aa8;">
            FixterGeek · <a href="https://www.fixtergeek.com" style="color:#7c3aed;text-decoration:none;">fixtergeek.com</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`;

export const sendVerificationCode = async (
  email: string,
  code: string,
  contexto: Contexto = {},
) => {
  const htmlContent = verificationCodeTemplate({ code, ...contexto });

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
