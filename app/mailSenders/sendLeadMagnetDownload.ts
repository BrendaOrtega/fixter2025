import { getSesTransport, getSesRemitent } from "~/utils/sendGridTransport";
import { generateLeadMagnetToken } from "~/utils/tokens";

type SendLeadMagnetDownloadProps = {
  to: string;
  slug: string;
  title: string;
  downloadUrl: string;
  coverImage?: string | null;
  userName?: string;
  expirationHours?: number;
};

type SendWaitlistConfirmationProps = {
  to: string;
  slug: string;
  eventName: string;
  eventDate?: string;
  eventTime?: string;
  eventLink?: string;
  eventDescription?: string;
  coverImage?: string | null;
  userName?: string;
};

const leadMagnetDownloadTemplate = ({
  userName,
  title,
  downloadUrl,
  coverImage,
  expirationHours = 24,
}: {
  userName?: string;
  title: string;
  downloadUrl: string;
  coverImage?: string | null;
  expirationHours?: number;
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Tu descarga está lista</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="padding: 40px 16px; max-width: 520px; margin: 0 auto; background: #ffffff;">
    <img style="max-width: 180px; margin-bottom: 24px;" src="https://i.imgur.com/mpzZhT9.png" alt="FixterGeek" />

    <h1 style="font-size: 28px; margin: 0 0 16px 0; color: #1a1a1a;">
      ${userName ? `Hola ${userName}` : "Hola"}
    </h1>

    ${
      coverImage
        ? `
    <div style="margin-bottom: 24px; text-align: center;">
      <img src="${coverImage}" alt="${title}" style="max-width: 200px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" />
    </div>
    `
        : ""
    }

    <div style="background: linear-gradient(135deg, #CA9B77 0%, #845A8F 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <h2 style="color: #ffffff; margin: 0 0 8px 0; font-size: 20px;">
        Tu descarga está lista
      </h2>
      <p style="color: #F3E8FF; margin: 0; font-size: 16px; font-weight: 500;">
        ${title}
      </p>
    </div>

    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
      Gracias por tu interés. Haz clic en el botón de abajo para descargar tu recurso.
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${downloadUrl}"
         style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #CA9B77 0%, #845A8F 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
        Descargar ahora
      </a>
    </div>

    <div style="background: #FEF3C7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; color: #92400E; font-size: 14px;">
        <strong>Importante:</strong> Este enlace es válido por ${expirationHours} horas.
        Si expira, puedes solicitar uno nuevo desde la página de descarga.
      </p>
    </div>

    <p style="color: #64748B; font-size: 14px; margin: 24px 0;">
      Si tienes alguna pregunta, no dudes en escribirnos a
      <a href="mailto:brenda@fixter.org" style="color: #CA9B77;">brenda@fixter.org</a>
    </p>

    <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />

    <p style="color: #1a1a1a; margin: 24px 0 8px 0;">
      Abrazo,
    </p>
    <p style="color: #64748B; margin: 0;">
      El equipo de FixterGeek
    </p>
  </div>
</body>
</html>
`;

/**
 * Envía un email con el link de descarga del lead magnet
 */
export const sendLeadMagnetDownload = async ({
  to,
  slug,
  title,
  downloadUrl,
  coverImage,
  userName,
  expirationHours = 24,
}: SendLeadMagnetDownloadProps) => {
  const htmlContent = leadMagnetDownloadTemplate({
    userName,
    title,
    downloadUrl,
    coverImage,
    expirationHours,
  });

  return getSesTransport()
    .sendMail({
      from: getSesRemitent(),
      bcc: to,
      subject: `Tu descarga está lista: ${title}`,
      html: htmlContent,
    })
    .then((result: any) => {
      console.log(
        `[Lead Magnet] Email enviado a: ${to} para lead magnet: ${slug}`
      );
      return result;
    })
    .catch((error: any) => {
      console.error(`[Lead Magnet] Error enviando email a ${to}:`, error);
      throw error;
    });
};

/**
 * Envía un email con magic link para confirmar y descargar
 * (para usuarios no confirmados)
 */
export const sendLeadMagnetConfirmation = async ({
  to,
  slug,
  title,
  coverImage,
  userName,
}: {
  to: string;
  slug: string;
  title: string;
  coverImage?: string | null;
  userName?: string;
}) => {
  // Generar token válido por 7 días
  const token = generateLeadMagnetToken(to, slug);
  const confirmUrl = `https://www.fixtergeek.com/descarga/${slug}/gracias?token=${token}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Confirma tu descarga</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="padding: 40px 16px; max-width: 520px; margin: 0 auto; background: #ffffff;">
    <img style="max-width: 180px; margin-bottom: 24px;" src="https://i.imgur.com/mpzZhT9.png" alt="FixterGeek" />

    <h1 style="font-size: 28px; margin: 0 0 16px 0; color: #1a1a1a;">
      ${userName ? `Hola ${userName}` : "Hola"}
    </h1>

    ${
      coverImage
        ? `
    <div style="margin-bottom: 24px; text-align: center;">
      <img src="${coverImage}" alt="${title}" style="max-width: 200px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" />
    </div>
    `
        : ""
    }

    <div style="background: linear-gradient(135deg, #CA9B77 0%, #845A8F 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <h2 style="color: #ffffff; margin: 0 0 8px 0; font-size: 20px;">
        Confirma tu email para descargar
      </h2>
      <p style="color: #F3E8FF; margin: 0; font-size: 16px; font-weight: 500;">
        ${title}
      </p>
    </div>

    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
      Solo necesitamos confirmar tu email. Haz clic en el botón de abajo para
      completar tu suscripción y acceder a la descarga.
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${confirmUrl}"
         style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #CA9B77 0%, #845A8F 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
        Confirmar y descargar
      </a>
    </div>

    <div style="background: #E0F2FE; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; color: #0369A1; font-size: 14px;">
        <strong>¿Por qué este paso?</strong> Queremos asegurarnos de que realmente
        quieres recibir nuestro contenido. Así evitamos el spam.
      </p>
    </div>

    <p style="color: #64748B; font-size: 14px; margin: 24px 0;">
      Este enlace es válido por 7 días. Si no solicitaste esta descarga,
      puedes ignorar este email.
    </p>

    <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />

    <p style="color: #1a1a1a; margin: 24px 0 8px 0;">
      Abrazo,
    </p>
    <p style="color: #64748B; margin: 0;">
      El equipo de FixterGeek
    </p>
  </div>
</body>
</html>
`;

  return getSesTransport()
    .sendMail({
      from: getSesRemitent(),
      bcc: to,
      subject: `Confirma tu email para descargar: ${title}`,
      html: htmlContent,
    })
    .then((result: any) => {
      console.log(
        `[Lead Magnet] Email de confirmación enviado a: ${to} para: ${slug}`
      );
      return result;
    })
    .catch((error: any) => {
      console.error(
        `[Lead Magnet] Error enviando email de confirmación a ${to}:`,
        error
      );
      throw error;
    });
};

/**
 * Envía confirmación de registro en lista de espera (waitlist)
 */
export const sendWaitlistConfirmation = async ({
  to,
  slug,
  eventName,
  eventDate,
  eventTime,
  eventLink,
  eventDescription,
  coverImage,
  userName,
}: SendWaitlistConfirmationProps) => {
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>¡Estás en la lista!</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="padding: 40px 16px; max-width: 520px; margin: 0 auto; background: #ffffff;">
    <img style="max-width: 180px; margin-bottom: 24px;" src="https://i.imgur.com/mpzZhT9.png" alt="FixterGeek" />

    <h1 style="font-size: 28px; margin: 0 0 16px 0; color: #1a1a1a;">
      ${userName ? `¡Hola ${userName}!` : "¡Hola!"}
    </h1>

    ${
      coverImage
        ? `
    <div style="margin-bottom: 24px; text-align: center;">
      <img src="${coverImage}" alt="${eventName}" style="max-width: 280px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" />
    </div>
    `
        : ""
    }

    <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <h2 style="color: #ffffff; margin: 0 0 8px 0; font-size: 20px;">
        ✅ ¡Estás registrado!
      </h2>
      <p style="color: #D1FAE5; margin: 0; font-size: 16px; font-weight: 500;">
        ${eventName}
      </p>
    </div>

    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
      Tu lugar está apartado. Te enviaremos recordatorios antes del evento.
    </p>

    ${
      eventDate || eventTime
        ? `
    <div style="background: #F3F4F6; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px; font-weight: bold;">
        📅 Fecha y hora:
      </p>
      <p style="margin: 0; color: #1F2937; font-size: 16px;">
        ${eventDate ? eventDate : ""} ${eventTime ? `a las ${eventTime}` : ""}
      </p>
    </div>
    `
        : ""
    }

    ${
      eventDescription
        ? `
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
      ${eventDescription}
    </p>
    `
        : ""
    }

    ${
      eventLink
        ? `
    <div style="text-align: center; margin: 32px 0;">
      <a href="${eventLink}"
         style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
        🎥 Unirse a la videollamada
      </a>
      <p style="color: #64748B; font-size: 12px; margin-top: 8px;">
        Guarda este enlace para el día del evento
      </p>
    </div>
    `
        : ""
    }

    <div style="background: #FEF3C7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; color: #92400E; font-size: 14px;">
        <strong>Tip:</strong> Agrega este evento a tu calendario para no olvidarlo.
      </p>
    </div>

    <p style="color: #64748B; font-size: 14px; margin: 24px 0;">
      Si tienes alguna pregunta, escríbenos a
      <a href="mailto:brenda@fixter.org" style="color: #3B82F6;">brenda@fixter.org</a>
    </p>

    <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />

    <p style="color: #1a1a1a; margin: 24px 0 8px 0;">
      ¡Nos vemos pronto!
    </p>
    <p style="color: #64748B; margin: 0;">
      El equipo de FixterGeek
    </p>
  </div>
</body>
</html>
`;

  return getSesTransport()
    .sendMail({
      from: getSesRemitent(),
      bcc: to,
      subject: `✅ Estás registrado: ${eventName}`,
      html: htmlContent,
    })
    .then((result: any) => {
      console.log(`[Waitlist] Email enviado a: ${to} para: ${slug}`);
      return result;
    })
    .catch((error: any) => {
      console.error(`[Waitlist] Error enviando email a ${to}:`, error);
      throw error;
    });
};

/**
 * Envía magic link para confirmar registro en waitlist
 * (para usuarios no confirmados)
 */
export const sendWaitlistMagicLink = async ({
  to,
  slug,
  eventName,
  coverImage,
  userName,
}: {
  to: string;
  slug: string;
  eventName: string;
  coverImage?: string | null;
  userName?: string;
}) => {
  const token = generateLeadMagnetToken(to, slug);
  const confirmUrl = `https://www.fixtergeek.com/descarga/${slug}/gracias?token=${token}`;

  const htmlContent = `
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
      ${userName ? `Hola ${userName}` : "Hola"}
    </h1>

    ${
      coverImage
        ? `
    <div style="margin-bottom: 24px; text-align: center;">
      <img src="${coverImage}" alt="${eventName}" style="max-width: 280px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" />
    </div>
    `
        : ""
    }

    <div style="background: linear-gradient(135deg, #CA9B77 0%, #845A8F 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <h2 style="color: #ffffff; margin: 0 0 8px 0; font-size: 20px;">
        Confirma tu registro
      </h2>
      <p style="color: #F3E8FF; margin: 0; font-size: 16px; font-weight: 500;">
        ${eventName}
      </p>
    </div>

    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
      Solo necesitamos confirmar tu email para reservar tu lugar.
      Haz clic en el botón de abajo para completar tu registro.
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${confirmUrl}"
         style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
        ✅ Confirmar mi lugar
      </a>
    </div>

    <p style="color: #64748B; font-size: 14px; margin: 24px 0;">
      Este enlace es válido por 7 días. Si no solicitaste este registro,
      puedes ignorar este email.
    </p>

    <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />

    <p style="color: #1a1a1a; margin: 24px 0 8px 0;">
      Abrazo,
    </p>
    <p style="color: #64748B; margin: 0;">
      El equipo de FixterGeek
    </p>
  </div>
</body>
</html>
`;

  return getSesTransport()
    .sendMail({
      from: getSesRemitent(),
      bcc: to,
      subject: `Confirma tu registro: ${eventName}`,
      html: htmlContent,
    })
    .then((result: any) => {
      console.log(`[Waitlist] Magic link enviado a: ${to} para: ${slug}`);
      return result;
    })
    .catch((error: any) => {
      console.error(`[Waitlist] Error enviando magic link a ${to}:`, error);
      throw error;
    });
};
