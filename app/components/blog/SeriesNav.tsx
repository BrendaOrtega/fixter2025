import { Link } from "react-router";

type SeriePost = { slug: string; title: string };

export type Serie = {
  serie: string;
  meta: { title: string; description: string };
  posts: SeriePost[];
  index: number;
  prev: SeriePost | null;
  next: SeriePost | null;
};

/** Badge de "Parte N de M". Va arriba del post, antes del cuerpo. */
export const SeriesBadge = ({ serie }: { serie: Serie }) => (
  <Link
    to={`/blog/serie/${serie.serie}`}
    className="inline-flex flex-wrap items-center gap-2 rounded-full bg-brand-500/10 hover:bg-brand-500/20 transition-colors px-4 py-1.5 text-xs font-semibold text-brand-500"
  >
    {serie.meta.title}
    <span className="opacity-70">
      Parte {serie.index + 1} de {serie.posts.length}
    </span>
  </Link>
);

/**
 * Navegación anterior/siguiente al pie. La anterior va primero para que el
 * ladder se lea de izquierda a derecha.
 */
export const SeriesNav = ({ serie }: { serie: Serie }) => (
  <nav
    aria-label="Navegación de la serie"
    className="mt-16 pt-8 border-t border-white/10"
  >
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
      {serie.meta.title} · parte {serie.index + 1} de {serie.posts.length}
    </p>

    <div className="grid gap-4 sm:grid-cols-2 mt-4">
      {serie.prev ? (
        <Link
          to={`/blog/${serie.prev.slug}`}
          className="block rounded-2xl bg-white/5 hover:bg-white/10 transition-colors p-5"
        >
          <span className="text-xs text-gray-400">← Parte {serie.index}</span>
          <span className="block font-semibold text-white text-base leading-snug mt-1.5">
            {serie.prev.title}
          </span>
        </Link>
      ) : (
        <span />
      )}

      {serie.next && (
        <Link
          to={`/blog/${serie.next.slug}`}
          className="block rounded-2xl bg-brand-500/15 hover:bg-brand-500/25 transition-colors p-5"
        >
          <span className="text-xs text-brand-500">
            Sigue la parte {serie.index + 2} →
          </span>
          <span className="block font-semibold text-white text-base leading-snug mt-1.5">
            {serie.next.title}
          </span>
        </Link>
      )}
    </div>

    <Link
      to={`/blog/serie/${serie.serie}`}
      className="inline-block text-sm text-brand-500 hover:opacity-80 transition-opacity mt-5"
    >
      Ver la serie completa →
    </Link>
  </nav>
);
