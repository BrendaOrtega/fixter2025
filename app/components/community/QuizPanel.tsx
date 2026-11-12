// Panel del quiz en vivo junto a la llamada del club.
//
// Vive como HERMANO del iframe de la sala y nunca lo toca: no navega, no cambia su `src` y no
// usa el fetcher de la grabación. Habla con su propia ruta de recurso (`/comunidad/:slug/quiz`)
// con fetch directo. Con el quiz apagado no pinta nada y la página queda como estaba.
//
// Miembro: cuando hay partida, aparece el panel con el jugador de Razzia ya dentro (sin PIN).
// Anfitrión: lanza la partida; el tablero se abre en otra ventana, que comparte en la llamada.
import { useCallback, useEffect, useRef, useState } from "react";
import { btn, btnGhost, card } from "./v2/ui";

type Active = { gameId: string; subject: string; playerUrl?: string; inviteCode?: string; boardUrl?: string; membersOnly?: boolean; site?: string };
type Status = { enabled: boolean; canHost: boolean; canEdit?: boolean; active: Active | null };
type Quiz = { id: string; subject: string; questionCount: number };

const POLL_MS = 5000;
const OFF: Status = { enabled: false, canHost: false, active: null };

// Sistema v2 del club (`v2/ui.tsx`): misma tarjeta y mismos botones, sólo más altos y a lo ancho
// porque aquí son la acción principal de un panel angosto.
const primary = `${btn} !min-h-11 w-full`;
const quiet = `${btnGhost} !min-h-11 w-full`;
const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500";

/** Tablero del quiz: pregunta, cuatro respuestas y una ya marcada. Caricatura plana de la casa. */
function QuizIllustration({ live }: { live: boolean }) {
  return (
    <svg viewBox="0 0 320 150" role="img" aria-label="Tablero de un quiz con cuatro respuestas" className="hidden w-full lg:block">
      <style>{`
        @keyframes quiz-pick { 0%,55% { opacity: 0; transform: scale(.4) } 70%,100% { opacity: 1; transform: scale(1) } }
        @keyframes quiz-bar { from { transform: scaleX(1) } to { transform: scaleX(.12) } }
        .quiz-pick { animation: quiz-pick 2.4s ease-out 2 both; transform-box: fill-box; transform-origin: center; }
        .quiz-bar { animation: quiz-bar 2.4s linear 2 both; transform-box: fill-box; transform-origin: left; }
        @media (prefers-reduced-motion: reduce) { .quiz-pick,.quiz-bar { animation: none } }
      `}</style>
      <ellipse cx="160" cy="142" rx="104" ry="6" fill="#000" opacity=".3" />
      <rect x="44" y="8" width="232" height="126" rx="16" fill="#141B20" stroke="#232D33" strokeWidth="2" />
      {/* pregunta y tiempo */}
      <rect x="62" y="24" width="128" height="10" rx="5" fill="#F2F5F4" />
      <rect x="62" y="40" width="84" height="8" rx="4" fill="#7C8A8E" />
      <rect x="62" y="56" width="196" height="5" rx="2.5" fill="#232D33" />
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
        <li key={text} className="flex gap-3 text-sm leading-snug text-[#D9E0DE]">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#17302C] text-xs font-semibold text-brand-500">{i + 1}</span>
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
      {/* Plegado: pastilla flotante en el borde derecho. No ocupa ancho ni alto: la sala conserva
          todo su espacio y su barra de controles no se recorta. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir el quiz"
        className={`${open ? "hidden" : "flex"} absolute right-0 top-1/2 z-10 -translate-y-1/2 flex-col items-center gap-2 rounded-l-[10px] border border-r-0 border-[#232D33] bg-[#141B20] px-2 py-3 text-[13px] font-semibold shadow-[0_6px_20px_rgba(0,0,0,.35)] transition-colors hover:bg-[#1C252B] ${focus} ${status.active ? "text-brand-500" : "text-[#F2F5F4]"}`}
      >
        <span className={`h-2 w-2 rounded-full ${status.active ? "animate-pulse bg-brand-500" : "bg-[#7C8A8E]"}`} />
        <span className="[writing-mode:vertical-rl]">{status.active ? "Quiz en vivo" : "Quiz"}</span>
      </button>

      {/* Desplegado. El jugador sigue montado aunque se pliegue, para conservar su lugar.
          Anfitrión: cajón ENCIMA de la sala (no juega; el tablero va en otra pestaña), así su barra
          de controles, la más ancha, nunca pierde espacio. Jugador: columna junto a la sala sólo en
          pantallas de 1024 px o más; abajo de eso, sala arriba y quiz abajo. */}
      <aside
        className={`${open ? "flex" : "hidden"} flex-col border-[#232D33] bg-background text-[#F2F5F4] ${
          status.canHost
            ? "absolute inset-x-0 bottom-0 z-10 h-[72%] rounded-t-[10px] border-t shadow-[0_-8px_28px_rgba(0,0,0,.4)] lg:inset-y-0 lg:left-auto lg:right-0 lg:h-full lg:w-[400px] lg:rounded-none lg:border-l lg:border-t-0 lg:shadow-[-8px_0_28px_rgba(0,0,0,.4)]"
            : "h-[58%] w-full shrink-0 border-t lg:h-full lg:w-[400px] lg:border-l lg:border-t-0"
        }`}
      >
        <header className="flex min-h-[52px] shrink-0 items-center justify-between gap-3 border-b border-[#232D33] px-4">
          <p className="inline-flex min-w-0 items-center gap-2 text-base font-semibold text-[#F2F5F4]">
            <span className={`h-2 w-2 shrink-0 rounded-full ${status.active ? "animate-pulse bg-brand-500" : "bg-[#7C8A8E]"}`} />
            <span className="truncate">{status.active ? "Quiz en vivo" : "Quiz del club"}</span>
          </p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Plegar el quiz"
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#232D33] bg-[#141B20] text-[#7C8A8E] transition-colors hover:bg-[#1C252B] hover:text-[#F2F5F4] ${focus}`}
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4 rotate-90 lg:rotate-0" aria-hidden="true">
              <path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </header>
        <div className="min-h-0 flex-1">
          {status.canHost ? (
            <HostControls endpoint={endpoint} adminUrl={status.canEdit ? `/comunidad/${slug}/admin?tab=quizzes` : null} active={status.active} onChange={refresh} />
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

function HostControls({ endpoint, adminUrl, preselect, active, onChange }: { endpoint: string; adminUrl: string | null; preselect?: string; active: Active | null; onChange: () => void }) {
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null);
  const [quizId, setQuizId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  // Abierto por default: el quiz se usa dentro y fuera de las llamadas.
  const [membersOnly, setMembersOnly] = useState(false);

  const loadQuizzes = useCallback(async () => {
    try {
      const res = await fetch(`${endpoint}?list=1`, { headers: { accept: "application/json" } });
      const body = (await res.json()) as { quizzes?: Quiz[] };
      const list = body.quizzes ?? [];
      setQuizzes(list);
      setQuizId((current) => current || list.find((q) => q.id === preselect)?.id || list[0]?.id || "");
    } catch {
      setQuizzes([]);
    }
  }, [endpoint, preselect]);

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
    const reply = await post({ intent: "quiz-start", quizId, membersOnly: membersOnly ? "1" : "0" }).catch(() => ({ error: "Sin conexión. Intenta de nuevo." }) as { error: string; managerUrl?: string });
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
          <h2 className="text-lg font-semibold leading-tight">{active.subject}</h2>
          <p className="mt-1 text-sm text-[#7C8A8E]">
            {active.membersOnly
              ? "En curso, sólo miembros del club: entran desde su panel de la llamada o con el QR del tablero."
              : "En curso, abierto: entra cualquiera con el PIN. Los miembros entran solos desde la llamada."}
          </p>
        </div>
        {active.inviteCode && (
          <p className={`${card} p-4`}>
            <span className="block text-xs text-[#7C8A8E]">Para jugar desde cualquier lugar: {active.site} con el PIN</span>
            <span className="text-3xl font-bold tracking-widest text-brand-500">{active.inviteCode}</span>
          </p>
        )}
        <div className={`${card} p-4`}>
          <Steps
            items={[
              "Comparte la ventana del tablero, en la llamada o en la pantalla del salón.",
              "Cuando aparezcan los jugadores, presiona «Iniciar» en el tablero.",
              "Al final, termina el quiz aquí: se cierra el panel de todos.",
            ]}
          />
        </div>
        {error && <p className="rounded-[10px] border border-[#232D33] p-3 text-sm text-[#F08A80]">{error}</p>}
        </div>
      <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-[#232D33] bg-background p-4 lg:grid-cols-1">
        <a href={active.boardUrl} target="_blank" rel="noopener" className={primary}>Abrir tablero</a>
        {confirmEnd ? (
          <div className="col-span-2 grid grid-cols-2 gap-2 lg:col-span-1">
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
        <h2 className="text-lg font-semibold leading-tight">Lanza un quiz en vivo</h2>
        <p className="mt-1 text-sm text-[#7C8A8E]">Sirve en la llamada del club y fuera de ella: en un evento, una clase o una transmisión.</p>
      </div>
      {quizzes === null ? (
        <p className={`${card} p-4 text-sm text-[#7C8A8E]`}>Cargando quizzes…</p>
      ) : quizzes.length === 0 ? (
        <p className={`${card} p-4 text-sm text-[#7C8A8E]`}>{adminUrl ? "Todavía no hay quizzes. Crea el primero en «Crear y editar quizzes»." : "Todavía no hay quizzes. Los crea quien administra el club."}</p>
      ) : (
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-[13px] font-semibold text-[#7C8A8E]">Elige el quiz</legend>
          {quizzes.map((q) => (
            <label
              key={q.id}
              className={`flex cursor-pointer items-center gap-3 rounded-[10px] border p-4 text-sm font-semibold transition ${quizId === q.id ? "border-brand-500 bg-[#17302C] text-[#F2F5F4]" : "border-[#232D33] bg-[#141B20] text-[#D9E0DE] hover:bg-[#1C252B]"}`}
            >
              <input type="radio" name="quiz" value={q.id} checked={quizId === q.id} onChange={() => setQuizId(q.id)} className="sr-only" />
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${quizId === q.id ? "border-brand-500" : "border-[#232D33]"}`}>
                {quizId === q.id && <span className="h-2.5 w-2.5 rounded-full bg-brand-500" />}
              </span>
              <span className="min-w-0">
                <span className="block break-words">{q.subject}</span>
                <span className="block text-[13px] font-normal text-[#7C8A8E]">{q.questionCount === 1 ? "1 pregunta" : `${q.questionCount} preguntas`}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-[13px] font-semibold text-[#7C8A8E]">Quién puede jugar</legend>
        {[
          { value: false, title: "Cualquiera con el PIN", note: "Para eventos, clases y transmisiones. Los miembros en la llamada entran solos." },
          { value: true, title: "Sólo miembros del club", note: "Entran desde su panel de la llamada o con el QR del tablero." },
        ].map((o) => (
          <label
            key={o.title}
            className={`flex cursor-pointer items-start gap-3 rounded-[10px] border p-4 text-sm transition ${membersOnly === o.value ? "border-brand-500 bg-[#17302C]" : "border-[#232D33] bg-[#141B20] hover:bg-[#1C252B]"}`}
          >
            <input type="radio" name="audience" checked={membersOnly === o.value} onChange={() => setMembersOnly(o.value)} className="sr-only" />
            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${membersOnly === o.value ? "border-brand-500" : "border-[#232D33]"}`}>
              {membersOnly === o.value && <span className="h-2.5 w-2.5 rounded-full bg-brand-500" />}
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-[#F2F5F4]">{o.title}</span>
              <span className="mt-0.5 block text-[#7C8A8E]">{o.note}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className={`${card} p-4`}>
        <Steps
          items={[
            "El tablero se abre en otra ventana.",
            "Compártela o proyéctala: ahí salen las preguntas, el ranking y el podio.",
            "Presiona «Iniciar» cuando ya estén los jugadores.",
          ]}
        />
      </div>
      {error && <p className="rounded-[10px] border border-[#232D33] p-3 text-sm text-[#F08A80]">{error}</p>}
      </div>
      <div className={`grid shrink-0 gap-2 border-t border-[#232D33] bg-background p-4 lg:grid-cols-1 ${adminUrl ? "grid-cols-2" : ""}`}>
        <button type="button" onClick={launch} disabled={busy || !quizId} className={primary}>
          {busy ? "Lanzando…" : "Lanzar y abrir el tablero"}
        </button>
        {adminUrl && <a href={adminUrl} target="_blank" rel="noopener" className={quiet}>Crear y editar quizzes</a>}
      </div>
    </div>
  );
}

/** Controles del anfitrión como página propia, para lanzar un quiz fuera de una llamada. */
export function QuizHost({ slug, preselect }: { slug: string; preselect?: string }) {
  const endpoint = `/comunidad/${slug}/quiz`;
  const [status, setStatus] = useState<Status | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(endpoint, { headers: { accept: "application/json" } });
      setStatus(res.ok ? ((await res.json()) as Status) : OFF);
    } catch {
      // Sin red un momento: se reintenta en el siguiente tic.
    }
  }, [endpoint]);

  useEffect(() => {
    refresh();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  if (!status) return <p className={`${card} p-5 text-sm text-[#7C8A8E]`}>Cargando…</p>;
  if (!status.enabled || !status.canHost) {
    return <p className={`${card} p-5 text-sm text-[#7C8A8E]`}>Lanzan quizzes el dueño del club y sus coanfitriones.</p>;
  }
  return (
    <div className={`${card} overflow-hidden bg-background text-[#F2F5F4]`}>
      <HostControls endpoint={endpoint} adminUrl={status.canEdit ? `/comunidad/${slug}/admin?tab=quizzes` : null} preselect={preselect} active={status.active} onChange={refresh} />
    </div>
  );
}
