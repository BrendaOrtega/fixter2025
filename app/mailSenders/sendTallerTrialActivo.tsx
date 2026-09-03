import { getSesTransport } from "~/utils/sendGridTransport";
import { wrapEmailHtml, emailButton } from "~/utils/emailShell";

// Dominio verificado en SES — enviar como @gmail.com rompe DMARC y Gmail lo tira
const FROM = "Héctorbliss de FixterGeek <secuencias@fixtergeek.com>";

const ROOM_URL = "https://business.teams.ghosty.studio/join/0be8073371a91d8807aecc5588402ea5";

type Props = { to: string; userName?: string | null };

const template = ({ userName }: { userName?: string | null }) => `
<h1 style="font-size:26px;margin:0 0 8px 0;color:#19262A;">
  ${userName ? `${userName}, hoy` : "Hoy"} a las 8 es la sesión 2 🎙️
</h1>
<p style="margin:0 0 20px 0;">
  Ya tienes tus tokens y tus cajas listas, así que hoy te toca usarlas.
</p>

<p style="margin:0 0 24px 0;color:#475569;">
  Le ponemos una interfaz bonita al agente: nuestro propio cliente ACP.
</p>

<div style="background:#0E1317;border-radius:10px;padding:20px;margin:0 0 24px 0;text-align:center;">
  <p style="margin:0 0 6px 0;color:#ffffff;font-size:17px;font-weight:bold;">
    Room Fixtergeek · hoy · 8:00 pm
  </p>
  <p style="margin:0 0 16px 0;color:#94A3B8;font-size:14px;">
    Entra unos minutos antes, con tu terminal abierta.
  </p>
  ${emailButton("Entrar al room →", ROOM_URL)}
</div>

<p style="color:#64748B;font-size:14px;margin:0 0 24px 0;">
  ¿No puedes entrar? Escríbeme por
  <a href="https://wa.me/527712412825" target="_blank" rel="noopener" style="color:#37AB93;">WhatsApp</a>.
</p>

<p style="color:#64748B;margin:0;">Abrazo. Blissmo. 🤓</p>
`;

export const buildTallerTrialActivoHtml = ({ userName }: Omit<Props, "to"> = {}) =>
  wrapEmailHtml(template({ userName }), {
    preheader:
      "Sesión 2 hoy a las 8: le ponemos interfaz al agente con nuestro propio cliente ACP.",
    promoFooter: false,
  }).replace(/\{\{unsubscribe\}\}/g, "https://www.fixtergeek.com/perfil");

export const sendTallerTrialActivo = async ({ to, userName }: Props) =>
  getSesTransport()
    .sendMail({
      from: FROM,
      to,
      subject: "🎙️ Hoy 8 pm: sesión 2 del taller",
      html: buildTallerTrialActivoHtml({ userName }),
    })
    .then((r: unknown) => {
      console.log(`[taller] invitación sesión 2 enviada a: ${to}`);
      return r;
    });
