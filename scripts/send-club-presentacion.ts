#!/usr/bin/env npx tsx
/**
 * Presentación del Club de Agentes de IA + el micro-hackatón de Ghosty Studio de HOY
 * (jueves 12-nov-2026, 7 a 10 pm CDMX). Correo simple, a toda la base (misma lista que
 * `send-club-invitacion.ts`: miembros con lugar + suscriptores, sin bajas ni cuentas propias).
 *
 * Uso:
 *   npx tsx --env-file=.env scripts/send-club-presentacion.ts                       # dry-run
 *   npx tsx --env-file=.env scripts/send-club-presentacion.ts --preview out.html    # sólo el HTML
 *   npx tsx --env-file=.env scripts/send-club-presentacion.ts --prueba --send       # a fixtergeek@gmail.com (las dos versiones)
 *   npx tsx --env-file=.env scripts/send-club-presentacion.ts --send                # de verdad
 */
import { writeFileSync } from "fs";
import { db } from "../app/.server/db";
import { isMembershipActive } from "../app/.server/services/membership.server";
import { checkSignupEmail } from "../app/.server/anti-bot";
import { campaignStats, sendCampaignEmail, startCampaign, withUtm } from "../app/.server/email-campaign.server";
import { emailButton, wrapEmailHtml } from "../app/utils/emailShell";
import { escapeHtml } from "../app/utils/escapeHtml";

const FROM = "Héctorbliss de FixterGeek <noreply@fixtergeek.com>";
const CLUB_URL = "https://www.fixtergeek.com/comunidad/club-de-agentes";
// Ilustración del Mundo del club (public/club-mundo-email.png, 1120×560; Gmail no muestra SVG).
const ART_URL = "https://www.fixtergeek.com/club-mundo-email.png";
const YOUTUBE_URL = "https://www.youtube.com/@fixtergeek?sub_confirmation=1";
const UNSUBSCRIBE = "mailto:brenda@fixter.org?subject=Baja%20de%20correos%20FixterGeek";
const OWN = new Set(["fixtergeek@gmail.com", "blissitos@gmail.com", "contacto@fixter.org", "brenda@fixter.org"]);

const arg = (flag: string) => {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const send = process.argv.includes("--send");
const prueba = process.argv.includes("--prueba");
const preview = arg("--preview");

/** `member`: ya tiene lugar en el club; al resto se le explica cómo entrar. */
export function presentationEmail(name: string | null, member: boolean) {
  const hi = name ? `Hola, ${escapeHtml(name.split(" ")[0])}:` : "Hola:";
  const access = member
    ? "Tu lugar en el club ya está apartado: entra con este mismo correo."
    : "";
  const link = (href: string, text: string) => `<a href="${href}" target="_blank" rel="noopener" style="color:#0E1317;font-weight:bold;">${text}</a>`;
  const inner = `
    <p style="margin:0 0 16px 0;">${hi}</p>
    <p style="margin:0 0 16px 0;"><strong>¿Quieres construir agentes de IA con otras personas que ya los están construyendo?</strong></p>
    <div style="margin:0 0 16px 0;"><img src="${ART_URL}" alt="El Mundo del club: naves sentadas en una mesa y la Isla Menta con una pantalla en vivo" width="560" style="width:100%;max-width:560px;height:auto;border:0;border-radius:12px;display:block;" /></div>
    <p style="margin:0 0 8px 0;">En el <strong>Club de Agentes de IA</strong> te sientas en una mesa del Mundo, prendes el micrófono y construyes tu agente con quien esté ahí.</p>
    <ul style="margin:0 0 20px 0;padding-left:20px;">
      <li style="margin:0 0 6px 0;">Cada semana, una llamada en vivo donde construimos un agente y te llevas su código.</li>
      <li style="margin:0 0 6px 0;">Si te la pierdes, la grabación te espera en el club.</li>
      <li style="margin:0;">Todos los cursos de FixterGeek, abiertos mientras seas miembro.</li>
    </ul>
    <div style="margin:0 0 20px 0;border:1px solid #85DDCB;border-radius:12px;padding:16px;">
      <p style="margin:0 0 6px 0;font-size:13px;font-weight:bold;letter-spacing:1px;color:#3F8F7F;">HOY · 7 A 10 PM (CDMX)</p>
      <p style="margin:0 0 8px 0;font-size:18px;"><strong>Micro-hackatón en vivo de Ghosty Studio</strong></p>
      <p style="margin:0 0 8px 0;font-style:italic;">Diez años de experiencia full-stack, metidos en un agente. Pídele a Ghosty tu app y Ghosty la construye completa.</p>
      <p style="margin:0;">Cinco participantes construyen su app en tres horas. Míralo en la sala del club o en ${link(YOUTUBE_URL, "YouTube")}.</p>
    </div>
    <div style="text-align:center;margin:0 0 16px 0;">${emailButton("Entrar al Club de Agentes", CLUB_URL)}</div>
    ${access ? `<p style="margin:0 0 16px 0;font-size:14px;color:#5A6A6E;">${access}</p>` : ""}
    <p style="margin:0;">Abrazo. @blissito</p>`;
  return {
    subject: "Hoy a las 7 pm: hackatón en vivo en el Club de Agentes 🤖",
    htmlBody: wrapEmailHtml(inner, {
      preheader: "Te presentamos el Club de Agentes de IA y hoy, de 7 a 10 pm, el micro-hackatón de Ghosty Studio en vivo.",
      promoFooter: false,
    }).replace(/\{\{unsubscribe\}\}/g, UNSUBSCRIBE),
  };
}

if (preview) {
  writeFileSync(preview, presentationEmail("Héctor", false).htmlBody);
  writeFileSync(preview.replace(/\.html$/, "-miembro.html"), presentationEmail("Héctor", true).htmlBody);
  console.log(`HTML en ${preview} y su versión de miembro`);
  process.exit(0);
}

const club = await db.community.findUniqueOrThrow({ where: { slug: "club-de-agentes" } });

const memberships = await db.membership.findMany({
  where: { communityId: club.id, status: { in: ["active", "past_due"] } },
  select: { status: true, currentPeriodEnd: true, user: { select: { email: true, displayName: true } } },
});
const people = new Map<string, { name: string | null; member: boolean }>();
for (const m of memberships) {
  if (m.user?.email && isMembershipActive(m)) {
    people.set(m.user.email.toLowerCase(), { name: m.user.displayName ?? null, member: true });
  }
}
// «Todo fixter»: usuarios con cuenta + suscriptores de la lista.
const users = await db.user.findMany({ select: { email: true, displayName: true } });
for (const u of users) {
  const email = u.email?.toLowerCase();
  if (email && !people.has(email)) people.set(email, { name: u.displayName ?? null, member: false });
}
const subscribers = await db.subscriber.findMany({ select: { email: true, name: true } });
for (const s of subscribers) {
  const email = s.email.toLowerCase();
  if (!people.has(email)) people.set(email, { name: s.name ?? null, member: false });
}

// Fuera: lista negra, bajas de secuencias, altas automatizadas y cuentas propias.
const blacklist = new Set((await db.emailBlacklist.findMany({ select: { email: true } })).map((b) => b.email.toLowerCase()));
const unsub = await db.sequenceEnrollment.findMany({
  where: { pausedReason: "unsubscribe" },
  select: { subscriber: { select: { email: true } } },
});
const unsubscribed = new Set(unsub.map((u) => u.subscriber?.email?.toLowerCase()).filter(Boolean) as string[]);

const recipients: Array<{ email: string; name: string | null; member: boolean }> = [];
const dropped: Record<string, number> = {};
for (const [email, p] of people) {
  const reason = blacklist.has(email)
    ? "lista negra"
    : unsubscribed.has(email)
      ? "se dio de baja"
      : OWN.has(email) || /^fixtergeek\+/.test(email)
        ? "cuenta propia"
        : checkSignupEmail(email, p.name).blocked
          ? "alta automatizada o desechable"
          : null;
  if (reason) dropped[reason] = (dropped[reason] ?? 0) + 1;
  else recipients.push({ email, ...p });
}

const list = prueba
  ? [
      { email: "fixtergeek@gmail.com", name: "Héctor", member: false },
      { email: "fixtergeek@gmail.com", name: "Héctor", member: true },
    ]
  : recipients;

console.log(`Miembros con lugar: ${recipients.filter((r) => r.member).length}`);
console.log(`Resto de la base: ${recipients.filter((r) => !r.member).length}`);
console.log(`Total a enviar: ${recipients.length}`);
console.log(`Descartados: ${JSON.stringify(dropped)}`);

if (!send) {
  console.log("\nDry-run. Agrega --send para enviar (con --prueba sólo a fixtergeek@gmail.com).");
  await db.$disconnect();
  process.exit(0);
}

// Medido: fila Newsletter + configuration set de rastreo + UTM (ver `email-campaign.server.ts`).
const CAMPAIGN = "club-presentacion-hackaton-2026-11-12";
const sample = presentationEmail(null, false);
const newsletterId = await startCampaign({ title: CAMPAIGN, subject: sample.subject });
console.log(`Campaña ${newsletterId}`);
let ok = 0;
for (const r of list) {
  try {
    const m = presentationEmail(r.name, r.member);
    await sendCampaignEmail(newsletterId, { to: r.email, from: FROM, subject: m.subject, htmlBody: withUtm(m.htmlBody, CAMPAIGN) });
    ok++;
  } catch (err) {
    console.error("Falló", r.email, err);
  }
  await new Promise((res) => setTimeout(res, 120));
}
console.log(`\nEnviados: ${ok}/${list.length}`);
console.log(await campaignStats(newsletterId));
await db.$disconnect();
