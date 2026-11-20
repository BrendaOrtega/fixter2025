/**
 * Cuenta de prueba para el revisor de la verificación OAuth de Google (permiso `youtube`).
 *
 * Crea (idempotente) un anfitrión de prueba dueño de SU comunidad de pago, fuera del directorio,
 * con su propia sala de llamadas (`fx-google-review-<día>`), y escribe una liga de acceso de 60
 * días que lo deja en el panel, pestaña «Transmisión». No toca ninguna comunidad real.
 *
 *   npx tsx --env-file=.env scripts/google-review-community.mts           # sólo enseña qué haría
 *   npx tsx --env-file=.env scripts/google-review-community.mts --write   # crea y da la liga
 */
import jwt from "jsonwebtoken";
import { db } from "../app/.server/db";

const EMAIL = "google-oauth-review@fixtergeek.com";
const SLUG = "google-review";
const NEXT = `/comunidad/${SLUG}/admin?tab=transmision&hl=en`;
const write = process.argv.includes("--write");

const existing = await db.community.findUnique({ where: { slug: SLUG }, select: { id: true } });
if (!write) {
  console.log(existing ? `Ya existe /comunidad/${SLUG}. Con --write se renueva la liga.` : `Crearía ${EMAIL} y /comunidad/${SLUG}. Corre con --write.`);
  process.exit(0);
}
if (!process.env.SECRET) throw new Error("Falta SECRET: la liga se firma con la llave de producción");

const owner = await db.user.upsert({
  where: { email: EMAIL },
  create: { email: EMAIL, username: EMAIL, displayName: "Google Reviewer", confirmed: true, tags: [] },
  update: { confirmed: true },
});
const community = await db.community.upsert({
  where: { slug: SLUG },
  create: {
    slug: SLUG,
    name: "OAuth Review Community",
    tagline: "Test community for the Google OAuth verification of the YouTube live streaming feature.",
    tag: `community:${SLUG}`,
    ownerId: owner.id,
    priceMxn: 99,
    unlisted: true,
    isActive: true,
  },
  update: { ownerId: owner.id, unlisted: true, isActive: true },
});
// Sin membresía: el dueño ya tiene acceso completo, y así los recordatorios de evento (que van a los
// miembros) no le escriben a un correo que no existe.
await db.membership.deleteMany({ where: { communityId: community.id, userId: owner.id } });
// Un evento agendado: con él el anfitrión ve «Iniciar llamada ahora» en Eventos.
if (!(await db.communityEvent.findFirst({ where: { communityId: community.id } }))) {
  const startsAt = new Date("2027-01-29T18:00:00Z");
  await db.communityEvent.create({
    data: { communityId: community.id, title: "Live stream test call", description: "Test session for the OAuth review.", startsAt, endsAt: new Date(startsAt.getTime() + 60 * 60_000) },
  });
}
const token = jwt.sign({ email: EMAIL, action: "magic-link", next: NEXT }, process.env.SECRET, { expiresIn: "60d" });
console.log(`Comunidad: https://www.fixtergeek.com/comunidad/${SLUG}`);
console.log(`Liga del revisor (60 días):\nhttps://www.fixtergeek.com/login?token=${token}`);
await db.$disconnect();
