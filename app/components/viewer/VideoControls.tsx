import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type Hls from "hls.js";
import { cn } from "~/utils/cn";
import { useStoryboard, tileEn } from "~/hooks/useStoryboard";
import { formatVideoTime } from "~/utils/videoTime";

/**
 * Barra de controles propia.
 *
 * Los controles nativos del navegador no pintan marcadores de capítulo ni dejan elegir
 * la calidad, y en un webinar de 75 minutos las dos cosas son la diferencia entre que la
 * gente lo revisite o no. Por eso se reemplazan aquí, no por gusto de rediseñar.
 *
 * El patrón de arrastre viene de `app/components/AudioPlayer.tsx`, que ya lo tenía
 * resuelto en este repo.
 */

export type Capitulo = { s: number; titulo: string };

type Props = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  hlsRef?: React.RefObject<Hls | null>;
  chapters?: Capitulo[];
  /** URL del VTT de subtítulos. Sin ella el botón de CC no aparece. */
  captionsUrl?: string;
  /** Se llama con el segundo ENTERO, no con el valor crudo: si no son ~60 renders/s. */
  onTimeChange?: (segundo: number) => void;
  /**
   * Duración en segundos que ya conocemos por la base de datos. El `<video>` no la sabe
   * hasta que cargan los metadatos, y hasta entonces la barra no se podría partir por
   * capítulos: en una conexión lenta eso son varios segundos con la barra en blanco.
   */
  duracionConocida?: number;
  /** Avisa al player cuando el video está esperando datos, para pintar el girito. */
  onCargandoChange?: (cargando: boolean) => void;
  /** Slug del video: con él se piden las miniaturas del hover. */
  videoSlug?: string;
};

const VELOCIDADES = [0.75, 1, 1.25, 1.5, 1.75, 2];

// Preferencias compartidas por todo el sitio, no por video.
const PREF_VOLUMEN = "fx_player_volumen";
const PREF_SILENCIO = "fx_player_silencio";
const PREF_RESTANTE = "fx_player_restante";

const reloj = (segundos: number): string => {
  if (!Number.isFinite(segundos)) return "0:00";
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = Math.floor(segundos % 60);
  const dd = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${dd(m)}:${dd(s)}` : `${m}:${dd(s)}`;
};

/** Botón de la barra. 44px de área táctil: por debajo de eso no se atina en móvil. */
const Boton = ({
  onClick,
  titulo,
  activo,
  children,
}: {
  onClick: () => void;
  titulo: string;
  activo?: boolean;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={titulo}
    aria-label={titulo}
    className={cn(
      "grid h-11 min-w-11 place-items-center rounded-full px-2 text-sm transition-colors",
      "text-white/80 hover:bg-white/10 hover:text-white",
      activo && "text-brand-500",
    )}
  >
    {children}
  </button>
);

/** Menú emergente (velocidad, calidad, capítulos). */
const Menu = ({
  abierto,
  children,
}: {
  abierto: boolean;
  children: React.ReactNode;
}) => (
  <AnimatePresence>
    {abierto && (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        className="scrollbar-sutil absolute bottom-full right-0 mb-2 max-h-64 w-56 overflow-y-auto rounded-xl border border-white/10 bg-dark/95 p-1 shadow-xl backdrop-blur"
      >
        {children}
      </motion.div>
    )}
  </AnimatePresence>
);

const OpcionMenu = ({
  onClick,
  activo,
  children,
}: {
  onClick: () => void;
  activo?: boolean;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
      activo
        ? "bg-brand-500/20 text-brand-500"
        : "text-white/80 hover:bg-white/10",
    )}
  >
    {children}
  </button>
);

export const VideoControls = ({
  videoRef,
  hlsRef,
  chapters = [],
  captionsUrl,
  onTimeChange,
  duracionConocida,
  videoSlug,
  onCargandoChange,
}: Props) => {
  const barraRef = useRef<HTMLDivElement>(null);
  const [tiempo, setTiempo] = useState(0);
  const [duracion, setDuracion] = useState(duracionConocida || 0);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [volumen, setVolumen] = useState(1);
  const [silenciado, setSilenciado] = useState(false);
  const [velocidad, setVelocidad] = useState(1);
  const [subtitulos, setSubtitulos] = useState(false);
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const [niveles, setNiveles] = useState<{ i: number; alto: number }[]>([]);
  const [nivel, setNivel] = useState(-1);
  const [menu, setMenu] = useState<
    null | "velocidad" | "calidad" | "capitulos"
  >(null);
  const [arrastrando, setArrastrando] = useState(false);
  // Saltar en HLS obliga a bajar el segmento de destino —varios MB— antes de pintar el
  // primer cuadro. Sin señal de que algo pasa, se siente que el clic no hizo nada.
  const [cargando, setCargando] = useState(false);
  // Los controles tapan la parte baja del video —justo donde van los subtítulos y las
  // diapositivas—, así que se van solos cuando nadie los está usando.
  const [visibles, setVisibles] = useState(true);
  const ocultarRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Posición del cursor sobre la barra, en segundos. `null` = no hay hover.
  const [asomado, setAsomado] = useState<number | null>(null);
  const [mostrarRestante, setMostrarRestante] = useState(false);
  const [hayPip, setHayPip] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const tiles = useStoryboard(videoSlug);

  // ── Estado del <video> ────────────────────────────────────────────────────
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    let ultimoSegundo = -1;
    const alTiempo = () => {
      setTiempo(el.currentTime);
      const seg = Math.floor(el.currentTime);
      if (seg !== ultimoSegundo) {
        ultimoSegundo = seg;
        onTimeChange?.(seg);
      }
    };
    // Sólo se pisa la duración conocida cuando el <video> ya tiene una de verdad.
    const alCargar = () => {
      if (Number.isFinite(el.duration) && el.duration > 0)
        setDuracion(el.duration);
    };
    const alPlay = () => setReproduciendo(true);
    const alPause = () => setReproduciendo(false);
    const alVolumen = () => {
      setVolumen(el.volume);
      setSilenciado(el.muted);
      guardarPref(PREF_VOLUMEN, String(el.volume));
      guardarPref(PREF_SILENCIO, el.muted ? "1" : "0");
    };

    const ocupado = () => {
      setCargando(true);
      onCargandoChange?.(true);
    };
    const libre = () => {
      setCargando(false);
      onCargandoChange?.(false);
    };

    el.addEventListener("waiting", ocupado);
    el.addEventListener("seeking", ocupado);
    el.addEventListener("playing", libre);
    el.addEventListener("seeked", libre);
    el.addEventListener("canplay", libre);

    el.addEventListener("timeupdate", alTiempo);
    el.addEventListener("durationchange", alCargar);
    el.addEventListener("loadedmetadata", alCargar);
    el.addEventListener("play", alPlay);
    el.addEventListener("pause", alPause);
    el.addEventListener("volumechange", alVolumen);
    alCargar();
    alVolumen();

    return () => {
      el.removeEventListener("waiting", ocupado);
      el.removeEventListener("seeking", ocupado);
      el.removeEventListener("playing", libre);
      el.removeEventListener("seeked", libre);
      el.removeEventListener("canplay", libre);
      el.removeEventListener("timeupdate", alTiempo);
      el.removeEventListener("durationchange", alCargar);
      el.removeEventListener("loadedmetadata", alCargar);
      el.removeEventListener("play", alPlay);
      el.removeEventListener("pause", alPause);
      el.removeEventListener("volumechange", alVolumen);
    };
  }, [videoRef, onTimeChange, onCargandoChange]);

  // Los niveles de calidad ya los tenía hls.js; hasta ahora se desperdiciaban.
  useEffect(() => {
    const hls = hlsRef?.current;
    if (!hls) return;
    const leer = () =>
      setNiveles(hls.levels.map((l, i) => ({ i, alto: l.height })).reverse());
    leer();
    // El manifiesto puede llegar después de montar los controles.
    const t = setTimeout(leer, 1500);
    return () => clearTimeout(t);
  }, [hlsRef, duracion]);

  useEffect(() => {
    const alCambiar = () => setPantallaCompleta(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", alCambiar);
    return () => document.removeEventListener("fullscreenchange", alCambiar);
  }, []);

  useEffect(() => {
    setHayPip(
      typeof document !== "undefined" && !!document.pictureInPictureEnabled,
    );
  }, []);

  // Auto-ocultado. En pausa, con un menú abierto o mientras se arrastra se quedan: ahí
  // la persona los está usando y que desaparezcan sería absurdo.
  useEffect(() => {
    const zona = videoRef.current?.closest("section");
    if (!zona) return;

    const reponer = () => {
      setVisibles(true);
      if (ocultarRef.current) clearTimeout(ocultarRef.current);
      ocultarRef.current = setTimeout(() => setVisibles(false), 2800);
    };
    const salir = () => setVisibles(false);

    zona.addEventListener("mousemove", reponer);
    zona.addEventListener("touchstart", reponer);
    zona.addEventListener("mouseleave", salir);
    reponer();

    return () => {
      zona.removeEventListener("mousemove", reponer);
      zona.removeEventListener("touchstart", reponer);
      zona.removeEventListener("mouseleave", salir);
      if (ocultarRef.current) clearTimeout(ocultarRef.current);
    };
  }, [videoRef]);

  // Preferencias del sitio, no del video: bajarle el volumen en una lección y que la
  // siguiente vuelva a gritar es de lo más molesto que puede hacer un reproductor.
  // Mux las guarda por defecto (tiene flags para APAGARLO); aquí también.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    try {
      const v = localStorage.getItem(PREF_VOLUMEN);
      if (v !== null) el.volume = Math.min(1, Math.max(0, Number(v)));
      el.muted = localStorage.getItem(PREF_SILENCIO) === "1";
      setMostrarRestante(localStorage.getItem(PREF_RESTANTE) === "1");
    } catch {
      // Modo privado: sin preferencias, pero el video se ve igual.
    }
  }, [videoRef]);

  const guardarPref = (clave: string, valor: string) => {
    try {
      localStorage.setItem(clave, valor);
    } catch {
      // ídem
    }
  };

  // ── Acciones ──────────────────────────────────────────────────────────────
  const saltarA = useCallback(
    (segundo: number) => {
      const el = videoRef.current;
      if (!el) return;
      el.currentTime = Math.max(0, Math.min(segundo, el.duration || segundo));
    },
    [videoRef],
  );

  const alternar = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.paused ? el.play().catch(() => {}) : el.pause();
  }, [videoRef]);

  /**
   * Copia la URL de esta pieza con el minuto en curso.
   *
   * El `?t=` va en formato legible (`12m30s`) y no en segundos: la liga se pega en
   * un correo o en WhatsApp, donde alguien la lee antes de darle clic.
   */
  const copyLinkAtCurrentTime = useCallback(async () => {
    const el = videoRef.current;
    if (!el) return;
    const url = new URL(window.location.href);
    url.searchParams.set("t", formatVideoTime(el.currentTime));
    const texto = url.toString();
    let listo = false;
    try {
      // Truena con NotAllowedError si el documento perdió el foco —pasa con el
      // panel de transcripción abierto, que se lo lleva al hacer scroll—, así que
      // no puede ser el único camino.
      await navigator.clipboard.writeText(texto);
      listo = true;
    } catch {
      const caja = document.createElement("textarea");
      caja.value = texto;
      caja.setAttribute("readonly", "");
      caja.style.position = "fixed";
      caja.style.opacity = "0";
      document.body.appendChild(caja);
      caja.select();
      try {
        listo = document.execCommand("copy");
      } catch {
        listo = false;
      }
      caja.remove();
    }
    if (!listo) return;
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }, [videoRef]);

  /** Segundo bajo una posición horizontal de pantalla. No mueve el video. */
  const segundoEn = useCallback(
    (clientX: number): number | null => {
      const rect = barraRef.current?.getBoundingClientRect();
      if (!rect || !duracion) return null;
      const ratio = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width),
      );
      return ratio * duracion;
    },
    [duracion],
  );

  const desdeEvento = useCallback(
    (clientX: number) => {
      const rect = barraRef.current?.getBoundingClientRect();
      if (!rect || !duracion) return;
      const ratio = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width),
      );
      saltarA(ratio * duracion);
    },
    [duracion, saltarA],
  );

  // El arrastre se escucha en window: si se escuchara en la barra, sacar el dedo o el
  // cursor de ella a media pasada dejaría el scrub colgado.
  useEffect(() => {
    if (!arrastrando) return;
    const mover = (e: MouseEvent | TouchEvent) => {
      const x = "touches" in e ? e.touches[0]?.clientX : e.clientX;
      if (x == null) return;
      desdeEvento(x);
      // En táctil no existe el hover: el globo tiene que salir mientras se arrastra,
      // que es justo cuando hace falta saber a dónde vas a caer.
      setAsomado(segundoEn(x));
    };
    const soltar = () => {
      setArrastrando(false);
      setAsomado(null);
    };
    window.addEventListener("mousemove", mover);
    window.addEventListener("touchmove", mover);
    window.addEventListener("mouseup", soltar);
    window.addEventListener("touchend", soltar);
    return () => {
      window.removeEventListener("mousemove", mover);
      window.removeEventListener("touchmove", mover);
      window.removeEventListener("mouseup", soltar);
      window.removeEventListener("touchend", soltar);
    };
  }, [arrastrando, desdeEvento, segundoEn]);

  const cambiarVelocidad = (v: number) => {
    if (videoRef.current) videoRef.current.playbackRate = v;
    setVelocidad(v);
    setMenu(null);
  };

  const cambiarCalidad = (i: number) => {
    if (hlsRef?.current) hlsRef.current.currentLevel = i;
    setNivel(i);
    setMenu(null);
  };

  const alternarSubtitulos = () => {
    const pistas = videoRef.current?.textTracks;
    if (!pistas) return;
    const encender = !subtitulos;
    for (const pista of pistas) {
      if (pista.kind === "captions" || pista.kind === "subtitles") {
        pista.mode = encender ? "showing" : "hidden";
      }
    }
    setSubtitulos(encender);
  };

  const alternarPip = async () => {
    const el = videoRef.current;
    if (!el) return;
    try {
      if (document.pictureInPictureElement)
        await document.exitPictureInPicture();
      else await el.requestPictureInPicture();
    } catch {
      // Safari en iPhone lo bloquea en algunos contextos: no vale un error visible.
    }
  };

  const alternarPantallaCompleta = () => {
    const contenedor = videoRef.current?.closest("section");
    if (!document.fullscreenElement)
      contenedor?.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  };

  // Atajos: es lo primero que busca quien repasa una clase.
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      const activo = document.activeElement;
      // No robar la barra espaciadora mientras alguien escribe en el buscador.
      if (
        activo instanceof HTMLInputElement ||
        activo instanceof HTMLTextAreaElement
      )
        return;
      const el = videoRef.current;
      if (!el) return;
      if (e.key === " " || e.key === "k") {
        e.preventDefault();
        alternar();
      } else if (e.key === "ArrowRight") saltarA(el.currentTime + 10);
      else if (e.key === "ArrowLeft") saltarA(el.currentTime - 10);
      else if (e.key === "f") alternarPantallaCompleta();
      else if (e.key === "m" && videoRef.current)
        videoRef.current.muted = !el.muted;
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  });

  // ── Barra de progreso, partida por capítulos ──────────────────────────────
  // Cada capítulo es su propio tramo con su propio relleno. Es la forma que ya entiende
  // todo el mundo, y en táctil funciona mejor que unas marcas de 2px sobre una barra.
  const tramos =
    duracion && chapters.length
      ? chapters.map((c, i) => ({
          desde: c.s,
          hasta: chapters[i + 1]?.s ?? duracion,
          titulo: c.titulo,
        }))
      : [{ desde: 0, hasta: duracion || 1, titulo: "" }];

  const capituloEn = (segundo: number) =>
    chapters.length
      ? [...chapters].reverse().find((c) => segundo >= c.s)
      : undefined;

  const capituloActual = capituloEn(tiempo);

  // El globo del hover: se topa a los bordes para que no se salga del video.
  const ANCHO_GLOBO = 176;
  const posicionGlobo = () => {
    const ancho = barraRef.current?.clientWidth || 1;
    const centro = ((asomado ?? 0) / (duracion || 1)) * ancho;
    // Se topa a los bordes, pero sólo si la barra es más ancha que el globo; en móvil
    // no lo es y el mínimo acabaría empujándolo fuera por el otro lado.
    if (ancho <= ANCHO_GLOBO) return ancho / 2;
    return Math.max(ANCHO_GLOBO / 2, Math.min(ancho - ANCHO_GLOBO / 2, centro));
  };

  const tile = asomado != null ? tileEn(tiles, asomado) : undefined;

  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-3 pb-2 pt-10",
        "transition-opacity duration-300",
        // Sólo se esconden si el video está corriendo y nadie los toca.
        visibles || !reproduciendo || menu || arrastrando || asomado != null
          ? "opacity-100"
          : "pointer-events-none opacity-0"
      )}
      // Un clic en la barra no debe pausar el video (el <video> tiene su propio onClick).
      onClick={(e) => e.stopPropagation()}
    >
      {/* El globo y la barra comparten contenedor: así `left` y `bottom-full` se miden
          contra la BARRA. Colgando del panel entero, el globo salía desplazado por su
          padding y muy por encima, fuera del alcance del cursor. */}
      <div className="relative">
        {/* Globo del hover: miniatura + tiempo + capítulo. La miniatura es un extra —si el
          video no tiene storyboard, el globo sale igual con tiempo y capítulo. */}
        <AnimatePresence>
          {asomado != null && duracion > 0 && (
            <motion.div
              // El centrado va en `x`, NO en una clase `-translate-x-1/2`: motion escribe
            // su propio `transform` para animar y borraría la clase, dejando el globo
            // desplazado justo medio ancho a la derecha.
            initial={{ opacity: 0, y: 6, scale: 0.96, x: "-50%" }}
            animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
            exit={{ opacity: 0, y: 6, scale: 0.96, x: "-50%" }}
            transition={{ duration: 0.12 }}
            className="pointer-events-none absolute bottom-full z-30 pb-1"
            style={{ left: posicionGlobo(), width: tile ? tile.w : ANCHO_GLOBO }}
            >
              <div
                className="overflow-hidden rounded-xl border-2 border-brand-500 bg-dark/95 backdrop-blur"
                // El resplandor de marca es lo que lo despega del video: sin él, sobre una
                // imagen clara el globo se pierde.
                style={{
                  boxShadow:
                    "0 0 0 1px rgba(0,0,0,.6), 0 8px 28px -6px rgba(133,221,203,.55)",
                }}
              >
                {tile ? (
                <div
                  className="border-b-2 border-brand-500/60"
                  style={{
                    // A TAMAÑO NATIVO: escalar el sprite exige saber su tamaño total, que
                    // el VTT no dice. Antes se calculaba un `background-size` en
                    // porcentaje que era relativo al globo, no al sprite, y salía una
                    // miniatura de otro momento. 160px es además lo que usa todo el mundo.
                    width: tile.w,
                    height: tile.h,
                    backgroundImage: `url("${tile.src}")`,
                    backgroundPosition: `-${tile.x}px -${tile.y}px`,
                    backgroundRepeat: "no-repeat",
                  }}
                />
              ) : (
                // Sin storyboard todavía: una franja de marca para que el globo no se
                // vea como una caja de texto suelta.
                <div className="h-1 w-full bg-gradient-to-r from-brand-700 via-brand-500 to-brand-700" />
              )}

              <div className="px-2 py-1.5 text-center">
                  {capituloEn(asomado) && (
                    <p className="truncate text-[11px] leading-tight text-white/70">
                      {capituloEn(asomado)!.titulo}
                    </p>
                  )}
                  <span className="mt-1 inline-block rounded-full bg-brand-500 px-2 py-0.5 font-mono text-xs font-bold text-brand-900">
                    {reloj(asomado)}
                  </span>
                </div>
              </div>

              {/* La punta, para que el globo señale el punto exacto de la barra. */}
              <div className="mx-auto -mt-[7px] h-3 w-3 rotate-45 border-b-2 border-r-2 border-brand-500 bg-dark" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progreso */}
        <div
          ref={barraRef}
          role="slider"
          aria-label="Progreso del video"
          aria-valuemin={0}
          aria-valuemax={Math.round(duracion)}
          aria-valuenow={Math.round(tiempo)}
          tabIndex={0}
          // py-3 da 24px de zona de agarre alrededor de una barra de 6px: sin eso, en el
          // teléfono hay que atinarle a 6 píxeles.
          className="group flex cursor-pointer items-center gap-[2px] py-3"
          onMouseDown={(e) => {
            setArrastrando(true);
            desdeEvento(e.clientX);
          }}
          onTouchStart={(e) => {
            setArrastrando(true);
            const x = e.touches[0]?.clientX;
            if (x != null) {
              desdeEvento(x);
              setAsomado(segundoEn(x));
            }
          }}
          onMouseMove={(e) => setAsomado(segundoEn(e.clientX))}
          onMouseLeave={() => !arrastrando && setAsomado(null)}
        >
          {tramos.map((tramo) => {
            const largo = Math.max(tramo.hasta - tramo.desde, 0.001);
            const avance = Math.max(
              0,
              Math.min(1, (tiempo - tramo.desde) / largo),
            );
            return (
              <div
                key={tramo.desde}
                style={{ flexGrow: largo }}
                // Sin `title`: el tooltip nativo del navegador salía encima del globo
                // propio, tarde y con otro estilo. Dos tooltips para el mismo dato.
                className="h-1.5 overflow-hidden rounded-full bg-white/25 transition-[height] group-hover:h-2.5"
              >
                <div
                  className={cn(
                    "h-full rounded-full bg-brand-500",
                    // Mientras baja el segmento, el relleno late: el girito del centro se
                    // ve, pero la mirada está en la barra, que es donde se hizo clic.
                    cargando && "animate-pulse"
                  )}
                  style={{ width: `${avance * 100}%` }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Botones */}
      <div className="flex items-center gap-1">
        <Boton
          onClick={alternar}
          titulo={reproduciendo ? "Pausar" : "Reproducir"}
        >
          {reproduciendo ? <IconoPausa /> : <IconoPlay />}
        </Boton>

        <button
          type="button"
          title="Cambiar entre transcurrido y restante"
          onClick={() => {
            const nuevo = !mostrarRestante;
            setMostrarRestante(nuevo);
            guardarPref(PREF_RESTANTE, nuevo ? "1" : "0");
          }}
          className="ml-1 shrink-0 font-mono text-xs text-white/70 hover:text-white"
        >
          {mostrarRestante ? (
            `-${reloj(Math.max(0, duracion - tiempo))}`
          ) : (
            <>
              {reloj(tiempo)}
              {/* El total se esconde en móvil: son ~60px que hacían desbordar la fila
                  a 375px, y la duración ya se intuye por la barra. */}
              <span className="hidden sm:inline"> / {reloj(duracion)}</span>
            </>
          )}
        </button>

        {/* El capítulo actual, que es lo que orienta en un video de una hora. */}
        {capituloActual && (
          <span className="ml-2 hidden truncate text-xs text-white/50 sm:block">
            {capituloActual.titulo}
          </span>
        )}

        <div className="flex-1" />

        {/* El volumen se oculta en móvil: ahí lo controlan los botones del teléfono. */}
        <div className="hidden items-center gap-1 sm:flex">
          <Boton
            onClick={() => {
              if (videoRef.current) videoRef.current.muted = !silenciado;
            }}
            titulo={silenciado ? "Activar sonido" : "Silenciar"}
          >
            {silenciado || volumen === 0 ? <IconoMudo /> : <IconoVolumen />}
          </Boton>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={silenciado ? 0 : volumen}
            aria-label="Volumen"
            onChange={(e) => {
              const v = Number(e.target.value);
              if (videoRef.current) {
                videoRef.current.volume = v;
                videoRef.current.muted = v === 0;
              }
            }}
            className="h-1 w-16 cursor-pointer accent-brand-500"
          />
        </div>

        {chapters.length > 0 && (
          <div className="relative">
            <Boton
              onClick={() => setMenu(menu === "capitulos" ? null : "capitulos")}
              titulo="Capítulos"
              activo={menu === "capitulos"}
            >
              <IconoLista />
            </Boton>
            <Menu abierto={menu === "capitulos"}>
              {chapters.map((c) => (
                <OpcionMenu
                  key={c.s}
                  activo={capituloActual?.s === c.s}
                  onClick={() => {
                    saltarA(c.s);
                    setMenu(null);
                  }}
                >
                  <span className="shrink-0 font-mono text-xs opacity-60">
                    {reloj(c.s)}
                  </span>
                  <span className="truncate">{c.titulo}</span>
                </OpcionMenu>
              ))}
            </Menu>
          </div>
        )}

        {captionsUrl && (
          <Boton
            onClick={alternarSubtitulos}
            titulo="Subtítulos"
            activo={subtitulos}
          >
            <span className="text-xs font-bold tracking-tight">CC</span>
          </Boton>
        )}

        <Boton
          onClick={copyLinkAtCurrentTime}
          titulo={linkCopied ? "¡Liga copiada!" : "Copiar liga en este minuto"}
          activo={linkCopied}
        >
          {linkCopied ? <IconCheck /> : <IconLink />}
        </Boton>

        <div className="relative">
          <Boton
            onClick={() => setMenu(menu === "velocidad" ? null : "velocidad")}
            titulo="Velocidad"
            activo={velocidad !== 1}
          >
            <span className="text-xs font-semibold">{velocidad}×</span>
          </Boton>
          <Menu abierto={menu === "velocidad"}>
            {VELOCIDADES.map((v) => (
              <OpcionMenu
                key={v}
                activo={v === velocidad}
                onClick={() => cambiarVelocidad(v)}
              >
                {v}× {v === 1 && <span className="opacity-50">normal</span>}
              </OpcionMenu>
            ))}
          </Menu>
        </div>

        {niveles.length > 1 && (
          <div className="relative">
            <Boton
              onClick={() => setMenu(menu === "calidad" ? null : "calidad")}
              titulo="Calidad"
              activo={menu === "calidad"}
            >
              <IconoEngrane />
            </Boton>
            <Menu abierto={menu === "calidad"}>
              <OpcionMenu
                activo={nivel === -1}
                onClick={() => cambiarCalidad(-1)}
              >
                Automática
              </OpcionMenu>
              {niveles.map((n) => (
                <OpcionMenu
                  key={n.i}
                  activo={nivel === n.i}
                  onClick={() => cambiarCalidad(n.i)}
                >
                  {n.alto}p
                </OpcionMenu>
              ))}
            </Menu>
          </div>
        )}

        {hayPip && (
          // Oculto en móvil por espacio; iOS además lo ofrece desde su menú nativo.
          <span className="hidden sm:contents">
            <Boton onClick={alternarPip} titulo="Ver en miniatura">
              <IconoPip />
            </Boton>
          </span>
        )}

        <Boton
          onClick={alternarPantallaCompleta}
          titulo={
            pantallaCompleta
              ? "Salir de pantalla completa"
              : "Pantalla completa"
          }
        >
          {pantallaCompleta ? <IconoSalirPantalla /> : <IconoPantalla />}
        </Boton>
      </div>
    </div>
  );
};

// ── Iconos ──────────────────────────────────────────────────────────────────
// Sueltos y no de react-icons: son cinco trazos y así no se carga un paquete de miles.
const svg = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const IconLink = () => (
  <svg {...svg}>
    <path d="M10 13a5 5 0 007.07 0l2.83-2.83a5 5 0 00-7.07-7.07L11.5 4.5" />
    <path d="M14 11a5 5 0 00-7.07 0L4.1 13.83a5 5 0 007.07 7.07L12.5 19.5" />
  </svg>
);
const IconCheck = () => (
  <svg {...svg}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
);
const IconoPlay = () => (
  <svg {...svg} fill="currentColor" stroke="none">
    <path d="M6 4l14 8-14 8V4z" />
  </svg>
);
const IconoPausa = () => (
  <svg {...svg} fill="currentColor" stroke="none">
    <path d="M7 4h4v16H7zM13 4h4v16h-4z" />
  </svg>
);
const IconoVolumen = () => (
  <svg {...svg}>
    <path d="M11 5L6 9H2v6h4l5 4V5z" />
    <path d="M15.5 8.5a5 5 0 010 7" />
  </svg>
);
const IconoMudo = () => (
  <svg {...svg}>
    <path d="M11 5L6 9H2v6h4l5 4V5z" />
    <path d="M22 9l-6 6M16 9l6 6" />
  </svg>
);
const IconoLista = () => (
  <svg {...svg}>
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </svg>
);
const IconoEngrane = () => (
  <svg {...svg}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6 1.65 1.65 0 0010 3.09V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9v0a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
);
const IconoPip = () => (
  <svg {...svg}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <rect x="12" y="12" width="8" height="6" rx="1" fill="currentColor" />
  </svg>
);
const IconoPantalla = () => (
  <svg {...svg}>
    <path d="M8 3H5a2 2 0 00-2 2v3M16 3h3a2 2 0 012 2v3M8 21H5a2 2 0 01-2-2v-3M16 21h3a2 2 0 002-2v-3" />
  </svg>
);
const IconoSalirPantalla = () => (
  <svg {...svg}>
    <path d="M8 3v3a2 2 0 01-2 2H3M21 8h-3a2 2 0 01-2-2V3M3 16h3a2 2 0 012 2v3M16 21v-3a2 2 0 012-2h3" />
  </svg>
);
