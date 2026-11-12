// Envíos masivos desde scripts (`scripts/send-*.ts`) SIEMPRE medidos (12-nov-2026).
//
// Cada campaña es una fila `Newsletter` con status SENT: su id viaja como tag `newsletter_id` en
// cada correo, por el configuration set de rastreo. El webhook `api/sns` ya llena `delivered`,
// `opened` y `clicked` de esa fila con cada evento de SES. Además se guardan los destinatarios y
// los `messageId` (respaldo del webhook cuando el tag no llega).
import { db } from "~/.server/db";
import { sendSesEmailDirect } from "~/utils/sesTransport";

/** Agrega UTM a cada liga http(s) del HTML (menos las de baja y las que ya traen utm_). */
export function withUtm(html: string, campaign: string, source = "email") {
  return html.replace(/href="(https?:\/\/[^"]+)"/g, (m, url: string) => {
    if (/[?&]utm_/.test(url)) return m;
    const u = new URL(url.replace(/&amp;/g, "&"));
    u.searchParams.set("utm_source", source);
    u.searchParams.set("utm_medium", "email");
    u.searchParams.set("utm_campaign", campaign);
    return `href="${u.toString().replace(/&/g, "&amp;")}"`;
  });
}

export async function startCampaign(o: { title: string; subject: string; fromName?: string; fromEmail?: string }) {
  const row = await db.newsletter.create({
    data: {
      title: o.title,
      subject: o.subject,
      status: "SENT",
      sentAt: new Date(),
      ...(o.fromName ? { fromName: o.fromName } : {}),
      ...(o.fromEmail ? { fromEmail: o.fromEmail } : {}),
    },
    select: { id: true },
  });
  return row.id;
}

/** Manda un correo de la campaña con rastreo y registra destinatario y messageId. */
export async function sendCampaignEmail(newsletterId: string, p: { to: string; from: string; subject: string; htmlBody: string }) {
  const r = await sendSesEmailDirect({ ...p, track: { newsletterId } });
  const messageId = r.MessageId;
  await db.newsletter.update({
    where: { id: newsletterId },
    data: { recipients: { push: p.to }, ...(messageId ? { messageIds: { push: messageId } } : {}) },
  });
  return messageId;
}

/** Resumen para leer después: cuántos entregados, abiertos y con clic. */
export async function campaignStats(newsletterId: string) {
  const n = await db.newsletter.findUniqueOrThrow({
    where: { id: newsletterId },
    select: { title: true, recipients: true, delivered: true, opened: true, clicked: true },
  });
  const uniq = (a: string[]) => new Set(a.map((e) => e.toLowerCase())).size;
  return {
    title: n.title,
    sent: n.recipients.length,
    delivered: uniq(n.delivered),
    opened: uniq(n.opened),
    clicked: uniq(n.clicked),
    openers: [...new Set(n.opened)],
    clickers: [...new Set(n.clicked)],
  };
}
