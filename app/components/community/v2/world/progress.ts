// Progreso guardado de un miembro (puro): cómo se mezcla un lote que manda el navegador con lo que hay
// en la base. Lo usa el servidor para validar: sólo contadores que declara el cartucho, números finitos,
// `sum` con tope por guardado y misiones con id válido. Lo que no cumple se ignora.
import { PROGRESS_MAX_QUESTS, QUEST_ID, type Progress, type WorldStructure } from "./cartridge";

export const emptyProgress = (): Progress => ({ stats: {}, quests: [] });

export function readProgress(raw: unknown): Progress {
  const o = (raw && typeof raw === "object" ? raw : {}) as { stats?: unknown; quests?: unknown };
  const stats: Record<string, number> = {};
  if (o.stats && typeof o.stats === "object") for (const [k, v] of Object.entries(o.stats)) if (typeof v === "number" && Number.isFinite(v)) stats[k] = v;
  const quests = Array.isArray(o.quests) ? o.quests.filter((q): q is string => typeof q === "string" && QUEST_ID.test(q)).slice(0, PROGRESS_MAX_QUESTS) : [];
  return { stats, quests };
}

export function mergeProgress(structure: WorldStructure, current: Progress, batch: unknown): Progress {
  const decl = structure.progress ?? {};
  const b = readProgress(batch), next: Progress = { stats: { ...current.stats }, quests: [...current.quests] };
  for (const [k, v] of Object.entries(b.stats)) {
    const d = Object.hasOwn(decl, k) ? decl[k] : null; if (!d) continue;
    const c = next.stats[k];
    if (d.merge === "sum") { if (v > 0) next.stats[k] = (c ?? 0) + Math.min(Math.round(v), d.max); }
    else if (v >= 0 && v <= d.max) next.stats[k] = c === undefined ? v : d.merge === "max" ? Math.max(c, v) : Math.min(c, v);
  }
  for (const q of b.quests) if (!next.quests.includes(q) && next.quests.length < PROGRESS_MAX_QUESTS) next.quests.push(q);
  return next;
}
