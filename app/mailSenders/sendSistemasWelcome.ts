import { getSesTransport } from "~/utils/sendGridTransport";
import { wrapEmailHtml, emailButton } from "~/utils/emailShell";

// Dominio verificado en SES — enviar como @gmail.com rompe DMARC y Gmail lo tira
const FROM = "Héctorbliss de FixterGeek <secuencias@fixtergeek.com>";

type SistemasWelcomeProps = {
  to: string;
  userName?: string | null;
};

// Sesiones del taller (hora local CDMX, sin DST desde 2022 → ctz fija)
const SESSIONS = [
  { label: "Sesión 1 · El harness", date: "Martes 1 de septiembre", start: "20260901T200000", end: "20260901T220000" },
  { label: "Sesión 2 · Contexto y memoria", date: "Jueves 3 de septiembre", start: "20260903T200000", end: "20260903T220000" },
  { label: "Sesión 3 · Producción", date: "Martes 8 de septiembre", start: "20260908T200000", end: "20260908T220000" },
  { label: "Sesión 4 · La interfaz", date: "Jueves 10 de septiembre", start: "20260910T200000", end: "20260910T220000" },
];

const gcalLink = (s: (typeof SESSIONS)[number]) => {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Taller Sistemas Agénticos — ${s.label}`,
    dates: `${s.start}/${s.end}`,
    ctz: "America/Mexico_City",
    details:
      "Sesión en vivo del taller Diseño de sistemas agénticos (FixterGeek). La sala es dentro de Ghosty Teams — revisa tu correo de bienvenida.",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

const sessionRows = SESSIONS.map(
  (s) => `
  <tr>
    <td style="padding:10px 14px;border-bottom:1px solid #e6ecec;">
      <strong style="color:#19262A;">${s.date}</strong><br/>
      <span style="color:#64748B;font-size:14px;">${s.label} · 8:00–10:00 PM (CDMX)</span>
    </td>
    <td style="padding:10px 14px;border-bottom:1px solid #e6ecec;text-align:right;white-space:nowrap;">
      <a href="${gcalLink(s)}" style="color:#37AB93;font-size:13px;font-weight:bold;text-decoration:none;">+ Google Calendar</a>
    </td>
  </tr>`
).join("");

const template = ({ userName }: { userName?: string | null }) => `
<h1 style="font-size:26px;margin:0 0 8px 0;color:#19262A;">${userName ? `¡Hola ${userName}!` : "¡Hola!"} 🎉</h1>
<p style="margin:0 0 20px 0;">
  Tu lugar en el taller <strong>Diseño de sistemas agénticos</strong> está confirmado.
  Vas a construir tu agente personal production-ready — del harness a la interfaz — en
  2 semanas intensivas.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6fafa;border-radius:10px;border-left:4px solid #85DDCB;margin-bottom:24px;">
${sessionRows}
</table>

<h3 style="margin:0 0 10px 0;color:#19262A;font-size:18px;">Qué sigue</h3>
<ol style="margin:0 0 24px 0;padding-left:20px;color:#475569;font-size:15px;line-height:1.8;">
  <li><strong>Tu invitación a Ghosty Teams</strong> llegará a este correo — ahí vive la comunidad del taller y ahí ocurren las sesiones en vivo. Si no la ves para el 28 de agosto, escríbeme por WhatsApp.</li>
  <li><strong>Tu API key de EasyBits</strong> con todos los tokens de DeepSeek v4 Pro que vas a necesitar te llega en un correo especial antes del arranque, con instrucciones paso a paso.</li>
  <li><strong>El repo con la UI inicial</strong> de tu agente se comparte en Ghosty Teams antes de la sesión 1.</li>
</ol>

<p style="margin:0 0 8px 0;">
  Mientras tanto, puedes dejar tu entorno listo (toma 2 minutos):
</p>
<div style="margin:0 0 24px 0;">
  ${emailButton("Instalar GhostyCode →", "https://www.fixtergeek.com/sistemas-agenticos#instalar")}
</div>

<p style="margin:0 0 8px 0;color:#475569;font-size:15px;">
  Las grabaciones de cada sesión quedarán para siempre en tu viewer:
</p>
<div style="margin:0 0 24px 0;">
  ${emailButton("Mi curso en FixterGeek", "https://www.fixtergeek.com/cursos/sistemas-agenticos/viewer")}
</div>

<p style="color:#64748B;font-size:14px;margin:24px 0 8px 0;">
  ¿Dudas? Escríbeme directo por <a href="https://wa.me/527712412825" style="color:#37AB93;">WhatsApp</a>.
</p>
<p style="color:#19262A;margin:16px 0 4px 0;">Nos vemos el martes 1 de septiembre.</p>
<p style="color:#64748B;margin:0;">Abrazo. bliss.</p>
`;

export const sendSistemasWelcome = async ({ to, userName }: SistemasWelcomeProps) => {
  const html = wrapEmailHtml(template({ userName }), {
    preheader:
      "Tu lugar está confirmado — fechas, calendario y lo que sigue antes del arranque.",
  }).replace(/\{\{unsubscribe\}\}/g, "https://www.fixtergeek.com/perfil");

  return getSesTransport()
    .sendMail({
      from: FROM,
      to,
      subject: "Tu lugar en Diseño de sistemas agénticos está confirmado 🎉",
      html,
    })
    .then((result: unknown) => {
      console.log(`[sistemas] welcome email sent to: ${to}`);
      return result;
    })
    .catch((error: unknown) => {
      console.error(`[sistemas] error sending welcome email to ${to}:`, error);
      throw error;
    });
};
