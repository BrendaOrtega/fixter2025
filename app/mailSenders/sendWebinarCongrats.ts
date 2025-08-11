import { getSesTransport, getSesRemitent } from "~/utils/sendGridTransport";
import { webinarCongratsTemplate } from "./templates/webinarCongrats";

type WebinarCongratsProps = {
  to: string;
  webinarTitle?: string;
  webinarDate?: string;
  userName?: string;
};

export const sendWebinarCongrats = async ({
  to,
  webinarTitle = "Claude Workshop",
  webinarDate = "Próximamente",
  userName
}: WebinarCongratsProps) => {
  // Temporalmente deshabilitado hasta configurar SendGrid o AWS SES correctamente
  console.log(`📧 Email del webinar deshabilitado temporalmente para: ${to}`);
  console.log(`   Título: ${webinarTitle}`);
  console.log(`   Fecha: ${webinarDate}`);
  console.log(`   Usuario: ${userName || 'Sin nombre'}`);
  
  // Retornar éxito simulado para no bloquear el flujo
  return Promise.resolve({
    messageId: 'simulated-' + Date.now(),
    accepted: [to],
    rejected: [],
    pending: []
  });
  
  /* Código original comentado temporalmente
  const link = `${process.env.BASE_URL || "https://fixtergeek.com"}/mis-cursos`;
  
  const htmlContent = webinarCongratsTemplate({ 
    link, 
    webinarTitle, 
    webinarDate 
  });

  return getSesTransport()
    .sendMail({
      from: getSesRemitent(),
      bcc: to,
      subject: `🎉 ¡Registro confirmado! - ${webinarTitle}`,
      html: htmlContent
    })
    .then((result: any) => {
      console.log(`✅ Webinar congratulations email sent to: ${to}`);
      return result;
    })
    .catch((error: any) => {
      console.error(`❌ Error sending webinar email to ${to}:`, error);
      throw error;
    });
  */
};