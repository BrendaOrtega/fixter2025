import { useEffect, useState, type MouseEvent } from "react";
import { useSearchParams } from "react-router";
import { CoursesView, MembershipView } from "./AccountView";
import { EventsView } from "./EventsView";
import { ClubShell } from "./ClubShell";
import { RecordingsView } from "./RecordingsView";
import { WallView } from "./WallView";
import { WorldView } from "./WorldView";
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
  // Sin `?tab=` se entra al Mundo; una liga vieja a una publicación (`?post=` sin tab) abre el muro.
  const view = VIEWS.includes(tab as View) ? (tab as View) : params.get("post") ? "wall" : "world";
  return { view, postId: view === "wall" ? params.get("post") : null };
}

function searchFor(base: URLSearchParams, { view, postId }: State) {
  const next = new URLSearchParams(base);
  if (view === "world") next.delete("tab");
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

export function ClubV2(data: ClubData) {
  const { community, me, canMod, event, recordingCount } = data;
  const { view, postId, go, hrefFor } = useClubView();

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
    <ClubShell
      community={community}
      me={me}
      canMod={canMod}
      eventOpen={!!event?.open}
      recordingCount={recordingCount}
      current={view}
      navProps={navProps}
    >
      {view === "wall" && <WallView data={data} postId={postId} go={go} />}
      {view === "world" && <WorldView data={data} go={go} />}
      {view === "events" && <EventsView data={data} />}
      {view === "recs" && <RecordingsView data={data} />}
      {view === "courses" && <CoursesView data={data} />}
      {view === "me" && <MembershipView data={data} />}
    </ClubShell>
  );
}
