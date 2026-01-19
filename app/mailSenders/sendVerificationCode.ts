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
  <title>Codigo de verificacion</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="padding: 24px 16px; max-width: 400px; margin: 0 auto; background: #ffffff;">
    <img style="max-width: 120px; margin-bottom: 16px;" src="https://i.imgur.com/mpzZhT9.png" alt="FixterGeek" />
    <p style="color: #475569; font-size: 14px; margin: 0 0 16px 0;">Tu codigo:</p>
    <div style="background: #F8FAFC; border-radius: 8px; padding: 16px; text-align: center; border: 1px solid #E2E8F0;">
      <p style="margin: 0; font-size: 24px; font-weight: bold; color: #1a1a1a; letter-spacing: 6px; font-family: monospace;">
        ${code}
      </p>
    </div>
    <p style="color: #94A3B8; font-size: 11px; margin-top: 16px;">Expira en 10 minutos.</p>
  </div>
</body>
</html>
`;

export const sendVerificationCode = async (email: string, code: string) => {
  const htmlContent = verificationCodeTemplate({ code });

  return getSesTransport()
    .sendMail({
      from: getSesRemitent(),
      to: email,
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
