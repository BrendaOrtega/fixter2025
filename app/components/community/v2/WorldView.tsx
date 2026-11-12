import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { EnterCallButton, describeCall, useNow } from "./call";
import { Icon, type IconName } from "./icons";
import { Avatar, SectionHead, btn } from "./ui";
import type { ClubData, Go } from "./types";
import { VoiceStrip } from "./world/VoiceStrip";
import type { Cartridge, Face, Look, ModeHud, PlaceTarget, WorldSkin, WorldStructure } from "./world/cartridge";
import { getCartridge, hasCartridge } from "./world/cartridges";
import { createWorld, faceFor, type Counts, type PlaceInfo, type RemoteShip, type ShipInfo, type WeaponInfo, type WorldApi } from "./world/engine";
import { createSound, type Sound } from "./world/sound";

// «Mundo»: el club como un lugar que se recorre. Cada miembro con la sección abierta está en el mapa;
// los lugares llevan a las secciones de verdad. La presencia es real y vive en memoria del servidor
// (`/comunidad/:slug/mundo`); se sondea sólo mientras esta sección está montada y la pestaña a la
// vista. Diseño: docs/club-rediseno/mockup-micromundo.html.
//
// El mundo es un cartucho (docs/club-rediseno/MUNDO-CARTUCHOS.md): aquí no hay naves ni planetas,
// sólo el motor, la presencia y los controles. Quien administra el club lo cambia desde el panel y
// el sondeo trae el id activo: si cambia, se desmonta un mundo y se monta el otro sin recargar.
//
// Reglas de producto:
// - Un lugar sólo existe si lleva a algo que funciona (sin grabaciones no hay satélite). Sin datos de ejemplo.
// - Nada flota encima del mapa tapando naves: lo que tienes cerca se atiende en la franja de abajo.
// - ⚠️ El HTML del servidor llega con el cielo, la franja y la lista de lugares: el canvas se enciende al montar.

const POLL_MS = 2500;
/** Volando con teclas el destino cambia todo el tiempo: se avisa más seguido. */
const FLY_MS = 900;
const INTENT_MS = 350;
/** El aspecto elegido se guarda por cartucho (GeekSector conserva la llave de siempre). */
const lookKey = (cartridgeId: string) => (cartridgeId === "geeksector" ? "club-world-ship" : `club-world-look:${cartridgeId}`);
const QUIET_KEY = "club-world-quiet";

type ChatMessage = { id: string; from: string; name: string; text: string; at: number };
type Snapshot = {
  /** Id del mundo activo (los servidores de antes no lo mandan). */
  cartridge?: string;
  count: number; ships: RemoteShip[]; waves: Array<{ id: string; from: string; to: string }>; says?: ChatMessage[]; nudges?: Array<{ id: string; to: string; kind?: "bonk" }>; down?: Array<{ bot: string; back: number }>;
  /** Estado compartido del modo de juego (sólo si el cartucho activo declara llaves). */
  shared?: Record<string, number | string>;
  me: string; waveId?: string | null; sayId?: string | null; nudgeId?: string | null;
};
/** Mismo tope que el servidor (`SAY_MAX_CHARS`). */
const SAY_MAX_CHARS = 140;

function readLook(cartridgeId: string, looks: WorldStructure["looks"]): Look | null {
  try {
    const raw = JSON.parse(localStorage.getItem(lookKey(cartridgeId)) || "null");
    if (!raw) return null;
    return {
      model: looks.models.find((m) => m.id === raw.model)?.id ?? looks.initial.model,
      color: looks.colors.find((c) => c.id === raw.color)?.id ?? looks.initial.color,
      pilot: looks.pilots.find((p) => p.id === raw.pilot)?.id ?? looks.initial.pilot,
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
/** Ícono de cada lugar en la lista del teléfono, según a qué lleva. */
const TARGET_ICON: Record<PlaceTarget, IconName> = { call: "calendar", wall: "wall", recs: "recording", courses: "book", table: "person" };
/** La lista del teléfono sale de la estructura: un renglón por lugar y uno solo para todas las mesas. */
function miniRows(structure: WorldStructure) {
  const rows = structure.places.filter((p) => p.table === null).map((p) => ({ id: p.id, label: p.short, icon: TARGET_ICON[p.target], tables: false }));
  const table = structure.places.find((p) => p.table !== null);
  if (table && structure.tableZone) rows.push({ id: table.id, label: structure.tableZone.name, icon: TARGET_ICON.table, tables: true });
  return rows;
}

export function WorldView({ data, go }: { data: ClubData; go: Go }) {
  const { community, me, event, recordingCount, courseCount } = data;
  const now = useNow();
  const call = event ? describeCall(event, now) : null;
  // El mundo activo: el que trae el loader y, después, el que diga el sondeo (cambia en vivo desde el panel).
  const [cartridgeId, setCartridgeId] = useState(() => getCartridge(community.worldCartridge).id);
  const cartridge: Cartridge = getCartridge(cartridgeId);
  const { structure, copy } = cartridge;
  /** El efecto se está desmontando para montar otro mundo: la presencia se queda (no se manda `leave`). */
  const switchingRef = useRef(false);
  // Lugares que hoy no llevan a nada: no se dibujan ni se listan.
  const hidden = structure.places.filter((p) => (p.target === "recs" && recordingCount === 0) || (p.target === "courses" && courseCount === 0)).map((p) => p.id);
  const hiddenKey = hidden.join(",");

  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<WorldApi | null>(null);
  const soundRef = useRef<Sound | null>(null);
  const faceRef = useRef<Face | null>(null);
  const lookRef = useRef<Look>(structure.looks.initial);
  const sheetOpenRef = useRef(false);
  const expandedRef = useRef(false);
  /** Pide una sincronía pronto (cambió el destino, la mesa o la nave). */
  const dirtyRef = useRef(true);
  const waveRef = useRef<(id: string) => void>(() => {});
  const sayRef = useRef<(text: string) => Promise<boolean>>(async () => false);
  const boxRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const [ready, setReady] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [mini, setMini] = useState(false);
  const [quiet, setQuiet] = useState(false);
  const [look, setLook] = useState<Look>(structure.looks.initial);
  // La skin del cartucho (renderizador, sonidos, dibujos del selector): se carga aparte.
  const [skin, setSkin] = useState<WorldSkin | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [joyOn, setJoyOn] = useState(false);
  const [place, setPlace] = useState<PlaceInfo | null>(null);
  const [ship, setShip] = useState<ShipInfo | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [present, setPresent] = useState<number | null>(null);
  const [myTable, setMyTable] = useState<number | null>(null);
  // Aparato que llevas (cambia tu disparo por unos tiros). `null`: disparo básico.
  const [weapon, setWeapon] = useState<WeaponInfo | null>(null);
  // Amenaza del cartucho (si trae): viene en camino, anda cerca, o nada. Y la cuenta para reaparecer si te destruyó.
  const [threat, setThreat] = useState<"warn" | "here" | null>(null);
  const [threatName, setThreatName] = useState("");
  /** Letrero del modo de juego del cartucho (si trae uno). */
  const [hud, setHud] = useState<ModeHud>(null);
  const [downIn, setDownIn] = useState<number | null>(null);
  // Chat efímero: los mensajes viven ~10 min en memoria del servidor y llegan con el mismo sondeo.
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [voiceOn, setVoiceOn] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
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
    if (!me) return;
    switchingRef.current = false;
    let cancelled = false, stop: (() => void) | null = null;
    // La skin llega con `import()`: un renderizador pesado (three.js) no le cuesta a los demás mundos.
    cartridge.loadSkin().then(
      (loaded) => { if (!cancelled) stop = start(loaded); },
      () => { if (!cancelled) setOffline("No se pudo cargar el Mundo. Recarga la página."); },
    );
    return () => { cancelled = true; stop?.(); };

    function start(skin: WorldSkin) {
    const canvas = canvasRef.current, stage = stageRef.current;
    if (!canvas || !stage || !me) return null;
    setSkin(skin);
    const saved = readLook(cartridge.id, structure.looks);
    const firstLook = saved ?? structure.looks.initial;
    const savedQuiet = readFlag(QUIET_KEY, window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const isCoarse = window.matchMedia("(pointer: coarse)").matches;
    // Sonido: siempre encendido desde el primer gesto; «Tranquilo» es lo único que lo apaga.
    lookRef.current = firstLook;
    setLook(firstLook); setQuiet(savedQuiet); setJoyOn(isCoarse);

    const sound = createSound(!savedQuiet, skin.sounds);
    soundRef.current = sound;
    const unlock = () => sound.unlock();
    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock, true);

    const api = createWorld({
      canvas, stage, cartridge, skin, meId: me.id, meName: me.name, mePhoto: me.photoURL, look: firstLook, quiet: savedQuiet,
      callbacks: {
        onPlace: (p) => { setPlace(p); setMyTable(api.myTable()); },
        onShip: (s) => { setShip(s); setWaved(null); },
        onCounts: setCounts,
        onIntent: () => { dirtyRef.current = true; setMyTable(apiRef.current?.myTable() ?? null); },
        onFirstMove: () => {},
        onSound: (name, other) => sound.play(name, { other }),
        // El robot ya estalló en tu pantalla; el servidor lo deja fuera para todos y regresa cuánto falta para que vuelva.
        onBoom: (id) => { post({ boom: id }).then(apply).catch(() => {}); },
        onWeapon: setWeapon,
        onHud: setHud,
        // Saludo pedido desde un menú de la skin: mismo camino que el botón «Saludar».
        onGreet: (id) => { if (structure.bots.some((b) => b.id === id)) apiRef.current?.waveBot(id); else waveRef.current(id); },
        // El modo de juego propone un valor compartido: el servidor decide y lo aceptado vuelve en el snapshot.
        onShare: (key, value) => { post({ share: { key, value } }).then(apply).catch(() => {}); },
        onThreat: (phase, name) => { setThreat(phase); if (phase) setThreatName(name); },
        // Destruida o de vuelta: los demás lo saben con el siguiente latido (`down`).
        onDown: (seconds) => { setDownIn(seconds); dirtyRef.current = true; },
        onNudge: (id, kind) => {
          // La nave ya tembló en tu pantalla; se avisa para que su dueño también la vea (el servidor acepta una por segundo).
          if (Date.now() - lastNudgeSent < 1000) return;
          lastNudgeSent = Date.now();
          post(kind ? { nudge: id, kind } : { nudge: id }).then((snap) => { if (snap.nudgeId) seenNudges.add(snap.nudgeId); apply(snap); }).catch(() => {});
        },
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
    // vistazo. Sin foto (el bucket da 404) arranca con el del cartucho. Lo que la persona elija manda.
    const face = faceFor(me.id, me.name, me.photoURL);
    faceRef.current = face;
    if (!saved && face.img && structure.looks.pilots.some((p) => p.id === "avatar")) {
      face.img.addEventListener("load", () => {
        if (lookRef.current !== firstLook || !face.img?.naturalWidth) return; // ya eligió otra cosa
        const next = { ...firstLook, pilot: "avatar" };
        lookRef.current = next; setLook(next); api.setLook(next);
      });
    }
    setReady(true);

    // ── Presencia: un solo viaje manda mi nave y trae las demás ──
    const url = `/comunidad/${community.slug}/mundo`;
    const seenWaves = new Set<string>(), seenSays = new Set<string>(), seenNudges = new Set<string>();
    let lastNudgeSent = 0;
    let firstRead = true, busy = false, lastSent = 0, stopped = false;
    const post = async (body: Record<string, unknown>) => {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Sin conexión con el Mundo.");
      return (await res.json()) as Snapshot;
    };
    const apply = (snap: Snapshot) => {
      // Quien administra cambió de mundo: se desmonta éste y se monta el otro. La presencia y el chat se quedan.
      if (snap.cartridge && snap.cartridge !== cartridge.id && hasCartridge(snap.cartridge)) {
        switchingRef.current = true;
        setCartridgeId(snap.cartridge);
        return;
      }
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
      // Cosquillas: varias a la misma nave en una lectura son un solo temblor. Sin texto ni autor.
      const shaken = new Map<string, "bonk" | undefined>();
      for (const n of snap.nudges ?? []) {
        if (seenNudges.has(n.id)) continue;
        seenNudges.add(n.id);
        if (!firstRead) shaken.set(n.to, n.kind ?? shaken.get(n.to));
      }
      for (const [to, kind] of shaken) if (api.showNudge(to, kind)) sound.play(kind ?? "nudge");
      api.setBotsDown(snap.down ?? [], firstRead);
      api.setShared(snap.shared ?? {});
      const says = snap.says ?? [];
      for (const m of says) {
        if (seenSays.has(m.id)) continue;
        seenSays.add(m.id);
        if (firstRead) continue; // lo de antes de que llegaras se lee en el historial, sin burbujas
        api.showSay(m.from, m.text);
        if (m.from !== snap.me) sound.play("msg");
      }
      setMessages((prev) => (prev.length === says.length && prev.at(-1)?.id === says.at(-1)?.id ? prev : says));
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
    sayRef.current = async (text: string) => {
      try {
        const snap = await post({ say: text });
        apply(snap);
        if (!snap.sayId) say("Espera un par de segundos entre mensajes.");
        return !!snap.sayId;
      } catch {
        say("El mensaje no salió. Intenta otra vez.");
        return false;
      }
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
      if (!switchingRef.current) leave();
      sound.destroy();
      soundRef.current = null;
      api.destroy();
      apiRef.current = null;
      // Lo que era de este mundo no pasa al siguiente.
      setReady(false); setSkin(null); setPlace(null); setShip(null); setCounts(null); setWeapon(null); setMyTable(null); setSheetOpen(false); setThreat(null); setDownIn(null); setHud(null);
    };
    }
    // El motor se crea una vez por visita a la sección y por cartucho.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [community.slug, me?.id, cartridge.id]);

  // La sala se enciende con el estado real de la próxima llamada; sin evento queda apagada.
  useEffect(() => {
    const status = { on: !!event?.open, sub: call ? (call.isLive ? "En vivo" : event?.open ? "Abierta" : call.pill.toLowerCase()) : "Sin llamada programada" };
    for (const p of structure.places) if (p.target === "call") apiRef.current?.setPlaceStatus(p.id, status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Con el mapa expandido en el teléfono, el teclado tapa lo fijo al fondo: la caja se ajusta al área visible.
  useEffect(() => {
    const vv = window.visualViewport, box = boxRef.current;
    if (!expanded || !vv || !box) return;
    const fit = () => { box.style.height = `${vv.height}px`; box.style.top = `${vv.offsetTop}px`; box.style.bottom = "auto"; };
    fit();
    vv.addEventListener("resize", fit); vv.addEventListener("scroll", fit);
    return () => { vv.removeEventListener("resize", fit); vv.removeEventListener("scroll", fit); box.style.height = ""; box.style.top = ""; box.style.bottom = ""; };
  }, [expanded]);

  // El historial se queda en el último mensaje.
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [messages]);

  const sendChat = async () => {
    const text = draft.replace(/\s+/g, " ").trim();
    if (!text || sending) return;
    setSending(true);
    if (await sayRef.current(text)) setDraft("");
    // El servidor acepta un mensaje cada 2 s por persona.
    window.setTimeout(() => setSending(false), 2000);
  };

  const changeQuiet = (on: boolean) => {
    setQuiet(on); apiRef.current?.setQuiet(on); saveFlag(QUIET_KEY, on);
    soundRef.current?.setEnabled(!on); // «Tranquilo» también apaga el sonido
    if (!on) soundRef.current?.unlock();
  };
  const changeLook = (patch: Partial<Look>) => {
    const next = { ...look, ...patch };
    setLook(next); lookRef.current = next; apiRef.current?.setLook(next);
    soundRef.current?.play("pick");
    try { localStorage.setItem(lookKey(cartridge.id), JSON.stringify(next)); } catch {}
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
  // Con enemigo cerca y sin aparato (si el cartucho pide aparato para defenderse): se dice qué hacer.
  const needsArm = !!threat && !weapon && !!structure.threat?.needsWeapon;
  const unarmed = needsArm && !!copy.threat?.unarmed;
  const weaponLabel = weapon ? `${weapon.name} · ${copy.uses(weapon.left)}` : copy.basicWeapon;
  const canShoot = !!structure.combat;
  const full = !mini; // mundo completo (incrustado en pantalla ancha, o expandido)

  // ── Lo que tienes cerca: se atiende en la franja, no encima del mapa ──
  let near: { sub: string; action: ReactNode } | null = null;
  if (place) {
    if (place.target === "call") {
      near = event && call
        ? { sub: `${event.title} · ${call.status}`, action: <EnterCallButton event={event} /> }
        : { sub: "No hay llamada programada", action: null };
    } else if (place.target === "wall") {
      near = { sub: "Lo que el club publicó y comentó", action: <button type="button" className={btn} onClick={() => go("wall")}>Entrar al Muro</button> };
    } else if (place.target === "recs") {
      near = { sub: recordingCount === 1 ? "1 grabación de las llamadas" : `${recordingCount} grabaciones de las llamadas`, action: <button type="button" className={btn} onClick={() => go("recs")}>Ver grabaciones</button> };
    } else if (place.target === "courses") {
      near = { sub: courseCount === 1 ? "1 curso incluido en tu membresía" : `${courseCount} cursos incluidos en tu membresía`, action: <button type="button" className={btn} onClick={() => go("courses")}>Entrar a Cursos</button> };
    } else if (place.table !== null) {
      const i = place.table, n = counts?.perTable[i] ?? 0, seats = structure.tables[i]?.seats.length ?? 0;
      near = myTable === i
        ? { sub: `Estás en la mesa · ${Math.max(1, n)} de ${seats}${voiceOn ? "" : " · sin audio"}`, action: <button type="button" className={btn} onClick={() => apiRef.current?.stand()}>Levantarte</button> }
        : n >= seats
          ? { sub: `Mesa llena · ${seats} de ${seats}`, action: <button type="button" className={btn} disabled>Mesa llena</button> }
          : { sub: `${n === 0 ? "Nadie todavía" : `${n} de ${seats} lugares`}${voiceOn ? " · con voz y cámara" : " · sin audio"}`, action: <button type="button" className={btn} onClick={() => apiRef.current?.sit(i)}>Sentarte</button> };
    }
  }

  return (
    <>
      <SectionHead title={`Mundo · ${cartridge.name}`} />
      <div className="p-3 sm:p-4">
        <div
          ref={boxRef}
          className={
            expanded
              ? "fixed inset-0 z-[300] flex flex-col overflow-hidden bg-background lg:flex-row"
              : "relative flex flex-col rounded-xl border border-[#232D33] max-sm:bg-[#141B20] sm:h-[calc(min(72dvh,660px)+240px)] sm:min-h-[680px] sm:overflow-hidden sm:bg-background lg:h-[calc(100dvh-172px)] lg:min-h-[440px] lg:flex-row"
          }
        >
          {/* Columna del mapa. En pantalla ancha el chat va a su derecha, en flujo: el mapa se encoge, no se tapa.
              Más angosto, esta columna «no existe» (contents) y el chat queda debajo, también en flujo. */}
          <div className="max-lg:contents lg:relative lg:flex lg:min-h-0 lg:min-w-0 lg:flex-1 lg:flex-col">
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
              aria-label={copy.lookLabel}
              onClick={() => setSheetOpen((v) => !v)}
              className={`${chip} font-medium text-[#F2F5F4] hover:bg-[#1C252B]`}
            >
              <Icon name="ship" className="h-4 w-4" />
              <span className={expanded ? "max-sm:hidden" : ""}>{copy.lookButton}</span>
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
              {expanded ? "Contraer" : <span>Expandir<span className="sm:hidden">{copy.expandMini}</span></span>}
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
            <div ref={stageRef} style={{ ...cartridge.poster, touchAction: "none" }} className="absolute inset-0 cursor-crosshair bg-background">
              {!ready && <p className="absolute inset-0 grid place-items-center text-sm text-[#7C8A8E]">{copy.loading}</p>}
              {/* Un lienzo por cartucho: cada uno pide su propio contexto (2D o WebGL). */}
              <canvas
                key={cartridge.id}
                ref={canvasRef}
                role="img"
                aria-label={copy.mapLabel}
                className="absolute inset-0 block h-full w-full"
              />
            </div>

            {/* Disparo: cosquillas a las naves de personas (tiemblan) y golpes a las de los robots (estallan y vuelven). Con mouse es clic derecho (o la
                barra espaciadora) y sólo se muestra el aparato que llevas; el botón grande queda para táctil. */}
            {full && ready && !quiet && canShoot && (
              <p className="pointer-events-none absolute bottom-3.5 right-3.5 z-[3] hidden rounded-full border border-[#232D33] bg-[#141B20] px-3 py-1.5 text-xs text-[#7C8A8E] [@media(pointer:fine)]:block">
                {unarmed ? <b className="font-semibold text-[#F4AFAF]">{copy.threat?.unarmed}</b> : <><b className="font-semibold text-brand-500">{weaponLabel}</b> · {copy.shootHint}</>}
              </p>
            )}
            {/* Letrero del modo de juego: fijo arriba a la izquierda, bajo el encabezado; no recibe toques ni tapa la franja de abajo. */}
            {full && ready && hud && (
              <div
                role="status"
                aria-live="polite"
                data-hud
                className="pointer-events-none absolute left-3.5 top-[96px] z-[3] max-w-[min(220px,calc(100%-28px))] rounded-xl border border-[#232D33] bg-[#141B20] px-3 py-2 text-xs text-[#D9E0DE] shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
              >
                <b className="block font-semibold text-brand-500">{hud.title}</b>
                {hud.lines.slice(0, 4).map((line, i) => (
                  <span key={i} className="mt-0.5 block truncate tabular-nums">{line}</span>
                ))}
              </div>
            )}
            {/* Amenaza: aviso antes de que llegue y pista mientras anda cerca. Nadie es destruido sin haber sido avisado. */}
            {full && ready && threat && downIn === null && copy.threat && (
              <p
                role="status"
                aria-live="assertive"
                data-threat={threat}
                className="pointer-events-none absolute left-1/2 top-[58px] z-[4] w-max max-w-[calc(100%-24px)] -translate-x-1/2 rounded-full border border-[#9A5656] bg-[#141B20] px-3.5 py-1.5 text-center text-xs text-[#D9E0DE] shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
              >
                <b className="font-semibold text-[#F4AFAF]">{threat === "warn" ? copy.threat.warning(threatName) : copy.threat.near(threatName)}</b> · {needsArm && copy.threat.arm ? copy.threat.arm : copy.threat.advice}
              </p>
            )}
            {/* Tu nave fue destruida: qué pasó y cuánto falta para volver. El chat y lo demás siguen funcionando. */}
            {ready && downIn !== null && copy.threat && (
              <div className="pointer-events-none absolute inset-0 z-[4] grid place-items-center p-4">
                <div role="status" aria-live="polite" aria-atomic="true" data-down className="rounded-[14px] border border-[#232D33] bg-[#141B20] px-6 py-5 text-center shadow-[0_10px_28px_rgba(0,0,0,0.35)]">
                  <b className="block text-base font-semibold text-[#F2F5F4]">{copy.threat.destroyed}</b>
                  <span className="mt-1 block text-sm tabular-nums text-brand-500">{copy.threat.back(downIn)}</span>
                </div>
              </div>
            )}
            {full && ready && !quiet && canShoot && downIn === null && (
              <button
                type="button"
                data-shoot
                aria-label={`Disparar. Llevas: ${weaponLabel}.`}
                onClick={() => apiRef.current?.shoot()}
                style={{ touchAction: "manipulation" }}
                className="absolute bottom-3.5 right-3.5 z-[3] grid h-[76px] w-[76px] place-content-center justify-items-center gap-px rounded-full border border-[#357265] bg-[#141B20] text-brand-500 shadow-[0_2px_8px_rgba(0,0,0,0.35)] active:bg-[#17302C] sm:h-[68px] sm:w-[68px] [@media(pointer:fine)]:hidden"
              >
                <b className="text-[13px] font-semibold">Disparar</b>
                <small className="text-[10px] text-[#7C8A8E]">{weapon ? `${weapon.name} · ${weapon.left}` : "Básico"}</small>
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

          {/* ── Voz por mesa: va debajo del mapa (arriba los controles flotan sobre él y se encimaban); con la voz apagada no pinta nada para un miembro ── */}
          {me && (
            <VoiceStrip
              slug={community.slug}
              zone={myTable === null ? null : String(myTable)}
              zoneLabel={myTable === null ? undefined : structure.tables[myTable]?.topic}
              blocked={false}
              name={me.name}
              photoURL={me.photoURL}
              onVoiceChange={setVoiceOn}
            />
          )}

          {/* ── Franja de contexto: fuera del lienzo, cambia según lo que tengas cerca ── */}
          <div
            ref={barRef}
            className={`grid grid-cols-[minmax(0,1fr)] gap-2 bg-[#141B20] px-3 py-2 ${
              expanded
                ? "border-t border-[#232D33] pb-[calc(8px+env(safe-area-inset-bottom))]"
                : "max-sm:mx-2.5 max-sm:mb-2.5 max-sm:rounded-[10px] max-sm:border max-sm:border-[#232D33] max-sm:bg-background sm:border-t sm:border-[#232D33]"
            }`}
          >
            <div aria-live="polite" className="flex min-h-[40px] flex-wrap items-center gap-x-5 gap-y-2">
            {!ship && !(place && near) && (
              <p className="text-[13px] text-[#7C8A8E]">
                {copy.hint}
                <span className="hidden lg:inline">{copy.hintKeys}</span>
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
          </div>

          {/* ── Vista reducida (teléfono, sin expandir): lista tocable ── */}
          {!expanded && (
            <div className="order-last px-2.5 pb-2.5 sm:hidden">
              <p className="mx-0.5 mb-2 text-xs text-[#7C8A8E]">{copy.hintMini}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {miniRows(structure).filter((row) => !hidden.includes(row.id)).map((row, i, rows) => {
                  const n = (row.tables ? counts?.tables : counts?.byPlace[row.id]) ?? 0;
                  const here = !!place && (place.id === row.id || (row.tables && place.table !== null));
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
                        <small className="text-[11px] text-[#7C8A8E]">{copy.count(n)}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {sheetOpen && (
            <ShipSheet
              look={look} face={faceRef.current} looks={structure.looks} skin={skin} copy={copy} onChange={changeLook} onClose={() => setSheetOpen(false)}
              toggles={[
                { label: "Modo tranquilo", on: quiet, set: changeQuiet },
                { label: "Joystick en pantalla", on: joyOn, set: setJoyOn },
              ]}
            />
          )}
          </div>

          {/* ── Chat: columna fija a la derecha del mapa (≥1024) o bloque debajo de él; siempre abierto, nunca encimado ── */}
          <aside
            aria-label="Chat del Mundo"
            className={`flex min-h-0 shrink-0 flex-col bg-[#141B20] lg:h-auto lg:w-[320px] lg:border-l lg:border-[#232D33] ${
              expanded
                ? "h-[min(30dvh,240px)] border-t border-[#232D33] pb-[env(safe-area-inset-bottom)] lg:border-t-0"
                : "h-[240px] max-sm:mx-2.5 max-sm:mb-2.5 max-sm:rounded-[10px] max-sm:border max-sm:border-[#232D33] max-sm:bg-background sm:border-t sm:border-[#232D33] lg:border-t-0"
            }`}
          >
            <div className="flex items-baseline justify-between gap-3 border-b border-[#232D33] px-3 py-2">
              <h2 className="text-[13px] font-semibold text-[#F2F5F4]">Chat del Mundo</h2>
              <p className="text-[11px] text-[#7C8A8E]">Se borra a los 10 minutos</p>
            </div>
            <div ref={logRef} role="log" aria-label="Mensajes recientes del Mundo" className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[13px] leading-snug">
              {messages.length === 0 ? (
                <p className="text-[#7C8A8E]">Todavía nadie escribe.</p>
              ) : (
                messages.map((m) => (
                  <p key={m.id} className="break-words py-1 text-[#D9E0DE] [overflow-wrap:anywhere]">
                    <b className="font-semibold text-[#F2F5F4]">{m.from === me?.id ? "Tú" : m.name}:</b> {m.text}
                  </p>
                ))
              )}
            </div>
            {/* Mientras escribes, las teclas no mueven la nave ni disparan (el motor ignora los campos). */}
            <form className="flex items-center gap-2 border-t border-[#232D33] p-2" onSubmit={(e) => { e.preventDefault(); void sendChat(); }}>
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={SAY_MAX_CHARS}
                enterKeyHint="send"
                autoComplete="off"
                aria-label="Escribe un mensaje al Mundo"
                placeholder="Escribe al Mundo…"
                disabled={!ready}
                className="h-10 min-w-0 flex-1 rounded-full border border-[#232D33] bg-background px-3.5 text-base text-[#F2F5F4] placeholder:text-[#7C8A8E] focus:border-brand-500 focus:outline-none sm:text-[13px]"
              />
              <button type="submit" className={btn} disabled={!ready || sending || !draft.trim()}>Enviar</button>
            </form>
          </aside>
        </div>
      </div>
    </>
  );
}

/** Selector de aspecto (modelo, color y piloto del cartucho) y ajustes. Se guarda en este navegador. */
function ShipSheet({ look, face, looks, skin, copy, onChange, onClose, toggles }: {
  look: Look; face: Face | null; looks: WorldStructure["looks"]; skin: WorldSkin | null; copy: Cartridge["copy"];
  onChange: (patch: Partial<Look>) => void; onClose: () => void;
  toggles: Array<{ label: string; on: boolean; set: (on: boolean) => void }>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState(0);
  // Los dibujos salen de la misma skin que pinta el mapa. Ghosty y la foto son imágenes: se repinta cuando cargan.
  useEffect(() => {
    const id = window.setTimeout(() => setTick((t) => t + 1), 400);
    return () => window.clearTimeout(id);
  }, []);
  useEffect(() => {
    ref.current?.querySelectorAll<HTMLCanvasElement>("canvas[data-model], canvas[data-pilot]").forEach((c) => {
      const g = c.getContext("2d");
      if (!g) return;
      g.setTransform(2, 0, 0, 2, 0, 0); g.clearRect(0, 0, 56, 40);
      if (c.dataset.model) skin?.drawOption?.(g, "model", c.dataset.model, look, face);
      else if (c.dataset.pilot) skin?.drawOption?.(g, "pilot", c.dataset.pilot, look, face);
    });
  }, [look, tick, face, skin]);
  // Una lista con una sola opción no se ofrece: no hay nada que elegir.
  const pick = (options: Array<{ id: string; name: string }>) => (options.length > 1 ? options : []);
  const models = pick(looks.models), colors = pick(looks.colors), pilots = pick(looks.pilots);
  const option = (selected: boolean) =>
    `grid justify-items-center gap-0.5 rounded-[10px] border px-0.5 pb-1 pt-1.5 text-[11px] leading-tight ${selected ? "border-brand-500 bg-[#17302C] text-[#F2F5F4]" : "border-[#232D33] bg-background text-[#7C8A8E]"}`;
  return (
    <div ref={ref} role="dialog" aria-label={copy.lookLabel} className="absolute inset-x-2.5 top-[calc(54px+env(safe-area-inset-top))] z-[5] ml-auto max-h-[calc(100%-64px)] max-w-[330px] overflow-y-auto rounded-[14px] border border-[#232D33] bg-[#141B20] p-3.5 shadow-[0_10px_28px_rgba(0,0,0,0.35)]">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#F2F5F4]">{copy.lookTitle}</h2>
        <button type="button" onClick={onClose} className="text-xs font-medium text-[#7C8A8E] underline underline-offset-2 hover:text-[#F2F5F4]">Listo</button>
      </div>
      {models.length > 0 && <p className="mb-1.5 text-xs font-medium text-[#7C8A8E]">{copy.modelLabel}</p>}
      <div className="grid grid-cols-4 gap-1.5">
        {models.map((m) => (
          <button key={m.id} type="button" aria-pressed={look.model === m.id} onClick={() => onChange({ model: m.id })} className={option(look.model === m.id)}>
            <canvas data-model={m.id} width={112} height={80} className="block h-10 w-14" />
            {m.name}
          </button>
        ))}
      </div>
      {colors.length > 0 && <p className="mb-1.5 mt-3 text-xs font-medium text-[#7C8A8E]">{copy.colorLabel}</p>}
      <div className="flex gap-2">
        {colors.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-label={`Color ${c.name}`}
            aria-pressed={look.color === c.id}
            onClick={() => onChange({ color: c.id })}
            style={{ background: skin?.swatch?.(c.id) ?? "#7C8A8E" }}
            className={`h-[30px] w-[30px] rounded-full border-2 border-[#141B20] ${look.color === c.id ? "ring-2 ring-[#F2F5F4]" : "ring-1 ring-[#232D33]"}`}
          />
        ))}
      </div>
      {pilots.length > 0 && <p className="mb-1.5 mt-3 text-xs font-medium text-[#7C8A8E]">{copy.pilotLabel}</p>}
      <div className="grid grid-cols-4 gap-1.5">
        {pilots.map((p) => (
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
