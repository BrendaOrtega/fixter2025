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

const button =
  "inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition disabled:opacity-50";
const primary = `${button} bg-[#85DDCB] text-[#0E1317] hover:-translate-y-0.5`;
const quiet = `${button} border border-[#2C3944] text-[#F2F5F4] hover:border-[#85DDCB]`;

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
        className={`${open ? "hidden" : "flex"} h-11 w-full shrink-0 items-center justify-center gap-2 border-t border-[#2C3944] bg-[#182128] text-sm font-semibold text-[#F2F5F4] md:h-full md:w-11 md:flex-col md:border-l md:border-t-0`}
      >
        <span className={`h-2 w-2 rounded-full ${status.active ? "bg-[#85DDCB]" : "bg-[#7C8A8E]"}`} />
        <span className="md:[writing-mode:vertical-rl]">{status.active ? "Quiz en vivo" : "Quiz"}</span>
      </button>

      {/* Desplegado. El jugador sigue montado aunque se pliegue, para conservar su lugar. */}
      <aside
        className={`${open ? "flex" : "hidden"} h-[58%] w-full shrink-0 flex-col border-t border-[#2C3944] bg-[#182128] text-[#F2F5F4] md:h-full md:w-[400px] md:border-l md:border-t-0`}
      >
        <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-[#2C3944] px-4">
          <p className="truncate text-sm font-semibold">
            {status.active ? status.active.subject : "Quiz en vivo"}
          </p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full border border-[#2C3944] px-3 py-1 text-xs text-[#7C8A8E] transition hover:border-[#85DDCB] hover:text-[#F2F5F4]"
          >
            Plegar
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
      <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 text-sm">
        {active.inviteCode ? (
          <p className="rounded-2xl border border-[#2C3944] bg-[#0E1317] p-4">
            <span className="block text-xs text-[#7C8A8E]">PIN, para quien entre desde fuera del club</span>
            <span className="font-mono text-3xl tracking-widest text-[#85DDCB]">{active.inviteCode}</span>
          </p>
        ) : (
          <p className="rounded-2xl border border-[#2C3944] bg-[#0E1317] p-4 text-[#7C8A8E]">
            Quiz en curso. Sólo entran miembros del club, cada uno desde su panel.
          </p>
        )}
        <ol className="list-decimal space-y-1 pl-5 text-[#F2F5F4]">
          <li>Comparte en la llamada la ventana del tablero.</li>
          <li>Espera a que aparezcan los jugadores y presiona «Iniciar» en el tablero.</li>
          <li>Al final, termina el quiz aquí para cerrar el panel de todos.</li>
        </ol>
        {error && <p className="rounded-xl border border-[#2C3944] bg-[#0E1317] p-3 text-[#F2F5F4]">{error}</p>}
        <a href={active.boardUrl} target="_blank" rel="noopener" className={quiet}>Abrir tablero</a>
        {confirmEnd ? (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={end} disabled={busy} className={primary}>Sí, terminar</button>
            <button type="button" onClick={() => setConfirmEnd(false)} className={quiet}>Seguir jugando</button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmEnd(true)} className={quiet}>Terminar quiz</button>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 text-sm">
      {quizzes === null ? (
        <p className="text-[#7C8A8E]">Cargando quizzes…</p>
      ) : quizzes.length === 0 ? (
        <p className="text-[#7C8A8E]">Todavía no hay quizzes. Crea el primero en el editor.</p>
      ) : (
        <label className="grid gap-1">
          Quiz
          <select
            value={quizId}
            onChange={(e) => setQuizId(e.target.value)}
            className="h-11 rounded-xl border border-[#2C3944] bg-[#0E1317] px-3 text-[#F2F5F4]"
          >
            {quizzes.map((q) => (
              <option key={q.id} value={q.id}>{q.subject}</option>
            ))}
          </select>
        </label>
      )}
      <ol className="list-decimal space-y-1 pl-5 text-[#F2F5F4]">
        <li>El tablero se abre en otra ventana.</li>
        <li>Compártela en la llamada: ahí salen las preguntas, el ranking y el podio.</li>
        <li>Cada miembro contesta en su panel, con su nombre del club y sin PIN.</li>
      </ol>
      {error && <p className="rounded-xl border border-[#2C3944] bg-[#0E1317] p-3 text-[#F2F5F4]">{error}</p>}
      <button type="button" onClick={launch} disabled={busy || !quizId} className={primary}>
        {busy ? "Lanzando…" : "Lanzar quiz"}
      </button>
      <a href={`${endpoint}?editor=1`} target="_blank" rel="noopener" className={quiet}>Editar quizzes</a>
    </div>
  );
}
