import { useEffect, useState, type MouseEvent } from "react";
import { useSearchParams } from "react-router";
import { CoursesView, MembershipView } from "./AccountView";
import { EventsView } from "./EventsView";
import { Icon, type IconName } from "./icons";
import { RecordingsView } from "./RecordingsView";
import { Avatar } from "./ui";
import { WallView } from "./WallView";
import { VIEWS, type ClubData, type Go, type View } from "./types";

// Casa del club, versión 2 (rediseño aprobado: docs/club-rediseno/mockup-comunidad-v2.html).
// Estructura de Circle: barra del club, barra lateral agrupada, encabezado de sección con un
// botón, muro en renglones y menú inferior en móvil. Sólo cambia la presentación: los datos
// son los del loader de /comunidad/:slug y los envíos usan sus mismos `intent`.
//
// Se monta desde la ruta sólo para quien está adentro y con `?v=2`. La ruta ya llama a
// `useWallRefresh`; aquí no se repite.
//
// ⚠️ Nada arranca en `opacity: 0`: el HTML del servidor llega visible.

type State = { view: View; postId: string | null };

function readState(params: URLSearchParams): State {
  const tab = params.get("tab");
  const view = VIEWS.includes(tab as View) ? (tab as View) : "wall";
  return { view, postId: view === "wall" ? params.get("post") : null };
}

function searchFor(base: URLSearchParams, { view, postId }: State) {
  const next = new URLSearchParams(base);
  if (view === "wall") next.delete("tab");
  else next.set("tab", view);
  if (postId) next.set("post", postId);
  else next.delete("post");
  return `?${next}`;
}

/**
 * La vista vive en estado local y se refleja en la URL (`?tab=` y `?post=`) con
 * `history.pushState`: cambiar de sección no vuelve a correr el loader, la liga se puede
 * compartir y «atrás» regresa a la sección anterior.
 */
function useClubView() {
  const [params] = useSearchParams();
  const [state, setState] = useState<State>(() => readState(params));
  useEffect(() => {
    const onPopState = () => setState(readState(new URLSearchParams(window.location.search)));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  const go: Go = (view, postId = null) => {
    const next: State = { view, postId: view === "wall" ? postId : null };
    const search = searchFor(new URLSearchParams(window.location.search), next);
    if (search !== window.location.search) window.history.pushState(window.history.state, "", search);
    setState(next);
    window.scrollTo({ top: 0 });
  };
  /** Liga real de cada sección: abre en otra pestaña y funciona antes de hidratar. */
  const hrefFor = (view: View) => searchFor(params, { view, postId: null });
  return { ...state, go, hrefFor };
}

type NavEntry = { view: View; label: string; icon: IconName; group?: string };
const SIDE_NAV: NavEntry[] = [
  { view: "wall", label: "Muro", icon: "wall" },
  { view: "events", label: "Eventos", icon: "calendar", group: "En vivo" },
  { view: "recs", label: "Grabaciones", icon: "recording" },
  { view: "courses", label: "Cursos incluidos", icon: "book", group: "Aprender" },
  { view: "me", label: "Mi membresía", icon: "person", group: "Tu cuenta" },
];
const TOP_NAV: Array<{ view: View; label: string }> = [
  { view: "wall", label: "Inicio" },
  { view: "events", label: "Eventos" },
  { view: "recs", label: "Grabaciones" },
  { view: "courses", label: "Cursos" },
];
const TAB_BAR: NavEntry[] = [
  { view: "wall", label: "Muro", icon: "wall" },
  { view: "events", label: "Eventos", icon: "calendar" },
  { view: "recs", label: "Grabaciones", icon: "recording" },
  { view: "me", label: "Yo", icon: "person" },
];

// Altura medida del navbar del sitio (fijo): 44 px en móvil, 60 px desde md y 78 px desde lg.
// La barra del club va justo debajo, sin encimarse.
const SITE_NAV_OFFSET = "pt-[44px] md:pt-[60px] lg:pt-[78px]";

const sideLink =
  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-sm text-[#7C8A8E] hover:bg-[#182026] aria-[current=page]:bg-[#1C252B] aria-[current=page]:font-medium aria-[current=page]:text-[#F2F5F4]";

export function ClubV2(data: ClubData) {
  const { community, me, canMod, event, recordingCount } = data;
  const { view, postId, go, hrefFor } = useClubView();
  const adminHref = `/comunidad/${community.slug}/admin`;

  /** Props de una liga de sección: navega sin recargar, salvo clic con modificador. */
  const navProps = (target: View) => ({
    href: hrefFor(target),
    "aria-current": view === target ? ("page" as const) : undefined,
    onClick: (e: MouseEvent<HTMLAnchorElement>) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      go(target);
    },
  });

  return (
    <div className={`club-v2 min-h-screen bg-background ${SITE_NAV_OFFSET} text-sm leading-normal text-[#D9E0DE] antialiased`}>
      {/* El promo flotante del sitio (FloatingPromo: `fixed bottom-6 left-6`, hijo directo de <body>)
          cae justo encima del menú inferior; en móvil se apaga mientras esta vista esté montada. */}
      <style>{`
        .club-v2 :focus-visible { outline: 2px solid #85DDCB; outline-offset: 2px; }
        @media (max-width: 1023px) { body:has(.club-v2) > .fixed.bottom-6.left-6 { display: none; } }
      `}</style>

      {/* ── Barra del club ── */}
      <header className="z-30 flex h-[52px] items-center gap-3 border-y border-[#232D33] bg-[#141B20] px-4 lg:sticky lg:top-[78px]">
        <a {...navProps("wall")} aria-current={undefined} className="flex min-w-0 items-center gap-2 text-[15px] font-semibold text-[#F2F5F4]">
          <span aria-hidden className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-md bg-brand-500 font-mono text-[11px] font-bold text-background">
            {"</>"}
          </span>
          <span className="truncate">{community.name}</span>
        </a>
        <nav aria-label="Secciones del club" className="mx-auto hidden gap-0.5 lg:flex">
          {TOP_NAV.map((item) => (
            <a
              key={item.view}
              {...navProps(item.view)}
              className="rounded-full px-3 py-1.5 text-[13px] font-medium text-[#7C8A8E] hover:text-[#F2F5F4] aria-[current=page]:bg-[#1C252B] aria-[current=page]:text-[#F2F5F4]"
            >
              {item.label}
            </a>
          ))}
        </nav>
        {me && (
          <a {...navProps("me")} aria-current={undefined} aria-label={`Mi membresía (${me.name})`} className="ml-auto shrink-0 rounded-full lg:ml-0">
            <Avatar person={me} />
          </a>
        )}
      </header>

      <div className="flex">
        {/* ── Barra lateral (escritorio) ── */}
        <aside className="hidden w-[228px] shrink-0 self-start border-r border-[#232D33] bg-[#141B20] px-2.5 py-3.5 lg:sticky lg:top-[130px] lg:block lg:h-[calc(100vh-130px)] lg:overflow-y-auto">
          <nav aria-label="Club">
            {SIDE_NAV.map((item) => (
              <div key={item.view}>
                {item.group && <p className="mx-2.5 mb-1.5 mt-[18px] text-[13px] font-semibold text-[#F2F5F4]">{item.group}</p>}
                <a {...navProps(item.view)} className={sideLink}>
                  <Icon name={item.icon} />
                  {item.label}
                  {item.view === "events" && event?.open && (
                    <span className="ml-auto h-[7px] w-[7px] rounded-full bg-brand-500 ring-[3px] ring-[#17302C]">
                      <span className="sr-only">La sala está abierta</span>
                    </span>
                  )}
                  {item.view === "recs" && recordingCount > 0 && <span className="ml-auto text-xs">{recordingCount}</span>}
                </a>
              </div>
            ))}
            {canMod && (
              <>
                <p className="mx-2.5 mb-1.5 mt-[18px] text-[13px] font-semibold text-[#F2F5F4]">Anfitrión</p>
                <a href={adminHref} className={sideLink}>
                  <Icon name="settings" />
                  Administrar club
                </a>
              </>
            )}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 pb-[76px] lg:pb-10">
          {view === "wall" && <WallView data={data} postId={postId} go={go} />}
          {view === "events" && <EventsView data={data} />}
          {view === "recs" && <RecordingsView data={data} />}
          {view === "courses" && <CoursesView data={data} />}
          {view === "me" && <MembershipView data={data} />}
        </main>
      </div>

      {/* ── Menú inferior (móvil) ── */}
      <nav
        aria-label="Secciones del club"
        className="fixed inset-x-0 bottom-0 z-40 grid auto-cols-fr grid-flow-col border-t border-[#232D33] bg-[#141B20] pb-[calc(6px+env(safe-area-inset-bottom))] pt-1.5 lg:hidden"
      >
        {TAB_BAR.map((item) => (
          <a
            key={item.view}
            {...navProps(item.view)}
            className="grid justify-items-center gap-0.5 py-1 text-[10px] text-[#7C8A8E] aria-[current=page]:font-semibold aria-[current=page]:text-[#F2F5F4]"
          >
            <Icon name={item.icon} />
            {item.label}
          </a>
        ))}
        {canMod && (
          <a href={adminHref} className="grid justify-items-center gap-0.5 py-1 text-[10px] text-[#7C8A8E]">
            <Icon name="settings" />
            Club
          </a>
        )}
      </nav>
    </div>
  );
}
