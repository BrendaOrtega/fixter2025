import { getSesTransport, getSesRemitent } from "~/utils/sendGridTransport";

// Aviso interno: alguien pidió una caja de llamadas en la home. El alta es a mano, así que
// este correo es lo que hace cierto el «te escribimos hoy mismo» del formulario.
const BOX_NAMES: Record<string, string> = {
  "caja-asesoria": "Caja Asesoría",
  "caja-taller": "Caja Taller",
  "caja-evento": "Caja Evento",
};

export const isCallBoxSlug = (slug: string) => slug in BOX_NAMES;

const escapeHtml = (t: string) =>
  t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const sendCallBoxLead = async ({ email, slug }: { email: string; slug: string }) => {
  const box = BOX_NAMES[slug] ?? slug;
  const safe = escapeHtml(email);
  const when = new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" });
  return getSesTransport().sendMail({
    from: getSesRemitent(),
    to: "brenda@fixter.org",
    subject: `Pidieron una ${box}: ${email}`,
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1d2327;">
        <h1 style="font-size: 20px; margin: 0 0 12px;">Pidieron una ${box}</h1>
        <ul style="padding-left: 18px; line-height: 1.7;">
          <li>Correo: <a href="mailto:${safe}" target="_blank" rel="noopener">${safe}</a></li>
          <li>Caja: ${box}</li>
          <li>Cuándo: ${when} (CDMX)</li>
        </ul>
        <p>El formulario le prometió que le escribimos hoy mismo para darla de alta.</p>
      </div>`,
  });
};
