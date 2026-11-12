import { Suspense, useEffect, useState } from "react";
import { Await, Form, useActionData, useFetcher, useNavigation } from "react-router";
import { btn, btnGhost } from "./ui";
import type { ClubData, ClubEvent } from "./types";

// La llamada en vivo en la casa v2: mismos `intent` que la página de hoy (call, rec-start,
// rec-stop), sólo cambia cómo se ve.

const CDMX = "America/Mexico_City";

/** Reloj del cliente. `null` en el servidor y en el primer pintado: nada depende de la hora ahí. */
export function useNow(everyMs = 30_000) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return now;
}

const dayKey = (d: Date | number) => new Date(d).toLocaleDateString("en-CA", { timeZone: CDMX });
const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit", timeZone: CDMX });

/** «2 h 14 min», «3 d 4 h» o «14 min». */
function remaining(ms: number) {
  const totalMin = Math.floor(ms / 60_000);
  if (totalMin < 1) return "menos de un minuto";
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return h > 0 ? `${d} d ${h} h` : `${d} d`;
  if (h > 0) return m > 0 ? `${h} h ${m} min` : `${h} h`;
  return `${m} min`;
}

/** Los textos de una llamada según la hora: etiqueta, cuándo es y qué falta. */
export function describeCall(event: ClubEvent, now: number | null) {
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  const isLive = now !== null && now >= start.getTime() && now < end.getTime();
  // «Hoy» también se decide en el servidor (misma fecha salvo al filo de la medianoche).
  const isToday = dayKey(now ?? Date.now()) === dayKey(start);
  const weekday = start.toLocaleDateString("es-MX", { weekday: "long", timeZone: CDMX });
  const day = start.toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: CDMX });
  const dayLabel = isToday ? "Hoy" : `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${day}`;
  const pill = isLive ? "EN VIVO" : event.open ? "ABIERTA" : `${dayLabel} · ${timeOf(event.startsAt)}`.toUpperCase();
  const status = isLive
    ? "La llamada ya empezó"
    : event.open
      ? `La sala ya está abierta · empieza a las ${timeOf(event.startsAt)}`
      : now === null || now >= start.getTime()
        ? "Se abre 15 minutos antes"
        : `Se abre 15 minutos antes · faltan ${remaining(start.getTime() - now)}`;
  return {
    isLive,
    pill,
    status,
    /** «Hoy · 7:00 p.m. – 10:00 p.m. (CDMX)» */
    when: `${dayLabel} · ${timeOf(event.startsAt)} – ${timeOf(event.endsAt)} (CDMX)`,
    month: start.toLocaleDateString("es-MX", { month: "short", timeZone: CDMX }).replace(".", "").toUpperCase(),
    dayOfMonth: start.toLocaleDateString("es-MX", { day: "numeric", timeZone: CDMX }),
  };
}

/** Hoja de calendario con mes y día. */
export function DateTile({ month, day }: { month: string; day: string }) {
  return (
    <div className="w-11 shrink-0 overflow-hidden rounded-lg border border-[#232D33] bg-[#141B20] text-center" suppressHydrationWarning>
      <span className="block bg-[#1C252B] text-[10px] font-semibold leading-4 tracking-wider text-[#7C8A8E]" suppressHydrationWarning>
        {month}
      </span>
      <span className="block text-[17px] font-bold leading-[26px] text-[#F2F5F4]" suppressHydrationWarning>
        {day}
      </span>
    </div>
  );
}

/** «Entrar a la llamada»: apagado hasta que la sala abre (15 min antes). Pide el ticket al dar clic. */
export function EnterCallButton({
  event,
  label = "Entrar a la llamada",
  block = false,
}: {
  event: ClubEvent;
  label?: string;
  block?: boolean;
}) {
  const navigation = useNavigation();
  const entering = navigation.formData?.get("intent") === "call";
  const actionData = useActionData<{ error?: string }>();
  return (
    <Form method="post" className={block ? "grid gap-1" : "grid justify-items-end gap-1"}>
      <button
        name="intent"
        value="call"
        disabled={!event.open || entering}
        aria-busy={entering}
        className={`${btn} ${block ? "w-full" : ""}`}
      >
        {entering ? "Abriendo la sala…" : label}
      </button>
      {actionData?.error && !entering && (
        <p role="alert" className="max-w-[16rem] text-xs text-[#F08A80]">
          {actionData.error}
        </p>
      )}
    </Form>
  );
}

type RecState = { recording: boolean; busy: boolean; startedAt: string | null } | null;

function RecButton({ rec, block }: { rec: RecState; block: boolean }) {
  const fetcher = useFetcher<{ error?: string }>();
  const busy = fetcher.state !== "idle";
  if (!rec) return <p className="text-xs text-[#7C8A8E]">Grabación: la caja no contestó.</p>;
  const width = block ? "w-full" : "";
  return (
    <fetcher.Form method="post" className={block ? "grid gap-1" : "grid justify-items-end gap-1"}>
      {rec.recording ? (
        <button name="intent" value="rec-stop" disabled={busy} className={`${btnGhost} ${width} border-[#F08A80] text-[#F08A80]`}>
          <span className="h-2 w-2 rounded-full bg-[#F08A80]" />
          {busy ? "Guardando…" : "Grabando · Detener y guardar"}
        </button>
      ) : (
        <button name="intent" value="rec-start" disabled={busy || rec.busy} className={`${btnGhost} ${width}`}>
          <span className="h-2 w-2 rounded-full bg-[#F08A80]" />
          {rec.busy ? "La caja graba otra sala" : busy ? "Arrancando…" : "Grabar"}
        </button>
      )}
      {fetcher.data?.error && (
        <p role="alert" className="max-w-[16rem] text-xs text-[#F08A80]">
          {fetcher.data.error}
        </p>
      )}
    </fetcher.Form>
  );
}

/** «Grabar» del anfitrión: sólo con la llamada abierta. El estado del grabador llega diferido. */
export function HostRecControl({
  rec,
  show,
  block = false,
}: {
  rec: ClubData["rec"];
  show: boolean;
  block?: boolean;
}) {
  if (!show) return null;
  return (
    <Suspense
      fallback={<span aria-busy className={`inline-block h-9 animate-pulse rounded-full border border-[#232D33] ${block ? "w-full" : "w-24"}`} />}
    >
      <Await resolve={rec} errorElement={<RecButton rec={null} block={block} />}>
        {(state) => <RecButton rec={state} block={block} />}
      </Await>
    </Suspense>
  );
}
