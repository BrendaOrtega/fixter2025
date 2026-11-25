#!/usr/bin/env npx tsx
/**
 * Correo 1 de campaña del taller gratis «Ghosty Anti-Factory» (martes 1 y jueves 3 de diciembre de
 * 2026, 7 pm CDMX), para mandarse el jueves 26-nov. Copia de `send-anti-factory-webinar-hoy.mts`
 * (anatomía en docs/correo-campana-a-suscriptores.md).
 * Destinatarios: suscriptores de la lista y usuarios con cuenta (como `send-club-presentacion.ts`),
 * sin quien ya se registró al taller (tag `anti-factory-registro-dic26`).
 * Fuera: lista negra, bajas de secuencias, cuentas propias y altas automatizadas/desechables.
 *
 *   npx tsx --env-file=.env scripts/send-anti-factory-taller-gratis.mts                       # dry-run: cuenta
 *   npx tsx --env-file=.env scripts/send-anti-factory-taller-gratis.mts --preview out.html    # sólo el HTML
 *   npx tsx --env-file=.env scripts/send-anti-factory-taller-gratis.mts --prueba --send       # a fixtergeek+prueba@gmail.com
 *   npx tsx --env-file=.env scripts/send-anti-factory-taller-gratis.mts --send                # de verdad (sólo con el ok de bliss)
 */
import { writeFileSync } from "fs";
import { db } from "../app/.server/db";
import { checkSignupEmail } from "../app/.server/anti-bot";
import { campaignStats, sendCampaignEmail, startCampaign, withUtm } from "../app/.server/email-campaign.server";
import { emailButton, wrapEmailHtml } from "../app/utils/emailShell";
import { escapeHtml } from "../app/utils/escapeHtml";

const FROM = "Héctorbliss de FixterGeek <noreply@fixtergeek.com>";
const REGISTER_URL = "https://www.fixtergeek.com/anti-factory";
const ART_URL = "https://www.fixtergeek.com/anti-factory-taller-og.jpg";
const UNSUBSCRIBE = "mailto:brenda@fixter.org?subject=Baja%20de%20correos%20FixterGeek";
const OWN = new Set(["fixtergeek@gmail.com", "blissitos@gmail.com", "contacto@fixter.org", "brenda@fixter.org"]);
const CAMPAIGN = "anti-factory-taller-gratis-2026-11-26";
const REGISTER_TAG = "anti-factory-registro-dic26";

const arg = (flag: string) => {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const send = process.argv.includes("--send");
const prueba = process.argv.includes("--prueba");
const preview = arg("--preview");

export function tallerEmail(name: string | null) {
  const hi = name ? `Hola, ${escapeHtml(name.split(" ")[0])}:` : "Hola:";
  const inner = `
    <p style="margin:0 0 16px 0;">${hi}</p>
    <p style="margin:0 0 16px 0;"><strong>¿Te están vendiendo una fábrica de software con agentes de IA y no sabes si la necesitas?</strong></p>
    <p style="margin:0 0 16px 0;">Nosotros armamos una y la quemamos. En el taller te enseñamos lo que la reemplazó: un agente escribe cada pendiente, otro agente lo revisa con contexto limpio y tú decides el merge, con Claude Code o Codex en tu propio repo.</p>
    <div style="margin:0 0 16px 0;"><img src="${ART_URL}" alt="Ghosty Anti-Factory, taller gratis en vivo: martes 1 y jueves 3 de diciembre, 7 pm (CDMX)" width="560" style="width:100%;max-width:560px;height:auto;border:0;border-radius:12px;display:block;" /></div>
    <div style="margin:0 0 20px 0;border:1px solid #85DDCB;border-radius:12px;padding:16px;">
      <p style="margin:0 0 6px 0;font-size:13px;font-weight:bold;letter-spacing:1px;color:#3F8F7F;">MARTES 1 Y JUEVES 3 DE DIC · 7 PM (CDMX) · GRATIS</p>
      <p style="margin:0 0 8px 0;font-size:18px;"><strong>Taller Ghosty Anti-Factory</strong></p>
      <p style="margin:0 0 8px 0;">Al registrarte te llevas:</p>
      <ul style="margin:0;padding-left:20px;">
        <li style="margin:0 0 6px 0;">Los avisos de las dos sesiones directo en tu calendario.</li>
        <li style="margin:0 0 6px 0;">3 meses gratis del Club de Agentes de IA.</li>
        <li style="margin:0;">La grabación del webinar del 18 de noviembre, que se ve dentro del club.</li>
      </ul>
    </div>
    <div style="text-align:center;margin:0 0 12px 0;">${emailButton("Regístrate gratis", REGISTER_URL)}</div>
    <p style="margin:0 0 20px 0;font-size:14px;color:#5A6A6E;text-align:center;">Te registras con Google o con tu correo en un minuto. Las dos sesiones son en vivo, por YouTube y en la llamada del club.</p>
    <p style="margin:0;">Nos vemos el martes. Abrazo. @blissito</p>`;
  return {
    subject: "Taller gratis Ghosty Anti-Factory: martes 1 y jueves 3 de diciembre",
    htmlBody: wrapEmailHtml(inner, {
      preheader: "Dos sesiones en vivo, 7 pm (CDMX). Al registrarte te llevas 3 meses gratis del Club de Agentes de IA.",
      promoFooter: false,
    }).replace(/\{\{unsubscribe\}\}/g, UNSUBSCRIBE),
  };
}

if (preview) {
  writeFileSync(preview, tallerEmail("Héctor").htmlBody);
  console.log(`HTML en ${preview}`);
  process.exit(0);
}

// Suscriptores y usuarios con cuenta; el nombre del suscriptor gana porque trae `firstName`.
const people = new Map<string, { name: string | null; registered: boolean }>();
const subscribers = await db.subscriber.findMany({ select: { email: true, name: true, firstName: true, tags: true } });
for (const s of subscribers) {
  const email = s.email.toLowerCase().trim();
  const prev = people.get(email);
  people.set(email, {
    name: prev?.name ?? s.firstName ?? s.name ?? null,
    registered: !!prev?.registered || s.tags.includes(REGISTER_TAG),
  });
}
const users = await db.user.findMany({ select: { email: true, displayName: true } });
for (const u of users) {
  const email = u.email?.toLowerCase().trim();
  if (email && !people.has(email)) people.set(email, { name: u.displayName ?? null, registered: false });
}

const blacklist = new Set((await db.emailBlacklist.findMany({ select: { email: true } })).map((b) => b.email.toLowerCase()));
const unsub = await db.sequenceEnrollment.findMany({
  where: { pausedReason: "unsubscribe" },
  select: { subscriber: { select: { email: true } } },
});
const unsubscribed = new Set(unsub.map((u) => u.subscriber?.email?.toLowerCase()).filter(Boolean) as string[]);

const recipients: Array<{ email: string; name: string | null }> = [];
const dropped: Record<string, number> = {};
for (const [email, p] of people) {
  const reason = p.registered
    ? "ya se registró"
    : blacklist.has(email)
      ? "lista negra"
      : unsubscribed.has(email)
        ? "se dio de baja"
        : OWN.has(email) || /^fixtergeek\+/.test(email)
          ? "cuenta propia"
          : checkSignupEmail(email, p.name).blocked
            ? "alta automatizada o desechable"
            : null;
  if (reason) dropped[reason] = (dropped[reason] ?? 0) + 1;
  else recipients.push({ email, name: p.name });
}

console.log(`Suscriptores: ${subscribers.length} · usuarios: ${users.length} · correos únicos: ${people.size}`);
console.log(`A enviar: ${recipients.length}`);
console.log(`Descartados: ${JSON.stringify(dropped)}`);
console.log(`Asunto: ${tallerEmail(null).subject}`);

if (!send) {
  console.log("\nDry-run. Agrega --send para enviar (con --prueba sólo a fixtergeek+prueba@gmail.com).");
  await db.$disconnect();
  process.exit(0);
}

const list = prueba ? [{ email: "fixtergeek+prueba@gmail.com", name: "Héctor" }] : recipients;
const sample = tallerEmail(null);
const newsletterId = await startCampaign({ title: prueba ? `${CAMPAIGN}-prueba` : CAMPAIGN, subject: sample.subject });
console.log(`Campaña ${newsletterId}`);
let ok = 0;
for (const r of list) {
  try {
    const m = tallerEmail(r.name);
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
