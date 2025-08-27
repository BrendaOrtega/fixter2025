import nodemailer from "nodemailer";
import { sendgridTransport } from "~/utils/sendGridTransport";

type FunctionProps = {
  isModule?: string;
  title?: string;
  slug?: string;
  userName: string;
  userMail: string;
  meta?: Object;
};

export const successPurchase = async ({
  isModule = "false",
  title,
  slug,
  userName,
  userMail,
  meta,
}: FunctionProps) => {
  const date = new Date().toLocaleDateString();
  return sendgridTransport
    .sendMail({
      from: "NotiBot de Fixtergeek <contacto@fixter.org>",
      subject: "👾¡Una compra en fixtergeek.com!🤖",
      bcc: ["contacto@fixter.org", "brenda@fixter.org"],
      html: `
  
  
        <html>
        <head>
          <title>Una nueva compra</title>
        </head>
        <body style="font-family:Arial;">
        <div style="padding:80px 16px;font-family:sans-serif;font-size:18px;max-width:420px;margin:0 auto;">
        <img style="max-width:180px;margin-bottom:16px;" src="https://i.imgur.com/YPzE4Ks.png" alt="logo" />
        <h2 style="font-size:38px;margin:0;font-size:38px">
          👋🏼 Hola brendi 💁🏻‍♀️
        </h2>
        <p>
          ¡Hubo una nueva compra del curso!
          
          <br/><code style="color:#4b0082;margin-top:4px;display:inline-block;padding:2px 4px;background:#FFD966;border-radius:5px;" >${
            title ? title : slug
          }</code> 🥳
        </p>
        <ul>
          <li>Usuario: <strong>${userName}</strong></li>
           <li>Correo: <strong>${userMail}</strong></li>
            <li>¿Es módulo?: <strong> ${isModule ? "Si" : "No"}</strong></li>
             <li>Fecha: <strong>${date}</strong></li>
        </ul>
        <a href="https://fixtergeek.com/admin" style="border-radius:9px;text-decoration:none;background:#7c60f4;padding:16px;font-size:18px;margin-top:32px 0;display:block;max-width:150px;text-align:center;cursor:pointer;color:#fff;">
          Abrir admin
          </a>
          <a style="color:#7c60f4;margin-top:18px;display:block;font-size:16px;" href="https://fixtergeek.com/admin/blog"  target="_blank">También puedes administrar el blog</a>
      </div>
        </body>
      </html>
          `,
    })
    .then((r: any) => {
      console.log(r);
    })
    .catch((e: any) => console.log(e));
};
