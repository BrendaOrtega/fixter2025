import { getSesRemitent, getSesTransport } from "~/utils/sendGridTransport";

type SesTag = { Name: string; Value: string };

export type SendSESTESTOptions = {
  subject?: string;
  html?: string | null;
  tags?: SesTag[];
  trackOpens?: boolean;
  to?: boolean;
};

export type SendSESTESTResult = {
  messageId: string;
  response?: string;
};

const injectOpenTracker = (html: string) => {
  if (html.includes("{{ses:openTracker}}")) return html;
  if (/<body[^>]*>/i.test(html)) {
    return html.replace(/<body[^>]*>/i, "$&\n{{ses:openTracker}}");
  }
  return "{{ses:openTracker}}\n" + html;
};

export const sendSESTEST = async (
  email: string,
  data?: SendSESTESTOptions
): Promise<SendSESTESTResult | undefined> => {
  const {
    subject = "testing",
    html,
    tags,
    trackOpens = false,
    to: useTo = false,
  } = data || {};

  const configurationSet = process.env.SES_CONFIGURATION_SET;
  const finalHtml = trackOpens
    ? injectOpenTracker(html || `<h1>Hola blissmo</h1>`)
    : html || `<h1>Hola blissmo</h1>`;

  const sesOptions =
    tags || configurationSet
      ? {
          ses: {
            ...(configurationSet ? { ConfigurationSetName: configurationSet } : {}),
            ...(tags ? { Tags: tags } : {}),
          },
        }
      : {};

  try {
    const result = await getSesTransport().sendMail({
      from: getSesRemitent(),
      subject,
      ...(useTo ? { to: email } : { bcc: email }),
      html: finalHtml,
      ...sesOptions,
    });
    return {
      messageId: (result as { messageId?: string }).messageId || "",
      response: (result as { response?: string }).response,
    };
  } catch (e) {
    console.error(e);
  }
};
