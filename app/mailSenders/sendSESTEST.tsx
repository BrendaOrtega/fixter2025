import { getSesRemitent, getSesTransport } from "~/utils/sendGridTransport";

// @todo do it in background
export const sendSESTEST = (
  email: string,
  data?: {
    subject?: string;
    html?: string | null;
  }
) => {
  const { subject = "testing", html } = data || {};
  return getSesTransport()
    .sendMail({
      from: getSesRemitent(),
      subject,
      bcc: email,
      html: html || `<h1>Hola blissmo</h1>`,
    })
    .then((result: unknown) => result)
    .catch((e: Error) => console.error(e));
};
