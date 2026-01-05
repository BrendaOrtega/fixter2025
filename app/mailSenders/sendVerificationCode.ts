import { getSesTransport, getSesRemitent } from "~/utils/sendGridTransport";

type Props = {
  email: string;
  code: string;
};

const verificationCodeTemplate = ({ code }: { code: string }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Tu codigo de verificacion</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="padding: 40px 16px; max-width: 520px; margin: 0 auto; background: #ffffff;">
    <img style="max-width: 180px; margin-bottom: 24px;" src="https://i.imgur.com/mpzZhT9.png" alt="FixterGeek" />

    <h1 style="font-size: 28px; margin: 0 0 16px 0; color: #1a1a1a;">
      Tu codigo de verificacion
    </h1>

    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
      Usa este codigo para desbloquear tu acceso:
    </p>

    <div style="background: #F8FAFC; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center; border: 2px dashed #10B981;">
      <p style="margin: 0; font-size: 36px; font-weight: bold; color: #1a1a1a; letter-spacing: 8px; font-family: monospace;">
        ${code}
      </p>
    </div>

    <p style="color: #94A3B8; font-size: 12px; margin-top: 24px; text-align: center;">
      Este codigo expira en 10 minutos.
    </p>

    <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 32px 0;" />

    <p style="color: #64748B; font-size: 14px; margin: 0;">
      Si no solicitaste este codigo, ignora este email.
    </p>
  </div>
</body>
</html>
`;

export const sendVerificationCode = async ({ email, code }: Props) => {
  const htmlContent = verificationCodeTemplate({ code });

  return getSesTransport()
    .sendMail({
      from: getSesRemitent(),
      bcc: email,
      subject: `Tu codigo: ${code}`,
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
