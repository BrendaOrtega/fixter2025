/**
 * Anuncia en el Club de Agentes de IA las tres sesiones en vivo de «Ghosty Anti-Factory» (15-nov-2026):
 * el webinar gratis del 18-nov y las dos sesiones del taller de paga (1 y 3 de diciembre).
 * Lo mismo se puede capturar a mano en /comunidad/club-de-agentes/admin → Eventos.
 *
 *   npx tsx --env-file=.env scripts/club-anti-factory-events.mts            # sólo muestra (dry-run)
 *   npx tsx --env-file=.env scripts/club-anti-factory-events.mts --write    # escribe
 *
 * Es idempotente: un evento con el mismo título y la misma hora de inicio no se vuelve a crear.
 * `CommunityEvent` no tiene campo de gratis/de paga, así que el título lo dice.
 * Las horas van en UTC: 19:00 en CDMX = 01:00 UTC del día siguiente (UTC−6 todo el año).
 */
import { db } from "../app/.server/db";

const write = process.argv.includes("--write");

const EVENTS = [
  {
    title: "Ghosty Anti-Factory · webinar gratis",
    description:
      "Webinar gratis y en vivo: hay formas más simples y efectivas de desarrollar que una fábrica. También se transmite en YouTube y Facebook de FixterGeek. Más información en https://www.ghosty.studio/anti-factory/",
    startsAt: new Date("2026-11-19T01:00:00Z"), // miércoles 18-nov, 19:00 CDMX
    endsAt: new Date("2026-11-19T02:00:00Z"),
  },
  {
    title: "Taller Ghosty Anti-Factory · sesión 1/2 (de paga)",
    description:
      "Primera sesión del taller de paga, de 7 a 9 pm. Inscripción en https://www.fixtergeek.com/anti-factory",
    startsAt: new Date("2026-12-02T01:00:00Z"), // martes 1-dic, 19:00 CDMX
    endsAt: new Date("2026-12-02T03:00:00Z"),
  },
  {
    title: "Taller Ghosty Anti-Factory · sesión 2/2 (de paga)",
    description:
      "Segunda sesión del taller de paga, de 7 a 9 pm. Inscripción en https://www.fixtergeek.com/anti-factory",
    startsAt: new Date("2026-12-04T01:00:00Z"), // jueves 3-dic, 19:00 CDMX
    endsAt: new Date("2026-12-04T03:00:00Z"),
  },
];

const cdmx = (d: Date) =>
  d.toLocaleString("es-MX", { timeZone: "America/Mexico_City", dateStyle: "full", timeStyle: "short" });

const community = await db.community.findUnique({ where: { slug: "club-de-agentes" } });
if (!community) throw new Error("No existe el club");

for (const e of EVENTS) {
  const existing = await db.communityEvent.findFirst({
    where: { communityId: community.id, title: e.title, startsAt: e.startsAt },
    select: { id: true },
  });
  const state = existing ? "ya existe" : write ? "creado" : "se crearía";
  console.log(`${state.padEnd(10)} · ${e.title} · ${cdmx(e.startsAt)} → ${cdmx(e.endsAt)}`);
  if (!existing && write) {
    await db.communityEvent.create({ data: { communityId: community.id, recurrence: null, ...e } });
  }
}
if (!write) console.log("Modo vista. Corre con --write para escribir.");
await db.$disconnect();
