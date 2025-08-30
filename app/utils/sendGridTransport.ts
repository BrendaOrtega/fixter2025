import nodemailer from "nodemailer";
import { SESClient, SendRawEmailCommand, SendEmailCommand } from "@aws-sdk/client-ses";

export const sendgridTransport = nodemailer.createTransport({
  host: "smtp.sendgrid.net",
  port: 465,
  auth: {
    user: "apikey",
    pass: process.env.SENDGRID_KEY,
  },
});

let sesClient;
const getSesClient = () => {
  // @ts-ignore
  sesClient ??= new SESClient({
    region: process.env.SES_REGION || "us-east-2",
    credentials: {
      accessKeyId: process.env.SES_KEY,
      secretAccessKey: process.env.SES_SECRET,
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
    // Explícitamente no usar configuration set
    configurationSetName: undefined,
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
    // NO incluir ConfigurationSetName para evitar el error
  });

  return await client.send(command);
};
