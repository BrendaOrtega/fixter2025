import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { EnterCallButton, describeCall, useNow } from "./call";
import { Icon, type IconName } from "./icons";
import { Avatar, SectionHead, btn } from "./ui";
import type { ClubData, Go } from "./types";
import {
  SHIP_COLORS, SHIP_MODELS, SHIP_PILOTS, createWorld, drawPilot, drawShip, faceFor,
  type Counts, type Face, type Look, type PlaceInfo, type RemoteShip, type ShipInfo, type WorldApi,
} from "./world/engine";
import { createSound, type Sound } from "./world/sound";

// «Mundo»: el club como un pedazo de espacio. Cada miembro con la sección abierta es una nave; los
// lugares llevan a las secciones de verdad. La presencia es real y vive en memoria del servidor
// (`/comunidad/:slug/mundo`); se sondea sólo mientras esta sección está montada y la pestaña a la
// vista. Diseño: docs/club-rediseno/mockup-micromundo.html.
//
// Reglas de producto:
// - Un lugar sólo existe si lleva a algo que funciona (sin grabaciones no hay satélite). Sin datos de ejemplo.
// - Nada flota encima del mapa tapando naves: lo que tienes cerca se atiende en la franja de abajo.
// - ⚠️ El HTML del servidor llega con el cielo, la franja y la lista de lugares: el canvas se enciende al montar.

const POLL_MS = 2500;
/** Volando con teclas el destino cambia todo el tiempo: se avisa más seguido. */
const FLY_MS = 900;
const INTENT_MS = 350;
const LOOK_KEY = "club-world-ship";
const QUIET_KEY = "club-world-quiet";
const DEFAULT_LOOK: Look = { model: "rocket", color: "mint", pilot: "ghosty" };

type Snapshot = { count: number; ships: RemoteShip[]; waves: Array<{ id: string; from: string; to: string }>; me: string; waveId?: string | null };

// Cielo del primer pintado (antes de que arranque el canvas): puntos sólidos con la paleta.
const SKY = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><g fill="#7C8A8E"><circle cx="22" cy="34" r="1"/><circle cx="130" cy="18" r="1.2"/><circle cx="198" cy="92" r="1"/><circle cx="64" cy="150" r="1.2"/><circle cx="172" cy="204" r="1"/><circle cx="96" cy="88" r=".8"/></g><g fill="#85DDCB"><circle cx="210" cy="30" r="1.2"/><circle cx="38" cy="214" r="1.2"/><circle cx="140" cy="140" r="1"/></g><g fill="#F2F5F4"><circle cx="84" cy="48" r="1"/><circle cx="226" cy="168" r="1"/><circle cx="14" cy="118" r=".9"/></g></svg>',
)}")`;

function readLook(): Look | null {
  try {
    const raw = JSON.parse(localStorage.getItem(LOOK_KEY) || "null");
    if (!raw) return null;
    return {
      model: SHIP_MODELS.find((m) => m.id === raw.model)?.id ?? DEFAULT_LOOK.model,
      color: SHIP_COLORS.find((c) => c.id === raw.color)?.id ?? DEFAULT_LOOK.color,
      pilot: SHIP_PILOTS.find((p) => p.id === raw.pilot)?.id ?? DEFAULT_LOOK.pilot,
    };
  } catch {
    return null;
  }
}
const readFlag = (key: string, fallback: boolean) => {
  try { const v = localStorage.getItem(key); return v === null ? fallback : v === "1"; } catch { return fallback; }
};
const saveFlag = (key: string, on: boolean) => { try { localStorage.setItem(key, on ? "1" : "0"); } catch {} };

const chip =
  "inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-full border border-[#232D33] bg-[#141B20] px-3 text-xs text-[#D9E0DE] shadow-[0_2px_8px_rgba(0,0,0,0.35)]";
const switchTrack =
  "relative h-5 w-[34px] shrink-0 rounded-full bg-[#232D33] after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-[#F2F5F4] after:transition-transform peer-checked:bg-brand-500 peer-checked:after:translate-x-3.5 peer-checked:after:bg-background peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-500 motion-reduce:after:transition-none";
const MINI_ROWS: Array<{ id: string; label: string; icon: IconName; key: "live" | "wall" | "recs" | "courses" | "tables" }> = [
  { id: "live", label: "Sala en vivo", icon: "calendar", key: "live" },
  { id: "wall", label: "Muro", icon: "wall", key: "wall" },
  { id: "recs", label: "Grabaciones", icon: "recording", key: "recs" },
  { id: "courses", label: "Cursos", icon: "book", key: "courses" },
  { id: "t1", label: "Mesas del hackatón", icon: "person", key: "tables" },
];

export function WorldView({ data, go }: { data: ClubData; go: Go }) {
  const { community, me, event, recordingCount, courseCount } = data;
  const now = useNow();
  const call = event ? describeCall(event, now) : null;
  // Lugares que hoy no llevan a nada: no se dibujan ni se listan.
  const hiddenKey = [recordingCount > 0 ? "" : "recs", courseCount > 0 ? "" : "courses"].filter(Boolean).join(",");
  const hidden = hiddenKey ? hiddenKey.split(",") : [];

  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<WorldApi | null>(null);
  const soundRef = useRef<Sound | null>(null);
  const faceRef = useRef<Face | null>(null);
  const lookRef = useRef<Look>(DEFAULT_LOOK);
  const sheetOpenRef = useRef(false);
  const expandedRef = useRef(false);
  /** Pide una sincronía pronto (cambió el destino, la mesa o la nave). */
  const dirtyRef = useRef(true);
  const waveRef = useRef<(id: string) => void>(() => {});

  const [ready, setReady] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [mini, setMini] = useState(false);
  const [quiet, setQuiet] = useState(false);
  const [look, setLook] = useState<Look>(DEFAULT_LOOK);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [joyOn, setJoyOn] = useState(false);
  const [place, setPlace] = useState<PlaceInfo | null>(null);
  const [ship, setShip] = useState<ShipInfo | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [present, setPresent] = useState<number | null>(null);
  const [myTable, setMyTable] = useState<number | null>(null);
  const [crystals, setCrystals] = useState(0);
  const [waved, setWaved] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [offline, setOffline] = useState<string | null>(null);

  sheetOpenRef.current = sheetOpen;
  expandedRef.current = expanded;

  const say = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 3200);
  };

  // ── Motor y sonido: sólo en el navegador ──
  useEffect(() => {
    const canvas = canvasRef.current, stage = stageRef.current;
    if (!canvas || !stage || !me) return;
    const saved = readLook();
    const firstLook = saved ?? DEFAULT_LOOK;
    const savedQuiet = readFlag(QUIET_KEY, window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const isCoarse = window.matchMedia("(pointer: coarse)").matches;
    // Sonido: siempre encendido desde el primer gesto; «Tranquilo» es lo único que lo apaga.
    lookRef.current = firstLook;
    setLook(firstLook); setQuiet(savedQuiet); setJoyOn(isCoarse);

    const sound = createSound(!savedQuiet);
    soundRef.current = sound;
    const unlock = () => sound.unlock();
    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock, true);

    const api = createWorld({
      canvas, stage, meId: me.id, meName: me.name, mePhoto: me.photoURL, look: firstLook, quiet: savedQuiet,
      callbacks: {
        onPlace: (p) => { setPlace(p); setMyTable(api.myTable()); },
        onShip: (s) => { setShip(s); setWaved(null); },
        onCounts: setCounts,
        onIntent: () => { dirtyRef.current = true; setMyTable(apiRef.current?.myTable() ?? null); },
        onFirstMove: () => {},
        onSound: (name) => sound.play(name),
        onScore: setCrystals,
        onEnter: () => barRef.current?.querySelector<HTMLButtonElement>("[data-place] button:not(:disabled)")?.click(),
        onEscape: () => { if (sheetOpenRef.current) setSheetOpen(false); else if (expandedRef.current) setExpanded(false); },
        onStageTap: () => { if (!sheetOpenRef.current) return false; setSheetOpen(false); return true; },
      },
    });
    apiRef.current = api;
    // Sólo en desarrollo: las pruebas con dos sesiones leen el motor desde la consola.
    if (import.meta.env.DEV) (window as unknown as { __clubWorld?: WorldApi }).__clubWorld = api;
    const narrow = window.matchMedia("(max-width: 639px)");
    const applyMini = () => { const m = narrow.matches && !expandedRef.current; setMini(m); api.resize(m); };
    applyMini();
    narrow.addEventListener("change", applyMini);

    // «Mi avatar» es el piloto por defecto de quien sí tiene foto: se reconoce a la gente de un
    // vistazo. Sin foto (el bucket da 404) arranca con Ghosty. Lo que la persona elija manda.
    const face = faceFor(me.id, me.name, me.photoURL);
    faceRef.current = face;
    if (!saved && face.img) {
      face.img.addEventListener("load", () => {
        if (lookRef.current !== firstLook || !face.img?.naturalWidth) return; // ya eligió otra cosa
        const next = { ...firstLook, pilot: "avatar" as const };
        lookRef.current = next; setLook(next); api.setLook(next);
      });
    }
    setReady(true);

    // ── Presencia: un solo viaje manda mi nave y trae las demás ──
    const url = `/comunidad/${community.slug}/mundo`;
    const seenWaves = new Set<string>();
    let firstRead = true, busy = false, lastSent = 0, stopped = false;
    const post = async (body: Record<string, unknown>) => {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Sin conexión con el Mundo.");
      return (await res.json()) as Snapshot;
    };
    const apply = (snap: Snapshot) => {
      setOffline(null);
      setPresent(snap.count);
      api.setRemote(snap.ships, snap.me);
      const mine = snap.ships.find((s) => s.id === snap.me);
      if (mine) { api.confirmSeat(mine.table, mine.seat); setMyTable(api.myTable()); }
      for (const w of snap.waves) {
        if (seenWaves.has(w.id)) continue;
        seenWaves.add(w.id);
        if (firstRead) continue; // saludos de antes de que llegaras
        api.showWave(w.from, w.to);
        // Sólo suena el saludo que es para ti; los ajenos se ven, no se oyen.
        if (w.to === snap.me) { sound.play("waveIn"); const who = snap.ships.find((s) => s.id === w.from); if (who) say(`${who.name} te saludó.`); }
      }
      firstRead = false;
    };
    const sync = async () => {
      if (busy || stopped) return;
      busy = true; dirtyRef.current = false; lastSent = Date.now();
      try {
        const { flying: _f, ...mine } = api.myState();
        const l = lookRef.current;
        apply(await post({ ...mine, ship: l.model, color: l.color, pilot: l.pilot }));
      } catch (e) {
        setOffline(e instanceof Error ? e.message : "Sin conexión con el Mundo.");
      } finally { busy = false; }
    };
    waveRef.current = (id: string) => {
      post({ wave: id })
        .then((snap) => { if (snap.waveId) { seenWaves.add(snap.waveId); api.showWave(snap.me, id); } apply(snap); })
        .catch(() => say("El saludo no salió. Intenta otra vez."));
    };
    const tick = () => {
      if (document.visibilityState !== "visible") return; // pestaña oculta: ni latido ni lectura
      const since = Date.now() - lastSent;
      if (since >= POLL_MS || (dirtyRef.current && since >= INTENT_MS) || (api.myState().flying && since >= FLY_MS)) void sync();
    };
    const timer = window.setInterval(tick, 250);
    const onVisible = () => { if (document.visibilityState === "visible") void sync(); };
    document.addEventListener("visibilitychange", onVisible);
    // Sale del mundo sin esperar el vencimiento (al cambiar de sección o al cerrar la página).
    const leave = () => { try { navigator.sendBeacon(url, new Blob([JSON.stringify({ leave: true })], { type: "application/json" })); } catch {} };
    window.addEventListener("pagehide", leave);
    void sync();

    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      narrow.removeEventListener("change", applyMini);
      window.removeEventListener("pagehide", leave);
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
      leave();
      sound.destroy();
      soundRef.current = null;
      api.destroy();
      apiRef.current = null;
    };
    // El motor se crea una vez por visita a la sección.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [community.slug, me?.id]);

  // La sala se enciende con el estado real de la próxima llamada; sin evento queda apagada.
  useEffect(() => {
    apiRef.current?.setStation({ open: !!event?.open, sub: call ? (call.isLive ? "En vivo" : event?.open ? "Abierta" : call.pill.toLowerCase()) : "Sin llamada programada" });
  }, [ready, event?.open, call?.isLive, call?.pill]);

  useEffect(() => { apiRef.current?.setHidden(hiddenKey ? hiddenKey.split(",") : []); }, [ready, hiddenKey]);

  // Expandir es sólo CSS: el canvas y el estado siguen siendo los mismos.
  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    const m = window.matchMedia("(max-width: 639px)").matches && !expanded;
    setMini(m);
    document.body.style.overflow = expanded ? "hidden" : "";
    // Las clases cambian en este mismo pintado; se mide en el siguiente cuadro.
    const id = requestAnimationFrame(() => api.resize(m));
    return () => { cancelAnimationFrame(id); document.body.style.overflow = ""; };
  }, [expanded]);

  const changeQuiet = (on: boolean) => {
    setQuiet(on); apiRef.current?.setQuiet(on); saveFlag(QUIET_KEY, on);
    soundRef.current?.setEnabled(!on); // «Tranquilo» también apaga el sonido
    if (!on) soundRef.current?.unlock();
  };
  const changeLook = (patch: Partial<Look>) => {
    const next = { ...look, ...patch };
    setLook(next); lookRef.current = next; apiRef.current?.setLook(next);
    soundRef.current?.play("pick");
    try { localStorage.setItem(LOOK_KEY, JSON.stringify(next)); } catch {}
  };
  const toggleExpanded = () => { soundRef.current?.unlock(); soundRef.current?.play(expanded ? "collapse" : "expand"); setExpanded((v) => !v); };
  const wave = () => {
    if (!ship) return;
    setWaved(ship.id);
    soundRef.current?.play("waveOut");
    if (ship.isBot) apiRef.current?.waveBot(ship.id); else waveRef.current(ship.id);
    window.setTimeout(() => setWaved((cur) => (cur === ship.id ? null : cur)), 2500);
  };

  // ── Joystick ──
  const knobRef = useRef<HTMLElement>(null);
  const joyMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect(), max = 32;
    let x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
    const d = Math.hypot(x, y); if (d > max) { x *= max / d; y *= max / d; }
    if (knobRef.current) knobRef.current.style.transform = `translate(${x}px, ${y}px)`;
    apiRef.current?.setJoy(x / max, y / max);
  };
  const joyEnd = () => { if (knobRef.current) knobRef.current.style.transform = ""; apiRef.current?.setJoy(0, 0); };

  const people = present ?? counts?.humans ?? 1;
  const full = !mini; // mundo completo (incrustado en pantalla ancha, o expandido)

  // ── Lo que tienes cerca: se atiende en la franja, no encima del mapa ──
  let near: { sub: string; action: ReactNode } | null = null;
  if (place) {
    if (place.kind === "station") {
      near = event && call
        ? { sub: `${event.title} · ${call.status}`, action: <EnterCallButton event={event} /> }
        : { sub: "No hay llamada programada", action: null };
    } else if (place.kind === "planet") {
      near = { sub: "Lo que el club publicó y comentó", action: <button type="button" className={btn} onClick={() => go("wall")}>Entrar al Muro</button> };
    } else if (place.kind === "satellite") {
      near = { sub: recordingCount === 1 ? "1 grabación de las llamadas" : `${recordingCount} grabaciones de las llamadas`, action: <button type="button" className={btn} onClick={() => go("recs")}>Ver grabaciones</button> };
    } else if (place.kind === "base") {
      near = { sub: courseCount === 1 ? "1 curso incluido en tu membresía" : `${courseCount} cursos incluidos en tu membresía`, action: <button type="button" className={btn} onClick={() => go("courses")}>Entrar a Cursos</button> };
    } else if (place.table !== null) {
      const i = place.table, n = counts?.perTable[i] ?? 0;
      near = myTable === i
        ? { sub: `Estás en la mesa · ${Math.max(1, n)} de 4 · sin audio`, action: <button type="button" className={btn} onClick={() => apiRef.current?.stand()}>Levantarte</button> }
        : n >= 4
          ? { sub: "Mesa llena · 4 de 4", action: <button type="button" className={btn} disabled>Mesa llena</button> }
          : { sub: n === 0 ? "Nadie todavía · sin audio" : `${n} de 4 lugares · sin audio`, action: <button type="button" className={btn} onClick={() => apiRef.current?.sit(i)}>Sentarte</button> };
    }
  }

  return (
    <>
      <SectionHead title="Mundo" />
      <div className="p-3 sm:p-4">
        <div
          className={
            expanded
              ? "fixed inset-0 z-[300] flex flex-col overflow-hidden bg-background"
              : "relative flex flex-col rounded-xl border border-[#232D33] max-sm:bg-[#141B20] sm:h-[min(72dvh,660px)] sm:min-h-[440px] sm:overflow-hidden sm:bg-background lg:h-[calc(100dvh-250px)]"
          }
        >
          {/* ── Controles ── */}
          <div
            className={
              expanded
                ? "pointer-events-none absolute inset-x-2.5 top-2.5 z-[3] flex items-center gap-1.5 pt-[env(safe-area-inset-top)] [&>*]:pointer-events-auto"
                : "flex flex-wrap items-center gap-1.5 max-sm:p-2.5 max-sm:pb-0 sm:pointer-events-none sm:absolute sm:inset-x-2.5 sm:top-2.5 sm:z-[3] sm:[&>*]:pointer-events-auto"
            }
          >
            <span className={chip} title="Personas con el Mundo abierto ahora (los robots de la casa no cuentan)">
              <span aria-hidden className="h-[7px] w-[7px] rounded-full bg-brand-500 ring-[3px] ring-[#17302C]" />
              <b className="font-semibold text-[#F2F5F4]">{people}</b>
              <span className="max-sm:sr-only">en el Mundo</span>
            </span>
            <span className="ml-auto" />
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={sheetOpen}
              aria-label="Elegir mi nave y ajustes"
              onClick={() => setSheetOpen((v) => !v)}
              className={`${chip} font-medium text-[#F2F5F4] hover:bg-[#1C252B]`}
            >
              <Icon name="ship" className="h-4 w-4" />
              <span className={expanded ? "max-sm:hidden" : ""}>Mi nave</span>
            </button>
            <label className={`${chip} cursor-pointer ${expanded ? "max-sm:hidden" : ""}`}>
              <input type="checkbox" role="switch" checked={quiet} onChange={(e) => changeQuiet(e.target.checked)} className="peer sr-only" />
              <span aria-hidden className={switchTrack} />
              Tranquilo
            </label>
            <button
              type="button"
              onClick={toggleExpanded}
              className={`${btn} shadow-[0_2px_8px_rgba(0,0,0,0.35)] ${expanded ? "" : "max-sm:min-h-10 max-sm:basis-full"}`}
            >
              <Icon name={expanded ? "collapse" : "expand"} className="h-[15px] w-[15px]" />
              {expanded ? "Contraer" : <span>Expandir<span className="sm:hidden"> el mundo y pilotear</span></span>}
            </button>
          </div>

          {/* ── El mapa ── */}
          <div
            className={
              expanded
                ? "relative min-h-0 flex-1"
                : "relative max-sm:m-2.5 max-sm:aspect-[16/10] max-sm:overflow-hidden max-sm:rounded-[10px] max-sm:border max-sm:border-[#232D33] sm:min-h-0 sm:flex-1"
            }
          >
            <div ref={stageRef} style={{ backgroundImage: SKY, touchAction: "none" }} className="absolute inset-0 cursor-crosshair bg-background">
              {!ready && <p className="absolute inset-0 grid place-items-center text-sm text-[#7C8A8E]">Preparando tu nave…</p>}
              <canvas
                ref={canvasRef}
                role="img"
                aria-label="Mapa del club con las naves de quienes están conectados. Los lugares y las personas cercanas aparecen en la franja de abajo."
                className="absolute inset-0 block h-full w-full"
              />
            </div>

            {/* Disparo: junta cristales (juego local, de esta visita). En teclado es la barra espaciadora. */}
            {full && ready && !quiet && (
              <button
                type="button"
                data-shoot
                aria-label={`Disparar a los cristales. Llevas ${crystals}.`}
                onClick={() => apiRef.current?.shoot()}
                style={{ touchAction: "manipulation" }}
                className="absolute bottom-3.5 right-3.5 z-[3] grid h-[76px] w-[76px] place-content-center justify-items-center gap-px rounded-full border border-[#357265] bg-[#141B20] text-brand-500 shadow-[0_2px_8px_rgba(0,0,0,0.35)] active:bg-[#17302C] sm:h-[68px] sm:w-[68px]"
              >
                <b className="text-[13px] font-semibold">Disparar</b>
                <small className="text-[10px] text-[#7C8A8E]">{crystals === 1 ? "1 cristal" : `${crystals} cristales`}</small>
              </button>
            )}

            {/* Joystick táctil (opcional) */}
            {full && joyOn && (
              <div
                aria-hidden
                onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); joyMove(e); }}
                onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) joyMove(e); }}
                onPointerUp={joyEnd}
                onPointerCancel={joyEnd}
                style={{ touchAction: "none" }}
                className="absolute bottom-3.5 left-3.5 z-[3] h-[104px] w-[104px] rounded-full border border-[#232D33] bg-[rgba(20,27,32,0.82)]"
              >
                <i ref={knobRef} className="absolute left-1/2 top-1/2 -ml-[22px] -mt-[22px] h-11 w-11 rounded-full border border-[#357265] bg-brand-500 shadow-[0_2px_6px_rgba(0,0,0,0.35)]" />
              </div>
            )}

            {(toast || offline) && (
              <p role="status" className="absolute bottom-3 left-1/2 z-[6] w-max max-w-[calc(100%-24px)] -translate-x-1/2 rounded-xl bg-[#F2F5F4] px-3.5 py-2 text-center text-[13px] font-medium text-background shadow-[0_8px_22px_rgba(0,0,0,0.35)]">
                {toast || offline}
              </p>
            )}
          </div>

          {/* ── Franja de contexto: fuera del lienzo, cambia según lo que tengas cerca ── */}
          <div
            ref={barRef}
            aria-live="polite"
            className={`flex min-h-[56px] flex-wrap items-center gap-x-5 gap-y-2 bg-[#141B20] px-3 py-2 ${
              expanded
                ? "border-t border-[#232D33] pb-[calc(8px+env(safe-area-inset-bottom))]"
                : "max-sm:mx-2.5 max-sm:mb-2.5 max-sm:rounded-[10px] max-sm:border max-sm:border-[#232D33] max-sm:bg-background sm:border-t sm:border-[#232D33]"
            }`}
          >
            {!ship && !(place && near) && (
              <p className="text-[13px] text-[#7C8A8E]">
                Acércate a un lugar o a alguien.
                <span className="hidden lg:inline"> Flechas o WASD para volar · clic para ir a un punto · Enter para entrar · Espacio dispara a los cristales.</span>
              </p>
            )}
            {ship && (
              <div className="flex min-w-0 flex-1 basis-[250px] items-center gap-2.5">
                {ship.isBot ? (
                  <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#17302C] text-brand-500"><Icon name="ship" className="h-4 w-4" /></span>
                ) : (
                  <Avatar person={{ id: ship.id, name: ship.name, photoURL: ship.photoURL }} />
                )}
                <div className="min-w-0 flex-1 leading-snug">
                  <b className="block truncate text-[13px] font-semibold text-[#F2F5F4]">{ship.name}</b>
                  <small className="block truncate text-xs text-[#7C8A8E]">{ship.isBot ? ship.note : ship.where}</small>
                </div>
                <button type="button" className={btn} disabled={waved === ship.id} onClick={wave}>
                  {waved === ship.id ? "Saludo enviado" : "Saludar"}
                </button>
              </div>
            )}
            {place && near && (
              <div data-place className="flex min-w-0 flex-1 basis-[250px] items-center gap-2.5">
                <div className="min-w-0 flex-1 leading-snug">
                  <b className="block truncate text-[13px] font-semibold text-[#F2F5F4]">{place.name}</b>
                  <small className="block truncate text-xs text-[#7C8A8E]" suppressHydrationWarning>{near.sub}</small>
                </div>
                {near.action}
              </div>
            )}
          </div>

          {/* ── Vista reducida (teléfono, sin expandir): lista tocable ── */}
          {!expanded && (
            <div className="px-2.5 pb-2.5 sm:hidden">
              <p className="mx-0.5 mb-2 text-xs text-[#7C8A8E]">Toca el mapa o un lugar y tu nave vuela para allá.</p>
              <div className="grid grid-cols-2 gap-1.5">
                {MINI_ROWS.filter((row) => !hidden.includes(row.id)).map((row, i, rows) => {
                  const n = counts?.[row.key] ?? 0;
                  const here = !!place && (place.id === row.id || (row.key === "tables" && place.kind === "table"));
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => apiRef.current?.flyToPlace(row.id)}
                      className={`flex min-h-[46px] items-center gap-2 rounded-[10px] border bg-background px-2.5 py-1.5 text-left ${rows.length % 2 === 1 && i === rows.length - 1 ? "col-span-2" : ""} ${here ? "border-brand-500" : "border-[#232D33]"}`}
                    >
                      <Icon name={row.icon} className="h-[18px] w-[18px] text-brand-500" />
                      <span className="min-w-0">
                        <b className="block text-[13px] font-semibold leading-tight text-[#F2F5F4]">{row.label}</b>
                        <small className="text-[11px] text-[#7C8A8E]">{n === 1 ? "1 nave" : `${n} naves`}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {sheetOpen && (
            <ShipSheet
              look={look} face={faceRef.current} onChange={changeLook} onClose={() => setSheetOpen(false)}
              toggles={[
                { label: "Modo tranquilo", on: quiet, set: changeQuiet },
                { label: "Joystick en pantalla", on: joyOn, set: setJoyOn },
              ]}
            />
          )}
        </div>
      </div>
    </>
  );
}

/** Selector de nave (modelo, color y piloto) y ajustes. Se guarda en este navegador. */
function ShipSheet({ look, face, onChange, onClose, toggles }: {
  look: Look; face: Face | null; onChange: (patch: Partial<Look>) => void; onClose: () => void;
  toggles: Array<{ label: string; on: boolean; set: (on: boolean) => void }>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState(0);
  // Los dibujos salen del mismo motor que el mapa. Ghosty y la foto son imágenes: se repinta cuando cargan.
  useEffect(() => {
    const id = window.setTimeout(() => setTick((t) => t + 1), 400);
    return () => window.clearTimeout(id);
  }, []);
  useEffect(() => {
    ref.current?.querySelectorAll<HTMLCanvasElement>("canvas[data-model], canvas[data-pilot]").forEach((c) => {
      const g = c.getContext("2d");
      if (!g) return;
      g.setTransform(2, 0, 0, 2, 0, 0); g.clearRect(0, 0, 56, 40);
      if (c.dataset.model) drawShip(g, { model: c.dataset.model as Look["model"], color: look.color, pilot: look.pilot, ang: -0.35, thrust: 0.7, face }, 30, 21, 36, 0.4);
      else drawPilot(g, c.dataset.pilot as Look["pilot"], 28, 20, 16, face, c.dataset.pilot === "avatar" ? SHIP_COLORS.find((x) => x.id === look.color)?.fill : undefined);
    });
  }, [look, tick, face]);
  const option = (selected: boolean) =>
    `grid justify-items-center gap-0.5 rounded-[10px] border px-0.5 pb-1 pt-1.5 text-[11px] leading-tight ${selected ? "border-brand-500 bg-[#17302C] text-[#F2F5F4]" : "border-[#232D33] bg-background text-[#7C8A8E]"}`;
  return (
    <div ref={ref} role="dialog" aria-label="Elegir mi nave y ajustes" className="absolute inset-x-2.5 top-[calc(54px+env(safe-area-inset-top))] z-[5] ml-auto max-h-[calc(100%-64px)] max-w-[330px] overflow-y-auto rounded-[14px] border border-[#232D33] bg-[#141B20] p-3.5 shadow-[0_10px_28px_rgba(0,0,0,0.35)]">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#F2F5F4]">Tu nave</h2>
        <button type="button" onClick={onClose} className="text-xs font-medium text-[#7C8A8E] underline underline-offset-2 hover:text-[#F2F5F4]">Listo</button>
      </div>
      <p className="mb-1.5 text-xs font-medium text-[#7C8A8E]">Modelo</p>
      <div className="grid grid-cols-4 gap-1.5">
        {SHIP_MODELS.map((m) => (
          <button key={m.id} type="button" aria-pressed={look.model === m.id} onClick={() => onChange({ model: m.id })} className={option(look.model === m.id)}>
            <canvas data-model={m.id} width={112} height={80} className="block h-10 w-14" />
            {m.name}
          </button>
        ))}
      </div>
      <p className="mb-1.5 mt-3 text-xs font-medium text-[#7C8A8E]">Color</p>
      <div className="flex gap-2">
        {SHIP_COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-label={`Color ${c.name}`}
            aria-pressed={look.color === c.id}
            onClick={() => onChange({ color: c.id })}
            style={{ background: c.fill }}
            className={`h-[30px] w-[30px] rounded-full border-2 border-[#141B20] ${look.color === c.id ? "ring-2 ring-[#F2F5F4]" : "ring-1 ring-[#232D33]"}`}
          />
        ))}
      </div>
      <p className="mb-1.5 mt-3 text-xs font-medium text-[#7C8A8E]">Piloto</p>
      <div className="grid grid-cols-4 gap-1.5">
        {SHIP_PILOTS.map((p) => (
          <button key={p.id} type="button" aria-pressed={look.pilot === p.id} onClick={() => onChange({ pilot: p.id })} className={option(look.pilot === p.id)}>
            <canvas data-pilot={p.id} width={112} height={80} className="block h-10 w-14" />
            {p.name}
          </button>
        ))}
      </div>
      <div className="mt-3.5 grid gap-2.5 border-t border-[#232D33] pt-3">
        {toggles.map((t) => (
          <label key={t.label} className="flex cursor-pointer items-center justify-between gap-3 text-xs text-[#D9E0DE]">
            {t.label}
            <input type="checkbox" role="switch" checked={t.on} onChange={(e) => t.set(e.target.checked)} className="peer sr-only" />
            <span aria-hidden className={switchTrack} />
          </label>
        ))}
      </div>
    </div>
  );
}
