import { getSesTransport } from "~/utils/sendGridTransport";
import { emailButton, wrapEmailHtml } from "~/utils/emailShell";
import { escapeHtml } from "~/utils/escapeHtml";
import { buildIcs } from "~/.server/services/club-events.server";

// Dominio verificado en SES: enviar como @gmail.com rompe DMARC y Gmail lo tira.
const FROM = "Héctorbliss de FixterGeek <secuencias@fixtergeek.com>";
const TITLE = "Ghosty Anti-Factory";

type Session = { id: string; label: string; startsAt: Date; endsAt: Date };

const INCLUDES = [
  "ghosty-dev instalado en tu repo",
  "Varios pendientes a la vez",
  "Un revisor con contexto limpio",
  "La grabación de las dos sesiones",
  "Cuenta Power de Ghosty Studio de cortesía hasta el 31 de diciembre (CLI y cajas, incluida la de CI)",
];

const template = ({
  userName,
  sessions,
  joinUrl,
  email,
}: {
  userName?: string | null;
  sessions: readonly Session[];
  joinUrl: string;
  email: string;
}) => `
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

<h3 style="margin:0 0 10px 0;color:#19262A;font-size:18px;">Cómo entrar</h3>
<p style="margin:0 0 12px 0;color:#475569;font-size:15px;">
  El taller se da en la llamada del Club de Agentes de IA. Cada día del taller entra a la página del
  club, inicia sesión con <strong>${escapeHtml(email)}</strong> y da clic en la llamada. La llamada se
  abre 15 minutos antes. No necesitas ser miembro del club: tu compra ya te da pase esos dos días.
</p>
<div style="margin:0 0 24px 0;">
  ${emailButton("Ir a la llamada del club", joinUrl)}
</div>

<h3 style="margin:0 0 10px 0;color:#19262A;font-size:18px;">Tu cuenta Power de Ghosty Studio</h3>
<p style="margin:0 0 24px 0;color:#475569;font-size:15px;">
  La cortesía va con el correo de tu compra, <strong>${escapeHtml(email)}</strong>, y dura hasta el
  31 de diciembre de 2026. Antes de la sesión 1 se activa en la cuenta de
  <a href="https://www.ghosty.studio" style="color:#37AB93;">ghosty.studio</a> que tenga ese correo.
  Si todavía no tienes cuenta, no pasa nada: entra a ghosty.studio con ese mismo correo y la
  cortesía queda en tu cuenta nueva. Con ella usas el CLI de Ghosty Studio y sus cajas, incluida la de CI.
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
  joinUrl,
}: {
  to: string;
  userName?: string | null;
  sessions: readonly Session[];
  /** Página del club desde la que se entra a la llamada; también va en el .ics. */
  joinUrl: string;
}) => {
  const html = wrapEmailHtml(template({ userName, sessions, joinUrl, email: to }), {
    preheader: "Tu lugar en el taller está pagado. Guarda las dos fechas en tu calendario.",
  }).replace(/\{\{unsubscribe\}\}/g, "https://www.fixtergeek.com/perfil");

  const attachments = sessions.map((s, i) => ({
    filename: `anti-factory-sesion-${i + 1}.ics`,
    contentType: "text/calendar; charset=utf-8; method=PUBLISH",
    content: buildIcs(
      {
        id: s.id,
        title: `${TITLE} · sesión ${i + 1} de ${sessions.length}`,
        description: "Taller en vivo en la llamada del Club de Agentes de IA de FixterGeek. Inicia sesión con el correo de tu compra.",
        startsAt: s.startsAt,
        endsAt: s.endsAt,
      },
      joinUrl,
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
