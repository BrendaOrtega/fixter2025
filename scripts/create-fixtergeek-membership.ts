/**
 * Crea la comunidad de pago FixterGeek (/comunidad/club-de-agentes) a $99 MXN al
 * mes o $990 al año, y regala 3 meses a quienes ya compraron un curso o libro
 * (decisión de bliss, 10-nov-2026; docs/comunidad/PLAN.md).
 *
 * Idempotente. Sin flags sólo cuenta (no escribe nada):
 *   npx tsx --env-file=.env scripts/create-fixtergeek-membership.ts
 *   npx tsx --env-file=.env scripts/create-fixtergeek-membership.ts --write
 */
import { db } from "../app/.server/db";
import { grantMembership } from "../app/.server/services/membership.server";

const OWNER_EMAIL = "fixtergeek@gmail.com";
const SLUG = "club-de-agentes";
const PRICE_MONTH = 99;
const PRICE_YEAR = 990; // dos meses gratis
const GRANT_DAYS = 90;
const write = process.argv.includes("--write");

async function main() {
  const owner = await db.user.findUnique({ where: { email: OWNER_EMAIL } });
  if (!owner) throw new Error(`No existe el usuario ${OWNER_EMAIL}`);

  // Quien pagó: cursos que no son gratis, o algún libro.
  const paidCourses = await db.course.findMany({
    where: { isFree: false },
    select: { id: true },
  });
  const buyers = await db.user.findMany({
    where: {
      OR: [
        { courses: { hasSome: paidCourses.map((c) => c.id) } },
        { books: { isEmpty: false } },
      ],
    },
    select: { id: true, email: true },
  });
  console.log(`Compradores con 3 meses de regalo: ${buyers.length}`);

  if (!write) {
    console.log("Modo conteo. Corre con --write para crear la comunidad y los regalos.");
    return;
  }

  const community = await db.community.upsert({
    where: { slug: SLUG },
    create: {
      slug: SLUG,
      name: "Club de Agentes",
      tagline: "Construye agentes de IA que trabajan de verdad, con una llamada en vivo cada semana.",
      tag: "community:fixtergeek",
      ownerId: owner.id,
      isActive: true,
      priceMxn: PRICE_MONTH,
      priceAnnualMxn: PRICE_YEAR,
    },
    update: { priceMxn: PRICE_MONTH, priceAnnualMxn: PRICE_YEAR, isActive: true },
  });

  const until = new Date(Date.now() + GRANT_DAYS * 24 * 60 * 60 * 1000);
  let done = 0;
  for (const b of buyers) {
    await grantMembership({ userId: b.id, communityId: community.id, until });
    done++;
  }
  console.log(`✓ ${done} regalos hasta ${until.toLocaleDateString("es-MX")}`);
  console.log(`🎉 https://www.fixtergeek.com/comunidad/${SLUG}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
