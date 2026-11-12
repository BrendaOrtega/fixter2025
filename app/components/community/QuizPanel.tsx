// Panel del quiz en vivo junto a la llamada del club.
//
// Vive como HERMANO del iframe de la sala y nunca lo toca: no navega, no cambia su `src` y no
// usa el fetcher de la grabación. Habla con su propia ruta de recurso (`/comunidad/:slug/quiz`)
// con fetch directo. Con el quiz apagado no pinta nada y la página queda como estaba.
//
// Miembro: cuando hay partida, aparece el panel con el jugador de Razzia ya dentro (sin PIN).
// Anfitrión: lanza la partida; el tablero se abre en otra ventana, que comparte en la llamada.
import { useCallback, useEffect, useRef, useState } from "react";

type Active = { gameId: string; subject: string; playerUrl?: string; inviteCode?: string; boardUrl?: string };
type Status = { enabled: boolean; canHost: boolean; active: Active | null };
type Quiz = { id: string; subject: string };

const POLL_MS = 5000;
const OFF: Status = { enabled: false, canHost: false, active: null };

// Mismo lenguaje que la página del club: tarjetas `backface` con borde `colorOutline` sobre el
// fondo de la casa, botón lleno como «Publicar» y pastilla menta como «Club · FixterGeek».
const button =
  "inline-flex h-12 w-full items-center justify-center rounded-xl px-5 text-sm font-bold transition disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500";
const primary = `${button} border border-colorOutline bg-brand-500 text-brand-900 hover:bg-brand-100 active:translate-y-px`;
const quiet = `${button} border border-colorOutline text-white hover:border-brand-500 hover:text-brand-500`;
const card = "rounded-2xl border border-colorOutline bg-backface";

/** Tablero del quiz: pregunta, cuatro respuestas y una ya marcada. Caricatura plana de la casa. */
function QuizIllustration({ live }: { live: boolean }) {
  return (
    <svg viewBox="0 0 320 150" role="img" aria-label="Tablero de un quiz con cuatro respuestas" className="hidden w-full md:block">
      <style>{`
        @keyframes quiz-pick { 0%,55% { opacity: 0; transform: scale(.4) } 70%,100% { opacity: 1; transform: scale(1) } }
        @keyframes quiz-bar { from { transform: scaleX(1) } to { transform: scaleX(.12) } }
        .quiz-pick { animation: quiz-pick 2.4s ease-out 2 both; transform-box: fill-box; transform-origin: center; }
        .quiz-bar { animation: quiz-bar 2.4s linear 2 both; transform-box: fill-box; transform-origin: left; }
        @media (prefers-reduced-motion: reduce) { .quiz-pick,.quiz-bar { animation: none } }
      `}</style>
      <ellipse cx="160" cy="142" rx="104" ry="6" fill="#000" opacity=".3" />
      <rect x="44" y="8" width="232" height="126" rx="16" fill="#182128" stroke="#2C3944" strokeWidth="2" />
      {/* pregunta y tiempo */}
      <rect x="62" y="24" width="128" height="10" rx="5" fill="#F2F5F4" />
      <rect x="62" y="40" width="84" height="8" rx="4" fill="#7C8A8E" />
      <rect x="62" y="56" width="196" height="5" rx="2.5" fill="#2C3944" />
      <rect className={live ? "quiz-bar" : ""} x="62" y="56" width="196" height="5" rx="2.5" fill="#85DDCB" />
      {/* respuestas */}
      <rect x="62" y="72" width="94" height="22" rx="8" fill="#85DDCB" />
      <rect x="164" y="72" width="94" height="22" rx="8" fill="#8DCF6E" />
      <rect x="62" y="100" width="94" height="22" rx="8" fill="#F2F5F4" />
      <rect x="164" y="100" width="94" height="22" rx="8" fill="#7C8A8E" />
      <g className="quiz-pick">
        <circle cx="244" cy="83" r="8" fill="#0E1317" />
        <path d="M240 83 l3 3 l5 -6" fill="none" stroke="#8DCF6E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* quien contesta */}
      <circle cx="26" cy="62" r="12" fill="#85DDCB" />
      <circle cx="26" cy="96" r="12" fill="#F2C7A0" />
      <circle cx="294" cy="78" r="12" fill="#8DCF6E" />
    </svg>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="grid gap-3">
      {items.map((text, i) => (
        <li key={text} className="flex gap-3 text-sm leading-snug text-colorParagraph">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-xs font-bold text-brand-500">{i + 1}</span>
          <span>{text}</span>
        </li>
      ))}
    </ol>
  );
}

export function QuizPanel({ slug }: { slug: string }) {
  const endpoint = `/comunidad/${slug}/quiz`;
  const [status, setStatus] = useState<Status>(OFF);
  const [open, setOpen] = useState(false);
  const seenGame = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(endpoint, { headers: { accept: "application/json" } });
      if (!res.ok) return;
      setStatus((await res.json()) as Status);
    } catch {
      // Sin red un momento: se queda lo último que se supo y se reintenta en el siguiente tic.
    }
  }, [endpoint]);

  useEffect(() => {
    refresh();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  // Partida nueva: el panel se abre solo, una vez. Si la persona lo pliega, se queda plegado.
  const gameId = status.active?.gameId ?? null;
  useEffect(() => {
    if (gameId && seenGame.current !== gameId) setOpen(true);
    seenGame.current = gameId;
  }, [gameId]);

  if (!status.enabled || (!status.canHost && !status.active)) return null;

  return (
    <>
      {/* Plegado: una pestaña delgada. Abajo en el teléfono, a la derecha en escritorio. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir el quiz"
        className={`${open ? "hidden" : "flex"} h-12 w-full shrink-0 items-center justify-center gap-2 border-t border-colorOutline bg-backface text-sm font-bold transition hover:text-brand-500 md:h-full md:w-12 md:flex-col md:border-l md:border-t-0 ${status.active ? "text-brand-500" : "text-white"}`}
      >
        <span className={`h-2 w-2 rounded-full ${status.active ? "animate-pulse bg-brand-500" : "bg-colorCaption"}`} />
        <span className="md:[writing-mode:vertical-rl]">{status.active ? "Quiz en vivo" : "Quiz"}</span>
      </button>

      {/* Desplegado. El jugador sigue montado aunque se pliegue, para conservar su lugar. */}
      <aside
        className={`${open ? "flex" : "hidden"} h-[58%] w-full shrink-0 flex-col border-t border-colorOutline bg-background text-white md:h-full md:w-[400px] md:border-l md:border-t-0`}
      >
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-colorOutline px-4">
          <p className="inline-flex min-w-0 items-center gap-2 rounded-full border border-brand-500 px-3 py-1 text-sm font-bold text-brand-500">
            <span className={`h-2 w-2 shrink-0 rounded-full bg-brand-500 ${status.active ? "animate-pulse" : ""}`} />
            <span className="truncate">{status.active ? "Quiz en vivo" : "Quiz del club"}</span>
          </p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Plegar el quiz"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-colorOutline text-colorCaption transition hover:border-brand-500 hover:text-brand-500"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4 rotate-90 md:rotate-0" aria-hidden="true">
              <path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </header>
        <div className="min-h-0 flex-1">
          {status.canHost ? (
            <HostControls endpoint={endpoint} active={status.active} onChange={refresh} />
          ) : status.active?.playerUrl ? (
            <iframe
              key={status.active.gameId}
              src={status.active.playerUrl}
              title="Quiz en vivo"
              className="h-full w-full border-0"
              allow="autoplay; fullscreen"
            />
          ) : null}
        </div>
      </aside>
    </>
  );
}

function HostControls({ endpoint, active, onChange }: { endpoint: string; active: Active | null; onChange: () => void }) {
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null);
  const [quizId, setQuizId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);

  const loadQuizzes = useCallback(async () => {
    try {
      const res = await fetch(`${endpoint}?list=1`, { headers: { accept: "application/json" } });
      const body = (await res.json()) as { quizzes?: Quiz[] };
      const list = body.quizzes ?? [];
      setQuizzes(list);
      setQuizId((current) => current || list[0]?.id || "");
    } catch {
      setQuizzes([]);
    }
  }, [endpoint]);

  useEffect(() => {
    if (!active) loadQuizzes();
  }, [active, loadQuizzes]);

  const post = async (fields: Record<string, string>) => {
    const res = await fetch(endpoint, { method: "POST", body: new URLSearchParams(fields) });
    return (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; managerUrl?: string };
  };

  const launch = async () => {
    if (!quizId || busy) return;
    setBusy(true);
    setError(null);
    // La ventana se abre dentro del clic (si no, el navegador la bloquea) y se llena al contestar.
    const board = window.open("", "_blank");
    const reply = await post({ intent: "quiz-start", quizId }).catch(() => ({ error: "Sin conexión. Intenta de nuevo." }) as { error: string; managerUrl?: string });
    if (reply.managerUrl && board) {
      board.location.href = reply.managerUrl;
    } else {
      board?.close();
      setError(reply.managerUrl ? "Tu navegador bloqueó la ventana del tablero. Permite ventanas emergentes y usa «Abrir tablero»." : reply.error ?? "No pude lanzar el quiz.");
    }
    setBusy(false);
    onChange();
  };

  const end = async () => {
    setBusy(true);
    await post({ intent: "quiz-end" }).catch(() => null);
    setConfirmEnd(false);
    setBusy(false);
    onChange();
  };

  if (active) {
    return (
      <div className="flex h-full flex-col">
      {/* Lo que se lee hace scroll; las acciones quedan fijas al pie, siempre a la mano. */}
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5 [&>*]:shrink-0">
        <QuizIllustration live />
        <div>
          <h2 className="text-xl font-bold leading-tight">{active.subject}</h2>
          <p className="mt-1 text-sm text-colorCaption">
            {active.inviteCode ? "En curso." : "En curso. Cada miembro del club entra desde su panel de la llamada."}
          </p>
        </div>
        {active.inviteCode && (
          <p className={`${card} p-4`}>
            <span className="block text-xs text-colorCaption">PIN, para quien entre desde fuera del club</span>
            <span className="text-3xl font-bold tracking-widest text-brand-500">{active.inviteCode}</span>
          </p>
        )}
        <div className={`${card} p-4`}>
          <Steps
            items={[
              "Comparte en la llamada la ventana del tablero.",
              "Cuando aparezcan los jugadores, presiona «Iniciar» en el tablero.",
              "Al final, termina el quiz aquí: se cierra el panel de todos.",
            ]}
          />
        </div>
        {error && <p className="rounded-xl border border-danger p-3 text-sm text-white">{error}</p>}
        </div>
      <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-colorOutline bg-background p-4 md:grid-cols-1">
        <a href={active.boardUrl} target="_blank" rel="noopener" className={primary}>Abrir tablero</a>
        {confirmEnd ? (
          <div className="col-span-2 grid grid-cols-2 gap-2 md:col-span-1">
            <button type="button" onClick={end} disabled={busy} className={primary}>Sí, terminar</button>
            <button type="button" onClick={() => setConfirmEnd(false)} className={quiet}>Seguir jugando</button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmEnd(true)} className={quiet}>Terminar quiz</button>
        )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Lo que se lee hace scroll; las acciones quedan fijas al pie, siempre a la mano. */}
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5 [&>*]:shrink-0">
      <QuizIllustration live={false} />
      <div>
        <h2 className="text-xl font-bold leading-tight">Lanza un quiz en la llamada</h2>
        <p className="mt-1 text-sm text-colorCaption">Cada miembro contesta desde su panel, con su nombre del club.</p>
      </div>
      {quizzes === null ? (
        <p className={`${card} p-4 text-sm text-colorCaption`}>Cargando quizzes…</p>
      ) : quizzes.length === 0 ? (
        <p className={`${card} p-4 text-sm text-colorCaption`}>Todavía no hay quizzes. Crea el primero con «Editar quizzes».</p>
      ) : (
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-bold">Elige el quiz</legend>
          {quizzes.map((q) => (
            <label
              key={q.id}
              className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 text-sm font-semibold transition ${quizId === q.id ? "border-brand-500 bg-brand-500/10 text-white" : "border-colorOutline bg-backface text-colorParagraph hover:border-brand-500"}`}
            >
              <input type="radio" name="quiz" value={q.id} checked={quizId === q.id} onChange={() => setQuizId(q.id)} className="sr-only" />
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${quizId === q.id ? "border-brand-500" : "border-colorOutline"}`}>
                {quizId === q.id && <span className="h-2.5 w-2.5 rounded-full bg-brand-500" />}
              </span>
              <span className="min-w-0 break-words">{q.subject}</span>
            </label>
          ))}
        </fieldset>
      )}
      <div className={`${card} p-4`}>
        <Steps
          items={[
            "El tablero se abre en otra ventana.",
            "Compártela en la llamada: ahí salen las preguntas, el ranking y el podio.",
            "Presiona «Iniciar» cuando ya estén los jugadores.",
          ]}
        />
      </div>
      {error && <p className="rounded-xl border border-danger p-3 text-sm text-white">{error}</p>}
      </div>
      <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-colorOutline bg-background p-4 md:grid-cols-1">
        <button type="button" onClick={launch} disabled={busy || !quizId} className={primary}>
          {busy ? "Lanzando…" : "Lanzar quiz"}
        </button>
        <a href={`${endpoint}?editor=1`} target="_blank" rel="noopener" className={quiet}>Editar quizzes</a>
      </div>
    </div>
  );
}
