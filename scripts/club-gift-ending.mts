#!/usr/bin/env npx tsx
/**
 * «Se acaban tus meses gratis» del Club de Agentes de IA. El envío real lo hace el job diario
 * `club_gift_ending` de Agenda (sólo en producción); este script es para revisar.
 *
 *   npx tsx --env-file=.env scripts/club-gift-ending.mts                     # dry-run: quién lo recibe hoy y los próximos 30 días
 *   npx tsx --env-file=.env scripts/club-gift-ending.mts --preview out.html  # sólo el HTML, con datos de ejemplo
 *   npx tsx --env-file=.env scripts/club-gift-ending.mts --prueba --send     # una copia a fixtergeek+prueba@gmail.com
 */
import { writeFileSync } from "fs";
import { db } from "../app/.server/db";
import { CLUB_SLUG, giftEndingEmail, listGiftEnding } from "../app/.server/services/club-gift-ending.server";
import { sendSesEmailDirect } from "../app/utils/sesTransport";
import { ANTI_FACTORY_GIFT_DAYS } from "../app/.server/services/anti-factory.server";

const arg = (flag: string) => {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const preview = arg("--preview");
const prueba = process.argv.includes("--prueba");
const send = process.argv.includes("--send");
const DAY_MS = 24 * 60 * 60 * 1000;

const community = await db.community.findFirst({
  where: { slug: CLUB_SLUG },
  select: { slug: true, name: true, priceMxn: true, priceAnnualMxn: true },
});
if (!community) throw new Error(`No existe la comunidad ${CLUB_SLUG}`);
// Fecha de ejemplo realista: la de quien se registra hoy a Anti-Factory (90 días de regalo), no hoy + 10,
// que enseñaba un cobro en diciembre de 2026 que nadie va a tener.
const sample = giftEndingEmail({ name: "Héctor Bliss", endsAt: new Date(Date.now() + ANTI_FACTORY_GIFT_DAYS * DAY_MS), community });

if (preview) {
  writeFileSync(preview, sample.htmlBody);
  console.log(`HTML en ${preview}`);
  process.exit(0);
}

if (prueba && send) {
  await sendSesEmailDirect({ to: "fixtergeek+prueba@gmail.com", from: "Héctorbliss de FixterGeek <noreply@fixtergeek.com>", ...sample });
  console.log("Prueba enviada a fixtergeek+prueba@gmail.com");
  process.exit(0);
}

const today = await listGiftEnding();
console.log(`Hoy lo recibirían ${today.length}:`);
for (const m of today) console.log(`  ${m.user.email} · vence ${m.currentPeriodEnd!.toISOString().slice(0, 10)}`);

let next30 = 0;
for (let d = 1; d <= 30; d++) next30 += (await listGiftEnding(new Date(Date.now() + d * DAY_MS))).length;
console.log(`En los próximos 30 días: ${next30}`);
console.log("\nDry-run. El envío lo hace el job diario `club_gift_ending` en producción.");
await db.$disconnect();
process.exit(0);
