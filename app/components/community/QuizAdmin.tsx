// Pestaña «Quizzes» del admin del club: los quizzes de ESTA comunidad, su editor, las partidas
// jugadas y los coanfitriones. Habla con la ruta de recurso `/comunidad/:slug/quiz` por fetch y
// al guardar pide al loader del admin que se vuelva a leer.
import { useEffect, useState } from "react";
import { useRevalidator } from "react-router";
import { btn, btnGhost, card, textLink } from "./v2/ui";

export type QuizRow = { id: string; subject: string; questionCount: number };
export type GameRow = {
  id: string;
  subject: string;
  live: boolean;
  at: string;
  membersOnly: boolean;
  players: number;
  top: Array<{ username: string; points: number; rank: number }>;
};
type Question = { question: string; answers: string[]; solution: number; time: number; image?: string };
type Draft = { id: string | null; subject: string; questions: Question[] };

const TIMES = [10, 20, 30, 60];
const LETTERS = ["A", "B", "C", "D"];
const input =
  "w-full rounded-[10px] border border-[#232D33] bg-background px-3 py-2.5 text-sm text-[#F2F5F4] placeholder:text-[#7C8A8E] focus:border-brand-500 focus:outline-none";
const label = "mb-2 block text-[13px] font-semibold text-[#7C8A8E]";
const blankQuestion = (): Question => ({ question: "", answers: ["", ""], solution: 0, time: 20 });

const when = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City" });

async function post(endpoint: string, body: URLSearchParams) {
  try {
    const res = await fetch(endpoint, { method: "POST", body });
    return (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; id?: string };
  } catch {
    return { error: "Sin conexión. Intenta de nuevo." };
  }
}

export function QuizAdmin({ slug, quizzes, games, hosts }: { slug: string; quizzes: QuizRow[]; games: GameRow[]; hosts: string[] }) {
  const endpoint = `/comunidad/${slug}/quiz`;
  const { revalidate } = useRevalidator();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const edit = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`${endpoint}?quiz=${id}`, { headers: { accept: "application/json" } });
      const body = (await res.json()) as { quiz?: Draft; error?: string };
      if (body.quiz) setDraft(body.quiz);
      else setError(body.error ?? "No pude abrir el quiz.");
    } catch {
      setError("Sin conexión. Intenta de nuevo.");
    }
  };

  if (draft) {
    return (
      <Editor
        endpoint={endpoint}
        slug={slug}
        initial={draft}
        onClose={() => {
          setDraft(null);
          revalidate();
        }}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 [&>*]:min-w-0">
      <section>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-[13px] font-semibold text-[#7C8A8E]">Tus quizzes</h2>
          <button type="button" className={btn} onClick={() => setDraft({ id: null, subject: "", questions: [blankQuestion()] })}>
            Nuevo quiz
          </button>
        </div>
        {error && <p className="mb-2 text-[13px] text-[#F08A80]">{error}</p>}
        {quizzes.length === 0 ? (
          <p className={`${card} p-4 text-sm text-[#7C8A8E]`}>
            Todavía no hay quizzes. Crea el primero con «Nuevo quiz»: unas cuantas preguntas de opción múltiple bastan para abrir una llamada.
          </p>
        ) : (
          <ul className={`${card} divide-y divide-[#232D33]`}>
            {quizzes.map((q) => (
              <li key={q.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1 basis-40">
                  <p className="truncate text-sm font-semibold text-[#F2F5F4]">{q.subject}</p>
                  <p className="text-xs text-[#7C8A8E]">{q.questionCount === 1 ? "1 pregunta" : `${q.questionCount} preguntas`}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" className={btnGhost} onClick={() => edit(q.id)}>Editar</button>
                  <a className={btn} href={`/comunidad/${slug}/quiz/lanzar?quiz=${q.id}`}>Lanzar</a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-[13px] font-semibold text-[#7C8A8E]">Partidas</h2>
        {games.length === 0 ? (
          <p className={`${card} p-4 text-sm text-[#7C8A8E]`}>Aquí aparece cada partida que lances, con su podio.</p>
        ) : (
          <ul className={`${card} divide-y divide-[#232D33]`}>
            {games.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                <div className="min-w-0 flex-1 basis-48">
                  <p className="truncate text-sm font-semibold text-[#F2F5F4]">{g.subject}</p>
                  <p className="text-xs text-[#7C8A8E]">
                    {[
                      g.live ? "En curso" : when(g.at),
                      g.players > 0 ? `${g.players} ${g.players === 1 ? "jugador" : "jugadores"}` : null,
                      g.membersOnly ? "sólo miembros" : "abierta con PIN",
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
                {g.top.length > 0 ? (
                  <ol className="flex flex-wrap gap-1.5">
                    {g.top.map((p) => (
                      <li key={p.rank} className="rounded-full bg-[#1C252B] px-2.5 py-1 text-xs text-[#F2F5F4]">
                        {p.rank}º {p.username}
                        {p.rank === 1 ? `, ${p.points.toLocaleString("es-MX")} puntos` : ""}
                      </li>
                    ))}
                  </ol>
                ) : (
                  !g.live && <p className="text-xs text-[#7C8A8E]">Se terminó antes del podio</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Hosts endpoint={endpoint} initial={hosts} />
    </div>
  );
}

function Hosts({ endpoint, initial }: { endpoint: string; initial: string[] }) {
  const [emails, setEmails] = useState(initial);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const save = async (next: string[]) => {
    setError(null);
    const body = new URLSearchParams({ intent: "hosts-save" });
    next.forEach((e) => body.append("email", e));
    const reply = (await post(endpoint, body)) as { ok?: boolean; error?: string; emails?: string[] };
    if (reply.ok && reply.emails) setEmails(reply.emails);
    else setError(reply.error ?? "No pude guardar.");
  };
  const add = () => {
    const email = value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Escribe un correo completo, como ana@ejemplo.com.");
    setValue("");
    if (!emails.includes(email)) save([...emails, email]);
  };

  return (
    <section>
      <h2 className="mb-2 text-[13px] font-semibold text-[#7C8A8E]">Coanfitriones: también pueden lanzar quizzes</h2>
      <div className={`${card} p-4`}>
        <div className="flex flex-wrap items-center gap-2">
          {emails.map((email) => (
            <span key={email} className="inline-flex items-center gap-1 rounded-full bg-[#1C252B] py-1 pl-3 pr-1 text-xs text-[#F2F5F4]">
              {email}
              <button
                type="button"
                aria-label={`Quitar a ${email}`}
                onClick={() => save(emails.filter((e) => e !== email))}
                className="grid h-6 w-6 place-items-center rounded-full text-[#7C8A8E] hover:bg-[#232D33] hover:text-[#F08A80]"
              >
                <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </button>
            </span>
          ))}
          <form
            className="flex min-w-0 flex-1 basis-64 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
          >
            <input
              type="email"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="correo@ejemplo.com"
              aria-label="Correo del coanfitrión"
              className={`${input} !rounded-full !py-1.5`}
            />
            <button type="submit" className={btnGhost}>Agregar</button>
          </form>
        </div>
        <p className="mt-3 text-xs text-[#7C8A8E]">Usa el correo con el que esa persona entra a FixterGeek. Lanza desde la llamada o desde «Lanzar un quiz»; editar los quizzes sigue siendo tuyo.</p>
        {error && <p className="mt-2 text-[13px] text-[#F08A80]">{error}</p>}
      </div>
    </section>
  );
}

function Editor({ endpoint, slug, initial, onClose }: { endpoint: string; slug: string; initial: Draft; onClose: () => void }) {
  const [draft, setDraft] = useState(initial);
  const [at, setAt] = useState(0);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [dirty, setDirty] = useState(false);
  const q = draft.questions[at];

  // Salir con cambios sin guardar: el navegador pregunta antes de cerrar la pestaña.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const change = (next: Draft) => {
    setDraft(next);
    setDirty(true);
    setState("idle");
  };
  const setQuestion = (patch: Partial<Question>) =>
    change({ ...draft, questions: draft.questions.map((item, i) => (i === at ? { ...item, ...patch } : item)) });

  const save = async () => {
    setState("saving");
    setError(null);
    const reply = await post(endpoint, new URLSearchParams({ intent: "quiz-save", id: draft.id ?? "", quiz: JSON.stringify({ subject: draft.subject, questions: draft.questions.map((item) => ({ ...item, image: item.image?.trim() || undefined })) }) }));
    if (reply.ok && reply.id) {
      setDraft((d) => ({ ...d, id: reply.id! }));
      setDirty(false);
      setState("saved");
    } else {
      setState("idle");
      setError(reply.error ?? "No pude guardar.");
      const m = /^Pregunta (\d+):/.exec(reply.error ?? "");
      if (m) setAt(Number(m[1]) - 1);
    }
  };
  const archive = async () => {
    if (!draft.id) return onClose();
    const reply = await post(endpoint, new URLSearchParams({ intent: "quiz-archive", id: draft.id }));
    if (reply.ok) onClose();
    else setError(reply.error ?? "No pude archivarlo.");
  };

  const removeQuestion = () => {
    if (draft.questions.length === 1) return;
    change({ ...draft, questions: draft.questions.filter((_, i) => i !== at) });
    setAt(Math.max(0, at - 1));
  };
  const setAnswer = (i: number, text: string) => setQuestion({ answers: q.answers.map((a, j) => (j === i ? text : a)) });
  const removeAnswer = (i: number) =>
    setQuestion({ answers: q.answers.filter((_, j) => j !== i), solution: q.solution === i ? 0 : q.solution > i ? q.solution - 1 : q.solution });

  return (
    <div className="grid grid-cols-1 gap-4 [&>*]:min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={textLink} onClick={onClose}>Volver a los quizzes</button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-[#7C8A8E]" aria-live="polite">
            {state === "saving" ? "Guardando…" : state === "saved" ? "Guardado" : dirty ? "Cambios sin guardar" : ""}
          </span>
          {draft.id && !dirty && <a className={btnGhost} href={`/comunidad/${slug}/quiz/lanzar?quiz=${draft.id}`}>Lanzar</a>}
          <button type="button" className={btn} onClick={save} disabled={state === "saving" || !dirty}>Guardar</button>
        </div>
      </div>
      {error && <p className="rounded-[10px] border border-[#232D33] px-3.5 py-2 text-[13px] text-[#F08A80]">{error}</p>}

      <label>
        <span className={label}>Nombre del quiz</span>
        <input className={`${input} text-base font-semibold`} value={draft.subject} maxLength={80} placeholder="Agentes de IA: calentamiento" onChange={(e) => change({ ...draft, subject: e.target.value })} />
      </label>

      <div className={`${card} min-w-0 overflow-hidden lg:grid lg:grid-cols-[230px_1fr]`}>
        {/* Preguntas: fila que se desliza en el teléfono, columna en escritorio. */}
        <nav aria-label="Preguntas" className="flex gap-1.5 overflow-x-auto border-b border-[#232D33] p-2.5 lg:flex-col lg:overflow-visible lg:border-b-0 lg:border-r">
          {draft.questions.map((item, i) => (
            <button
              key={i}
              type="button"
              aria-current={i === at ? "true" : undefined}
              onClick={() => setAt(i)}
              className="flex shrink-0 items-baseline gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-[#D9E0DE] hover:bg-[#182026] aria-[current=true]:bg-[#1C252B] aria-[current=true]:font-semibold aria-[current=true]:text-[#F2F5F4] lg:w-full"
            >
              <span className="text-[#7C8A8E]">{i + 1}</span>
              <span className="max-w-[160px] truncate lg:max-w-none">{item.question || "Sin escribir"}</span>
            </button>
          ))}
          {draft.questions.length < 50 && (
            <button
              type="button"
              className={`${btnGhost} shrink-0 lg:mt-1.5`}
              onClick={() => {
                change({ ...draft, questions: [...draft.questions, blankQuestion()] });
                setAt(draft.questions.length);
              }}
            >
              Agregar pregunta
            </button>
          )}
        </nav>

        <div className="grid min-w-0 grid-cols-1 gap-5 p-4">
          <label>
            <span className={label}>Pregunta {at + 1}</span>
            <input className={`${input} text-base font-semibold`} value={q.question} maxLength={200} placeholder="¿Qué le da un sandbox a un agente?" onChange={(e) => setQuestion({ question: e.target.value })} />
          </label>

          <fieldset>
            <legend className={label}>Respuestas: marca la correcta</legend>
            <div className="grid gap-2">
              {q.answers.map((answer, i) => (
                <div key={i} className="flex items-center gap-2">
                  <label className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center" title={`La ${LETTERS[i]} es la correcta`}>
                    <input type="radio" name="solution" className="peer sr-only" checked={q.solution === i} onChange={() => setQuestion({ solution: i })} aria-label={`La respuesta ${LETTERS[i]} es la correcta`} />
                    <span className="grid h-6 w-6 place-items-center rounded-md border-2 border-[#232D33] text-transparent peer-checked:border-[#8DCF6E] peer-checked:bg-[#8DCF6E] peer-checked:text-background peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-500">
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true"><path d="M3 8l3.5 3.5L13 5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                  </label>
                  <input className={input} value={answer} maxLength={90} placeholder={`Respuesta ${LETTERS[i]}`} aria-label={`Respuesta ${LETTERS[i]}`} onChange={(e) => setAnswer(i, e.target.value)} />
                  {q.answers.length > 2 && (
                    <button type="button" aria-label={`Quitar la respuesta ${LETTERS[i]}`} onClick={() => removeAnswer(i)} className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-[#7C8A8E] hover:bg-[#1C252B] hover:text-[#F08A80]">
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            {q.answers.length < 4 && (
              <button type="button" className={`${textLink} mt-2`} onClick={() => setQuestion({ answers: [...q.answers, ""] })}>Agregar otra respuesta</button>
            )}
          </fieldset>

          <fieldset>
            <legend className={label}>Tiempo para contestar</legend>
            <div className="flex flex-wrap gap-1.5">
              {TIMES.map((t) => (
                <label key={t} className="cursor-pointer">
                  <input type="radio" name="time" className="peer sr-only" checked={q.time === t} onChange={() => setQuestion({ time: t })} />
                  <span className="inline-flex min-h-9 items-center rounded-full bg-[#1C252B] px-3.5 text-[13px] font-medium text-[#D9E0DE] peer-checked:bg-brand-500 peer-checked:font-semibold peer-checked:text-background peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-500">
                    {t} s
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <label>
            <span className={label}>Imagen, si la pregunta la necesita</span>
            <input className={input} type="url" value={q.image ?? ""} placeholder="https://… liga a una imagen" onChange={(e) => setQuestion({ image: e.target.value })} />
          </label>

          <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-[#232D33] pt-4">
            {draft.questions.length > 1 && <button type="button" className={textLink} onClick={removeQuestion}>Quitar esta pregunta</button>}
            {confirmArchive ? (
              <span className="flex flex-wrap items-center gap-2 text-xs text-[#7C8A8E]">
                Sale de tu lista; las partidas ya jugadas se conservan.
                <button type="button" className={btnGhost} onClick={archive}>Sí, archivar</button>
                <button type="button" className={textLink} onClick={() => setConfirmArchive(false)}>Conservarlo</button>
              </span>
            ) : (
              draft.id && <button type="button" className={`${textLink} ml-auto`} onClick={() => setConfirmArchive(true)}>Archivar este quiz</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
