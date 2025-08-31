import { sendgridTransport } from "~/utils/sendGridTransport";

export const purchaseCongrats = async ({
  to,
  courseTitle,
  courseSlug,
}: {
  to: string;
  courseTitle: string;
  courseSlug: string;
}) => {
  const link = `${process.env.BASE_URL || "https://www.fixtergeek.com"}/cursos/${courseSlug}/viewer`;
  return sendgridTransport.sendMail({
    subject: "🎉¡Gracias por tu compra!🥳",
    from: "contacto@fixter.org",
    bcc: [to],
    html: `
    <html>
    <head>
      <title>¡Hola Geek!</title>
    </head>
    <body style="font-family:Arial;">
    <div style="padding:80px 16px;font-family:sans-serif;font-size:18px;max-width:420px;margin:0 auto;">
    <img style="max-width:180px;margin-bottom:16px;" src="https://i.imgur.com/YPzE4Ks.png" alt="logo" />
    <h2 style="font-size:38px;margin:0;font-size:38px">
      👋🏼 ¡Hola Geek! 🤓
    </h2>
    <p>
      ¡Nos encanta que seas parte de Fixtergeek!<strong> Estas a punto de experimentar el método Fixtergeek®</strong> dentro de tu nuevo curso:
      
      <br/><code style="color:#4b0082;margin-top:4px;display:inline-block;padding:2px 4px;background:#FFD966;border-radius:5px;" >${courseTitle}</code> 🥳
    </p>
    <p>
      ¿Qué haces aún en este email, cuando ya puedes ver tu curso? 👀 ¡Corre! 🏃🏻‍♀️
    </p>
    <a href=${link} style="border-radius:9px;text-decoration:none;background:#7c60f4;padding:16px;font-size:18px;margin-top:32px 0;display:block;max-width:150px;text-align:center;cursor:pointer;color:#fff;">
      ¡Comenzar! 
      </a>
      <a style="color:#7c60f4;margin-top:18px;display:block;font-size:16px;" href="https://fixtergeek.com/blog"  target="_blank">También puedes ver lo nuevo en nuestro blog</a>
  </div>
    </body>
  </html>
      `,
  });
};
