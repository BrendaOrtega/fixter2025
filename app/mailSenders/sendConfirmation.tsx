import { sendgridTransport } from "~/utils/sendGridTransport";
import { confirmation } from "./templates/confirmation";
import jwt from "jsonwebtoken";
import { generateUserToken } from "~/utils/tokens";

export const generateURL = (options: {
  pathname?: string;
  token?: string;
  next?: string;
}) => {
  const uri = new URL(
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "https://fixter2025.fly.dev"
  );
  uri.pathname = options.pathname || "";
  options.token && uri.searchParams.set("token", options.token);
  options.next && uri.searchParams.set("next", options.next);
  return uri;
};

export const sendConfirmation = (email: string, tags?: string[]) => {
  const token = generateUserToken({ email, tags });
  const url = new URL(
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "https://fixter2025.fly.dev"
  );
  url.pathname = "/login";
  url.searchParams.set("token", token);

  return sendgridTransport
    .sendMail({
      from: "contacto@fixter.org",
      subject: "👽 Confirmando que eres humano 🤖",
      bcc: [email],
      html: confirmation({ link: url.toString() }),
    })
    .then((result: unknown) => console.log(result))
    .catch((e: Error) => console.error(e));
};
