// Calendario del club (10-nov-2026). El anfitrión crea eventos desde /comunidad/:slug/admin; un
// evento puede repetirse cada semana hasta una fecha. Aquí viven las cuentas puras (sesiones de una
// serie, archivo .ics, qué recordatorio toca) y el envío de recordatorios por correo.
//
// México no tiene horario de verano desde 2022: sumar 7 × 24 h cae siempre a la misma hora en CDMX.
import { db } from "~/.server/db";
import { isMembershipActive } from "~/.server/services/membership.server";
import { cdmxDay } from "~/.server/services/club-invites.server";
import { sendSesEmailDirect } from "~/utils/sesTransport";
import { emailButton, wrapEmailHtml } from "~/utils/emailShell";
import { escapeHtml } from "~/utils/escapeHtml";

const WEEK_MS = 7 * 24 * 60 * 60_000;
const HOUR_MS = 60 * 60_000;
const REMINDER_FROM = "FixterGeek <noreply@fixtergeek.com>";
const SITE = "https://www.fixtergeek.com";

export type ClubEvent = {
  id: string;
  title: string;
  description?: string | null;
  startsAt: Date;
  endsAt: Date;
  recurrence?: string | null;
  until?: Date | null;
  imageKey?: string | null;
  goingFor?: string[] | null;
};

/** Una sesión concreta de un evento (en una serie, la de esa semana). */
export type Occurrence = { id: string; title: string; description: string | null; startsAt: Date; endsAt: Date; imageKey?: string; going?: string[] };

/** Sesiones del evento que terminan después de `from`, hasta `limit`. */
export function occurrencesOf(e: ClubEvent, from: Date, limit = 1): Occurrence[] {
  const dur = e.endsAt.getTime() - e.startsAt.getTime();
  // Quién confirmó esa sesión (ids de usuario), sólo si hay alguien.
  const goingAt = (start: number) => {
    const prefix = `${new Date(start).toISOString()}|`;
    return (e.goingFor ?? []).filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length));
  };
  const at = (start: number): Occurrence => ({
    id: e.id,
    title: e.title,
    description: e.description ?? null,
    startsAt: new Date(start),
    endsAt: new Date(start + dur),
    // Flyer del evento, sólo si tiene.
    ...(e.imageKey ? { imageKey: e.imageKey } : {}),
    ...(goingAt(start).length ? { going: goingAt(start) } : {}),
  });
  if (e.recurrence !== "weekly") return e.endsAt > from ? [at(e.startsAt.getTime())] : [];
  // Primera semana cuya sesión todavía no termina.
  const first = e.startsAt.getTime();
  const k = Math.max(0, Math.ceil((from.getTime() - dur - first) / WEEK_MS));
  const out: Occurrence[] = [];
  for (let i = k; out.length < limit; i++) {
    const start = first + i * WEEK_MS;
    if (e.until && start > e.until.getTime()) break;
    if (start + dur > from.getTime()) out.push(at(start));
  }
  return out;
}

/** La siguiente sesión (o la que está en curso) entre todos los eventos. */
export function nextOccurrence(events: ClubEvent[], now = new Date()): Occurrence | null {
  return (
    events
      .flatMap((e) => occurrencesOf(e, now, 1))
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0] ?? null
  );
}

/** Eventos que todavía pueden tener sesiones (sencillos que no terminan o series). */
export async function activeEvents(communityId: string, now = new Date()) {
  return db.communityEvent.findMany({
    where: { communityId, OR: [{ endsAt: { gt: now } }, { recurrence: "weekly" }] },
    orderBy: { startsAt: "asc" },
  });
}

export async function getNextOccurrence(communityId: string, now = new Date()) {
  return nextOccurrence(await activeEvents(communityId, now), now);
}

/**
 * «Voy» / «ya no voy» a una sesión. Regresa si quedó confirmado, o `null` si el evento no existe.
 * Se escribe el arreglo completo (leer y guardar): con decenas de miembros el choque de dos
 * clics simultáneos es improbable y, si pasa, basta volver a dar clic.
 */
export async function toggleGoing(communityId: string, eventId: string, sessionStart: Date, userId: string) {
  const e = await db.communityEvent.findFirst({ where: { id: eventId, communityId }, select: { goingFor: true } });
  if (!e) return null;
  const key = `${sessionStart.toISOString()}|${userId}`;
  const current = e.goingFor ?? [];
  const going = !current.includes(key);
  // De paso se tiran las confirmaciones de sesiones que ya pasaron hace más de un día.
  const cutoff = Date.now() - 24 * HOUR_MS;
  const kept = current.filter((k) => k !== key && new Date(k.split("|")[0]).getTime() > cutoff);
  await db.communityEvent.update({ where: { id: eventId }, data: { goingFor: { set: going ? [...kept, key] : kept } } });
  return going;
}

// ── .ics ─────────────────────────────────────────────────────────────────────

const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (t: string) => t.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (m) => `\\${m}`);

/** Archivo para «Agregar a mi calendario». En una serie lleva su RRULE semanal. */
export function buildIcs(e: ClubEvent, url: string, now = new Date()) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FixterGeek//Club//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.id}@fixtergeek.com`,
    `DTSTAMP:${icsDate(now)}`,
    `DTSTART:${icsDate(e.startsAt)}`,
    `DTEND:${icsDate(e.endsAt)}`,
    ...(e.recurrence === "weekly" ? [`RRULE:FREQ=WEEKLY${e.until ? `;UNTIL=${icsDate(e.until)}` : ""}`] : []),
    `SUMMARY:${icsText(e.title)}`,
    `DESCRIPTION:${icsText(`${e.description ? `${e.description}\n\n` : ""}Entra desde ${url}`)}`,
    `URL:${url}`,
    `LOCATION:${url}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsText(e.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.join("\r\n")}\r\n`;
}

// ── Recordatorios ────────────────────────────────────────────────────────────

export type ReminderKind = "24h" | "1h";

// Con menos de 2 h por delante el aviso anticipado quedaría pegado al de 1 h: ya no sale.
const ADVANCE_MIN_LEFT_MS = 2 * HOUR_MS;

/**
 * Qué recordatorio toca para una sesión. Hay dos avisos y cada uno sale una sola vez:
 * - Anticipado (llave `|24h`): entre 24 h y 2 h antes. Normalmente sale un día antes; si el evento
 *   se creó con menos de 24 h, sale en cuanto se crea y el correo dice «hoy» o «mañana» según el
 *   día real en CDMX (ver `reminderEmail`).
 * - De 1 h (llave `|1h`): en la última hora.
 * Entre 2 h y 1 h antes no sale nada nuevo: un evento creado a 90 min sólo recibe el de 1 h.
 * Nunca después de empezar.
 */
export function dueReminder(startsAt: Date, sent: string[], now = new Date()): ReminderKind | null {
  const left = startsAt.getTime() - now.getTime();
  if (left <= 0) return null;
  const key = (k: ReminderKind) => `${startsAt.toISOString()}|${k}`;
  if (left <= HOUR_MS) return sent.includes(key("1h")) ? null : "1h";
  if (left <= ADVANCE_MIN_LEFT_MS || left > 24 * HOUR_MS) return null;
  return sent.includes(key("24h")) ? null : "24h";
}

/** Miembros activos más los invitados con pase a la llamada de ese día. */
async function recipients(community: { id: string; ownerId: string }, day: string) {
  const members = await db.membership.findMany({
    where: { communityId: community.id, status: { in: ["active", "past_due"] } },
    select: { status: true, currentPeriodEnd: true, user: { select: { email: true, displayName: true } } },
  });
  const guests = await db.communityInvite.findMany({
    where: { communityId: community.id, callDays: { has: day } },
    select: { email: true },
  });
  const out = new Map<string, string | null>();
  for (const m of members) {
    if (m.user?.email && isMembershipActive(m)) out.set(m.user.email.toLowerCase(), m.user.displayName ?? null);
  }
  for (const g of guests) if (!out.has(g.email)) out.set(g.email, null);
  return [...out.entries()];
}

const CDMX = "America/Mexico_City";

/**
 * «7:00 p.m.» en CDMX, como en el sitio. Se arma a mano: `toLocaleString("es-MX")` da «19:00» o
 * «7:00 p.m.» según la versión de ICU del servidor (en producción salió «19:00»).
 */
export function clockText(d: Date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: CDMX })
      .formatToParts(d)
      .map((x) => [x.type, x.value])
  );
  return `${p.hour}:${p.minute}\u00a0${p.dayPeriod === "AM" ? "a.m." : "p.m."}`;
}

/** «jueves, 12 de noviembre, 7:00 p.m.» */
const whenText = (d: Date) =>
  `${d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", timeZone: CDMX })}, ${clockText(d)}`;

/**
 * Encabezado y asunto según lo que de verdad falta al momento de enviar: «mañana» sólo si la sesión
 * cae en el día siguiente de CDMX, «hoy» si es el mismo día, y los minutos reales en el de 1 h.
 */
export function reminderLead(startsAt: Date, kind: ReminderKind, now = new Date()) {
  const time = clockText(startsAt);
  if (kind === "1h") {
    const minutes = Math.max(1, Math.round((startsAt.getTime() - now.getTime()) / 60_000));
    // El trabajo corre cada 10 min: lo normal es que falten entre 50 y 60.
    if (minutes >= 45) return { heading: "En una hora empezamos", subject: "En 1 hora" };
    const span = minutes === 1 ? "1 minuto" : `${minutes} minutos`;
    return { heading: `En ${span} empezamos`, subject: `En ${span}` };
  }
  if (cdmxDay(startsAt) === cdmxDay(now)) {
    return { heading: `Hoy hay llamada a las ${time}`, subject: `Hoy a las ${time}` };
  }
  if (cdmxDay(startsAt) === cdmxDay(new Date(now.getTime() + 24 * HOUR_MS))) {
    return { heading: "Mañana hay llamada", subject: "Mañana" };
  }
  // No debería pasar (el aviso sale a 24 h o menos); por si acaso, la fecha completa.
  return { heading: "Se acerca la llamada", subject: "Próxima llamada" };
}

export function reminderEmail(
  o: Pick<Occurrence, "id" | "title" | "description" | "startsAt">,
  kind: ReminderKind,
  community: { name: string; slug: string },
  name: string | null,
  now = new Date()
) {
  const url = `${SITE}/comunidad/${community.slug}`;
  const ics = `${SITE}/comunidad/${community.slug}/evento/${o.id}.ics`;
  const { heading, subject } = reminderLead(o.startsAt, kind, now);
  const inner = `
    <h1 style="margin:0 0 12px 0;font-size:22px;">${name ? `${escapeHtml(name)}, ` : ""}${name ? heading.charAt(0).toLowerCase() + heading.slice(1) : heading}</h1>
    <p style="margin:0 0 8px 0;"><strong>${escapeHtml(o.title)}</strong></p>
    <p style="margin:0 0 16px 0;">${escapeHtml(whenText(o.startsAt))} (hora de CDMX).</p>
    ${o.description ? `<p style="margin:0 0 16px 0;">${escapeHtml(o.description)}</p>` : ""}
    <div style="text-align:center;margin:24px 0;">${emailButton(kind === "1h" ? "Ir a la llamada" : "Ver en el club", url)}</div>
    <p style="margin:0;font-size:13px;">El botón para entrar se enciende 15 minutos antes. <a href="${ics}">Agregar a mi calendario</a>.</p>`;
  return {
    subject: `${subject}: ${o.title}`,
    // El pie del cascarón dice «Cancelar suscripción», pero este aviso no tiene baja propia: la liga
    // va al club, así que el texto dice eso.
    htmlBody: wrapEmailHtml(inner, { preheader: `${o.title} · ${whenText(o.startsAt)}`, promoFooter: false })
      .replace(/\{\{unsubscribe\}\}/g, url)
      .replace("Cancelar suscripción", `Recibes este aviso por ser parte de ${escapeHtml(community.name)} · Abrir el club`),
  };
}

/**
 * Manda los recordatorios que tocan en todas las comunidades de pago. La marca se escribe ANTES de
 * enviar y sólo si nadie más la puso (Agenda puede correr en dos máquinas): un recordatorio puede
 * perderse si SES falla, pero nunca sale dos veces.
 */
export async function sendDueReminders(now = new Date()) {
  const communities = await db.community.findMany({
    where: { isActive: true, priceMxn: { not: null } },
    select: { id: true, slug: true, name: true, ownerId: true },
  });
  let sent = 0;
  for (const c of communities) {
    for (const e of await activeEvents(c.id, now)) {
      const o = occurrencesOf(e, now, 1)[0];
      if (!o) continue;
      const kind = dueReminder(o.startsAt, e.remindedFor, now);
      if (!kind) continue;
      const key = `${o.startsAt.toISOString()}|${kind}`;
      const claimed = await db.communityEvent.updateMany({
        where: { id: e.id, NOT: { remindedFor: { has: key } } },
        data: { remindedFor: { push: key } },
      });
      if (claimed.count === 0) continue;
      for (const [email, name] of await recipients(c, cdmxDay(o.startsAt))) {
        // La hora real de cada envío, no la del arranque del trabajo.
        const msg = reminderEmail(o, kind, c, name, new Date());
        await sendSesEmailDirect({ to: email, from: REMINDER_FROM, ...msg }).then(
          () => sent++,
          (err) => console.error("Recordatorio del club falló", email, err)
        );
        await new Promise((r) => setTimeout(r, 120));
      }
    }
  }
  return { sent };
}
