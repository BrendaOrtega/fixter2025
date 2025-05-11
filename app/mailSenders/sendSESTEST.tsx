import { getSesRemitent, getSesTransport } from "~/utils/sendGridTransport";

export const sendSESTEST = (emails: string[], data?: { html?: string }) => {
  return getSesTransport()
    .sendMail({
      from: getSesRemitent(),
      subject: "testing ses in fixtergeek",
      bcc: emails,
      html: data?.html || `<h1>Hola blissmo</h1>`,
    })
    .then((result: unknown) => result)
    .catch((e: Error) => console.error(e));
};
