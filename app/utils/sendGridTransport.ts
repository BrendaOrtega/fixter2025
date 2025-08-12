import nodemailer from "nodemailer";
import { SESClient, SendRawEmailCommand } from "@aws-sdk/client-ses";

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

export const getSesRemitent = () =>
  `Brendi de Fixtergeek <brenda@fixtergeek.com>`;
