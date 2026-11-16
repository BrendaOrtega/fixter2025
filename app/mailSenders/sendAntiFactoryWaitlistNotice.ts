import { getSesTransport } from "~/utils/sendGridTransport";
import { emailButton, wrapEmailHtml } from "~/utils/emailShell";

// Aviso a la lista de espera del taller anterior («Software Factory»): el taller se rehízo como
// Ghosty Anti-Factory y quien estaba en la lista paga el precio del club. Lo manda
// `scripts/anti-factory-waitlist-notice.mts` después del deploy.
const FROM = "Héctorbliss de FixterGeek <secuencias@fixtergeek.com>";
const PAGE_URL = "https://www.fixtergeek.com/anti-factory";

export const ANTI_FACTORY_WAITLIST_SUBJECT =
  "Rehicimos el taller: Ghosty Anti-Factory, 1 y 3 de diciembre, y tú tienes el precio del club";

const template = (email: string, clubPrice: number) => `
<h1 style="font-size:26px;margin:0 0 8px 0;color:#19262A;">Rehicimos el taller</h1>
<p style="margin:0 0 16px 0;">
  Te apuntaste a la lista de espera del taller Software Factory. Lo rehicimos como
  <strong>Ghosty Anti-Factory</strong>, porque hay formas más simples y efectivas de desarrollar que una fábrica.
</p>
<p style="margin:0 0 16px 0;">
  Ahora son dos sesiones en vivo, el <strong>martes 1 y el jueves 3 de diciembre de 2026, de 7 a 9 pm
  (hora de la Ciudad de México)</strong>, en la llamada del Club de Agentes de IA.
</p>
<p style="margin:0 0 16px 0;">
  Por estar en la lista tienes el precio del club: <strong>$${clubPrice.toLocaleString("es-MX")} MXN</strong>.
  Para verlo en la página, inicia sesión con este correo (<strong>${email}</strong>).
</p>
<div style="margin:0 0 24px 0;">
  ${emailButton("Ver el taller", PAGE_URL)}
</div>
<p style="margin:0 0 16px 0;color:#475569;font-size:15px;">
  Antes del taller hay un webinar gratis el miércoles 18 de noviembre a las 7 pm (CDMX). Los detalles
  también están en la página.
</p>
<p style="color:#19262A;margin:16px 0 4px 0;">Nos vemos ahí.</p>
<p style="color:#64748B;margin:0;">Abrazo. Blissmo. 🤓</p>
`;

export const sendAntiFactoryWaitlistNotice = async (to: string, clubPrice: number) => {
  const html = wrapEmailHtml(template(to, clubPrice), {
    preheader: `Dos sesiones el 1 y 3 de diciembre. Por estar en la lista pagas $${clubPrice.toLocaleString("es-MX")} MXN.`,
  }).replace(/\{\{unsubscribe\}\}/g, "https://www.fixtergeek.com/perfil");
  return getSesTransport().sendMail({ from: FROM, to, subject: ANTI_FACTORY_WAITLIST_SUBJECT, html });
};
