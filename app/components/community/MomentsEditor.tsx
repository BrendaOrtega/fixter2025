// Momentos de una grabación en Administrar club (paso 1, 13-nov-2026). La IA propone un borrador,
// el anfitrión ajusta títulos y tiempos (h:mm:ss) y lo aprueba. Plan: docs/club-rediseno/MOMENTOS-PLAN.md.
import { useEffect, useState } from "react";
import { Form, useNavigation } from "react-router";
import { Plus, Sparkles, X } from "lucide-react";

type Moment = { s: number; e: number; title: string; summary: string };
type Row = { s: string; e: string; title: string; summary: string };

const fmt = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

// «1:02:03», «62:03» o «3723» → segundos; NaN si no se entiende.
const parse = (v: string) => {
  const parts = v.trim().split(":").map(Number);
  if (!parts.length || parts.length > 3 || parts.some((n) => !Number.isFinite(n) || n < 0)) return NaN;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
};

const toRows = (list: Moment[] | null): Row[] =>
  (list ?? []).map((m) => ({ s: fmt(m.s), e: fmt(m.e), title: m.title, summary: m.summary }));

const field =
  "rounded-md border border-[#232D33] bg-background px-2 py-1.5 text-sm text-[#F2F5F4] placeholder:text-[#7C8A8E] focus:border-brand-500 focus:outline-none";

export function MomentsEditor({ id, moments, approved }: { id: string; moments: Moment[] | null; approved: boolean }) {
  const nav = useNavigation();
  const busy = nav.state !== "idle" && nav.formData?.get("id") === id ? String(nav.formData.get("intent")) : null;
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>(() => toRows(moments));
  const serverKey = JSON.stringify(moments);
  // Lo que regresa el servidor (propuesta nueva o guardado) reemplaza lo editado.
  useEffect(() => setRows(toRows(moments)), [serverKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (i: number, k: keyof Row, v: string) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const invalid = rows.some((r) => !r.title.trim() || !(parse(r.e) > parse(r.s)));
  const payload = JSON.stringify(rows.map((r) => ({ s: parse(r.s), e: parse(r.e), title: r.title, summary: r.summary })));

  const status = !moments?.length ? "sin proponer" : approved ? `${moments.length} aprobados` : `${moments.length} en borrador`;

  return (
    <div className="mt-3 border-t border-[#232D33] pt-3">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-sm" aria-expanded={open}>
        <span className="font-semibold text-[#F2F5F4]">Momentos</span>
        <span className={approved ? "text-[#8DCF6E]" : "text-[#7C8A8E]"}>{status} {open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <Form method="post" className="mt-3 grid gap-3">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="moments" value={payload} />
          {rows.length === 0 && (
            <p className="text-sm text-[#7C8A8E]">La IA lee la transcripción y propone de 6 a 10 momentos. Tarda uno o dos minutos.</p>
          )}
          <ol className="grid gap-2">
            {rows.map((r, i) => (
              <li key={i} className="grid gap-1.5 rounded-lg bg-[#141B20] p-2.5">
                <div className="flex items-center gap-1.5">
                  <input aria-label="Inicio" value={r.s} onChange={(e) => set(i, "s", e.target.value)} className={`${field} w-[5.5rem] tabular-nums`} />
                  <span className="text-[#7C8A8E]">–</span>
                  <input aria-label="Fin" value={r.e} onChange={(e) => set(i, "e", e.target.value)} className={`${field} w-[5.5rem] tabular-nums`} />
                  <button
                    type="button"
                    onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                    className="ml-auto grid h-8 w-8 place-items-center rounded-md text-[#7C8A8E] hover:bg-[#1C252B] hover:text-[#F2F5F4]"
                    aria-label="Quitar momento"
                  >
                    <X size={16} />
                  </button>
                </div>
                <input aria-label="Título" value={r.title} maxLength={120} onChange={(e) => set(i, "title", e.target.value)} className={`${field} font-semibold`} placeholder="Qué pasa, con nombre propio" />
                <textarea aria-label="Resumen" value={r.summary} maxLength={300} rows={2} onChange={(e) => set(i, "summary", e.target.value)} className={field} placeholder="Una o dos frases" />
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setRows((rs) => [...rs, { s: rs.at(-1)?.e ?? "0:00:00", e: "", title: "", summary: "" }])}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-[#7C8A8E] hover:text-[#F2F5F4]"
            >
              <Plus size={14} /> Agregar
            </button>
            <button
              name="intent"
              value="rec-moments-generate"
              disabled={!!busy}
              onClick={(ev) => { if (rows.length && !confirm("La propuesta nueva reemplaza estos momentos. ¿Seguir?")) ev.preventDefault(); }}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-[#85DDCB] hover:bg-[#1C252B] disabled:opacity-50"
            >
              <Sparkles size={14} /> {busy === "rec-moments-generate" ? "Leyendo la llamada…" : rows.length ? "Proponer de nuevo" : "Proponer momentos"}
            </button>
            {rows.length > 0 && (
              <span className="ml-auto flex gap-2">
                <button name="intent" value="rec-moments-save" disabled={!!busy || invalid} className="rounded-md px-3 py-1.5 text-sm font-semibold text-[#F2F5F4] hover:bg-[#1C252B] disabled:opacity-50">
                  {busy === "rec-moments-save" ? "Guardando…" : "Guardar"}
                </button>
                <button name="intent" value="rec-moments-approve" disabled={!!busy || invalid} className="rounded-md bg-[#85DDCB] px-3 py-1.5 text-sm font-semibold text-[#0E1317] disabled:opacity-50">
                  {busy === "rec-moments-approve" ? "Aprobando…" : "Aprobar"}
                </button>
              </span>
            )}
          </div>
          {invalid && <p className="text-xs text-[#E08A7A]">Cada momento lleva título y un fin después del inicio (h:mm:ss).</p>}
        </Form>
      )}
    </div>
  );
}
