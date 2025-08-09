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
};