import nodemailer from "nodemailer";
import { SESClient, SendRawEmailCommand, SendEmailCommand } from "@aws-sdk/client-ses";

let sesClient: SESClient | undefined;

const getSesClient = () => {
  sesClient ??= new SESClient({
    region: process.env.SES_REGION || "us-east-2",
    credentials: {
      accessKeyId: process.env.SES_KEY!,
      secretAccessKey: process.env.SES_SECRET!,
    },
  });
  return sesClient;
};

export const getSesTransport = () => {
  return nodemailer.createTransport({
    SES: {
      ses: getSesClient(),
      aws: { SendRawEmailCommand },
    },
  });
};

export const getSesRemitent = () => `Fixtergeek <fixtergeek@gmail.com>`;

// Transporter específico para webinar SIN configuration set
export const getSesTransportForWebinar = () => {
  return nodemailer.createTransport({
    SES: {
      ses: getSesClient(),
      aws: { SendRawEmailCommand },
    },
  });
};

// Función alternativa para enviar emails directamente con SES sin nodemailer
export const sendSesEmailDirect = async (params: {
  to: string;
  subject: string;
  htmlBody: string;
  from?: string;
}) => {
  const client = getSesClient();

  const command = new SendEmailCommand({
    Source: params.from || getSesRemitent(),
    Destination: {
      ToAddresses: [params.to],
    },
    Message: {
      Subject: {
        Data: params.subject,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: params.htmlBody,
          Charset: 'UTF-8',
        },
      },
    },
  });

  return await client.send(command);
};

// Re-export for backwards compatibility during migration
// TODO: Remove these exports and update all imports to use the new names
export { getSesTransport as sendgridTransport };
