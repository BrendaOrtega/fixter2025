// «Se acaban tus meses gratis» (25-nov-2026). A quien tiene membresía de regalo en el Club de Agentes
// de IA (registro de Anti-Factory o compradores con `claimBuyerGift`) le llega un correo ~10 días
// antes de que venza (día 80 de 90), con la liga al checkout que respeta los días regalados: el cobro
// empieza el día que vencen, no antes (`giftTrialEnd`). Lo corre el job diario `club_gift_ending`
// de Agenda; `scripts/club-gift-ending.mts` lista y previsualiza.
import { db } from "~/.server/db";
import { claimEmailSend } from "~/.server/signup-guard";
import { emailButton, wrapEmailHtml } from "~/utils/emailShell";
import { escapeHtml } from "~/utils/escapeHtml";
import { sendSesEmailDirect } from "~/utils/sesTransport";

const DAY_MS = 24 * 60 * 60 * 1000;
export const CLUB_SLUG = "club-de-agentes";
/** Cuántos días antes de vencer se avisa. La ventana es de un día: el job corre diario. */
export const GIFT_ENDING_DAYS = 10;
const FROM = "Héctorbliss de FixterGeek <noreply@fixtergeek.com>";
const BASE_URL = "https://www.fixtergeek.com";
const UNSUBSCRIBE = "mailto:brenda@fixter.org?subject=Baja%20de%20correos%20FixterGeek";
/// La ilustración del correo de registro (la llamada del club, Ghosty y un control de juego).
const ART_URL = "https://wild-bird-2039.t3.storage.dev/correos/anti-factory-registro-club-1120.png";
const ART_ALT = "Ghosty junto a la pantalla de la llamada del club, con un tablero de tareas y un control de juego";

/** Vencen entre ahora+9 d y ahora+10 d: cada membresía cae en la ventana de un solo día. */
export function giftEndingWindow(now = new Date()) {
  return {
    from: new Date(now.getTime() + (GIFT_ENDING_DAYS - 1) * DAY_MS),
    to: new Date(now.getTime() + GIFT_ENDING_DAYS * DAY_MS),
  };
}

/** ¿Esta membresía es un regalo vigente que vence dentro de la ventana de hoy? Sin fecha no caduca. */
export function isGiftEnding(
  m: { provider: string; status: string; currentPeriodEnd: Date | null },
  now = new Date(),
) {
  if (m.provider !== "grant" || m.status !== "active" || !m.currentPeriodEnd) return false;
  const { from, to } = giftEndingWindow(now);
  return m.currentPeriodEnd >= from && m.currentPeriodEnd < to;
}

/** Regalos del club que vencen en la ventana de hoy, con el correo y nombre de su dueño. */
export async function listGiftEnding(now = new Date()) {
  const { from, to } = giftEndingWindow(now);
  const rows = await db.membership.findMany({
    where: {
      provider: "grant",
      status: "active",
      currentPeriodEnd: { gte: from, lt: to },
      community: { slug: CLUB_SLUG },
    },
    select: {
      id: true,
      provider: true,
      status: true,
      currentPeriodEnd: true,
      user: { select: { email: true, displayName: true, username: true } },
      community: { select: { slug: true, name: true, priceMxn: true, priceAnnualMxn: true } },
    },
  });
  // El filtro de la base y el de la función dicen lo mismo; la función es la que tiene tests.
  return rows.filter((r) => isGiftEnding(r, now) && r.user?.email);
}

const longDate = (d: Date) =>
  d.toLocaleDateString("es-MX", { timeZone: "America/Mexico_City", day: "numeric", month: "long", year: "numeric" });
const mxn = (n: number) => `$${n.toLocaleString("es-MX")} MXN`;

/** El correo: pregunta directa, ilustración, recuadro menta con la fecha, botones al checkout y firma. */
export function giftEndingEmail({
  name,
  endsAt,
  community,
}: {
  name: string | null;
  endsAt: Date;
  community: { slug: string; name: string; priceMxn: number | null; priceAnnualMxn: number | null };
}) {
  const date = longDate(endsAt);
  const hi = name ? `Hola, ${escapeHtml(name.split(" ")[0])}:` : "Hola:";
  const join = (interval: "month" | "year") => `${BASE_URL}/comunidad/${community.slug}?unirse=${interval}`;
  const monthly = community.priceMxn
    ? `<div style="text-align:center;margin:0 0 10px 0;">${emailButton(`Seguir en el club por ${mxn(community.priceMxn)} al mes`, join("month"))}</div>`
    : "";
  const annual = community.priceAnnualMxn
    ? `<p style="margin:0 0 16px 0;text-align:center;"><a href="${join("year")}" style="color:#0E1317;font-weight:bold;">O paga el año: ${mxn(community.priceAnnualMxn)}</a></p>`
    : "";
  const inner = `
    <p style="margin:0 0 16px 0;">${hi} <strong>¿Quieres seguir en el ${escapeHtml(community.name)} cuando se acaben tus meses gratis?</strong></p>
    <div style="margin:0 0 16px 0;"><img src="${ART_URL}" alt="${ART_ALT}" width="560" style="width:100%;max-width:560px;height:auto;border:0;border-radius:12px;display:block;" /></div>
    <div style="margin:0 0 16px 0;border:1px solid #85DDCB;border-radius:12px;padding:16px;">
      <p style="margin:0 0 6px 0;font-size:13px;font-weight:bold;letter-spacing:1px;color:#3F8F7F;">TUS MESES GRATIS VENCEN EL ${escapeHtml(date.toUpperCase())}</p>
      <p style="margin:0;">Elige tu plan antes de que se acaben tus meses gratis y sigues en el club sin cortes. El primer cobro llega cuando terminan tus meses gratis, ni un día antes.</p>
    </div>
    ${monthly}
    ${annual}
    <p style="margin:0 0 20px 0;font-size:14px;color:#5A6A6E;text-align:center;">Entra con el correo de tu cuenta. Puedes cancelar cuando quieras desde la página del club.</p>
    <p style="margin:0;">Abrazo. @blissito</p>`;
  return {
    subject: `Tus meses gratis del ${community.name} vencen el ${date}`,
    htmlBody: wrapEmailHtml(inner, {
      preheader: `Elige tu plan antes del ${date} y sigues en el club sin cortes; no se cobra nada antes.`,
      promoFooter: false,
    }).replace(/\{\{unsubscribe\}\}/g, UNSUBSCRIBE),
  };
}

/** Manda el aviso a cada regalo que vence en la ventana de hoy, una sola vez por membresía y fecha. */
export async function sendGiftEndingEmails(now = new Date()) {
  let sent = 0;
  for (const m of await listGiftEnding(now)) {
    const email = m.user.email;
    // `once` por membresía y fecha de vencimiento: si se amplía el regalo, el aviso nuevo sí sale.
    const purpose = `club-gift-ending:${m.id}:${m.currentPeriodEnd!.toISOString().slice(0, 10)}`;
    if (!(await claimEmailSend(email, purpose, "agenda", "once"))) continue;
    const msg = giftEndingEmail({
      name: m.user.displayName || m.user.username || null,
      endsAt: m.currentPeriodEnd!,
      community: m.community,
    });
    await sendSesEmailDirect({ to: email, from: FROM, ...msg }).then(
      () => sent++,
      (err) => console.error("Aviso de fin de regalo falló", email, err),
    );
    await new Promise((r) => setTimeout(r, 120));
  }
  return { sent };
}
