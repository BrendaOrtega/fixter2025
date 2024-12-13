import { magicLinkTemplate } from "~/mailSenders/templates/magicLink";
import { sendgridTransport } from "~/utils/sendGridTransport";
import { generateUserToken } from "~/utils/tokens";

const isDev = process.env.NODE_ENV === "development";

export const sendMagicLink = async (data: {
  email: string;
  next?: string;
  userId?: string;
}) => {
  // generate token
  const token = generateUserToken(data);
  const location = isDev
    ? "http://localhost:3000"
    : "https://fixter2025.fly.dev"; // @todo change when domain
  return sendgridTransport
    .sendMail({
      from: "contacto@fixter.org",
      subject: "👾¡Inicia sesión en Fixtergeek!🤖",
      bcc: [data.email],
      html: magicLinkTemplate({
        link: `${location}/login?token=${token}`,
      }),
    })
    .then((r: any) => {
      console.log(r);
    })
    .catch((e: any) => console.log(e));
};
