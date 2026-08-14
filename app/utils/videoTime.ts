/**
 * El momento de un video, escrito como lo escribe una persona.
 *
 * `?t=` nació aceptando solo segundos crudos (`?t=3936`), que sirve para que un
 * programa arme la liga pero no para que alguien la escriba a mano o la lea en
 * un correo. Aquí se aceptan las formas que la gente ya usa en YouTube y en
 * cualquier chat: `12m30s`, `1h05m`, `12:30`, `1:02:03`, `90s`, `90`.
 */

/** Devuelve el segundo, o `null` si el texto no es un momento válido. */
export const parseVideoTime = (raw: string | null | undefined): number | null => {
  if (!raw) return null;
  const text = raw.trim().toLowerCase();
  if (!text) return null;

  // 1:02:03 · 12:30 — el formato del reloj, que es como se lee en pantalla
  if (text.includes(":")) {
    const parts = text.split(":");
    if (parts.length > 3 || parts.some((p) => p === "" || !/^\d+$/.test(p))) return null;
    const seconds = parts.reduce((total, part) => total * 60 + Number(part), 0);
    return Number.isFinite(seconds) ? seconds : null;
  }

  // 1h02m03s · 12m30s · 90s — el formato de YouTube
  const units = text.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (units && (units[1] || units[2] || units[3])) {
    return Number(units[1] ?? 0) * 3600 + Number(units[2] ?? 0) * 60 + Number(units[3] ?? 0);
  }

  // 3936 — segundos pelones, que es lo que ya generaban los enlaces viejos
  if (/^\d+(\.\d+)?$/.test(text)) return Number(text);

  return null;
};

/** El mismo momento, escrito para que quepa en una liga legible: `1h05m20s`. */
export const formatVideoTime = (seconds: number): string => {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  // Sin ceros a la izquierda ni unidades vacías: `90s` y no `0h01m30s`.
  return [h && `${h}h`, m && `${m}m`, s && `${s}s`].filter(Boolean).join("") || "0s";
};
