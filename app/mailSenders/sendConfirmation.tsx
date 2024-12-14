import { sendgridTransport } from "~/utils/sendGridTransport";
import { confirmation } from "./templates/confirmation";

export const generateURL = (options: {
  pathname?: string;
  token?: string;
  next?: string;
}) => {
  const uri = new URL(
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "https://animaciones.fixtergeek.com"
  );
  uri.pathname = options.pathname || "";
  options.token && uri.searchParams.set("token", options.token);
  options.next && uri.searchParams.set("next", options.next);
  return uri;
};

export const sendConfirmation = (email: string, token: string) => {
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
