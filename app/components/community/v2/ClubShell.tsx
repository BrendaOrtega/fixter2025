import type { AnchorHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "./icons";
import { Avatar } from "./ui";
import type { View } from "./types";

// Cascarón de la casa v2 del club: barra del club, barra lateral agrupada y menú inferior en
// móvil. Lo comparten el club (`ClubV2`, que navega sin recargar) y el panel del anfitrión
// (`/comunidad/:slug/admin`, con ligas normales), para que todo se vea como una sola pantalla.

type NavEntry = { view: View; label: string; icon: IconName; group?: string };
const SIDE_NAV: NavEntry[] = [
  { view: "wall", label: "Muro", icon: "wall" },
  { view: "world", label: "Mundo", icon: "world" },
  { view: "events", label: "Eventos", icon: "calendar", group: "En vivo" },
  { view: "recs", label: "Grabaciones", icon: "recording" },
  { view: "courses", label: "Cursos incluidos", icon: "book", group: "Aprender" },
  { view: "me", label: "Mi membresía", icon: "person", group: "Tu cuenta" },
];
const TOP_NAV: Array<{ view: View; label: string }> = [
  { view: "wall", label: "Inicio" },
  { view: "world", label: "Mundo" },
  { view: "events", label: "Eventos" },
  { view: "recs", label: "Grabaciones" },
  { view: "courses", label: "Cursos" },
];
const TAB_BAR: NavEntry[] = [
  { view: "wall", label: "Muro", icon: "wall" },
  { view: "world", label: "Mundo", icon: "world" },
  { view: "events", label: "Eventos", icon: "calendar" },
  { view: "recs", label: "Grabaciones", icon: "recording" },
  { view: "me", label: "Yo", icon: "person" },
];

// Altura medida del navbar del sitio (fijo): 44 px en móvil, 60 px desde md y 78 px desde lg.
// La barra del club va justo debajo, sin encimarse.
const SITE_NAV_OFFSET = "pt-[44px] md:pt-[60px] lg:pt-[78px]";

const sideLink =
  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-sm text-[#7C8A8E] hover:bg-[#182026] aria-[current=page]:bg-[#1C252B] aria-[current=page]:font-medium aria-[current=page]:text-[#F2F5F4]";

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { "aria-current"?: "page" };

export function ClubShell({
  community,
  me,
  canMod,
  eventOpen = false,
  recordingCount = 0,
  current,
  navProps,
  children,
}: {
  community: { slug: string; name: string };
  me: { id: string; name: string; photoURL: string | null } | null;
  canMod: boolean;
  eventOpen?: boolean;
  recordingCount?: number;
  /** Sección encendida en los menús. */
  current: View | "admin";
  /** Props de la liga de cada sección (href, aria-current y, si aplica, onClick). */
  navProps: (view: View) => LinkProps;
  children: ReactNode;
}) {
  const adminHref = `/comunidad/${community.slug}/admin`;

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
                  {item.view === "events" && eventOpen && (
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
                <a href={adminHref} aria-current={current === "admin" ? "page" : undefined} className={sideLink}>
                  <Icon name="settings" />
                  Administrar club
                </a>
              </>
            )}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 pb-[76px] lg:pb-10">{children}</main>
      </div>

      {/* ── Menú inferior (móvil) ── */}
      <nav
        aria-label="Secciones del club"
        className="fixed inset-x-0 bottom-0 z-40 grid auto-cols-fr grid-flow-col border-t border-[#232D33] bg-[#141B20] pb-[calc(6px+env(safe-area-inset-bottom))] pt-1.5 lg:hidden"
      >
        {/* Con «Mundo» el anfitrión tendría siete pestañas y a 375 px se enciman: «Yo» se le quita
            del menú inferior (su avatar de la barra del club lleva al mismo lugar). */}
        {TAB_BAR.filter((item) => !(canMod && item.view === "me")).map((item) => (
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
          <a
            href={adminHref}
            aria-current={current === "admin" ? "page" : undefined}
            className="grid justify-items-center gap-0.5 py-1 text-[10px] text-[#7C8A8E] aria-[current=page]:font-semibold aria-[current=page]:text-[#F2F5F4]"
          >
            <Icon name="settings" />
            Club
          </a>
        )}
      </nav>
    </div>
  );
}
