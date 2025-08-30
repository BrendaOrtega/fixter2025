import { getSesTransport, getSesRemitent } from "~/utils/sendGridTransport";
import { webinarRegistrationTemplate } from "./templates/webinarRegistration";
import jwt from "jsonwebtoken";

type WebinarRegistrationProps = {
  to: string;
  webinarTitle?: string;
  webinarDate?: string;
  userName?: string;
  isConfirmed?: boolean;
};

export const sendWebinarRegistration = async ({
  to,
  webinarTitle = "Webinar Gratuito",
  webinarDate = "Próximamente",
  userName,
  isConfirmed = false
}: WebinarRegistrationProps) => {
  
  // Generar token de confirmación si el usuario no está confirmado
  let confirmationLink;
  if (!isConfirmed) {
    const token = jwt.sign({ email: to }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    confirmationLink = `${process.env.BASE_URL || "https://fixtergeek.com"}/verify-email/${token}`;
    console.log("Token generado para:", to);
    console.log("Enlace completo:", confirmationLink);
  }
  
  const htmlContent = webinarRegistrationTemplate({ 
    webinarTitle, 
    webinarDate,
    confirmationLink,
    isConfirmed
  });

  return getSesTransport()
    .sendMail({
      from: getSesRemitent(),
      bcc: to, // Usar BCC como funcionaba antes
      subject: `✅ Registro confirmado - ${webinarTitle}`,
      html: htmlContent
    })
    .then((result: any) => {
      console.log(`✅ Webinar registration email sent to: ${to}`);
      return result;
    })
    .catch((error: any) => {
      console.error(`❌ Error sending webinar registration email to ${to}:`, error);
      throw error;
    });
};