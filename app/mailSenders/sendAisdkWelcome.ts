import { getSesTransport, getSesRemitent } from "~/utils/sendGridTransport";

type AisdkWelcomeProps = {
  to: string;
  userName?: string;
};

const aisdkWelcomeTemplate = ({ userName }: { userName?: string }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Bienvenido al Taller de AI SDK</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="padding: 40px 16px; max-width: 520px; margin: 0 auto; background: #ffffff;">
    <img style="max-width: 180px; margin-bottom: 24px;" src="https://i.imgur.com/mpzZhT9.png" alt="FixterGeek" />

    <h1 style="font-size: 28px; margin: 0 0 16px 0; color: #1a1a1a;">
      ${userName ? `Hola ${userName}` : 'Hola'}
    </h1>

    <div style="background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <h2 style="color: #ffffff; margin: 0 0 8px 0; font-size: 20px;">
        Tu inscripcion al Taller de AI SDK esta confirmada
      </h2>
      <p style="color: #E0E7FF; margin: 0; font-size: 14px;">
        Aprende a construir aplicaciones con IA usando TypeScript
      </p>
    </div>

    <h3 style="color: #1a1a1a; margin: 24px 0 16px 0; font-size: 18px;">
      Fechas del Taller
    </h3>

    <div style="background: #F8FAFC; border-radius: 8px; padding: 16px; margin-bottom: 16px; border-left: 4px solid #3B82F6;">
      <p style="margin: 0 0 4px 0; font-weight: bold; color: #1a1a1a;">
        Sesion 1 - Sabado 13 de Diciembre
      </p>
      <p style="margin: 0; color: #64748B; font-size: 14px;">
        10:00 AM - 1:30 PM (hora CDMX)
      </p>
      <ul style="margin: 12px 0 0 0; padding-left: 20px; color: #475569; font-size: 14px;">
        <li>Intro a TypeScript</li>
        <li>NodeJS y ES Modules</li>
        <li>Tu primer programa inteligente</li>
        <li>RAG simple</li>
      </ul>
    </div>

    <div style="background: #F8FAFC; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #3B82F6;">
      <p style="margin: 0 0 4px 0; font-weight: bold; color: #1a1a1a;">
        Sesion 2 - Sabado 20 de Diciembre
      </p>
      <p style="margin: 0; color: #64748B; font-size: 14px;">
        10:00 AM - 1:30 PM (hora CDMX)
      </p>
      <ul style="margin: 12px 0 0 0; padding-left: 20px; color: #475569; font-size: 14px;">
        <li>Intro a ExpressJS</li>
        <li>Conectando agente IA a cliente web</li>
        <li>Streams end-to-end</li>
        <li>Chat con React</li>
        <li>Tools y RAG avanzado</li>
      </ul>
    </div>

    <div style="background: #FEF3C7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; color: #92400E; font-size: 14px;">
        <strong>Importante:</strong> El link de Zoom para las sesiones te llegara un dia antes de cada clase a este mismo correo.
      </p>
    </div>

    <p style="color: #64748B; font-size: 14px; margin: 24px 0;">
      Si tienes alguna pregunta, no dudes en escribirnos a <a href="mailto:brenda@fixter.org" style="color: #3B82F6;">brenda@fixter.org</a>
    </p>

    <p style="color: #1a1a1a; margin: 24px 0 8px 0;">
      Nos vemos pronto
    </p>
    <p style="color: #64748B; margin: 0;">
      El equipo de FixterGeek
    </p>
  </div>
</body>
</html>
`;

export const sendAisdkWelcome = async ({
  to,
  userName
}: AisdkWelcomeProps) => {
  const htmlContent = aisdkWelcomeTemplate({ userName });

  return getSesTransport()
    .sendMail({
      from: getSesRemitent(),
      bcc: to,
      subject: "Tu inscripcion al Taller de AI SDK esta confirmada",
      html: htmlContent
    })
    .then((result: any) => {
      console.log(`AI SDK welcome email sent to: ${to}`);
      return result;
    })
    .catch((error: any) => {
      console.error(`Error sending AI SDK welcome email to ${to}:`, error);
      throw error;
    });
};
