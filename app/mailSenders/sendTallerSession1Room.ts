import { getSesTransport } from "~/utils/sendGridTransport";
import { wrapEmailHtml, emailButton } from "~/utils/emailShell";

// Dominio verificado en SES — enviar como @gmail.com rompe DMARC y Gmail lo tira
const FROM = "Héctorbliss de FixterGeek <secuencias@fixtergeek.com>";

const ROOM_URL = "https://business.teams.ghosty.studio/join/0be8073371a91d8807aecc5588402ea5";
const TRIAL_URL = "https://buy.stripe.com/dRm28sf3d5pJ3vm3Ul3F60A";

type Props = { to: string; userName?: string | null };

const template = ({ userName }: { userName?: string | null }) => `
<h1 style="font-size:26px;margin:0 0 8px 0;color:#19262A;">
  ${userName ? `${userName}, hoy` : "Hoy"} a las 8 nos vemos dentro de Ghosty Teams 🎙️
</h1>
<p style="margin:0 0 24px 0;">
  La sesión 1 no va por Zoom ni por Meet. La llamada sucede en el room
  <strong>Fixtergeek</strong> de Ghosty Teams, la misma sala privada del taller.
</p>

<div style="background:#0E1317;border-radius:10px;padding:20px;margin:0 0 24px 0;text-align:center;">
  <p style="margin:0 0 6px 0;color:#ffffff;font-size:17px;font-weight:bold;">
    Room Fixtergeek · 1 de septiembre · 8:00 pm
  </p>
  <p style="margin:0 0 16px 0;color:#94A3B8;font-size:14px;">
    Entra unos minutos antes. Al abrirse la llamada, aparece el botón para unirte arriba del chat.
  </p>
  ${emailButton("Entrar al room →", ROOM_URL)}
</div>

<p style="margin:0 0 8px 0;color:#19262A;font-weight:bold;">Para llegar sin sorpresas:</p>
<ul style="margin:0 0 24px 0;padding-left:20px;color:#475569;">
  <li style="margin-bottom:8px;">Entra con el mismo correo con el que te inscribiste.</li>
  <li style="margin-bottom:8px;">Si no alcanzaste a instalar Ghosty Code, no pasa nada: lo instalamos juntos en la sesión.</li>
  <li style="margin-bottom:8px;">Si todavía no activaste tu trial de EasyBits, <a href="${TRIAL_URL}" target="_blank" rel="noopener" style="color:#37AB93;">hazlo aquí</a>: de ahí salen tus 10 millones de tokens.</li>
</ul>

<p style="color:#64748B;font-size:14px;margin:0 0 24px 0;">
  ¿No puedes entrar al room? Escríbeme por <a href="https://wa.me/527712412825" target="_blank" rel="noopener" style="color:#37AB93;">WhatsApp</a> y te paso el acceso al momento.
</p>

<p style="color:#64748B;margin:0;">Abrazo. Blissmo. 🤓</p>
`;

export const buildTallerSession1RoomHtml = ({ userName }: Omit<Props, "to"> = {}) =>
  wrapEmailHtml(template({ userName }), {
    preheader: "La sesión 1 es hoy a las 8 pm y la llamada sucede dentro del room Fixtergeek en Ghosty Teams.",
    promoFooter: false,
  }).replace(/\{\{unsubscribe\}\}/g, "https://www.fixtergeek.com/perfil");

export const sendTallerSession1Room = async ({ to, userName }: Props) =>
  getSesTransport()
    .sendMail({
      from: FROM,
      to,
      subject: "🎙️ Hoy 8 pm: la sesión 1 es dentro de Ghosty Teams",
      html: buildTallerSession1RoomHtml({ userName }),
    })
    .then((r: unknown) => {
      console.log(`[taller] session 1 room email sent to: ${to}`);
      return r;
    });
