import { getSesTransport } from "~/utils/sendGridTransport";
import { wrapEmailHtml } from "~/utils/emailShell";
import { escapeHtml } from "~/utils/escapeHtml";
import { buildIcs } from "~/.server/services/club-events.server";

// Dominio verificado en SES: enviar como @gmail.com rompe DMARC y Gmail lo tira.
const FROM = "Héctorbliss de FixterGeek <secuencias@fixtergeek.com>";
const PAGE_URL = "https://www.fixtergeek.com/anti-factory";
const TITLE = "Ghosty Anti-Factory";

type Session = { id: string; label: string; startsAt: Date; endsAt: Date };

const INCLUDES = [
  "ghosty-dev instalado en tu repo",
  "Varios pendientes a la vez",
  "Un revisor con contexto limpio",
  "La grabación de las dos sesiones",
  "Acceso gratis a las cajas de CI de Ghosty Studio",
];

const template = ({ userName, sessions }: { userName?: string | null; sessions: readonly Session[] }) => `
<h1 style="font-size:26px;margin:0 0 8px 0;color:#19262A;">${userName ? `Listo, ${escapeHtml(userName)}` : "Listo"} ✅</h1>
<p style="margin:0 0 20px 0;">
  Tu lugar en el taller en vivo <strong>${TITLE}</strong> del Club de Agentes de IA ya está pagado.
  Las dos sesiones son en vivo y duran dos horas cada una.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6fafa;border-radius:10px;border-left:4px solid #85DDCB;margin-bottom:24px;">
  <tr><td style="padding:16px 18px;color:#19262A;font-size:16px;line-height:1.7;">
    ${sessions.map((s) => `<strong>${escapeHtml(s.label)}</strong>`).join("<br/>")}
    <br/><span style="color:#64748B;font-size:14px;">Los dos archivos .ics de este correo agregan cada sesión a tu calendario.</span>
  </td></tr>
</table>

<h3 style="margin:0 0 10px 0;color:#19262A;font-size:18px;">Lo que te llevas</h3>
<ul style="margin:0 0 24px 0;padding-left:20px;color:#475569;font-size:15px;line-height:1.8;">
  ${INCLUDES.map((i) => `<li>${i}</li>`).join("\n  ")}
</ul>

<p style="margin:0 0 24px 0;color:#475569;font-size:15px;">
  Antes de la primera sesión te escribo a este correo con la liga para entrar.
</p>

<p style="color:#64748B;font-size:14px;margin:24px 0 8px 0;">
  ¿Tienes dudas? Escríbeme directo por <a href="https://wa.me/527712412825" style="color:#37AB93;">WhatsApp</a>.
</p>
<p style="color:#19262A;margin:16px 0 4px 0;">Nos vemos el martes 1 de diciembre.</p>
<p style="color:#64748B;margin:0;">Abrazo. Blissmo. 🤓</p>
`;

/** Confirmación al comprador del taller, con un .ics por sesión. */
export const sendAntiFactoryConfirmation = async ({
  to,
  userName,
  sessions,
}: {
  to: string;
  userName?: string | null;
  sessions: readonly Session[];
}) => {
  const html = wrapEmailHtml(template({ userName, sessions }), {
    preheader: "Tu lugar en el taller está pagado. Guarda las dos fechas en tu calendario.",
  }).replace(/\{\{unsubscribe\}\}/g, "https://www.fixtergeek.com/perfil");

  const attachments = sessions.map((s, i) => ({
    filename: `anti-factory-sesion-${i + 1}.ics`,
    contentType: "text/calendar; charset=utf-8; method=PUBLISH",
    content: buildIcs(
      {
        id: s.id,
        title: `${TITLE} · sesión ${i + 1} de ${sessions.length}`,
        description: "Taller en vivo del Club de Agentes de IA de FixterGeek.",
        startsAt: s.startsAt,
        endsAt: s.endsAt,
      },
      PAGE_URL,
    ),
  }));

  return getSesTransport()
    .sendMail({
      from: FROM,
      to,
      subject: `Tu lugar en ${TITLE} está pagado: martes 1 y jueves 3 de diciembre`,
      html,
      attachments,
    })
    .then((result: unknown) => {
      console.log(`[anti-factory] confirmation sent to: ${to}`);
      return result;
    });
};
