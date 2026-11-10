/**
 * Invita gente al Club de Agentes de IA por correo (10-nov-2026). Lo mismo se hace desde el panel
 * del anfitrión: /comunidad/club-de-agentes/admin.
 *
 *   npx tsx --env-file=.env scripts/club-invite.mts --source micro-hackaton-nov-2026 --gift 90 a@x.com b@y.com
 *   npx tsx --env-file=.env scripts/club-invite.mts --source llamada --call 20261117 a@x.com   # pase a una llamada
 *   … --write   para escribir (sin él sólo muestra)
 *
 * --gift N     días de membresía de regalo al entrar con ese correo (sin tarjeta)
 * --call DIA   YYYYMMDD (CDMX) en que entra a la llamada aunque no sea miembro; se puede repetir
 */
import { db } from "../app/.server/db";
import { upsertInvites } from "../app/.server/services/club-invites.server";

const args = process.argv.slice(2);
const write = args.includes("--write");
const take = (flag: string) => {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) if (args[i] === flag && args[i + 1]) out.push(args[++i]);
  return out;
};
const source = take("--source")[0] ?? "manual";
const gift = Number(take("--gift")[0] ?? 0);
const callDays = take("--call");
if (callDays.some((d) => !/^\d{8}$/.test(d))) throw new Error("--call va como YYYYMMDD");
const used = new Set(["--source", "--gift", "--call"]);
const emails = args
  .filter((a, i) => !a.startsWith("--") && !used.has(args[i - 1]))
  .map((e) => e.trim().toLowerCase())
  .filter((e) => /^[^@\s]+@[^@\s]+$/.test(e));

const community = await db.community.findUnique({ where: { slug: "club-de-agentes" } });
if (!community) throw new Error("No existe el club");
console.log(`${emails.length} correos · fuente ${source} · regalo ${gift} días · llamadas ${callDays.join(", ") || "—"}`);
if (!write) {
  console.log(emails.join("\n"));
  console.log("Modo vista. Corre con --write para escribir.");
  process.exit(0);
}
await upsertInvites(community.id, emails, { source, giftDays: gift, callDays });
console.log(`✓ ${emails.length} invitaciones listas`);
await db.$disconnect();
