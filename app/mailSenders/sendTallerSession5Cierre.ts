import { getSesTransport } from "~/utils/sendGridTransport";
import { wrapEmailHtml, emailButton } from "~/utils/emailShell";

// Dominio verificado en SES — enviar como @gmail.com rompe DMARC y Gmail lo tira
const FROM = "Héctorbliss de FixterGeek <secuencias@fixtergeek.com>";

const ROOM_URL =
  "https://business.teams.ghosty.studio/join/0be8073371a91d8807aecc5588402ea5";
const REPO_URL = "https://github.com/blissito/acp-agent-ui";

type Props = { to: string; userName?: string | null };

// Las seis sesiones en 3 filas de 2; la de hoy va encendida, la 6 apagada (por venir).
const SESSIONS: [string, string, string][] = [
  ["1", "SSH → WebSocket", "el puente"],
  ["2", "la UI", "el viaje del tool"],
  ["3", "memoria y estado", "4 memorias, 3 almacenes"],
  ["4", "extensiones y MCP", "por ACP, en la caja"],
  ["5", "canales + WhatsApp", "hoy: Baileys"],
  ["6", "sesión 1:1", "tu caso, a solas"],
];

const sessionCell = ([n, title, note]: [string, string, string]) => {
  const today = n === "5";
  const future = n === "6";
  const bg = today ? "#0E1317" : "#EEF3F2";
  const fg = today ? "#85DDCB" : future ? "#7C8A8E" : "#19262A";
  const sub = today ? "#F2F5F4" : "#7C8A8E";
  return `<td valign="top" width="50%" style="background:${bg};border-radius:8px;padding:12px 14px;${future ? "border:2px dashed #C5D0CE;" : ""}">
      <span style="font-size:22px;font-weight:bold;color:${fg};">${n}</span>
      <span style="font-size:15px;font-weight:bold;color:${fg};margin-left:8px;">${title}</span>
      <div style="font-size:12px;color:${sub};margin-top:4px;">${note}</div>
    </td>`;
};

const sessionRow = () => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px 0;border-collapse:separate;border-spacing:6px;">
  ${[0, 2, 4].map((i) => `<tr>${sessionCell(SESSIONS[i])}${sessionCell(SESSIONS[i + 1])}</tr>`).join("")}
</table>`;

const template = ({ userName }: { userName?: string | null }) => `
<h1 style="font-size:26px;margin:0 0 8px 0;color:#19262A;">
  ${userName ? `${userName}, hoy` : "Hoy"} cerramos: tu agente contesta en WhatsApp 💬
</h1>

<p style="margin:0 0 20px 0;">
  Hace dos semanas tu agente vivía en una terminal y se le olvidaba todo al cerrar la
  ventana. Hoy tiene interfaz, memoria y tools por MCP. Falta llevarlo a los canales
  donde viven las personas.
</p>

${sessionRow()}

<p style="margin:0 0 20px 0;">
  Hoy vinculamos un número de WhatsApp con Baileys —QR desde la caja—
  y cerramos el turno completo: mensaje entra, tool corre, respuesta sale al chat.
</p>

<div style="background:#0E1317;border-radius:10px;padding:20px;margin:0 0 24px 0;text-align:center;">
  <p style="margin:0 0 6px 0;color:#ffffff;font-size:17px;font-weight:bold;">
    Room Fixtergeek · Lunes 14 de septiembre · 8:00 pm
  </p>
  <p style="margin:0 0 16px 0;color:#94A3B8;font-size:14px;">
    Última sesión en vivo. Ten tu celular a la mano: el QR se escanea desde ahí.
  </p>
  ${emailButton("Entrar al room →", ROOM_URL)}
</div>

<p style="margin:0 0 24px 0;">
  Al salir de hoy, el código de las cinco sesiones queda en
  <a href="${REPO_URL}" target="_blank" rel="noopener" style="color:#0E1317;font-weight:bold;">acp-agent-ui</a>
  para que lo clones y le cambies la caja. Y lo importante no está en el repo: la próxima
  vez que alguien te pida "ayúdame con un sistema agéntico", ya sabes exactamente qué
  hacer. Fueron cinco noches muy buenas. Te espero a las 8.
</p>

<p style="color:#64748B;margin:0;">Abrazo. Blissmo. 🤓</p>
`;

export const buildTallerSession5CierreHtml = ({
  userName,
}: Omit<Props, "to"> = {}) =>
  wrapEmailHtml(template({ userName }), {
    preheader:
      "Última sesión: el motor que ya construiste, ahora contestando en WhatsApp.",
    theme: "light",
    // Correo del taller pagado, no de una secuencia: sin footer promocional.
    promoFooter: false,
  });

export const sendTallerSession5Cierre = async ({ to, userName }: Props) => {
  const transport = getSesTransport();
  return transport.sendMail({
    from: FROM,
    to,
    subject: "Hoy a las 8 · Tu agente contesta en WhatsApp 💬 (última sesión)",
    html: buildTallerSession5CierreHtml({ userName }),
  });
};
