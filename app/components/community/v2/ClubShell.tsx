import { useEffect, useRef, useState, type AnchorHTMLAttributes, type ReactNode } from "react";
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

// Dentro del club la barra del sitio no se muestra (ver NavBar): esta barra es la única, con el
// logo de FixterGeek a la izquierda y el menú de la cuenta en el avatar.

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
    <div className={`club-v2 min-h-screen bg-background text-sm leading-normal text-[#D9E0DE] antialiased`}>
      {/* El promo flotante del sitio (FloatingPromo: `fixed bottom-6 left-6`, hijo directo de <body>)
          cae justo encima del menú inferior; en móvil se apaga mientras esta vista esté montada. */}
      <style>{`
        .club-v2 :focus-visible { outline: 2px solid #85DDCB; outline-offset: 2px; }
        @media (max-width: 1023px) { body:has(.club-v2) > .fixed.bottom-6.left-6 { display: none; } }
      `}</style>

      {/* ── Barra del club ── */}
      <header className="z-30 flex h-[52px] items-center gap-3 border-b border-[#232D33] bg-[#141B20] px-4 lg:sticky lg:top-0">
        <a href="/" aria-label="FixterGeek, ir al inicio del sitio" className="shrink-0">
          <img src="/logo.png" alt="FixterGeek" className="h-6" />
        </a>
        <span aria-hidden className="h-5 w-px shrink-0 bg-[#232D33]" />
        <a {...navProps("wall")} aria-current={undefined} className="min-w-0 truncate text-[15px] font-semibold text-[#F2F5F4]">
          {community.name}
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
        {me && <AccountMenu me={me} membershipProps={{ ...navProps("me"), "aria-current": undefined }} />}
      </header>

      <div className="flex">
        {/* ── Barra lateral (escritorio) ── */}
        <aside className="hidden w-[228px] shrink-0 self-start border-r border-[#232D33] bg-[#141B20] px-2.5 py-3.5 lg:sticky lg:top-[52px] lg:block lg:h-[calc(100vh-52px)] lg:overflow-y-auto">
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

/** Avatar de la barra del club: abre el menú de la cuenta (membresía, perfil y cerrar sesión). */
function AccountMenu({
  me,
  membershipProps,
}: {
  me: { id: string; name: string; photoURL: string | null };
  membershipProps: LinkProps;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);
  const item = "block w-full rounded-md px-2.5 py-2 text-left text-[13px] text-[#D9E0DE] hover:bg-[#1C252B]";
  return (
    <div ref={ref} className="relative ml-auto shrink-0 lg:ml-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Tu cuenta (${me.name})`}
        onClick={() => setOpen((v) => !v)}
        className="block rounded-full"
      >
        <Avatar person={me} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 min-w-[200px] rounded-[10px] border border-[#232D33] bg-[#141B20] p-1 shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
        >
          <p className="truncate px-2.5 py-2 text-xs text-[#7C8A8E]">{me.name}</p>
          <a
            {...membershipProps}
            role="menuitem"
            className={item}
            onClick={(e) => {
              membershipProps.onClick?.(e);
              setOpen(false);
            }}
          >
            Mi membresía
          </a>
          <a href="/perfil" role="menuitem" className={item}>
            Perfil
          </a>
          <a href="/logout" role="menuitem" className={`${item} text-[#F08A80]`}>
            Cerrar sesión
          </a>
        </div>
      )}
    </div>
  );
}
