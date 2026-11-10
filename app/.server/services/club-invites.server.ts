// Invitados del club (10-nov-2026). bliss invita por correo y el invitado no tiene que hacer nada:
//   - `giftDays`: al entrar con ese correo recibe la membresía de regalo, sin tarjeta.
//   - `callDays`: los días que bliss lo invite a la llamada, entra aunque no pague.
// Se agregan con `scripts/club-invite.mts`.
import { db } from "~/.server/db";
import { isMembershipActive } from "~/.server/services/membership.server";

const DAY_MS = 24 * 60 * 60_000;

/** `YYYYMMDD` del día en CDMX (el mismo que nombra la sala de la llamada). */
export function cdmxDay(d = new Date()): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(d)
      .map((x) => [x.type, x.value])
  );
  return `${p.year}${p.month}${p.day}`;
}

/** Fin del regalo: nunca acorta lo que ya tenía. */
export function giftUntil(current: Date | null | undefined, days: number, now = new Date()) {
  const fresh = new Date(now.getTime() + days * DAY_MS);
  return current && current > fresh ? current : fresh;
}

export function isCallGuestToday(invite: { callDays: string[] } | null | undefined, now = new Date()) {
  return !!invite?.callDays.includes(cdmxDay(now));
}

/**
 * Aplica la invitación de este correo, si hay: regala la membresía una sola vez (sin pisar una
 * pagada vigente) y devuelve la invitación para saber si hoy tiene pase a la llamada.
 */
export async function applyInvite(user: { id: string; email: string }, communityId: string) {
  const invite = await db.communityInvite.findUnique({
    where: { communityId_email: { communityId, email: user.email.trim().toLowerCase() } },
  });
  if (!invite) return null;
  if (invite.giftDays > 0 && !invite.giftAt) {
    const current = await db.membership.findUnique({
      where: { communityId_userId: { communityId, userId: user.id } },
    });
    const paid = current && current.provider !== "grant" && isMembershipActive(current);
    if (!paid) {
      const data = {
        status: "active",
        provider: "grant",
        grantSource: current?.provider === "grant" && current.grantSource ? current.grantSource : "invite",
        currentPeriodEnd: giftUntil(current?.currentPeriodEnd, invite.giftDays),
      };
      await db.membership.upsert({
        where: { communityId_userId: { communityId, userId: user.id } },
        create: { communityId, userId: user.id, ...data },
        update: data,
      });
    }
    await db.communityInvite.update({ where: { id: invite.id }, data: { giftAt: new Date() } });
  }
  return invite;
}
