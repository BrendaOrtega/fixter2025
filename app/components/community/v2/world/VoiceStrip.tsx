// Voz en las mesas del «Mundo»: tira de cámaras de quienes están sentados en tu mesa.
// Autocontenida: sondea el interruptor (`GET /comunidad/:slug/voz`), pide el token al sentarte,
// conecta a LiveKit, pinta la tira y desconecta al cambiar `zone`. El SDK se carga con `import()`
// dinámico: sólo lo paga quien se sienta con la voz encendida.
//
// Entra escuchando, con micrófono y cámara apagados; el navegador pide permiso hasta que la
// persona pulsa un botón. Su elección se recuerda para la siguiente mesa.
import { useCallback, useEffect, useRef, useState } from "react";
import type { Participant, RemoteTrack, Room, VideoTrack } from "livekit-client";

type LK = typeof import("livekit-client");
type Phase = "idle" | "connecting" | "connected" | "reconnecting" | "failed" | "full";
type ServerState = { enabled: boolean; canManage: boolean; roster: { name: string; photoURL: string }[] };
type Face = { name: string; photoURL: string };

const POLL_MS = 15_000;
const RETRY_MS = [1_000, 3_000, 6_000];
/** La presencia tarda un latido en confirmar el asiento: se reintenta el token sin avisar. */
const SEAT_WAIT_MS = 1_500, SEAT_TRIES = 5;
const SIT_DELAY_MS = 700;
const MAX_TILES = 4;

const pref = {
  get(key: "mic" | "cam") { try { return localStorage.getItem(`fx-voz-${key}`) === "1"; } catch { return false; } },
  set(key: "mic" | "cam", on: boolean) { try { localStorage.setItem(`fx-voz-${key}`, on ? "1" : "0"); } catch { /* sin almacenamiento: no se recuerda */ } },
};

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
/** La caja arma la identidad como `Nombre#abc123`: el sufijo no se enseña. */
const cleanName = (p: Participant) => (p.name || p.identity).replace(/#[0-9a-f]{6}$/, "");

async function readState(slug: string, signal?: AbortSignal): Promise<ServerState | null> {
  try {
    const res = await fetch(`/comunidad/${slug}/voz`, { signal, headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const b = await res.json();
    return { enabled: b.enabled === true, canManage: b.canManage === true, roster: Array.isArray(b.roster) ? b.roster : [] };
  } catch { return null; }
}

const ICON = "h-4 w-4 shrink-0 fill-none stroke-current stroke-[1.8] [stroke-linecap:round] [stroke-linejoin:round]";
const MicIcon = ({ off }: { off?: boolean }) => (
  <svg viewBox="0 0 24 24" className={ICON} aria-hidden="true">
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    {off && <path d="M4 4l16 16" />}
  </svg>
);
const CamIcon = ({ off }: { off?: boolean }) => (
  <svg viewBox="0 0 24 24" className={ICON} aria-hidden="true">
    <rect x="3" y="6" width="13" height="12" rx="2" />
    <path d="m16 10 5-3v10l-5-3z" />
    {off && <path d="M4 4l16 16" />}
  </svg>
);

function TileVideo({ track, mirror }: { track: VideoTrack; mirror: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    track.attach(el);
    return () => { track.detach(el); };
  }, [track]);
  return <video ref={ref} autoPlay playsInline muted className={`absolute inset-0 h-full w-full object-cover ${mirror ? "-scale-x-100" : ""}`} />;
}

/**
 * Interruptor «voz en mesas» de la comunidad. Sólo se pinta para quien la administra (lo dice el
 * servidor, y el servidor vuelve a validar al cambiarlo). Vive en Administración › Mundo.
 */
export function VoiceSwitch({ slug, onChange, className = "" }: { slug: string; onChange?: (enabled: boolean) => void; className?: string }) {
  const [state, setState] = useState<ServerState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const ac = new AbortController();
    readState(slug, ac.signal).then((s) => { if (s && !ac.signal.aborted) setState(s); });
    return () => ac.abort();
  }, [slug]);
  if (!state?.canManage) return null;
  const toggle = async () => {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/comunidad/${slug}/voz`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ intent: "toggle", on: !state.enabled }) });
      const b = await res.json().catch(() => null);
      if (!res.ok || typeof b?.enabled !== "boolean") throw new Error(b?.error || "No se pudo cambiar.");
      setState({ ...state, enabled: b.enabled });
      onChange?.(b.enabled);
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo cambiar."); }
    setBusy(false);
  };
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#7C8A8E] ${className}`}>
      <button
        type="button" role="switch" aria-checked={state.enabled} disabled={busy} onClick={toggle}
        className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#232D33] bg-[#141B20] px-3 py-1.5 text-[#F2F5F4] disabled:opacity-60"
      >
        <span className={`relative h-4 w-7 shrink-0 rounded-full ${state.enabled ? "bg-brand-500" : "bg-[#232D33]"}`}>
          <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-[#F2F5F4] transition-[left] ${state.enabled ? "left-3.5" : "left-0.5"}`} />
        </span>
        Cámaras en las mesas: {state.enabled ? "encendidas" : "apagadas"}
      </button>
      <span>Quien se sienta en una mesa habla y se ve con los de esa mesa, sin grabación. Sólo tú ves este interruptor.</span>
      {error && <span role="alert" className="text-[#E58B8B]">{error}</span>}
    </div>
  );
}

export function VoiceStrip({
  slug, zone, zoneLabel, enabled = true, blocked = false, name, photoURL, showSwitch = true,
}: {
  slug: string;
  /** Id de la mesa donde estás sentado según el servidor (su índice, como texto), o `null`. */
  zone: string | null;
  /** Nombre de la mesa para el texto de estado. Por defecto «Mesa N». */
  zoneLabel?: string;
  /** Compuerta local; el interruptor de la comunidad lo consulta la tira por su cuenta. */
  enabled?: boolean;
  /** `true` mientras la sala principal está abierta: nunca dos audios a la vez. */
  blocked?: boolean;
  name: string;
  photoURL?: string | null;
  /** Pinta a quien administra la comunidad el estado de la voz (el interruptor está en Administración › Mundo). */
  showSwitch?: boolean;
}) {
  const [server, setServer] = useState<ServerState | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<"mic" | "cam" | null>(null);
  const [needsAudio, setNeedsAudio] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [, setTick] = useState(0);
  const roomRef = useRef<Room | null>(null);
  const lkRef = useRef<LK | null>(null);
  const audioBoxRef = useRef<HTMLDivElement>(null);
  const facesRef = useRef<Face[]>([]);

  // ── Interruptor de la comunidad: se sondea, así apagarlo desconecta a todos en segundos ──
  useEffect(() => {
    if (!enabled) return;
    const ac = new AbortController();
    const read = () => {
      if (document.visibilityState === "hidden") return;
      readState(slug, ac.signal).then((s) => { if (s && !ac.signal.aborted) { facesRef.current = s.roster; setServer(s); } });
    };
    read();
    const id = window.setInterval(read, POLL_MS);
    return () => { ac.abort(); window.clearInterval(id); };
    // `zone` a propósito: al sentarte se vuelve a leer en el acto (alguien pudo encenderla hace segundos).
  }, [slug, enabled, zone]);

  const on = enabled && server?.enabled === true;
  const activeZone = on && !blocked ? zone : null;

  // ── Conexión: una por mesa; al cambiar `activeZone` se desmonta todo ──
  useEffect(() => {
    if (activeZone === null) return;
    let cancelled = false;
    let room: Room | null = null;
    let timer: number | undefined;
    let attempts = 0, seatTries = 0;
    const bump = () => { if (!cancelled) setTick((t) => t + 1); };
    // Cada pista de audio con su <audio>: el SDK puede soltar el elemento antes de avisar, y
    // entonces `detach()` ya no lo regresa; se quita por esta lista para no dejar huérfanos.
    const audioEls = new Map<RemoteTrack, HTMLMediaElement>();
    const dropAudio = (track: RemoteTrack) => {
      track.detach().forEach((el) => el.remove());
      audioEls.get(track)?.remove();
      audioEls.delete(track);
    };

    const teardown = () => {
      const r = room;
      room = null;
      roomRef.current = null;
      if (r) { r.removeAllListeners(); void r.disconnect(true); }
      audioBoxRef.current?.replaceChildren();
      audioEls.clear();
    };
    const retry = () => {
      if (cancelled) return;
      teardown();
      if (attempts >= RETRY_MS.length) { setPhase("failed"); return; }
      setPhase("reconnecting");
      timer = window.setTimeout(connect, RETRY_MS[attempts++]);
    };

    async function connect() {
      if (cancelled) return;
      try {
        const res = await fetch(`/comunidad/${slug}/voz`, {
          method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ intent: "token", zone: activeZone }),
        });
        const body = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !body?.token) {
          const code = body?.code;
          if (code === "not_seated" && seatTries++ < SEAT_TRIES) { timer = window.setTimeout(connect, SEAT_WAIT_MS); return; }
          if (code === "voice_off") { setServer((s) => (s ? { ...s, enabled: false } : s)); return; }
          if (code === "full") { setNote(typeof body?.error === "string" ? body.error : null); setPhase("full"); return; }
          if (code === "not_seated" || code === "not_configured" || code === "too_many") { setPhase("failed"); return; }
          throw new Error(code || "token");
        }
        if (Array.isArray(body.roster)) facesRef.current = body.roster;

        const lk = (lkRef.current ??= await import("livekit-client"));
        if (cancelled) return;
        const E = lk.RoomEvent;
        room = new lk.Room({
          adaptiveStream: true,
          dynacast: true,
          // Al despublicar o desconectar se sueltan cámara y micrófono (es el default del SDK; va explícito).
          stopLocalTrackOnUnpublish: true,
          audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          // Mosaicos chicos: no hace falta más que 360p.
          videoCaptureDefaults: { resolution: lk.VideoPresets.h360.resolution, facingMode: "user" },
          // Sin `stopMicTrackOnMute`: el SDK avisa que con audífonos Bluetooth cada silenciada cambia el
          // perfil de audio y se oye. Silenciado, el micrófono no manda nada; se suelta al levantarte.
          publishDefaults: { simulcast: true, videoEncoding: lk.VideoPresets.h360.encoding },
        });
        const r = room;
        r.on(E.TrackSubscribed, (track) => {
          if (track.kind === lk.Track.Kind.Audio) {
            const el = track.attach();
            audioEls.set(track, el);
            audioBoxRef.current?.appendChild(el);
          }
          bump();
        });
        r.on(E.TrackUnsubscribed, (track) => { if (track.kind === lk.Track.Kind.Audio) dropAudio(track); bump(); });
        for (const ev of [E.ParticipantConnected, E.ParticipantDisconnected, E.TrackMuted, E.TrackUnmuted, E.LocalTrackPublished, E.LocalTrackUnpublished, E.ActiveSpeakersChanged, E.TrackPublished, E.TrackUnpublished] as const) {
          r.on(ev, bump);
        }
        r.on(E.AudioPlaybackStatusChanged, () => { if (!cancelled) setNeedsAudio(!r.canPlaybackAudio); });
        r.on(E.Reconnecting, () => { if (!cancelled) setPhase("reconnecting"); });
        r.on(E.Reconnected, () => { if (!cancelled) { setPhase("connected"); bump(); } });
        r.on(E.MediaDevicesError, () => { if (!cancelled) setNote("No pudimos usar tu micrófono o tu cámara. Revisa los permisos del navegador."); });
        // El SDK ya intentó reconectar por su cuenta; si llega aquí, se pide un token nuevo.
        r.on(E.Disconnected, () => { if (!cancelled && room === r) retry(); });

        await r.connect(body.wsUrl, body.token);
        if (cancelled || room !== r) return;
        roomRef.current = r;
        attempts = 0;
        setNeedsAudio(!r.canPlaybackAudio);
        setPhase("connected");
        // Lo que eligió en la mesa anterior. Si el navegador ya no da permiso, se queda apagado.
        if (pref.get("mic")) r.localParticipant.setMicrophoneEnabled(true).catch(() => pref.set("mic", false)).finally(bump);
        if (pref.get("cam")) r.localParticipant.setCameraEnabled(true).catch(() => pref.set("cam", false)).finally(bump);
      } catch {
        retry();
      }
    }

    setNote(null);
    setPhase("connecting");
    // Un respiro antes de pedir token: quien sólo pasa por la mesa no aparta lugar en la caja.
    timer = window.setTimeout(connect, SIT_DELAY_MS);
    // Cerrar la pestaña o mandarla al historial: se sueltan cámara y micrófono en el acto.
    const onHide = () => teardown();
    window.addEventListener("pagehide", onHide);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("pagehide", onHide);
      teardown();
      setPhase("idle");
      setNeedsAudio(false);
      setBusy(null);
    };
  }, [slug, activeZone, retryKey]);

  const toggle = useCallback(async (kind: "mic" | "cam") => {
    const room = roomRef.current;
    if (!room) return;
    const lp = room.localParticipant;
    const next = kind === "mic" ? !lp.isMicrophoneEnabled : !lp.isCameraEnabled;
    setBusy(kind); setNote(null);
    // El clic también desbloquea el sonido en navegadores que lo frenan (Safari).
    room.startAudio().then(() => setNeedsAudio(false)).catch(() => {});
    try {
      await (kind === "mic" ? lp.setMicrophoneEnabled(next) : lp.setCameraEnabled(next));
      pref.set(kind, next);
    } catch {
      pref.set(kind, false);
      setNote(kind === "mic" ? "El navegador no dio permiso para el micrófono. Actívalo en los permisos del sitio." : "El navegador no dio permiso para la cámara. Actívalo en los permisos del sitio.");
    }
    setBusy(null);
    setTick((t) => t + 1);
  }, []);

  // En el Mundo quien administra sólo ve el estado; el interruptor vive en Administración › Mundo.
  const adminSwitch = showSwitch && server?.canManage ? (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#7C8A8E]">
      <span className="inline-flex min-h-7 items-center gap-2 rounded-full border border-[#232D33] bg-[#141B20] px-2.5 py-1 text-[#F2F5F4]">
        <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${server.enabled ? "bg-brand-500" : "bg-[#7C8A8E]"}`} />
        Cámaras en las mesas: {server.enabled ? "encendidas" : "apagadas"}
      </span>
      <a href={`/comunidad/${slug}/admin?tab=mundo`} className="underline underline-offset-2 hover:text-[#F2F5F4]">Cambiar en Administración › Mundo</a>
    </p>
  ) : null;

  // Apagado o de pie: nadie nota nada (quien administra sólo ve el estado).
  if (!on || zone === null) return adminSwitch ? <div className="shrink-0 px-2.5 py-2">{adminSwitch}</div> : null;

  const box = "shrink-0 border-y border-[#232D33] bg-[#141B20] px-2.5 py-2 text-[#F2F5F4]";
  if (blocked) {
    return (
      <div className={box}>
        <p aria-live="polite" className="text-xs text-[#7C8A8E]">La voz de la mesa se pausa mientras estás en la sala principal.</p>
      </div>
    );
  }

  const room = phase === "connected" || phase === "reconnecting" ? roomRef.current : null;
  const lk = lkRef.current;
  const label = zoneLabel ?? `Mesa ${Number(zone) + 1}`;
  const people: { p: Participant; local: boolean }[] = room
    ? [{ p: room.localParticipant, local: true }, ...[...room.remoteParticipants.values()].map((p) => ({ p, local: false }))]
    : [];
  const shown = people.slice(0, MAX_TILES), extra = people.length - shown.length;
  const micOn = !!room?.localParticipant.isMicrophoneEnabled, camOn = !!room?.localParticipant.isCameraEnabled;

  const status =
    phase === "connecting" ? "Conectando…"
    : phase === "reconnecting" ? "Reconectando…"
    : phase === "failed" ? "Sin conexión de voz"
    : phase === "full" ? (note ?? "Mesa llena o la caja de llamadas está llena")
    : `En la mesa «${label}» · ${people.length === 1 ? "1 persona" : `${people.length} personas`}`;

  const btn = (active: boolean) =>
    `inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium disabled:opacity-60 ${
      active ? "border-brand-500 bg-brand-500 text-[#0E1317]" : "border-[#232D33] bg-[#0E1317] text-[#F2F5F4]"
    }`;

  return (
    <div className={box}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p aria-live="polite" className="min-w-0 flex-1 basis-40 text-xs text-[#7C8A8E]">
          <span className={phase === "connected" ? "text-[#F2F5F4]" : ""}>{status}</span>
          {phase !== "full" && note && <span className="block text-[#E5B98B]">{note}</span>}
        </p>
        {(phase === "failed" || phase === "full") && (
          <button type="button" className={btn(false)} onClick={() => setRetryKey((k) => k + 1)}>Reintentar</button>
        )}
        {room && phase === "connected" && (
          <div className="flex flex-wrap items-center gap-1.5">
            {needsAudio && (
              <button type="button" className={btn(true)} onClick={() => room.startAudio().then(() => setNeedsAudio(false)).catch(() => {})}>Activar sonido</button>
            )}
            <button type="button" className={btn(micOn)} aria-pressed={micOn} disabled={busy === "mic"} onClick={() => toggle("mic")}>
              <MicIcon off={!micOn} />{micOn ? "Silenciar micrófono" : "Activar micrófono"}
            </button>
            <button type="button" className={btn(camOn)} aria-pressed={camOn} disabled={busy === "cam"} onClick={() => toggle("cam")}>
              <CamIcon off={!camOn} />{camOn ? "Apagar cámara" : "Activar cámara"}
            </button>
          </div>
        )}
      </div>

      {shown.length > 0 && lk && (
        <ul className="mt-2 flex gap-1.5 overflow-x-auto">
          {shown.map(({ p, local }) => {
            const pub = p.getTrackPublication(lk.Track.Source.Camera);
            const video = pub && !pub.isMuted && pub.videoTrack ? (pub.videoTrack as VideoTrack) : null;
            const who = local ? name : cleanName(p);
            const photo = local ? photoURL : facesRef.current.find((f) => f.name === who)?.photoURL;
            const muted = !p.isMicrophoneEnabled;
            return (
              <li
                key={p.identity}
                className={`relative h-[72px] w-24 shrink-0 overflow-hidden rounded-lg border bg-[#0E1317] sm:h-[84px] sm:w-28 ${p.isSpeaking ? "border-brand-500" : "border-[#232D33]"}`}
              >
                {video ? (
                  <TileVideo track={video} mirror={local} />
                ) : photo ? (
                  <img src={photo} alt="" className="absolute left-1/2 top-[calc(50%-8px)] h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full object-cover" />
                ) : (
                  <span className="absolute left-1/2 top-[calc(50%-8px)] grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#232D33] text-xs font-semibold">{initials(who)}</span>
                )}
                <span className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-[rgba(14,19,23,0.78)] px-1.5 py-0.5 text-[10px] leading-4">
                  <span className={muted ? "text-[#E58B8B]" : p.isSpeaking ? "text-brand-500" : "text-[#7C8A8E]"}><MicIcon off={muted} /></span>
                  <span className="min-w-0 flex-1 truncate">{local ? "Tú" : who}</span>
                  <span className="sr-only">{muted ? "micrófono apagado" : p.isSpeaking ? "hablando" : "micrófono encendido"}</span>
                </span>
              </li>
            );
          })}
          {extra > 0 && <li className="grid h-[72px] w-12 shrink-0 place-items-center rounded-lg border border-[#232D33] text-xs text-[#7C8A8E] sm:h-[84px]">+{extra}</li>}
        </ul>
      )}
      {/* Aquí cuelgan los <audio> de los demás; no se ven. */}
      <div ref={audioBoxRef} hidden />
      {adminSwitch && <div className="mt-2">{adminSwitch}</div>}
    </div>
  );
}
