import { useEffect, useRef, useState, type ReactNode } from "react";
import { DotsIcon } from "./icons";

// Piezas compartidas de la casa v2 del club. Colores del skin «fixter» del mockup aprobado:
// panel #141B20, línea #232D33, tinta #F2F5F4, texto #D9E0DE, gris #7C8A8E, suave #1C252B,
// peligro #F08A80; fondo (`background`) y menta (`brand-500`) ya viven en tailwind.config.

export const card = "rounded-[10px] border border-[#232D33] bg-[#141B20]";

const btnBase =
  "inline-flex min-h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-semibold transition-colors";
/** El único botón lleno de cada sección. Apagado se ve gris, no menta. */
export const btn = `${btnBase} bg-brand-500 text-background hover:bg-brand-100 disabled:cursor-default disabled:bg-[#1C252B] disabled:text-[#9AA7AA]`;
export const btnGhost = `${btnBase} border border-[#232D33] bg-[#141B20] text-[#F2F5F4] hover:bg-[#1C252B] disabled:cursor-default disabled:text-[#7C8A8E] disabled:hover:bg-[#141B20]`;
export const textLink = "text-xs font-medium text-[#7C8A8E] underline underline-offset-2 hover:text-[#F2F5F4]";

const CDMX = "America/Mexico_City";

/** «hace 5 min», «hace 3 h» o «el 5 nov»: completa la frase «Fulano publicó …». */
export function timeAgo(iso: string) {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "hace un momento";
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `el ${new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: CDMX })}`;
}

export const longDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: CDMX });

export const shortDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: CDMX });

/** Texto plano de un cuerpo en markdown (misma limpieza que el adelanto de la home). */
function plainText(md: string) {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[#*_>`-]+/g, " ")
    .replace(/[ \t]+/g, " ");
}

/**
 * Título de un renglón del muro. Las publicaciones no tienen campo de título: sale del título
 * del enlace si lo trae, o del primer renglón con texto del cuerpo.
 */
export function postTitle(post: { body: string; link: { title: string } | null }, max = 110) {
  const fromLink = post.link?.title?.trim();
  const firstLine = plainText(post.body)
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);
  const title = fromLink || firstLine || "Publicación sin texto";
  return title.length > max ? `${title.slice(0, max).trimEnd()}…` : title;
}

// Avatares sin foto: iniciales sobre un tono fijo por persona (los seis del mockup).
const AVATAR_TONES = [
  "bg-[#17302C] text-[#85DDCB]",
  "bg-[#33291A] text-[#F2C98A]",
  "bg-[#26233F] text-[#BDB5F7]",
  "bg-[#3A2020] text-[#F4AFAF]",
  "bg-[#1A2B3D] text-[#9CC8F2]",
  "bg-[#22331A] text-[#8DCF6E]",
];
const toneFor = (id: string) =>
  AVATAR_TONES[[...id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % AVATAR_TONES.length];
const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("") || "?";

export function Avatar({
  person,
  size = 32,
}: {
  person: { id: string; name: string; photoURL: string | null };
  size?: number;
}) {
  const [broken, setBroken] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  // Si la foto falló antes de hidratar, `onError` ya no avisa: se revisa al montar.
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth === 0) setBroken(true);
  }, []);
  if (person.photoURL && !broken) {
    return (
      <img
        ref={imgRef}
        src={person.photoURL}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className="shrink-0 rounded-full bg-[#1C252B] object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full font-semibold ${toneFor(person.id)}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {initialsOf(person.name)}
    </span>
  );
}

export function Tag({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "ok" | "bad" }) {
  const tones = {
    plain: "border-[#232D33] text-[#7C8A8E]",
    ok: "border-transparent bg-[#17302C] text-brand-500",
    bad: "border-[#232D33] text-[#F08A80]",
  };
  return (
    <span className={`inline-block whitespace-nowrap rounded-full border px-[7px] py-px text-[11px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

/** Encabezado de cada sección: título y, a lo más, UN botón. */
export function SectionHead({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-[52px] items-center gap-2.5 border-b border-[#232D33] bg-[#141B20] px-4 lg:px-6">
      <h1 className="truncate text-base font-semibold text-[#F2F5F4]">{title}</h1>
      {action && <div className="ml-auto shrink-0">{action}</div>}
    </div>
  );
}

/** Ancho de lectura del contenido de una sección. */
export function Wrap({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className={`mx-auto w-full p-4 lg:p-6 ${wide ? "max-w-[860px] min-[1240px]:max-w-[1120px]" : "max-w-[860px]"}`}>
      {children}
    </div>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className={`${card} px-4 py-6 text-center text-[#7C8A8E]`}>{children}</p>;
}

/** Menú ⋯: se cierra con clic afuera o Escape. `children` recibe cómo cerrarlo. */
export function Menu({ label, children }: { label: string; children: (close: () => void) => ReactNode }) {
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
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className="-mr-1.5 grid h-8 w-7 place-items-center rounded-md text-[#7C8A8E] hover:bg-[#1C252B] hover:text-[#F2F5F4]"
      >
        <DotsIcon />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 min-w-[200px] rounded-[10px] border border-[#232D33] bg-[#141B20] p-1 shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  onSelect,
  danger = false,
  children,
}: {
  onSelect: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className={`block w-full rounded-md px-2.5 py-2 text-left text-[13px] hover:bg-[#1C252B] ${danger ? "text-[#F08A80]" : "text-[#D9E0DE]"}`}
    >
      {children}
    </button>
  );
}
