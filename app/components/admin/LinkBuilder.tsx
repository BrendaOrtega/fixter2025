import { useState } from "react";

/**
 * Arma las ligas con las que se difunde el programa.
 *
 * Existe para que las fuentes sean siempre las mismas. Escritas a mano acaban
 * como `linkedin`, `LinkedIn` y `linked-in`, que en el corte por canal aparecen
 * como tres canales distintos y no suman. Por eso son botones y no un campo de
 * texto libre.
 *
 * Los valores coinciden con los que normaliza `app/.server/origen.ts`, así que
 * una liga con `utm_source=linkedin` y una visita que llega desde lnkd.in caen
 * en el mismo cubo.
 */

const SITE = "https://www.fixtergeek.com";

const SOURCES = [
  { id: "linkedin", label: "LinkedIn" },
  { id: "youtube", label: "YouTube" },
  { id: "email", label: "Correo" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "comunidad", label: "Comunidad" },
  { id: "x", label: "X" },
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "tiktok", label: "TikTok" },
];

type Destino = { label: string; path: string };

export const LinkBuilder = ({
  destinos,
  campanaSugerida,
}: {
  destinos: Destino[];
  /** Por defecto, el programa y su edición: `sistemas-agenticos-2026-08-20`. */
  campanaSugerida: string;
}) => {
  const [path, setPath] = useState(destinos[0]?.path ?? "/");
  const [source, setSource] = useState("linkedin");
  const [campaign, setCampaign] = useState(campanaSugerida);
  // Qué pieza concreta dentro de la campaña. Con dos ligas en la misma
  // descripción de YouTube, `campaign` dice de qué video vinieron y `content`
  // cuál de los dos botones apretaron. Opcional: vacío no ensucia la URL.
  const [content, setContent] = useState("");
  const [copied, setCopied] = useState(false);

  const url = `${SITE}${path}${path.includes("?") ? "&" : "?"}utm_source=${source}${
    campaign ? `&utm_campaign=${encodeURIComponent(campaign)}` : ""
  }${content ? `&utm_content=${encodeURIComponent(content)}` : ""}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sin portapapeles queda el campo, que es seleccionable.
    }
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-4">
      <h3 className="text-sm font-medium text-gray-300">Liga para difundir</h3>
      <p className="mt-1 text-xs text-gray-500">
        Usa estas y el corte por canal cuadra. Una liga sin `utm_source` cae en
        «directo» junto con todo lo demás.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="text-xs uppercase tracking-wide text-gray-500">A dónde</span>
          <select
            value={path}
            onChange={(e) => setPath(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-200"
          >
            {destinos.map((d) => (
              <option key={d.path} value={d.path}>
                {d.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-wide text-gray-500">Campaña</span>
          <input
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
            placeholder="sin campaña"
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-200"
          />
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-wide text-gray-500">
            Pieza <span className="normal-case text-gray-600">(opcional)</span>
          </span>
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="tutorial, taller, bio…"
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-200"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {SOURCES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSource(s.id)}
            className={`rounded-full px-3 py-1 text-xs transition-colors ${
              source === s.id
                ? "bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/40"
                : "bg-gray-800 text-gray-400 hover:text-gray-200"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <code className="flex-1 truncate rounded-lg bg-gray-950 px-3 py-2 text-xs text-gray-400">
          {url}
        </code>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-lg bg-purple-500/20 px-3 py-2 text-xs text-purple-300 ring-1 ring-purple-500/40 hover:bg-purple-500/30"
        >
          {copied ? "¡Copiada!" : "Copiar"}
        </button>
      </div>
    </div>
  );
};
