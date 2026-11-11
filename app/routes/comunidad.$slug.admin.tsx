// Panel del anfitrión de una comunidad (10-nov-2026). Lo que Skool, Circle, Mighty y Kajabi le dan
// al dueño sin pedirle nada a nadie: calendario (con series semanales), grabaciones, invitados y
// miembros. Sólo dueño o ADMIN (`canModerate`). El plan y el contraste con la competencia están en
// docs/comunidad/PLAN.md.
import { useState } from "react";
import { Form, Link, data, redirect, useActionData, useNavigation, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import type { Route } from "./+types/comunidad.$slug.admin";
import { db } from "~/.server/db";
import { Switch } from "~/components/common/Switch";
import { ClubVideo } from "~/components/community/ClubVideo";
import { getUserOrNull } from "~/.server/dbGetters";
import { canModerate } from "~/.server/services/wall.server";
import { occurrencesOf } from "~/.server/services/club-events.server";
import { listRecordings, retryRecording } from "~/.server/services/club-recording.server";
import { cdmxDay, parseEmails, upsertInvites } from "~/.server/services/club-invites.server";
import { isMembershipActive } from "~/.server/services/membership.server";

export const meta = () => [{ title: "Administrar club | FixterGeek" }, { name: "robots", content: "noindex" }];

// México va fijo en UTC−6 (sin horario de verano desde 2022).
const CDMX_OFFSET = "-06:00";
const toCdmxInput = (d: Date) => new Date(d.getTime() - 6 * 3600e3).toISOString().slice(0, 16);
const fromCdmxInput = (v: string) => new Date(`${v}:00${CDMX_OFFSET}`);
const DURATIONS = [60, 90, 120, 180, 240];

async function guard(request: Request, slug: string) {
  const user = await getUserOrNull(request);
  if (!user) throw redirect(`/login?next=/comunidad/${slug}/admin`);
  const community = await db.community.findFirst({
    where: { slug, isActive: true },
    select: { id: true, slug: true, name: true, ownerId: true },
  });
  if (!community) throw data("Comunidad no encontrada", { status: 404 });
  if (!canModerate(user, community)) throw data("Sólo el anfitrión administra el club.", { status: 403 });
  return { user, community };
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { community } = await guard(request, params.slug as string);
  const now = new Date();
  const [events, recordings, members, invites] = await Promise.all([
    db.communityEvent.findMany({ where: { communityId: community.id }, orderBy: { startsAt: "desc" }, take: 100 }),
    listRecordings(community.id, true),
    db.membership.findMany({
      where: { communityId: community.id },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true, status: true, provider: true, grantSource: true, interval: true,
        currentPeriodEnd: true, cancelAtPeriodEnd: true, createdAt: true,
        user: { select: { email: true, displayName: true, username: true } },
      },
    }),
    db.communityInvite.findMany({ where: { communityId: community.id }, orderBy: { createdAt: "desc" }, take: 500 }),
  ]);

  const view = events.map((e) => {
    const next = occurrencesOf(e, now, 1)[0] ?? null;
    return {
      id: e.id,
      title: e.title,
      description: e.description ?? "",
      startsAt: e.startsAt.toISOString(),
      startInput: toCdmxInput(e.startsAt),
      minutes: Math.round((e.endsAt.getTime() - e.startsAt.getTime()) / 60_000),
      weekly: e.recurrence === "weekly",
      untilInput: e.until ? toCdmxInput(e.until).slice(0, 10) : "",
      next: next?.startsAt.toISOString() ?? null,
    };
  });
  // Días con llamada (próximas 8 sesiones) para el pase de invitados.
  const callDays = [...new Set(events.flatMap((e) => occurrencesOf(e, now, 8)).map((o) => o.startsAt.getTime()))]
    .sort()
    .slice(0, 8)
    .map((t) => ({ day: cdmxDay(new Date(t)), label: new Date(t).toISOString() }));
  const titles = Object.fromEntries(events.map((e) => [e.id, e.title]));

  return {
    community: { slug: community.slug, name: community.name },
    events: view,
    callDays,
    recordings: recordings.map((r) => ({ ...r, eventTitle: r.eventId ? titles[r.eventId] ?? null : null })),
    members: members.map((m) => ({
      id: m.id,
      name: m.user.displayName || m.user.username || m.user.email.split("@")[0],
      email: m.user.email,
      active: isMembershipActive(m, now),
      status: m.status,
      source: m.provider === "grant" ? (m.grantSource === "invite" ? "invitado" : "estudiante") : m.provider,
      interval: m.interval,
      until: m.currentPeriodEnd?.toISOString() ?? null,
      cancels: m.cancelAtPeriodEnd,
      joined: m.createdAt.toISOString(),
    })),
    invites: invites.map((i) => ({
      id: i.id,
      email: i.email,
      source: i.source,
      giftDays: i.giftDays,
      used: !!i.giftAt,
      callDays: i.callDays,
    })),
  };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { community } = await guard(request, params.slug as string);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const str = (k: string) => String(form.get(k) ?? "").trim();

  if (intent === "event-save") {
    const title = str("title").slice(0, 140);
    const start = str("startsAt");
    const minutes = Number(str("minutes"));
    if (!title || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(start) || !DURATIONS.includes(minutes)) {
      return data({ error: "Falta el título, la fecha o la duración." }, { status: 400 });
    }
    const startsAt = fromCdmxInput(start);
    const weekly = form.get("weekly") === "on";
    const untilRaw = str("until");
    const until = weekly && /^\d{4}-\d{2}-\d{2}$/.test(untilRaw) ? fromCdmxInput(`${untilRaw}T23:59`) : null;
    if (until && until < startsAt) return data({ error: "«Hasta» no puede ser antes del inicio." }, { status: 400 });
    const fields = {
      title,
      description: str("description").slice(0, 1000) || null,
      startsAt,
      endsAt: new Date(startsAt.getTime() + minutes * 60_000),
      recurrence: weekly ? "weekly" : null,
      until,
    };
    const id = str("id");
    if (id) {
      const r = await db.communityEvent.updateMany({ where: { id, communityId: community.id }, data: fields });
      if (r.count === 0) return data({ error: "Ese evento no existe." }, { status: 404 });
    } else {
      await db.communityEvent.create({ data: { communityId: community.id, ...fields } });
    }
    return { ok: id ? "Evento actualizado." : "Evento creado." };
  }

  if (intent === "event-delete") {
    await db.communityEvent.deleteMany({ where: { id: str("id"), communityId: community.id } });
    return { ok: "Evento borrado." };
  }

  if (intent === "rec-rename") {
    const title = str("title").slice(0, 140);
    if (!title) return data({ error: "El título no puede ir vacío." }, { status: 400 });
    await db.communityRecording.updateMany({ where: { id: str("id"), communityId: community.id }, data: { title } });
    return { ok: "Grabación renombrada." };
  }
  if (intent === "rec-hide" || intent === "rec-unhide") {
    await db.communityRecording.updateMany({
      where: { id: str("id"), communityId: community.id },
      data: { hiddenAt: intent === "rec-hide" ? new Date() : null },
    });
    return { ok: intent === "rec-hide" ? "Grabación oculta." : "Grabación visible para los miembros." };
  }
  // Borra la fila: deja de existir para todos, el anfitrión incluido. Los archivos HLS se quedan
  // en el bucket (no hay limpieza todavía).
  if (intent === "rec-delete") {
    await db.communityRecording.deleteMany({ where: { id: str("id"), communityId: community.id } });
    return { ok: "Grabación borrada." };
  }
  if (intent === "rec-retry") {
    const r = await retryRecording(community.id, str("id"));
    return r.ok ? { ok: "Se volvió a pedir el video a la caja." } : data({ error: r.error }, { status: 502 });
  }

  if (intent === "invite") {
    const emails = parseEmails(str("emails"));
    if (emails.length === 0) return data({ error: "No encontré correos válidos." }, { status: 400 });
    const giftDays = Math.min(365, Math.max(0, Number(str("giftDays")) || 0));
    const callDays = form.getAll("callDays").map(String).filter((d) => /^\d{8}$/.test(d));
    if (!giftDays && callDays.length === 0) {
      return data({ error: "Elige días de regalo o al menos una llamada." }, { status: 400 });
    }
    const n = await upsertInvites(community.id, emails, { source: str("source") || "panel", giftDays, callDays });
    return { ok: `${n} ${n === 1 ? "invitación lista" : "invitaciones listas"}. Se activan cuando entren con ese correo.` };
  }
  if (intent === "invite-delete") {
    await db.communityInvite.deleteMany({ where: { id: str("id"), communityId: community.id } });
    return { ok: "Invitación borrada." };
  }

  return data({ error: "Acción desconocida." }, { status: 400 });
};

// ── UI ───────────────────────────────────────────────────────────────────────

const when = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", {
    weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
    timeZone: "America/Mexico_City",
  });
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Mexico_City" });

const card = "rounded-2xl border border-colorOutline bg-backface p-5";
const input = "w-full rounded-xl border border-colorOutline bg-background px-3 py-2 text-white placeholder:text-colorCaption focus:border-brand-500 focus:outline-none";
const primary = "inline-flex h-11 items-center justify-center rounded-full bg-brand-500 px-6 font-semibold text-brand-900 transition hover:-translate-y-0.5 disabled:opacity-50";
const ghost = "text-sm text-colorCaption underline hover:text-white";

type Tab = "calendario" | "grabaciones" | "invitados" | "miembros";

type EventView = Route.ComponentProps["loaderData"]["events"][number];

function EventForm({ event, onDone }: { event?: EventView; onDone?: () => void }) {
  const nav = useNavigation();
  const [weekly, setWeekly] = useState(event?.weekly ?? true);
  const saving = nav.state !== "idle" && nav.formData?.get("intent") === "event-save";
  return (
    <Form method="post" className="grid gap-3" onSubmit={() => onDone?.()}>
      <input type="hidden" name="intent" value="event-save" />
      {event && <input type="hidden" name="id" value={event.id} />}
      <label className="grid gap-1 text-sm">
        Título
        <input name="title" required maxLength={140} defaultValue={event?.title} className={input} placeholder="Llamada del club: construimos un agente" />
      </label>
      <label className="grid gap-1 text-sm">
        Descripción (sale en el correo y en el calendario)
        <textarea name="description" rows={2} maxLength={1000} defaultValue={event?.description} className={input} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          Inicio (hora de CDMX)
          <input type="datetime-local" name="startsAt" required defaultValue={event?.startInput} className={input} />
        </label>
        <label className="grid gap-1 text-sm">
          Duración
          <select name="minutes" defaultValue={event?.minutes ?? 120} className={input}>
            {DURATIONS.map((m) => (
              <option key={m} value={m}>{m < 120 ? `${m} min` : `${m / 60} h`}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <Switch name="weekly" on={weekly} onChange={setWeekly}>
          Se repite cada semana
        </Switch>
        {weekly && (
          <label className="grid gap-1 text-sm">
            Hasta (opcional)
            <input type="date" name="until" defaultValue={event?.untilInput} className={input} />
          </label>
        )}
      </div>
      <div>
        <button className={primary} disabled={saving}>{saving ? "Guardando…" : event ? "Guardar cambios" : "Crear evento"}</button>
      </div>
    </Form>
  );
}

function Calendar({ events, slug }: { events: EventView[]; slug: string }) {
  const [editing, setEditing] = useState<string | null>(null);
  const upcoming = events.filter((e) => e.next);
  const past = events.filter((e) => !e.next);
  const row = (e: EventView) => (
    <li key={e.id} className={card}>
      {editing === e.id ? (
        <>
          <EventForm event={e} onDone={() => setEditing(null)} />
          <button type="button" onClick={() => setEditing(null)} className={`${ghost} mt-3`}>Cancelar</button>
        </>
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-white">{e.title}</p>
            <p className="mt-1 text-sm text-colorCaption" suppressHydrationWarning>
              {e.weekly ? "🔁 Cada semana · " : ""}
              {e.next ? `Próxima: ${when(e.next)}` : `Fue el ${when(e.startsAt)}`} · {e.minutes} min
              {e.weekly && e.untilInput ? ` · hasta ${e.untilInput}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a href={`/comunidad/${slug}/evento/${e.id}.ics`} className={ghost}>.ics</a>
            <button type="button" onClick={() => setEditing(e.id)} className="text-sm font-semibold text-brand-500 hover:underline">Editar</button>
            <Form method="post" onSubmit={(ev) => { if (!confirm(`¿Borrar «${e.title}»?`)) ev.preventDefault(); }}>
              <input type="hidden" name="id" value={e.id} />
              <button name="intent" value="event-delete" className={ghost}>Borrar evento</button>
            </Form>
          </div>
        </div>
      )}
    </li>
  );
  return (
    <div className="grid gap-8">
      <section className={card}>
        <h2 className="text-lg font-semibold text-white">Nuevo evento</h2>
        <p className="mb-4 mt-1 text-sm text-colorCaption">
          Los miembros lo ven con cuenta regresiva, reciben correo 24 h y 1 h antes y pueden agregarlo a su calendario.
        </p>
        <EventForm key={events.length} />
      </section>
      <section>
        <h2 className="text-lg font-semibold text-white">Próximos</h2>
        {upcoming.length === 0 ? <p className="mt-2 text-sm text-colorCaption">No hay eventos próximos.</p> : <ul className="mt-3 grid gap-3">{upcoming.map(row)}</ul>}
      </section>
      {past.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-white">Pasados</h2>
          <ul className="mt-3 grid gap-3 opacity-70">{past.map(row)}</ul>
        </section>
      )}
    </div>
  );
}

type RecView = Route.ComponentProps["loaderData"]["recordings"][number];

const recStatus: Record<string, string> = {
  recording: "🔴 grabando",
  uploading: "⏳ procesando",
  ready: "✅ lista",
  failed: "⚠️ la subida falló",
};

function Recordings({ recordings, slug }: { recordings: RecView[]; slug: string }) {
  const [renaming, setRenaming] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  if (recordings.length === 0) {
    return <p className="text-colorCaption">Todavía no hay grabaciones. El anfitrión graba con «● Grabar» dentro de la llamada.</p>;
  }
  return (
    <ul className="grid gap-3">
      {recordings.map((r) => (
        <li key={r.id} className={`${card} ${r.hidden ? "opacity-60" : ""}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            {/* Vista previa: se sabe qué se borra antes de borrarlo. */}
            {r.status === "ready" ? (
              <button
                type="button"
                onClick={() => setPlaying(playing === r.id ? null : r.id)}
                className="relative h-20 w-36 shrink-0 overflow-hidden rounded-lg border border-colorOutline bg-black"
                aria-label={`Ver «${r.title}»`}
              >
                {r.poster && <img src={r.poster} alt="" className="h-full w-full object-cover" />}
                <span className="absolute inset-0 grid place-items-center text-2xl text-white">{playing === r.id ? "✕" : "▶"}</span>
              </button>
            ) : (
              <div className="grid h-20 w-36 shrink-0 place-items-center rounded-lg border border-colorOutline text-xs text-colorCaption">
                {recStatus[r.status] ?? r.status}
              </div>
            )}
            <div className="min-w-0 flex-1">
              {renaming === r.id ? (
                <Form method="post" className="flex gap-2" onSubmit={() => setRenaming(null)}>
                  <input type="hidden" name="id" value={r.id} />
                  <input name="title" defaultValue={r.title} maxLength={140} className={input} autoFocus />
                  <button name="intent" value="rec-rename" className="text-sm font-semibold text-brand-500">Guardar</button>
                </Form>
              ) : (
                <p className="font-semibold text-white">{r.title}</p>
              )}
              <p className="mt-1 text-sm text-colorCaption" suppressHydrationWarning>
                {shortDate(r.endedAt)}
                {r.minutes ? ` · ${r.minutes} min` : ""} · {recStatus[r.status] ?? r.status}
                {r.hidden ? " · oculta" : ""}
                {r.eventTitle ? ` · evento «${r.eventTitle}»` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {renaming !== r.id && (
                <button type="button" onClick={() => setRenaming(r.id)} className="text-sm font-semibold text-brand-500 hover:underline">Renombrar</button>
              )}
              {r.canRetry && (
                <Form method="post">
                  <input type="hidden" name="id" value={r.id} />
                  <button name="intent" value="rec-retry" className="text-sm font-semibold text-brand-500 hover:underline">Reintentar</button>
                </Form>
              )}
              <Form method="post">
                <input type="hidden" name="id" value={r.id} />
                <button name="intent" value={r.hidden ? "rec-unhide" : "rec-hide"} className={ghost}>
                  {r.hidden ? "Mostrar" : "Ocultar"}
                </button>
              </Form>
              <Form method="post" onSubmit={(ev) => { if (!confirm(`¿Borrar la grabación «${r.title}»? No se puede deshacer.`)) ev.preventDefault(); }}>
                <input type="hidden" name="id" value={r.id} />
                <button name="intent" value="rec-delete" className="text-sm text-colorCaption underline hover:text-white">Borrar</button>
              </Form>
            </div>
          </div>
          {playing === r.id && (
            <div className="mt-3 overflow-hidden rounded-xl">
              <ClubVideo srcUrl={`/comunidad/${slug}/grabacion/${r.id}`} poster={r.poster} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function Invites({ invites, callDays }: Pick<Route.ComponentProps["loaderData"], "invites" | "callDays">) {
  const nav = useNavigation();
  const saving = nav.state !== "idle" && nav.formData?.get("intent") === "invite";
  return (
    <div className="grid gap-8">
      <section className={card}>
        <h2 className="text-lg font-semibold text-white">Invitar por correo</h2>
        <p className="mb-4 mt-1 text-sm text-colorCaption">
          No tienen que hacer nada: al entrar con ese correo reciben el regalo, y los días marcados entran a la llamada aunque no paguen.
        </p>
        <Form method="post" className="grid gap-3">
          <input type="hidden" name="intent" value="invite" />
          <label className="grid gap-1 text-sm">
            Correos (separados por coma o uno por renglón)
            <textarea name="emails" rows={3} required className={input} placeholder="ana@correo.com, beto@correo.com" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              Días de membresía de regalo
              <select name="giftDays" defaultValue="90" className={input}>
                {[0, 7, 30, 90, 180, 365].map((d) => (
                  <option key={d} value={d}>{d === 0 ? "Sin regalo (sólo llamadas)" : `${d} días`}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              Origen (para tus notas)
              <input name="source" className={input} placeholder="hackaton-nov-2026" />
            </label>
          </div>
          {callDays.length > 0 && (
            <fieldset className="grid gap-2 text-sm">
              <legend className="mb-1">Pase a las llamadas de:</legend>
              <div className="flex flex-wrap gap-3">
                {callDays.map((d) => (
                  <label key={d.day} className="cursor-pointer" suppressHydrationWarning>
                    {/* Ficha que se enciende: el checkbox queda oculto, sólo lleva el valor. */}
                    <input type="checkbox" name="callDays" value={d.day} className="peer sr-only" />
                    <span className="inline-block rounded-full border border-colorOutline px-3 py-1.5 transition peer-checked:border-brand-500 peer-checked:bg-brand-500 peer-checked:text-brand-900 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500">
                      {when(d.label)}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <div>
            <button className={primary} disabled={saving}>{saving ? "Invitando…" : "Invitar"}</button>
          </div>
        </Form>
      </section>
      <section>
        <h2 className="text-lg font-semibold text-white">Invitaciones ({invites.length})</h2>
        <ul className="mt-3 divide-y divide-colorOutline rounded-2xl border border-colorOutline bg-backface">
          {invites.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate text-white">{i.email}</p>
                <p className="text-colorCaption">
                  {i.source}
                  {i.giftDays ? ` · ${i.giftDays} días ${i.used ? "(ya entró)" : "(pendiente)"}` : ""}
                  {i.callDays.length ? ` · llamadas ${i.callDays.map((d) => `${d.slice(6)}/${d.slice(4, 6)}`).join(", ")}` : ""}
                </p>
              </div>
              <Form method="post">
                <input type="hidden" name="id" value={i.id} />
                <button name="intent" value="invite-delete" className={ghost}>Quitar</button>
              </Form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Members({ members }: Pick<Route.ComponentProps["loaderData"], "members">) {
  const active = members.filter((m) => m.active);
  const bySource = active.reduce<Record<string, number>>((acc, m) => ({ ...acc, [m.source]: (acc[m.source] ?? 0) + 1 }), {});
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap gap-2 text-sm">
        <span className="rounded-full border border-brand-500/40 bg-brand-500/10 px-3 py-1 text-brand-500">{active.length} activos</span>
        {Object.entries(bySource).map(([s, n]) => (
          <span key={s} className="rounded-full border border-colorOutline px-3 py-1 text-colorParagraph">{n} {s}</span>
        ))}
        <span className="rounded-full border border-colorOutline px-3 py-1 text-colorCaption">{members.length - active.length} inactivos</span>
      </div>
      <ul className="divide-y divide-colorOutline rounded-2xl border border-colorOutline bg-backface">
        {members.map((m) => (
          <li key={m.id} className={`flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm ${m.active ? "" : "opacity-50"}`}>
            <div className="min-w-0">
              <p className="truncate font-semibold text-white">{m.name}</p>
              <p className="truncate text-colorCaption">{m.email}</p>
            </div>
            <p className="text-right text-colorCaption" suppressHydrationWarning>
              {m.source}
              {m.interval ? ` · ${m.interval === "year" ? "anual" : "mensual"}` : ""}
              {m.until ? ` · ${m.cancels ? "termina" : "hasta"} ${shortDate(m.until)}` : ""}
              <br />
              desde {shortDate(m.joined)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function CommunityAdmin({ loaderData }: Route.ComponentProps) {
  const { community, events, recordings, invites, callDays, members } = loaderData;
  const result = useActionData<{ ok?: string; error?: string }>();
  const [tab, setTab] = useState<Tab>("calendario");
  const tabs: Array<[Tab, string]> = [
    ["calendario", "Calendario"],
    ["grabaciones", `Grabaciones (${recordings.length})`],
    ["invitados", `Invitados (${invites.length})`],
    ["miembros", `Miembros (${members.filter((m) => m.active).length})`],
  ];
  return (
    <main className="min-h-screen bg-background pb-24 pt-28 text-white">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
        <Link to={`/comunidad/${community.slug}`} className="text-sm text-brand-500 hover:underline">← {community.name}</Link>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Administrar club</h1>
        <nav className="mt-6 flex flex-wrap gap-2 border-b border-colorOutline">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition ${tab === key ? "border-brand-500 text-brand-500" : "border-transparent text-colorCaption hover:text-white"}`}
            >
              {label}
            </button>
          ))}
        </nav>
        {result?.ok && <p className="mt-4 rounded-xl border border-brand-500/40 bg-brand-500/10 px-4 py-2 text-sm text-brand-500">{result.ok}</p>}
        {result?.error && <p className="mt-4 rounded-xl border border-danger/50 bg-danger/10 px-4 py-2 text-sm text-white">{result.error}</p>}
        <div className="mt-6">
          {tab === "calendario" && <Calendar events={events} slug={community.slug} />}
          {tab === "grabaciones" && <Recordings recordings={recordings} slug={community.slug} />}
          {tab === "invitados" && <Invites invites={invites} callDays={callDays} />}
          {tab === "miembros" && <Members members={members} />}
        </div>
      </div>
    </main>
  );
}
