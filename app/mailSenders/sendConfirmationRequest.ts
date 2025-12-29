import { getSesTransport, getSesRemitent } from "~/utils/sendGridTransport";
import { generateUserToken } from "~/utils/tokens";

type ConfirmationType = "aisdk-webinar" | "aisdk-taller-1" | "newsletter" | string;

type Props = {
  email: string;
  name?: string;
  type: ConfirmationType;
  tags?: string[];
};

// Configuración por tipo de confirmación
const CONFIRMATION_EMAIL_CONFIG: Record<string, {
  subject: string;
  eventTitle: string;
  eventDetails: string;
  tags: string[];
  welcomeType: string;
}> = {
  "aisdk-webinar": {
    subject: "Confirma tu lugar en el webinar de AI SDK",
    eventTitle: "Webinar: Introducción a la IA aplicada",
    eventDetails: "Viernes 17 de Enero 2025 - 7:00 PM CDMX",
    tags: ["aisdk-webinar-registered"],
    welcomeType: "aisdk-webinar",
  },
  "aisdk-taller-1": {
    subject: "Confirma tu inscripción al taller de AI SDK",
    eventTitle: "Taller 1: IA aplicada con TypeScript",
    eventDetails: "Sábado 24 de Enero 2025 - 10:00 AM CDMX",
    tags: ["aisdk-taller-1-registered"],
    welcomeType: "aisdk-taller-1",
  },
  newsletter: {
    subject: "Confirma tu suscripción a FixterGeek",
    eventTitle: "Newsletter FixterGeek",
    eventDetails: "Contenido sobre desarrollo web e IA",
    tags: ["newsletter"],
    welcomeType: "newsletter",
  },
};

const confirmationRequestTemplate = ({
  link,
  name,
  eventTitle,
  eventDetails,
}: {
  link: string;
  name?: string;
  eventTitle: string;
  eventDetails: string;
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Confirma tu registro</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="padding: 40px 16px; max-width: 520px; margin: 0 auto; background: #ffffff;">
    <img style="max-width: 180px; margin-bottom: 24px;" src="https://i.imgur.com/mpzZhT9.png" alt="FixterGeek" />

    <h1 style="font-size: 28px; margin: 0 0 16px 0; color: #1a1a1a;">
      ${name ? `Hola ${name}` : "Hola"}
    </h1>

    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
      Estas a un click de confirmar tu registro.
    </p>

    <div style="background: #F8FAFC; border-radius: 8px; padding: 16px; margin: 24px 0; border-left: 4px solid #10B981;">
      <p style="margin: 0 0 4px 0; font-weight: bold; color: #1a1a1a;">
        ${eventTitle}
      </p>
      <p style="margin: 0; color: #64748B; font-size: 14px;">
        ${eventDetails}
      </p>
    </div>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${link}" style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
        Confirmar mi registro
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

export const sendConfirmationRequest = async ({
  email,
  name,
  type,
  tags,
}: Props) => {
  const config = CONFIRMATION_EMAIL_CONFIG[type] || {
    subject: "Confirma tu email",
    eventTitle: "Confirmación",
    eventDetails: "",
    tags: tags || [],
    welcomeType: type,
  };

  const token = generateUserToken({
    email,
    action: "confirm-subscriber",
    tags: config.tags,
    welcomeType: config.welcomeType,
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
    eventTitle: config.eventTitle,
    eventDetails: config.eventDetails,
  });

  return getSesTransport()
    .sendMail({
      from: getSesRemitent(),
      bcc: email,
      subject: config.subject,
      html: htmlContent,
    })
    .then((result: any) => {
      console.log(`Confirmation request (${type}) sent to: ${email}`);
      return result;
    })
    .catch((error: any) => {
      console.error(`Error sending confirmation request (${type}) to ${email}:`, error);
      throw error;
    });
};
