import { getSesTransport, getSesRemitent } from "~/utils/sendGridTransport";

type AisdkWebinarConfirmationProps = {
  to: string;
  userName?: string;
};

const webinarConfirmationTemplate = ({ userName }: { userName?: string }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Tu lugar en el webinar esta confirmado</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="padding: 40px 16px; max-width: 520px; margin: 0 auto; background: #ffffff;">
    <img style="max-width: 180px; margin-bottom: 24px;" src="https://i.imgur.com/mpzZhT9.png" alt="FixterGeek" />

    <h1 style="font-size: 28px; margin: 0 0 16px 0; color: #1a1a1a;">
      ${userName ? `Hola ${userName}` : 'Hola'}
    </h1>

    <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <h2 style="color: #ffffff; margin: 0 0 8px 0; font-size: 20px;">
        Tu lugar en el webinar esta confirmado
      </h2>
      <p style="color: #D1FAE5; margin: 0; font-size: 14px;">
        Introduccion a la IA aplicada con TypeScript y React
      </p>
    </div>

    <div style="background: #F8FAFC; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #10B981;">
      <p style="margin: 0 0 4px 0; font-weight: bold; color: #1a1a1a;">
        Viernes 17 de Enero 2025
      </p>
      <p style="margin: 0; color: #64748B; font-size: 14px;">
        7:00 PM (hora CDMX)
      </p>
    </div>

    <h3 style="color: #1a1a1a; margin: 24px 0 16px 0; font-size: 18px;">
      Que veras en el webinar (45 min)
    </h3>

    <ul style="margin: 0 0 24px 0; padding-left: 20px; color: #475569; font-size: 14px; line-height: 1.8;">
      <li>Mensajes, prompts de sistema y razonamiento</li>
      <li>Que son los tokens y por que importan</li>
      <li>Ventana de contexto: limites y estrategias</li>
      <li>Herramientas y agentes: conceptos clave</li>
      <li>Demo: UI generativa en tiempo real</li>
    </ul>

    <div style="background: #FEF3C7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; color: #92400E; font-size: 14px;">
        <strong>Importante:</strong> El link de Zoom te llegara un dia antes del webinar a este mismo correo.
      </p>
    </div>

    <p style="color: #64748B; font-size: 14px; margin: 24px 0;">
      Si tienes alguna pregunta, no dudes en escribirnos a <a href="mailto:brenda@fixter.org" style="color: #10B981;">brenda@fixter.org</a>
    </p>

    <p style="color: #1a1a1a; margin: 24px 0 8px 0;">
      Nos vemos el viernes
    </p>
    <p style="color: #64748B; margin: 0;">
      El equipo de FixterGeek
    </p>
  </div>
</body>
</html>
`;

export const sendAisdkWebinarConfirmation = async ({
  to,
  userName
}: AisdkWebinarConfirmationProps) => {
  const htmlContent = webinarConfirmationTemplate({ userName });

  return getSesTransport()
    .sendMail({
      from: getSesRemitent(),
      bcc: to,
      subject: "Tu lugar en el webinar de AI SDK esta confirmado",
      html: htmlContent
    })
    .then((result: any) => {
      console.log(`AI SDK webinar confirmation email sent to: ${to}`);
      return result;
    })
    .catch((error: any) => {
      console.error(`Error sending AI SDK webinar confirmation email to ${to}:`, error);
      throw error;
    });
};
