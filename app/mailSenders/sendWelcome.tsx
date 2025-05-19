import { sendgridTransport } from "~/utils/sendGridTransport";
import { generateUserToken } from "~/utils/tokens";
import { welcomeTemplate } from "./templates/welcome";

const isDev = process.env.NODE_ENV === "development";
const location = isDev ? "http://localhost:3000" : "https://www.fixtergeek.com";

export const sendWelcome = async (data: {
  email: string;
  next?: string;
  userId?: string;
}) => {
  // generate token
  const token = generateUserToken(data);
  return sendgridTransport
    .sendMail({
      from: "contacto@fixter.org",
      subject: "👾¡Inicia sesión en Fixtergeek!🤖",
      bcc: [data.email],
      html: welcomeTemplate({
        link: `${location}/login?token=${token}`,
      }),
    })
    .then((r: any) => {
      console.log(r);
    })
    .catch((e: any) => console.log(e));
};
