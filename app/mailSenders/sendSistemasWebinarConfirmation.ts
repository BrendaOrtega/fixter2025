import { getSesTransport } from "~/utils/sendGridTransport";
import { wrapEmailHtml, emailButton } from "~/utils/emailShell";
import {
  WEBINAR_TITLE,
  WEBINAR_SUBTITLE,
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

const template = ({ userName, slot }: { userName?: string | null; slot: WebinarSlot }) => `
<h1 style="font-size:26px;margin:0 0 8px 0;color:#19262A;">${userName ? `Listo, ${userName}` : "Listo"} ✅</h1>
<p style="margin:0 0 20px 0;">
  Tu lugar en el webinar <strong>${WEBINAR_TITLE}</strong> está apartado para el
  <strong>${slot.label}</strong>. ${WEBINAR_SUBTITLE}: 45 minutos, Q&amp;A al final y sin costo.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6fafa;border-radius:10px;border-left:4px solid #85DDCB;margin-bottom:24px;">
  <tr><td style="padding:16px 18px;">
    <strong style="color:#19262A;font-size:17px;">${slot.short}</strong><br/>
    <span style="color:#64748B;font-size:14px;">45 min + Q&amp;A · en vivo · hora de la Ciudad de México</span><br/>
    <a href="${webinarGcalLink(slot)}" style="color:#37AB93;font-size:14px;font-weight:bold;text-decoration:none;">+ Agregar a Google Calendar</a>
  </td></tr>
</table>

<h3 style="margin:0 0 10px 0;color:#19262A;font-size:18px;">Qué vas a ver</h3>
<ul style="margin:0 0 24px 0;padding-left:20px;color:#475569;font-size:15px;line-height:1.8;">
  <li>La ecuación que ordena todo: agente = modelo + harness</li>
  <li>Las seis piezas: primitivas, contexto, ejecución durable, memoria, autenticación e interfaz</li>
  <li>Tres demos sobre un mismo agente nuestro corriendo hoy en producción, por dentro</li>
  <li>🎁 Al minuto 30 dejo en el chat el PDF con las seis piezas a detalle — es tuyo, compres o no</li>
  <li>Preguntas al final — trae la tuya</li>
</ul>

<p style="margin:0 0 8px 0;color:#475569;">La sala abre 10 minutos antes en este link (guárdalo):</p>
<div style="margin:0 0 24px 0;">
  ${emailButton("Entrar al webinar", WEBINAR_ROOM_PATH)}
</div>

<p style="margin:0 0 24px 0;color:#475569;font-size:15px;">
  Te mando un recordatorio el día anterior y otro unas horas antes, para que no
  se te pase. Si no puedes llegar en vivo, avísame y te comparto la grabación.
</p>

<p style="color:#64748B;font-size:14px;margin:24px 0 8px 0;">
  ¿Dudas? Escríbeme directo por <a href="https://wa.me/527712412825" style="color:#37AB93;">WhatsApp</a>.
</p>
<p style="color:#19262A;margin:16px 0 4px 0;">Nos vemos ahí.</p>
<p style="color:#64748B;margin:0;">Abrazo. bliss.</p>
`;

export const sendSistemasWebinarConfirmation = async ({ to, userName, slot }: Props) => {
  const html = wrapEmailHtml(template({ userName, slot }), {
    preheader: `Tu lugar está apartado para el ${slot.short}. Guarda el link de la sala.`,
  }).replace(/\{\{unsubscribe\}\}/g, "https://www.fixtergeek.com/perfil");

  return getSesTransport()
    .sendMail({
      from: FROM,
      to,
      subject: `Tu lugar en el webinar está apartado — ${slot.short}`,
      html,
    })
    .then((result: unknown) => {
      console.log(`[sistemas] webinar confirmation sent to: ${to} (${slot.id})`);
      return result;
    })
    .catch((error: unknown) => {
      console.error(`[sistemas] error sending webinar confirmation to ${to}:`, error);
      throw error;
    });
};
