import { sendgridTransport } from "~/utils/sendGridTransport";
import { generateUserToken } from "~/utils/tokens";
import { welcomeTemplate } from "./templates/welcome";

const isDev = process.env.NODE_ENV === "development";
const location = isDev ? "http://localhost:3000" : "https://www.fixtergeek.com";

export const sendWelcome = async (email: string) => {
  // generate token
  const token = generateUserToken({ email });
  // `sendgridTransport` es una función que construye el transport; sin
  // invocarla, `.sendMail` es undefined y esto nunca llegó a mandar nada.
  return sendgridTransport()
    .sendMail({
      from: "Fixtergeek <contacto@fixtergeek.com>",
      replyTo: "contacto@fixter.org",
      subject: "👾¡En hora buena!🤖",
      bcc: [email],
      html: welcomeTemplate({
        link: `${location}/login?token=${token}`,
      }),
    })
    .then((r: any) => {
      console.log(r);
    })
    .catch((e: any) => console.log(e));
};
