import { getSesTransport, getSesRemitent } from "~/utils/sendGridTransport";

type AisdkTaller1WelcomeProps = {
  to: string;
  userName?: string;
};

const taller1WelcomeTemplate = ({ userName }: { userName?: string }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Tu inscripcion al Taller 1 esta confirmada</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="padding: 40px 16px; max-width: 520px; margin: 0 auto; background: #ffffff;">
    <img style="max-width: 180px; margin-bottom: 24px;" src="https://i.imgur.com/mpzZhT9.png" alt="FixterGeek" />

    <h1 style="font-size: 28px; margin: 0 0 16px 0; color: #1a1a1a;">
      ${userName ? `Hola ${userName}` : 'Hola'}
    </h1>

    <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <h2 style="color: #ffffff; margin: 0 0 8px 0; font-size: 20px;">
        Tu inscripcion al Taller 1 esta confirmada
      </h2>
      <p style="color: #D1FAE5; margin: 0; font-size: 14px;">
        Introduccion a la IA aplicada con TypeScript
      </p>
    </div>

    <div style="background: #F8FAFC; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #10B981;">
      <p style="margin: 0 0 4px 0; font-weight: bold; color: #1a1a1a;">
        Sabado 24 de Enero 2025
      </p>
      <p style="margin: 0; color: #64748B; font-size: 14px;">
        10:00 AM - 1:30 PM (hora CDMX)
      </p>
    </div>

    <h3 style="color: #1a1a1a; margin: 24px 0 16px 0; font-size: 18px;">
      Que construiras en el taller
    </h3>

    <ul style="margin: 0 0 24px 0; padding-left: 20px; color: #475569; font-size: 14px; line-height: 1.8;">
      <li>Tu primer chat con streaming en tiempo real</li>
      <li>Interfaz React con el hook useChat</li>
      <li>Sistema de doble stream (artefactos estilo v0.dev)</li>
      <li>Codigo fuente completo para llevar a tus proyectos</li>
    </ul>

    <h3 style="color: #1a1a1a; margin: 24px 0 16px 0; font-size: 18px;">
      Temario detallado
    </h3>

    <div style="background: #F8FAFC; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <p style="margin: 0 0 8px 0; font-weight: bold; color: #1a1a1a;">Setup y Fundamentos (~30 min)</p>
      <p style="margin: 0; color: #64748B; font-size: 14px;">Configuracion del entorno y tu primer "hola mundo" con IA</p>
    </div>

    <div style="background: #F8FAFC; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <p style="margin: 0 0 8px 0; font-weight: bold; color: #1a1a1a;">Streaming Basico (~45 min)</p>
      <p style="margin: 0; color: #64748B; font-size: 14px;">Express + vanilla JS para entender el flujo de datos</p>
    </div>

    <div style="background: #F8FAFC; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <p style="margin: 0 0 8px 0; font-weight: bold; color: #1a1a1a;">Cliente React (~45 min)</p>
      <p style="margin: 0; color: #64748B; font-size: 14px;">Hook useChat para interfaces de chat fluidas</p>
    </div>

    <div style="background: #ECFDF5; border-radius: 8px; padding: 16px; margin-bottom: 24px; border: 2px solid #10B981;">
      <p style="margin: 0 0 8px 0; font-weight: bold; color: #1a1a1a;">Doble Stream / Artefactos (~1.5h)</p>
      <p style="margin: 0; color: #064E3B; font-size: 14px;">El plato fuerte: genera UI en tiempo real estilo v0.dev</p>
    </div>

    <div style="background: #FEF3C7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; color: #92400E; font-size: 14px;">
        <strong>Importante:</strong> El link de Zoom te llegara un dia antes del taller a este mismo correo.
      </p>
    </div>

    <p style="color: #64748B; font-size: 14px; margin: 24px 0;">
      Si tienes alguna pregunta, no dudes en escribirnos a <a href="mailto:brenda@fixter.org" style="color: #10B981;">brenda@fixter.org</a>
    </p>

    <p style="color: #1a1a1a; margin: 24px 0 8px 0;">
      Nos vemos el sabado
    </p>
    <p style="color: #64748B; margin: 0;">
      El equipo de FixterGeek
    </p>
  </div>
</body>
</html>
`;

export const sendAisdkTaller1Welcome = async ({
  to,
  userName
}: AisdkTaller1WelcomeProps) => {
  const htmlContent = taller1WelcomeTemplate({ userName });

  return getSesTransport()
    .sendMail({
      from: getSesRemitent(),
      bcc: to,
      subject: "Tu inscripcion al Taller de IA con TypeScript esta confirmada",
      html: htmlContent
    })
    .then((result: any) => {
      console.log(`AI SDK Taller 1 welcome email sent to: ${to}`);
      return result;
    })
    .catch((error: any) => {
      console.error(`Error sending AI SDK Taller 1 welcome email to ${to}:`, error);
      throw error;
    });
};
