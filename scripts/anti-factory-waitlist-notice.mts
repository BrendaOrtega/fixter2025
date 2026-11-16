/**
 * Avisa a la lista de espera de software-factory que el taller se rehízo como Ghosty Anti-Factory
 * (1 y 3 de diciembre) y que por estar en la lista pagan el precio del club. Se corre DESPUÉS del
 * deploy (la página tiene que reconocerles el precio).
 *
 *   npx tsx --env-file=.env scripts/anti-factory-waitlist-notice.mts            # sólo muestra (dry-run)
 *   npx tsx --env-file=.env scripts/anti-factory-waitlist-notice.mts --write    # manda
 *
 * Idempotente: a quien ya se le mandó queda con el tag `anti-factory-aviso-lista` y no se le repite.
 */
import { db } from "../app/.server/db";
import {
  ANTI_FACTORY_TIERS,
  FACTORY_WAITLIST_TAG,
  priceFor,
} from "../app/.server/services/anti-factory.server";
import {
  ANTI_FACTORY_WAITLIST_SUBJECT,
  sendAntiFactoryWaitlistNotice,
} from "../app/mailSenders/sendAntiFactoryWaitlistNotice";

const SENT_TAG = "anti-factory-aviso-lista";
const write = process.argv.includes("--write");

const clubPrice = await priceFor(ANTI_FACTORY_TIERS.club);
const subs = await db.subscriber.findMany({
  where: { tags: { has: FACTORY_WAITLIST_TAG } },
  select: { id: true, email: true, tags: true, confirmed: true },
});
const pending = subs.filter((s) => !s.tags.includes(SENT_TAG));

console.log(`Asunto: ${ANTI_FACTORY_WAITLIST_SUBJECT}`);
console.log(`Precio del club: $${clubPrice} MXN · en la lista: ${subs.length} · por avisar: ${pending.length}`);
for (const s of pending) console.log(`  ${s.email}${s.confirmed ? "" : " (sin confirmar)"}`);
if (!write) {
  console.log("Modo vista. Corre con --write para mandar.");
} else {
  for (const s of pending) {
    try {
      await sendAntiFactoryWaitlistNotice(s.email, clubPrice);
      await db.subscriber.update({ where: { id: s.id }, data: { tags: { push: SENT_TAG } } });
      console.log(`✓ ${s.email}`);
    } catch (error) {
      console.error(`✗ ${s.email}:`, error);
    }
  }
}
await db.$disconnect();
