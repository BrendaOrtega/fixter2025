import { getSesTransport, getSesRemitent } from "~/utils/sendGridTransport";
import { generateUserToken } from "~/utils/tokens";

type Props = {
  email: string;
  name?: string;
};

const confirmationRequestTemplate = ({
  link,
  name,
}: {
  link: string;
  name?: string;
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Confirma tu lugar en el webinar</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="padding: 40px 16px; max-width: 520px; margin: 0 auto; background: #ffffff;">
    <img style="max-width: 180px; margin-bottom: 24px;" src="https://i.imgur.com/mpzZhT9.png" alt="FixterGeek" />

    <h1 style="font-size: 28px; margin: 0 0 16px 0; color: #1a1a1a;">
      ${name ? `Hola ${name}` : "Hola"}
    </h1>

    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
      Estas a un click de reservar tu lugar en el webinar gratuito de AI SDK.
    </p>

    <div style="background: #F8FAFC; border-radius: 8px; padding: 16px; margin: 24px 0; border-left: 4px solid #10B981;">
      <p style="margin: 0 0 4px 0; font-weight: bold; color: #1a1a1a;">
        Webinar: Introduccion a la IA aplicada
      </p>
      <p style="margin: 0; color: #64748B; font-size: 14px;">
        Viernes 17 de Enero 2025 - 7:00 PM CDMX
      </p>
    </div>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${link}" style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
        Confirmar mi lugar
      </a>
    </div>

    <p style="color: #94A3B8; font-size: 12px; margin-top: 24px; text-align: center;">
      Este enlace expira en 1 hora. Si no solicitaste este registro, ignora este email.
    </p>

    <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 32px 0;" />

    <p style="color: #64748B; font-size: 14px; margin: 0;">
      Si tienes preguntas, escribe a <a href="mailto:brenda@fixter.org" style="color: #10B981;">brenda@fixter.org</a>
    </p>
  </div>
</body>
</html>
`;

export const sendAisdkWebinarConfirmationRequest = async ({
  email,
  name,
}: Props) => {
  const token = generateUserToken({
    email,
    action: "confirm-subscriber",
    tags: ["aisdk-webinar-registered"],
    welcomeType: "aisdk-webinar",
    redirectTo: "/ai-sdk",
  });

  const baseUrl =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "https://www.fixtergeek.com";

  const url = new URL(baseUrl);
  url.pathname = "/login";
  url.searchParams.set("token", token);

  const htmlContent = confirmationRequestTemplate({
    link: url.toString(),
    name,
  });

  return getSesTransport()
    .sendMail({
      from: getSesRemitent(),
      bcc: email,
      subject: "Confirma tu lugar en el webinar de AI SDK",
      html: htmlContent,
    })
    .then((result: any) => {
      console.log(`AI SDK webinar confirmation request sent to: ${email}`);
      return result;
    })
    .catch((error: any) => {
      console.error(
        `Error sending AI SDK webinar confirmation request to ${email}:`,
        error
      );
      throw error;
    });
};
