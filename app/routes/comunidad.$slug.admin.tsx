// Panel del anfitrión de una comunidad (10-nov-2026). Lo que Skool, Circle, Mighty y Kajabi le dan
// al dueño sin pedirle nada a nadie: calendario (con series semanales), grabaciones, invitados y
// miembros. Sólo dueño o ADMIN (`canModerate`). El plan y el contraste con la competencia están en
// docs/comunidad/PLAN.md.
import { useState, type ChangeEvent } from "react";
import { Form, data, redirect, useActionData, useNavigation, useSearchParams, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import type { Route } from "./+types/comunidad.$slug.admin";
import { db } from "~/.server/db";
import { Switch } from "~/components/common/Switch";
import { ClubVideo } from "~/components/community/ClubVideo";
import { CalendarIllustration } from "~/components/community/v2/CalendarIllustration";
import { ClubShell } from "~/components/community/v2/ClubShell";
import { SectionHead, Wrap, btn, btnGhost, card as panel, textLink } from "~/components/community/v2/ui";
import type { View } from "~/components/community/v2/types";
import { CalendarPlus, Eye, EyeOff, Pencil, RotateCw, Trash2, UserMinus } from "lucide-react";
import { getUserOrNull } from "~/.server/dbGetters";
import { avatarUrlFor, canModerate, imageUrlFor } from "~/.server/services/wall.server";
import { occurrencesOf } from "~/.server/services/club-events.server";
import { listRecordings, retryRecording } from "~/.server/services/club-recording.server";
import { cdmxDay, parseEmails, upsertInvites } from "~/.server/services/club-invites.server";
import { isMembershipActive } from "~/.server/services/membership.server";
import { listPastGames, listQuizzes, quizEnabled } from "~/.server/services/club-quiz.server";
import { QuizAdmin } from "~/components/community/QuizAdmin";
import { LiveAdmin } from "~/components/community/LiveAdmin";
import { disconnectYouTube, liveStatus, setYouTubePrivacy } from "~/.server/services/club-live.server";
import { activeCartridge, changeCartridge, hydrateCartridge } from "~/.server/services/club-world.server";
import { CARTRIDGES } from "~/components/community/v2/world/cartridges";
import { VoiceSwitch } from "~/components/community/v2/world/VoiceStrip";

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
    select: { id: true, slug: true, name: true, ownerId: true, quizHostEmails: true, worldCartridge: true },
  });
  if (!community) throw data("Comunidad no encontrada", { status: 404 });
  hydrateCartridge(community.id, community.worldCartridge);
  if (!canModerate(user, community)) throw data("Sólo el anfitrión administra el club.", { status: 403 });
  return { user, community };
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { community, user } = await guard(request, params.slug as string);
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
      imageKey: e.imageKey ?? "",
      imageUrl: e.imageKey ? imageUrlFor(e.imageKey) : null,
      next: next?.startsAt.toISOString() ?? null,
    };
  });
  // Días con llamada (próximas 8 sesiones) para el pase de invitados.
  const callDays = [...new Set(events.flatMap((e) => occurrencesOf(e, now, 8)).map((o) => o.startsAt.getTime()))]
    .sort()
    .slice(0, 8)
    .map((t) => ({ day: cdmxDay(new Date(t)), label: new Date(t).toISOString() }));
  const titles = Object.fromEntries(events.map((e) => [e.id, e.title]));
  // Quiz en vivo: la pestaña sólo existe con el servicio encendido (QUIZ_API_URL).
  const quizOn = quizEnabled();
  const [quizGames, quizzes] = quizOn
    ? await Promise.all([listPastGames(community.id).catch(() => []), listQuizzes(community.id).catch(() => [])])
    : [[], []];

  return {
    community: { slug: community.slug, name: community.name },
    // Lo que pide el cascarón del club (avatar y contador de grabaciones visibles).
    me: {
      id: user.id,
      name: user.displayName || user.username || user.email.split("@")[0],
      photoURL: avatarUrlFor(user),
    },
    recordingCount: recordings.filter((r) => !r.hidden && r.status === "ready").length,
    // Mundo: los cartuchos del registro y cuál está activo en este club.
    world: {
      active: activeCartridge(community.id),
      cartridges: CARTRIDGES.map((c) => ({ id: c.id, name: c.name, description: c.description })),
    },
    // Transmisión: el canal de YouTube conectado (sin tokens: sólo nombre, privacidad y última liga).
    live: await liveStatus(community.id),
    quiz: {
      enabled: quizOn,
      hosts: community.quizHostEmails,
      quizzes: quizzes.map((q) => ({ id: q.id, subject: q.subject, questionCount: q.questionCount })),
      games: quizGames.map((g) => ({
        id: g.id,
        subject: g.subject,
        live: g.status === "live",
        membersOnly: !!g.membersOnly,
        at: g.createdAt.toISOString(),
        // Podio: sólo si la partida se jugó hasta el final.
        top: (Array.isArray(g.results) ? (g.results as Array<{ username: string; points: number; rank: number }>) : []).slice(0, 3),
        players: Array.isArray(g.results) ? g.results.length : 0,
      })),
    },
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
    // Flyer: sólo llaves del prefijo del muro (las entrega /api/wall-image); vacío lo quita.
    const imageKey = str("imageKey");
    if (imageKey && (!imageKey.startsWith("wall/") || imageKey.includes("..") || imageKey.length > 300)) {
      return data({ error: "Esa imagen no es válida. Súbela de nuevo." }, { status: 400 });
    }
    const fields = {
      title,
      imageKey: imageKey || null,
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

  if (intent === "world-cartridge") {
    // `guard` ya dejó pasar sólo a quien administra; el servicio rechaza un id que no esté en el registro.
    const res = await changeCartridge({
      communityId: community.id,
      canManage: true,
      cartridgeId: str("cartridge"),
      save: (worldCartridge) => db.community.update({ where: { id: community.id }, data: { worldCartridge } }),
    });
    if (!res.ok) return data({ error: res.error }, { status: res.status });
    const name = CARTRIDGES.find((c) => c.id === res.cartridge)?.name ?? res.cartridge;
    return { ok: `El Mundo del club ahora es ${name}. Quien lo tenga abierto cambia en unos segundos, sin recargar.` };
  }

  if (intent === "live-privacy") {
    const ok = await setYouTubePrivacy(community.id, str("privacy"));
    return ok ? { ok: "Listo: así saldrá la próxima transmisión." } : data({ error: "No se pudo cambiar." }, { status: 400 });
  }

  if (intent === "live-disconnect") {
    await disconnectYouTube(community.id);
    return { ok: "Canal de YouTube desconectado." };
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

// Mismas piezas que la casa v2 del club (`components/community/v2/ui.tsx`).
const card = `${panel} p-4 lg:p-5`;
const input = "w-full rounded-lg border border-[#232D33] bg-background px-3 py-2 text-sm text-[#F2F5F4] placeholder:text-[#7C8A8E] focus:border-brand-500 focus:outline-none";
const primary = btn;
const ghost = textLink;
// Botón secundario (lo usa la pestaña de quizzes).
const quiet = btnGhost;
// Acciones con ícono: el texto va en `title` (tooltip) y `aria-label`; borrar se pinta rojo al pasar.
const iconBtn = "grid h-8 w-8 place-items-center rounded-md text-[#7C8A8E] transition-colors hover:bg-[#1C252B] hover:text-[#F2F5F4]";
const iconDanger = "grid h-8 w-8 place-items-center rounded-md text-[#7C8A8E] transition-colors hover:bg-[#1C252B] hover:text-[#F08A80]";
const h2 = "text-[15px] font-semibold text-[#F2F5F4]";
const label = "grid gap-1 text-[13px] font-medium text-[#D9E0DE]";

type Tab = "transmision" | "calendario" | "grabaciones" | "invitados" | "miembros" | "mundo" | "quizzes";

type EventView = Route.ComponentProps["loaderData"]["events"][number];

const MAX_FLYER_BYTES = 8 * 1024 * 1024;

/**
 * Portada del evento: la ilustración del calendario, o la imagen/flyer que suba el anfitrión.
 * Sube por /api/wall-image (igual que las fotos del muro) y manda la llave en `imageKey`.
 */
function EventCover({ event }: { event?: EventView }) {
  const [imageKey, setImageKey] = useState(event?.imageKey ?? "");
  const [preview, setPreview] = useState<string | null>(event?.imageUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    if (file.size > MAX_FLYER_BYTES) return setError("La imagen pesa más de 8 MB.");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("fileName", file.name);
      fd.set("type", file.type);
      const res = await fetch("/api/wall-image", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo subir");
      const put = await fetch(json.putURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!put.ok) throw new Error("No se pudo subir");
      setImageKey(json.key);
      setPreview(URL.createObjectURL(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <input type="hidden" name="imageKey" value={imageKey} />
      <div className="grid h-24 w-32 shrink-0 place-items-center overflow-hidden rounded-lg border border-[#232D33] bg-background sm:h-28 sm:w-40">
        {preview ? (
          <img src={preview} alt="Imagen del evento" className="h-full w-full object-cover" />
        ) : (
          <CalendarIllustration className="h-full w-full p-1" />
        )}
      </div>
      <div className="grid min-w-0 gap-1.5">
        <p className="text-[13px] font-medium text-[#D9E0DE]">Imagen o flyer del evento</p>
        <p className="text-xs text-[#7C8A8E]">Opcional. Sin imagen, los miembros ven esta ilustración.</p>
        <div className="flex flex-wrap items-center gap-3">
          <label className={`${btnGhost} cursor-pointer ${uploading ? "pointer-events-none opacity-60" : ""}`}>
            {uploading ? "Subiendo…" : preview ? "Cambiar imagen" : "Subir imagen"}
            <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="sr-only" onChange={onFile} disabled={uploading} />
          </label>
          {preview && (
            <button type="button" className={textLink} onClick={() => { setImageKey(""); setPreview(null); }}>
              Quitar
            </button>
          )}
        </div>
        {error && <p className="text-xs text-[#F08A80]">{error}</p>}
      </div>
    </div>
  );
}

function EventForm({ event, onDone }: { event?: EventView; onDone?: () => void }) {
  const nav = useNavigation();
  const [weekly, setWeekly] = useState(event?.weekly ?? true);
  const saving = nav.state !== "idle" && nav.formData?.get("intent") === "event-save";
  return (
    <Form method="post" className="grid gap-3" onSubmit={() => onDone?.()}>
      <input type="hidden" name="intent" value="event-save" />
      {event && <input type="hidden" name="id" value={event.id} />}
      <EventCover event={event} />
      <label className={label}>
        Título
        <input name="title" required maxLength={140} defaultValue={event?.title} className={input} placeholder="Llamada del club: construimos un agente" />
      </label>
      <label className={label}>
        Descripción (sale en el correo y en el calendario)
        <textarea name="description" rows={2} maxLength={1000} defaultValue={event?.description} className={input} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={label}>
          Inicio (hora de CDMX)
          <input type="datetime-local" name="startsAt" required defaultValue={event?.startInput} className={input} />
        </label>
        <label className={label}>
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
          <label className={label}>
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
          {e.imageUrl && <img src={e.imageUrl} alt="" loading="lazy" className="h-14 w-20 shrink-0 rounded-md border border-[#232D33] object-cover" />}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[#F2F5F4]">{e.title}</p>
            <p className="mt-1 text-sm text-[#7C8A8E]" suppressHydrationWarning>
              {e.weekly ? "🔁 Cada semana · " : ""}
              {e.next ? `Próxima: ${when(e.next)}` : `Fue el ${when(e.startsAt)}`} · {e.minutes} min
              {e.weekly && e.untilInput ? ` · hasta ${e.untilInput}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <a href={`/comunidad/${slug}/evento/${e.id}.ics`} className={iconBtn} title="Agregar al calendario (.ics)" aria-label="Agregar al calendario"><CalendarPlus size={16} /></a>
            <button type="button" onClick={() => setEditing(e.id)} className={iconBtn} title="Editar evento" aria-label="Editar evento"><Pencil size={16} /></button>
            <Form method="post" onSubmit={(ev) => { if (!confirm(`¿Borrar «${e.title}»?`)) ev.preventDefault(); }}>
              <input type="hidden" name="id" value={e.id} />
              <button name="intent" value="event-delete" className={iconDanger} title="Borrar evento" aria-label="Borrar evento"><Trash2 size={16} /></button>
            </Form>
          </div>
        </div>
      )}
    </li>
  );
  return (
    <div className="grid gap-6">
      <section className={card}>
        <h2 className={h2}>Nuevo evento</h2>
        <p className="mb-4 mt-1 text-sm text-[#7C8A8E]">
          Los miembros lo ven con cuenta regresiva, reciben correo 24 h y 1 h antes y pueden agregarlo a su calendario.
        </p>
        <EventForm key={events.length} />
      </section>
      <section>
        <h2 className={h2}>Próximos</h2>
        {upcoming.length === 0 ? <p className="mt-2 text-sm text-[#7C8A8E]">No hay eventos próximos.</p> : <ul className="mt-3 grid gap-3">{upcoming.map(row)}</ul>}
      </section>
      {past.length > 0 && (
        <section>
          <h2 className={h2}>Pasados</h2>
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
    return <p className="text-[#7C8A8E]">Todavía no hay grabaciones. El anfitrión graba con «● Grabar» dentro de la llamada.</p>;
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
                className="relative h-20 w-36 shrink-0 overflow-hidden rounded-lg border border-[#232D33] bg-black"
                aria-label={`Ver «${r.title}»`}
              >
                {r.poster && <img src={r.poster} alt="" className="h-full w-full object-cover" />}
                <span className="absolute inset-0 grid place-items-center text-2xl text-[#F2F5F4]">{playing === r.id ? "✕" : "▶"}</span>
              </button>
            ) : (
              <div className="grid h-20 w-36 shrink-0 place-items-center rounded-lg border border-[#232D33] text-xs text-[#7C8A8E]">
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
                <p className="font-semibold text-[#F2F5F4]">{r.title}</p>
              )}
              <p className="mt-1 text-sm text-[#7C8A8E]" suppressHydrationWarning>
                {shortDate(r.endedAt)}
                {r.minutes ? ` · ${r.minutes} min` : ""} · {recStatus[r.status] ?? r.status}
                {r.hidden ? " · oculta" : ""}
                {r.eventTitle ? ` · evento «${r.eventTitle}»` : ""}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {renaming !== r.id && (
                <button type="button" onClick={() => setRenaming(r.id)} className={iconBtn} title="Renombrar" aria-label="Renombrar"><Pencil size={16} /></button>
              )}
              {r.canRetry && (
                <Form method="post">
                  <input type="hidden" name="id" value={r.id} />
                  <button name="intent" value="rec-retry" className={iconBtn} title="Reintentar la subida" aria-label="Reintentar la subida"><RotateCw size={16} /></button>
                </Form>
              )}
              <Form method="post">
                <input type="hidden" name="id" value={r.id} />
                <button
                  name="intent"
                  value={r.hidden ? "rec-unhide" : "rec-hide"}
                  className={iconBtn}
                  title={r.hidden ? "Mostrar a los miembros" : "Ocultar a los miembros"}
                  aria-label={r.hidden ? "Mostrar a los miembros" : "Ocultar a los miembros"}
                >
                  {r.hidden ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </Form>
              <Form method="post" onSubmit={(ev) => { if (!confirm(`¿Borrar la grabación «${r.title}»? No se puede deshacer.`)) ev.preventDefault(); }}>
                <input type="hidden" name="id" value={r.id} />
                <button name="intent" value="rec-delete" className={iconDanger} title="Borrar grabación" aria-label="Borrar grabación"><Trash2 size={16} /></button>
              </Form>
            </div>
          </div>
          {playing === r.id && (
            <div className="mt-3 overflow-hidden rounded-lg">
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
    <div className="grid gap-6">
      <section className={card}>
        <h2 className={h2}>Invitar por correo</h2>
        <p className="mb-4 mt-1 text-sm text-[#7C8A8E]">
          No tienen que hacer nada: al entrar con ese correo reciben el regalo, y los días marcados entran a la llamada aunque no paguen.
        </p>
        <Form method="post" className="grid gap-3">
          <input type="hidden" name="intent" value="invite" />
          <label className={label}>
            Correos (separados por coma o uno por renglón)
            <textarea name="emails" rows={3} required className={input} placeholder="ana@correo.com, beto@correo.com" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={label}>
              Días de membresía de regalo
              <select name="giftDays" defaultValue="90" className={input}>
                {[0, 7, 30, 90, 180, 365].map((d) => (
                  <option key={d} value={d}>{d === 0 ? "Sin regalo (sólo llamadas)" : `${d} días`}</option>
                ))}
              </select>
            </label>
            <label className={label}>
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
                    <span className="inline-block rounded-full border border-[#232D33] px-3 py-1.5 transition peer-checked:border-brand-500 peer-checked:bg-brand-500 peer-checked:text-background peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500">
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
        <h2 className={h2}>Invitaciones ({invites.length})</h2>
        <ul className="mt-3 divide-y divide-[#232D33] rounded-[10px] border border-[#232D33] bg-[#141B20]">
          {invites.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate text-[#F2F5F4]">{i.email}</p>
                <p className="text-[#7C8A8E]">
                  {i.source}
                  {i.giftDays ? ` · ${i.giftDays} días ${i.used ? "(ya entró)" : "(pendiente)"}` : ""}
                  {i.callDays.length ? ` · llamadas ${i.callDays.map((d) => `${d.slice(6)}/${d.slice(4, 6)}`).join(", ")}` : ""}
                </p>
              </div>
              <Form method="post">
                <input type="hidden" name="id" value={i.id} />
                <button name="intent" value="invite-delete" className={iconDanger} title="Quitar invitación" aria-label="Quitar invitación"><UserMinus size={16} /></button>
              </Form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** El mundo del club es un cartucho: aquí se elige cuál. Un clic lo cambia para todos, en vivo. */
function WorldPicker({ world }: Pick<Route.ComponentProps["loaderData"], "world">) {
  const nav = useNavigation();
  const pending = nav.state !== "idle" && nav.formData?.get("intent") === "world-cartridge" ? String(nav.formData.get("cartridge")) : null;
  return (
    <section className="grid gap-3">
      <div>
        <h2 className={h2}>Mundo del club</h2>
        <p className="mt-1 text-[13px] text-[#7C8A8E]">
          Elige el mundo que ven tus miembros. El cambio llega en unos segundos a quien lo tenga abierto, sin recargar; el chat y quién está presente se conservan.
        </p>
      </div>
      <Form method="post" className="grid gap-2 sm:grid-cols-2">
        <input type="hidden" name="intent" value="world-cartridge" />
        {world.cartridges.map((c) => {
          const active = c.id === world.active;
          return (
            <button
              key={c.id}
              name="cartridge"
              value={c.id}
              disabled={active || pending !== null}
              aria-pressed={active}
              className={`grid gap-1 rounded-[10px] border p-4 text-left transition-colors disabled:cursor-default ${active ? "border-brand-500 bg-[#17302C]" : "border-[#232D33] bg-[#141B20] hover:bg-[#1C252B]"}`}
            >
              <span className="flex items-center justify-between gap-3">
                <b className="text-[15px] font-semibold text-[#F2F5F4]">{c.name}</b>
                <span className={`shrink-0 text-xs font-medium ${active ? "text-brand-500" : "text-[#7C8A8E]"}`}>
                  {active ? "Activo" : pending === c.id ? "Cambiando…" : "Usar este mundo"}
                </span>
              </span>
              <span className="text-[13px] leading-snug text-[#7C8A8E]">{c.description}</span>
            </button>
          );
        })}
      </Form>
    </section>
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
          <span key={s} className="rounded-full border border-[#232D33] px-3 py-1 text-[#D9E0DE]">{n} {s}</span>
        ))}
        <span className="rounded-full border border-[#232D33] px-3 py-1 text-[#7C8A8E]">{members.length - active.length} inactivos</span>
      </div>
      <ul className="divide-y divide-[#232D33] rounded-[10px] border border-[#232D33] bg-[#141B20]">
        {members.map((m) => (
          <li key={m.id} className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm ${m.active ? "" : "opacity-50"}`}>
            <div className="min-w-0">
              <p className="truncate font-semibold text-[#F2F5F4]">{m.name}</p>
              <p className="truncate text-[#7C8A8E]">{m.email}</p>
            </div>
            <p className="text-right text-[#7C8A8E]" suppressHydrationWarning>
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

const CLUB_TABS: Record<View, string> = { world: "", wall: "?tab=wall", events: "?tab=events", recs: "?tab=recs", courses: "?tab=courses", me: "?tab=me" };
const TABS: Tab[] = ["transmision", "calendario", "grabaciones", "invitados", "miembros", "mundo", "quizzes"];

export default function CommunityAdmin({ loaderData }: Route.ComponentProps) {
  const { community, me, live, recordingCount, events, recordings, invites, callDays, members, quiz, world } = loaderData;
  const result = useActionData<{ ok?: string; error?: string }>();
  // La pestaña vive en `?tab=`: se puede ligar directo («Editar» de la próxima llamada → calendario).
  const [params, setParams] = useSearchParams();
  const asked = params.get("tab") as Tab;
  const tab: Tab = TABS.includes(asked) && (asked !== "quizzes" || quiz.enabled) ? asked : "calendario";
  const tabs: Array<[Tab, string]> = [
    ["calendario", "Calendario"],
    ["grabaciones", `Grabaciones (${recordings.length})`],
    ["transmision", "Transmisión"],
    ["invitados", `Invitados (${invites.length})`],
    ["miembros", `Miembros (${members.filter((m) => m.active).length})`],
    ["mundo", "Mundo"],
    ...(quiz.enabled ? ([["quizzes", "Quizzes"]] as Array<[Tab, string]>) : []),
  ];
  return (
    <ClubShell
      community={community}
      me={me}
      canMod
      recordingCount={recordingCount}
      current="admin"
      navProps={(view) => ({ href: `/comunidad/${community.slug}${CLUB_TABS[view]}` })}
    >
      <SectionHead title="Administrar club" />
      <nav aria-label="Secciones del panel" className="flex gap-1 overflow-x-auto border-b border-[#232D33] bg-[#141B20] px-3 lg:px-5">
        {tabs.map(([key, text]) => (
          <button
            key={key}
            type="button"
            aria-current={tab === key ? "page" : undefined}
            onClick={() => setParams(key === "calendario" ? {} : { tab: key }, { replace: true, preventScrollReset: true })}
            className="-mb-px shrink-0 whitespace-nowrap border-b-2 border-transparent px-2.5 py-2.5 text-[13px] font-medium text-[#7C8A8E] hover:text-[#F2F5F4] aria-[current=page]:border-brand-500 aria-[current=page]:text-[#F2F5F4]"
          >
            {text}
          </button>
        ))}
      </nav>
      <Wrap>
        {result?.ok && <p className="mb-4 rounded-lg bg-[#17302C] px-3.5 py-2 text-[13px] text-brand-500">{result.ok}</p>}
        {result?.error && <p className="mb-4 rounded-lg border border-[#232D33] px-3.5 py-2 text-[13px] text-[#F08A80]">{result.error}</p>}
        {tab === "calendario" && <Calendar events={events} slug={community.slug} />}
        {tab === "grabaciones" && <Recordings recordings={recordings} slug={community.slug} />}
        {tab === "transmision" && <LiveAdmin slug={community.slug} live={live} result={params.get("live")} detail={params.get("detail")} />}
        {tab === "invitados" && <Invites invites={invites} callDays={callDays} />}
        {tab === "miembros" && <Members members={members} />}
        {tab === "mundo" && (
          <div className="grid gap-4">
            <WorldPicker world={world} />
            {/* Voz por mesa: interruptor de la comunidad (apagado por defecto). */}
            <VoiceSwitch slug={community.slug} />
          </div>
        )}
        {tab === "quizzes" && <QuizAdmin slug={community.slug} quizzes={quiz.quizzes} games={quiz.games} hosts={quiz.hosts} />}
      </Wrap>
    </ClubShell>
  );
}
