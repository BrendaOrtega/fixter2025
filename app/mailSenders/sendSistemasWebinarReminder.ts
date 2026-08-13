import { getSesTransport } from "~/utils/sendGridTransport";
import { wrapEmailHtml, emailButton } from "~/utils/emailShell";
import {
  WEBINAR_TITLE,
  WEBINAR_ROOM_PATH,
  webinarGcalLink,
  type WebinarSlot,
} from "~/utils/webinarDates";

// Dominio verificado en SES — enviar como @gmail.com rompe DMARC y Gmail lo tira
const FROM = "Héctorbliss de FixterGeek <secuencias@fixtergeek.com>";

type Props = {
  to: string;
  userName?: string | null;
  slot: WebinarSlot;
};

const firstName = (name?: string | null) =>
  name?.trim().split(/\s+/)[0] || null;

const template = ({
  userName,
  slot,
}: {
  userName?: string | null;
  slot: WebinarSlot;
}) => `
<h1 style="font-size:26px;margin:0 0 8px 0;color:#19262A;">${
  firstName(userName)
    ? `${firstName(userName)}, ya le caes ¿qué no?`
    : "Ya le caes ¿qué no?"
} 👋</h1>
<p style="margin:0 0 8px 0;">
  <strong>${WEBINAR_TITLE}</strong> — Hoy, ${slot.short
    .charAt(0)
    .toLowerCase()}${slot.short.slice(1)} (CDMX).
</p>
<p style="margin:0 0 8px 0;">
  La sala ya está abierta 🚪✨
</p>
<p style="margin:0 0 20px 0;color:#64748B;font-size:14px;">
  <a href="${webinarGcalLink(slot)}" target="_blank" rel="noopener" style="color:#37AB93;text-decoration:none;font-weight:bold;">+ Agregar a Google Calendar</a>
</p>

<div style="margin:0 0 8px 0;">
  ${emailButton("Entrar al webinar", WEBINAR_ROOM_PATH)}
</div>
<p style="margin:0 0 24px 0;color:#64748B;font-size:13px;word-break:break-all;">
  <a href="${WEBINAR_ROOM_PATH}" target="_blank" rel="noopener" style="color:#37AB93;">${WEBINAR_ROOM_PATH}</a>
</p>

<p style="margin:0 0 24px 0;color:#475569;">
  Al minuto 30 dejo en el chat el PDF con las seis piezas 🎁<br/>
  Trae tu pregunta para el Q&amp;A.<br/>
  Si no puedes llegar en vivo, respóndeme y te paso la grabación.
</p>
<p style="color:#64748B;margin:0;">Abrazo. bliss.</p>
`;

/** El HTML final, sin enviar nada — para preview local. */
export const previewSistemasWebinarReminder = ({
  userName,
  slot,
}: Omit<Props, "to">) =>
  wrapEmailHtml(template({ userName, slot }), {
    preheader: `Hoy a las 8:00 PM. Aquí está tu link de acceso al webinar.`,
    promoFooter: false,
  }).replace(
    /\{\{unsubscribe\}\}/g,
    // Este correo no sale de una secuencia, así que no hay token de baja:
    // el mailto sí funciona y cumple con CAN-SPAM.
    "mailto:brenda@fixter.org?subject=BAJA"
  );

export const sendSistemasWebinarReminder = async ({
  to,
  userName,
  slot,
}: Props) => {
  const html = wrapEmailHtml(template({ userName, slot }), {
    preheader: `Hoy a las 8:00 PM. Aquí está tu link de acceso al webinar.`,
    promoFooter: false,
  }).replace(
    /\{\{unsubscribe\}\}/g,
    // Este correo no sale de una secuencia, así que no hay token de baja:
    // el mailto sí funciona y cumple con CAN-SPAM.
    "mailto:brenda@fixter.org?subject=BAJA"
  );

  return getSesTransport()
    .sendMail({
      from: FROM,
      to,
      subject: `Hoy a las 8:00 PM — tu link para "${WEBINAR_TITLE}"`,
      html,
    })
    .then((result: unknown) => {
      console.log(`[sistemas] webinar reminder sent to: ${to} (${slot.id})`);
      return result;
    })
    .catch((error: unknown) => {
      console.error(
        `[sistemas] error sending webinar reminder to ${to}:`,
        error
      );
      throw error;
    });
};
