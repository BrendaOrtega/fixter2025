import type { Video } from "~/types/models";
import { Link } from "react-router";
import {
  AnimatePresence,
  motion,
  MotionValue,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { BsMenuButtonWide, BsMarkdown } from "react-icons/bs";
import { FaPlay, FaVideo } from "react-icons/fa6";
import { IoMdLock, IoMdClose, IoMdMail, IoMdConstruct } from "react-icons/io";
import { IoCheckmarkCircle } from "react-icons/io5";
import { formatUnlock } from "~/utils/formatUnlock";
import {
  MdMenuOpen,
  MdOutlineRadioButtonChecked,
  MdOutlineRadioButtonUnchecked,
} from "react-icons/md";
import { useClickOutside } from "~/hooks/useClickOutside";
import { cn } from "~/utils/cn";
import { LAYER } from "~/utils/layers";
import { MdOutlineSubtitles, MdOutlineFolder } from "react-icons/md";
import {
  TranscriptPanel,
  type Segmento,
  type Capitulo,
} from "~/components/viewer/TranscriptPanel";
import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";

type TabType = "videos" | "notes" | "transcript" | "resources";

interface UnifiedSidebarProps {
  // Videos props
  courseSlug: string;
  courseTitle?: string;
  isLocked?: boolean;
  isSubscribed?: boolean;
  /** Veredicto del servidor por slug para los videos de una secuencia. */
  sequenceUnlocks?: Record<
    string,
    { unlocked: boolean; unlocksAt: string | null; enrolled?: boolean }
  >;
  currentVideoSlug?: string;
  moduleNames: string[];
  videos: Partial<Video>[];
  // Notes props
  markdownBody?: string;
  // Transcript props
  transcript?: { segments: Segmento[]; chapters?: Capitulo[] } | null;
  /** Slides, PDFs, repos y enlaces de esta pieza y del curso. */
  resources?: {
    slug: string;
    kind: string;
    title: string;
    externalUrl: string | null;
    videoId: string | null;
  }[];
  courseId?: string;
  /** Segundo en curso del player, para marcar la línea que suena. */
  currentTime?: number;
  onSeek?: (segundo: number) => void;
  // Unified props
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  defaultTab?: TabType;
}

export const UnifiedSidebarMenu = ({
  courseSlug,
  courseTitle,
  isLocked,
  isSubscribed,
  sequenceUnlocks,
  currentVideoSlug,
  moduleNames,
  videos,
  markdownBody,
  transcript,
  resources = [],
  courseId,
  currentTime = 0,
  onSeek,
  isOpen,
  setIsOpen,
  defaultTab = "videos",
}: UnifiedSidebarProps) => {
  const [activeTab, setActiveTabState] = useState<TabType>(defaultTab);

  /**
   * Cambiar de pestaña también reescribe `?tab=` en la barra de direcciones.
   *
   * Sin esto la pestaña era estado local invisible: quien copiaba la liga con la
   * transcripción abierta —o recargaba— caía en la lista de videos. `replaceState`
   * y no `navigate` porque no es un destino nuevo, es la misma página con otra
   * pestaña: no debe apilar una entrada en el historial ni recargar los loaders.
   */
  const setActiveTab = useCallback((tab: TabType) => {
    setActiveTabState(tab);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (tab === "videos") url.searchParams.delete("tab");
    else url.searchParams.set("tab", tab);
    window.history.replaceState(window.history.state, "", url.toString());
  }, []);

  // Navegar a otra lección NO desmonta el menú, así que el estado se quedaría en la
  // pestaña anterior y `defaultTab` no serviría de nada después del primer render.
  useEffect(() => {
    setActiveTabState(defaultTab);
  }, [defaultTab, currentVideoSlug]);
  const [completed, setCompleted] = useState<string[]>([]);
  const [videosCompleted, setVideosCompleted] = useState<string[]>([]);

  // Animation setup
  const x = useMotionValue(0);
  const springX = useSpring(x, { bounce: 0.2 });
  // En estado y no calculado en render: al pintar en el servidor `window` no existe, así
  // que salía 320, y el botón —que se posiciona con un MotionValue— se quedaba con el 400
  // del cliente. Resultado: el botón flotando a 70px del borde del panel.
  const [menuWidth, setMenuWidth] = useState(320);
  useEffect(() => {
    const medir = () => setMenuWidth(window.innerWidth >= 768 ? 400 : 320);
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);
  // Abierto, el botón monta 16px sobre el borde del panel: los suficientes para que se
  // lea como parte de él y no como algo flotando al lado, y caen en su padding, así que
  // no tapa las pestañas.
  const buttonX = useTransform(springX, [-menuWidth, 0], [0, menuWidth - 16]);

  useEffect(() => {
    isOpen ? x.set(0) : x.set(-menuWidth);
  }, [isOpen, x, menuWidth]);

  // Video completion logic
  const checkIfWatched = (slug: string) => {
    if (typeof window === "undefined") return false;
    let list = localStorage.getItem("watched") || "[]";
    list = JSON.parse(list);
    return list.includes(slug);
  };

  useEffect(() => {
    const list: string[] = [];
    moduleNames.map((moduleName) => {
      // El mismo criterio que usa la lista para agrupar. Comparar contra el
      // sentinel «nomodules» no casaba con nada —esos videos traen `null`— y
      // el filtro salía VACÍO… que es como se colaba el bug: `[].every()` es
      // `true`, así que TODO curso sin módulos se pintaba como completado.
      const delModulo = videos.filter((vi) =>
        moduleName === "nomodules" ? true : vi?.moduleName === moduleName,
      );
      const allCompleted =
        delModulo.length > 0 && delModulo.every((v) => checkIfWatched(v?.slug));
      allCompleted && list.push(moduleName);
    });
    setCompleted(list);

    let watchedList = localStorage.getItem("watched") || "[]";
    watchedList = JSON.parse(watchedList);
    setVideosCompleted(watchedList);
  }, [moduleNames, videos]);

  const tabs = [
    {
      id: "videos" as TabType,
      label: "Videos",
      icon: <FaVideo className="text-sm" />,
      available: videos.length > 0,
    },
    {
      id: "notes" as TabType,
      label: "Notas",
      icon: <BsMarkdown className="text-sm" />,
      available: !!markdownBody,
    },
    {
      id: "resources" as TabType,
      label: "Recursos",
      icon: <MdOutlineFolder className="text-sm" />,
      available: resources.length > 0,
    },
    {
      id: "transcript" as TabType,
      label: "Transcripción",
      icon: <MdOutlineSubtitles className="text-sm" />,
      available: !!transcript?.segments?.length && !!onSeek,
    },
  ];

  // Si la pestaña pedida no existe para esta lección —un video sin transcripción, por
  // ejemplo— se cae a la primera disponible en vez de dejar el panel en blanco.
  const disponibles = tabs.filter((t) => t.available);
  const tabVigente = disponibles.some((t) => t.id === activeTab)
    ? activeTab
    : disponibles[0]?.id || "videos";

  return (
    <>
      {/* Sólo para ABRIR. Con el panel abierto el cierre vive colgado del
          borde: un botón flotando sobre el panel acababa encima de las
          pestañas. */}
      {!isOpen && (
        <UnifiedMenuButton
          x={buttonX}
          onToggle={() => setIsOpen(true)}
          isOpen={false}
        />
      )}

      {/* Unified Menu Container */}
      <UnifiedMenuContainer
        isOpen={isOpen}
        x={springX}
        onOutsideClick={() => setIsOpen(false)}
        menuWidth={menuWidth}
        onClose={() => setIsOpen(false)}
      >
        {/* Header with tabs */}
        <div className="px-4 py-4 border-b border-gray-700/50">
          {/* Sin la etiqueta, el nombre del programa se confunde con el
              título del video que se está viendo. */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-brand-500">
                Curso
              </p>
              <h2 className="text-lg font-semibold text-white mb-3 truncate">
                {courseTitle}
              </h2>
            </div>
            {/* En móvil el panel ocupa toda la pantalla y el botón flotante que
                lo abre queda debajo: sin esta ✕ no había forma de volver al
                video. */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar el menú"
              className="-mr-1 shrink-0 rounded-full p-2 text-2xl text-brand-100 transition-colors hover:text-white lg:hidden"
            >
              <IoMdClose />
            </button>
          </div>

          {/* Tabs Navigation */}
          {/* Rejilla de dos columnas: con cuatro pestañas en una sola fila de 320px los
              textos se truncaban a "Transc…" y no se entendía nada. */}
          <div className="grid grid-cols-2 gap-1 bg-gray-800/50 rounded-lg p-1">
            {tabs
              .filter((tab) => tab.available)
              .map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    // `min-w-0` + `truncate`: con tres pestañas, "Transcripción" se
                    // salía de la barra y aparecía un scroll horizontal.
                    "min-w-0 flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-medium transition-all",
                    {
                      "bg-brand-500 text-brand-900": tabVigente === tab.id,
                      "text-gray-400 hover:text-gray-200":
                        tabVigente !== tab.id,
                    },
                  )}
                >
                  <span className="shrink-0">{tab.icon}</span>
                  <span className="truncate">{tab.label}</span>
                </button>
              ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="scrollbar-sutil flex min-h-0 flex-1 flex-col overflow-y-auto">
          <AnimatePresence mode="wait">
            {tabVigente === "videos" && (
              <motion.div
                key="videos"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="p-4"
              >
                <VideosContent
                  moduleNames={moduleNames}
                  videos={videos}
                  courseSlug={courseSlug}
                  courseTitle={courseTitle}
                  currentVideoSlug={currentVideoSlug}
                  isLocked={isLocked}
                  isSubscribed={isSubscribed}
                  sequenceUnlocks={sequenceUnlocks}
                  completed={completed}
                  videosCompleted={videosCompleted}
                  checkIfWatched={checkIfWatched}
                  onSelect={() => setActiveTab("transcript")}
                />
              </motion.div>
            )}

            {tabVigente === "notes" && markdownBody && (
              <motion.div
                key="notes"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="p-4"
              >
                <NotesContent
                  body={markdownBody}
                  title={
                    videos.find((v: any) => v?.slug === currentVideoSlug)?.title
                  }
                />
              </motion.div>
            )}

            {tabVigente === "resources" && resources.length > 0 && (
              <motion.div
                key="resources"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="p-4"
              >
                <ResourcesContent
                  resources={resources}
                  courseSlug={courseSlug}
                  videoSlug={currentVideoSlug || ""}
                />
              </motion.div>
            )}

            {tabVigente === "transcript" && transcript && onSeek && (
              <motion.div
                key="transcript"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                // Ocupa lo que quede de la barra, ni más ni menos. Antes era
                // `h-[70vh]`: una altura fija que no llega al fondo del panel,
                // así que quedaba un hueco muerto debajo del aviso y los
                // capítulos no podían crecer para llenarlo.
                className="flex min-h-0 flex-1 flex-col px-4 pt-4"
              >
                <TranscriptPanel
                  // `?? undefined` y no `||`: un transcript recién ingestado trae
                  // `chapters: null` —los capítulos se generan después— y un null
                  // explícito NO dispara el valor por omisión del parámetro, así
                  // que adentro reventaba al leerle `.length`.
                  segments={transcript.segments ?? []}
                  chapters={transcript.chapters ?? undefined}
                  currentTime={currentTime}
                  onSeek={onSeek}
                  courseId={courseId}
                  courseSlug={courseSlug}
                  videoSlug={currentVideoSlug || ""}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </UnifiedMenuContainer>
    </>
  );
};

// Subcomponents
const UnifiedMenuButton = ({
  isOpen,
  x = 0,
  onToggle,
}: {
  x?: MotionValue | number;
  onToggle?: () => void;
  isOpen?: boolean;
}) => {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      // Justo encima del panel que abre, y por debajo de cualquier cajón.
      style={{ x, zIndex: LAYER.sidebar + 1 }}
      onClick={onToggle}
      className={cn(
        "fixed bg-[#0C1115] border border-gray-600/40 text-4xl w-14 h-14 text-white p-2 flex items-center justify-center hover:bg-gray-800/80 transition-colors shadow-lg",
        // Siempre en el mismo sitio, abierto o cerrado: si se mueve al abrir, hay que
        // volver a buscarlo para cerrar. El choque con las pestañas se resuelve
        // dejándoles hueco a la derecha, no moviendo el botón.
        "top-20",
        {
          "rounded-r-2xl left-0": !isOpen,
          "rounded-2xl": isOpen,
        },
      )}
    >
      <AnimatePresence mode="popLayout">
        {isOpen ? (
          <motion.span
            key="close"
            initial={{ filter: "blur(9px)", opacity: 0 }}
            animate={{ filter: "blur(0px)", opacity: 1 }}
            exit={{ filter: "blur(9px)", opacity: 0 }}
          >
            <IoMdClose className="text-2xl" />
          </motion.span>
        ) : (
          <motion.span
            key="open"
            initial={{ filter: "blur(9px)", opacity: 0 }}
            animate={{ filter: "blur(0px)", opacity: 1 }}
            exit={{ filter: "blur(9px)", opacity: 0 }}
          >
            <BsMenuButtonWide className="text-2xl" />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

const UnifiedMenuContainer = ({
  children,
  x = 0,
  onOutsideClick,
  onClose,
  isOpen = false,
  menuWidth,
}: {
  children: ReactNode;
  isOpen?: boolean;
  x?: MotionValue | number;
  onOutsideClick?: () => void;
  onClose?: () => void;
  menuWidth: number;
}) => {
  const ref = useClickOutside({ isActive: isOpen, onOutsideClick });
  // El desvanecido de abajo mordía el último 10% de la barra: en la pestaña de
  // transcripción eso se comía el aviso del pie y dejaba un hueco que parecía
  // un error de maquetación. 10% de una barra de 1300px son 130px. Se conserva
  // el efecto, en una franja que sólo suaviza el corte.
  const maskImage = useMotionTemplate`linear-gradient(to bottom, white 97%, transparent 100%)`;

  return (
    <motion.div
      ref={ref}
      style={{
        x,
        width: menuWidth,
        zIndex: LAYER.sidebar,
      }}
      className={cn(
        "fixed h-screen bg-[#0C1115] top-0 left-0 flex flex-col",
        "shadow-2xl border-r border-gray-700/50",
      )}
    >
      {/* La máscara va AQUÍ y no en el contenedor: aplicada al padre recortaba todo lo
          que sobresale, y el botón de cerrar —que cuelga del borde— salía cortado. */}
      <motion.div
        style={{ maskImage }}
        className="flex min-h-0 flex-1 flex-col"
      >
        {children}
      </motion.div>

      {/* El mismo botón flotante de siempre, pero COLGADO DEL PANEL: así su posición es
          `left-full` y no una cuenta de anchos que el servidor y el cliente resolvían
          distinto. Va FUERA del panel, sin pisarlo: montarlo sobre el borde lo dejaba
          encimado con las pestañas. */}
      {/* Sólo con el panel abierto: al cerrarse, el panel se desliza fuera de la
          pantalla y el botón viaja con él, así que reaparecía por el lado izquierdo
          detrás del botón de abrir. */}
      {isOpen && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar menú"
          className="absolute left-full top-20 ml-2 grid h-14 w-14 place-items-center rounded-2xl border border-gray-600/40 bg-[#0C1115] text-white shadow-lg transition-colors hover:bg-gray-800/80"
        >
          <IoMdClose className="text-2xl" />
        </button>
      )}
    </motion.div>
  );
};

// Content Components
const VideosContent = ({
  moduleNames,
  videos,
  courseSlug,
  courseTitle,
  currentVideoSlug,
  isLocked,
  isSubscribed,
  sequenceUnlocks,
  completed,
  videosCompleted,
  checkIfWatched,
  onSelect,
}: {
  /** Se dispara al abrir una lección: el menú salta a su transcripción. */
  onSelect?: () => void;
  moduleNames: string[];
  videos: Partial<Video>[];
  courseSlug: string;
  courseTitle?: string;
  currentVideoSlug?: string;
  isLocked?: boolean;
  isSubscribed?: boolean;
  /** Veredicto del servidor por slug para los videos de una secuencia. */
  sequenceUnlocks?: Record<
    string,
    { unlocked: boolean; unlocksAt: string | null; enrolled?: boolean }
  >;
  completed: string[];
  videosCompleted: string[];
  checkIfWatched: (slug: string) => boolean;
}) => {
  return (
    <div className="space-y-4">
      {moduleNames.map((moduleName, index) => {
        // El filtro se resuelve UNA vez: lo necesitan la lista y el recuento del
        // encabezado, y repetirlo abría la puerta a que dijeran cosas distintas.
        const delModulo = videos
          .filter((vid) =>
            moduleName === "nomodules" ? true : vid.moduleName === moduleName,
          )
          .sort((a, b) => (a.index < b.index ? -1 : 1));

        return (
          <div key={index}>
            <ModuleHeader
              title={moduleName === "nomodules" ? courseTitle : moduleName}
              lecciones={delModulo.length}
              minutos={totalMinutos(delModulo)}
              primero={index === 0}
              isCompleted={completed.includes(moduleName)}
            />

            <div className="space-y-2">
              {delModulo.map((v) => {
                const accessLevel = (v as any)?.accessLevel || "paid";
                // Las entregas de una secuencia las resuelve el servidor: aquí
                // solo se lee su veredicto y la fecha en que se abren.
                const unlock = v?.slug ? sequenceUnlocks?.[v.slug] : undefined;
                // Quien compró ve todo: `isLocked` llega como !isPurchased, así
                // que en cuanto es false ya no hay nada que esperar. Iba primero
                // en la rama de secuencia y NO en la de suscriptor, y por eso un
                // webinar del curso comprado se abría al hacer clic pero se
                // pintaba con candado y cursor de prohibido: el servidor decía
                // que sí (`resolveAccess` mira `isPurchased` antes que nada) y
                // la lista decía que no.
                const videoIsLocked =
                  accessLevel === "public"
                    ? false
                    : accessLevel === "subscriber"
                      ? isLocked && !isSubscribed
                      : accessLevel === "sequence"
                        ? isLocked && !unlock?.unlocked
                        : isLocked; // paid

                return (
                  <VideoListItem
                    key={v?.id}
                    isLocked={videoIsLocked}
                    unlocksAt={unlock?.unlocksAt}
                    isCompleted={videosCompleted.includes(v?.slug)}
                    isCurrent={currentVideoSlug === v?.slug}
                    slug={v?.slug || ""}
                    title={v?.title || ""}
                    duration={v?.duration || 0}
                    courseSlug={courseSlug}
                    accessLevel={accessLevel}
                    // `m3u8` cuenta: un video procesado a HLS no necesita
                    // `storageLink`, y sin esto la lección salía marcada "en
                    // construcción" y con el enlace muerto.
                    hasContent={
                      !!(v as any)?.storageLink ||
                      !!(v as any)?.youtubeUrl ||
                      !!(v as any)?.m3u8
                    }
                    onSelect={onSelect}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ICONO_POR_TIPO: Record<string, string> = {
  slides: "🖥️",
  pdf: "📄",
  repo: "💻",
  link: "🔗",
};

const ResourcesContent = ({
  resources,
  courseSlug,
  videoSlug,
}: {
  resources: {
    slug: string;
    kind: string;
    title: string;
    externalUrl: string | null;
    videoId: string | null;
  }[];
  courseSlug: string;
  videoSlug: string;
}) => {
  const deLaPieza = resources.filter((r) => r.videoId);
  const delCurso = resources.filter((r) => !r.videoId);

  const Item = ({ r }: { r: (typeof resources)[number] }) => (
    <li>
      <a
        // Canónica del material. La ruta decide si se puede abrir; aquí sólo se lista.
        href={`/cursos/${courseSlug}/${videoSlug}/${r.slug}`}
        // Pestaña nueva: abrir unas slides encima del video te saca de la clase y
        // pierdes el minuto en el que ibas.
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-start gap-3 rounded-lg px-2 py-2.5 text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
      >
        <span className="text-base leading-none">
          {ICONO_POR_TIPO[r.kind] || "📎"}
        </span>
        <span className="min-w-0">
          <span className="block">{r.title}</span>
          <span className="block text-xs capitalize text-gray-500">
            {r.kind}
          </span>
        </span>
      </a>
    </li>
  );

  return (
    <div className="space-y-4">
      {deLaPieza.length > 0 && (
        <div>
          <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
            De esta lección
          </p>
          <ul className="space-y-0.5">
            {deLaPieza.map((r) => (
              <Item key={r.slug} r={r} />
            ))}
          </ul>
        </div>
      )}
      {delCurso.length > 0 && (
        <div>
          <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Del curso
          </p>
          <ul className="space-y-0.5">
            {delCurso.map((r) => (
              <Item key={r.slug} r={r} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const NotesContent = ({ body, title }: { body: string; title?: string }) => {
  return (
    <>
      {/* De qué video son estas notas: el panel se abre solo y sin el título no
        hay forma de saber a qué lección pertenece lo que se está leyendo. */}
      {title && (
        <h2 className="mb-4 border-b border-brand-100/10 pb-3 text-lg font-bold leading-snug text-white">
          {title}
        </h2>
      )}
      <div className="dark prose prose-invert max-w-none prose-base prose-headings:font-bold prose-h1:text-xl prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-2 prose-h3:text-base prose-p:leading-relaxed prose-p:text-brand-100 prose-li:text-brand-100 prose-li:my-0.5 prose-strong:text-white prose-a:text-brand-500 prose-a:no-underline hover:prose-a:underline prose-code:text-brand-500 prose-code:before:content-none prose-code:after:content-none prose-img:rounded-xl prose-img:my-4 prose-hr:border-brand-100/10">
        <Streamdown
          plugins={{ code }}
          shikiTheme={["one-dark-pro", "one-dark-pro"]}
        >
          {body}
        </Streamdown>
      </div>
    </>
  );
};

/**
 * Minutos de una lección. `duration` es un String? en el schema y se guarda como
 * MINUTOS DECIMALES (12.5 = 12m 30s), no como segundos.
 */
const formatDuration = (mins: number | string | null | undefined) => {
  const totalMins = +(mins || 0);
  if (!totalMins || isNaN(totalMins)) return "";
  const m = Math.floor(totalMins);
  const s = Math.round((totalMins - m) * 60);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
};

/**
 * Total de un módulo, en horas cuando toca: los webinars suman 161 minutos y
 * "161m" no se lee como "2h 41m".
 *
 * ⚠️ Un video sin `duration` llega como "" o null y `+""` es 0, pero `+"abc"` es
 * NaN y envenenaría la suma entera. Por eso se descarta pieza a pieza.
 */
export const totalMinutos = (vs: Partial<Video>[]) =>
  vs.reduce((acc, v) => {
    const m = +((v as any)?.duration || 0);
    return acc + (isNaN(m) ? 0 : m);
  }, 0);

export const formatTotal = (mins: number) => {
  const t = Math.round(mins);
  if (!t) return "";
  return t >= 60 ? `${Math.floor(t / 60)}h ${t % 60}m` : `${t}m`;
};

/**
 * Etiqueta de módulo. Fue una tarjeta con fondo y borde que ocupaba lo que dos
 * lecciones; hoy es una etiqueta, con el mismo peso visual que las secciones de
 * `TranscriptPanel`.
 *
 * ⚠️ **No lleva número de capítulo, y es deliberado.** El que había salía de la
 * POSICIÓN en la lista, así que un grupo que no es un módulo —los Webinars del
 * curso de sistemas agénticos— corría la cuenta y "ACP desde cero" se anunciaba
 * como Capítulo 03 mientras su propio video decía MÓDULO 02. Hoy no hay dato del
 * que sacar el número bueno: `moduleName` es un String suelto en `Video` y el
 * modelo `Module` no tiene campo de orden. El recuento sí es siempre cierto, y
 * además dice algo que el número no decía: a qué te estás metiendo.
 */
const ModuleHeader = ({
  title,
  lecciones,
  minutos,
  primero,
  isCompleted,
}: {
  isCompleted?: boolean;
  title: string;
  lecciones?: number;
  minutos?: number;
  /** El primer grupo no lleva regla arriba: no hay nada de qué separarlo. */
  primero?: boolean;
}) => {
  const total = formatTotal(minutos ?? 0);
  const cuenta =
    lecciones && lecciones > 0
      ? `${lecciones} ${lecciones === 1 ? "lección" : "lecciones"}${total ? ` · ${total}` : ""}`
      : "";

  return (
    <header
      className={cn(
        "mb-2 px-2",
        primero ? "pt-1" : "border-t border-gray-700/40 pt-4",
      )}
    >
      <h3
        className={cn(
          "text-sm font-semibold uppercase tracking-wide",
          isCompleted ? "text-green-400" : "text-gray-200",
        )}
      >
        {title}
      </h3>
      {cuenta && <p className="mt-0.5 text-[11px] text-gray-500">{cuenta}</p>}
    </header>
  );
};

const VideoListItem = ({
  isCompleted,
  courseSlug,
  duration,
  title,
  isCurrent,
  slug,
  isLocked,
  accessLevel,
  unlocksAt,
  hasContent = true,
  onSelect,
}: {
  onSelect?: () => void;
  courseSlug?: string;
  isLocked?: boolean;
  slug: string;
  isCurrent?: boolean;
  duration: number | string;
  isCompleted?: boolean;
  title: string;
  accessLevel?: string;
  /** Para las entregas de secuencia que aún no llegan. */
  unlocksAt?: string | null;
  hasContent?: boolean;
}) => {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (isCurrent && ref.current) {
      ref.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [isCurrent]);

  const isDisabled = isLocked || !hasContent;

  return (
    <Link
      ref={ref}
      // ⚠️ La pestaña viaja en la URL, no sólo en el estado. Al llegar a la lección
      // nueva, el efecto que sincroniza `defaultTab` vuelve a leer `?tab=` — y si el
      // enlace no lo lleva, lee "videos" y deshace el cambio: la transcripción se veía
      // un instante y la lista volvía sola. Parecía que la segunda navegación cancelaba
      // la primera; en realidad eran el estado y la URL contándose cosas distintas.
      to={hasContent ? `/cursos/${courseSlug}/${slug}?tab=transcript` : "#"}
      onClick={(e) => {
        if (!hasContent) {
          e.preventDefault();
          return;
        }
        // La lección que YA está abierta es el caso que obligaba a hacerlo por estado:
        // su URL no cambia, así que el router no navega y no habría nada que sincronice
        // la pestaña. Aquí se corta el enlace y se cambia a mano.
        if (isCurrent) {
          e.preventDefault();
          onSelect?.();
        }
      }}
      className={cn(
        "group relative flex items-center p-3 rounded-lg transition-all hover:bg-gray-800/50",
        {
          "bg-[#1a2332] ring-1 ring-brand-500/30": isCurrent,
          "cursor-pointer": !isDisabled,
          "cursor-not-allowed opacity-60": isDisabled,
        },
      )}
    >
      <span
        className={cn("text-lg mr-3", {
          "text-green-500": isCompleted,
          "text-brand-500": isCurrent && !isCompleted,
          "text-gray-500": !isCurrent && !isCompleted,
        })}
      >
        {isCurrent ? (
          <div className="w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center">
            <FaPlay className="text-xs text-white ml-0.5" />
          </div>
        ) : isCompleted ? (
          <MdOutlineRadioButtonChecked />
        ) : (
          <MdOutlineRadioButtonUnchecked />
        )}
      </span>

      <div className="flex-1 min-w-0">
        <div
          className="line-clamp-2 text-sm font-medium text-gray-200"
          title={title}
        >
          {title}
        </div>
      </div>

      {/* Access level indicator */}
      <div className="flex items-center gap-1.5 ml-2">
        {!hasContent && (
          <IoMdConstruct
            className="text-yellow-500 text-sm"
            title="En construcción"
          />
        )}
        {hasContent && accessLevel === "public" && (
          <IoCheckmarkCircle
            className="text-brand-500 text-sm"
            title="Gratis"
          />
        )}
        {/* ⚠️ brand-700, no brand-400: la escala `brand` de tailwind.config sólo
            tiene 100/500/600/700/800/900. Un `text-brand-400` compila y deja el
            icono SIN color — se ve casi negro sobre el fondo. */}
        {hasContent && accessLevel === "subscriber" && (
          <IoMdMail
            className="text-brand-700 text-sm"
            title="Gratis con email"
          />
        )}
        {hasContent && isLocked && (accessLevel === "paid" || !accessLevel) && (
          <IoMdLock className="text-gray-500 text-sm" title="Requiere compra" />
        )}
        {/* La entrega que todavía no llega dice CUÁNDO llega. Un candado mudo
            se lee como error del sitio; una fecha se lee como una cita.
            ⚠️ Y va JUNTO a la duración, no en su lugar: esto se llevaba la
            duración de toda lección de secuencia bloqueada —o sea de casi
            todas— y cuánto dura una clase es justo lo que quieres saber ANTES
            de que te llegue, no después. */}
        {hasContent && isLocked && accessLevel === "sequence" ? (
          formatUnlock(unlocksAt ?? null) ? (
            <span className="text-xs text-brand-500">
              {formatUnlock(unlocksAt ?? null)}
            </span>
          ) : (
            <IoMdMail
              className="text-sm text-brand-500"
              title="Llega por correo"
            />
          )
        ) : null}
        <span className="text-xs text-gray-500">
          {formatDuration(duration)}
        </span>
      </div>
    </Link>
  );
};
