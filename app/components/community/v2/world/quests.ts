// Misiones (el sistema de quests): una lista de pasos que avanzan con señales del motor o eventos propios
// del modo. Puro y sin piel: lo usa cualquier cartucho. El modo le pasa cada señal y dibuja lo que regresa
// (texto del paso para el HUD y objetivo para la flecha); al terminar una misión, el modo da la recompensa
// y la guarda con `ctx.save([], [id])`.
import type { ModeContext, ModeSignal, Objective } from "./cartridge";

/** Eventos que el modo agrega a las señales del motor (p. ej. `{ type: "star" }`). */
export type QuestEvent = ModeSignal | { type: string; [k: string]: unknown };
export type QuestStep = {
  text: string;
  /** A dónde mandar a la persona en este paso (marcador y flecha). */
  target?: (ctx: ModeContext) => Objective | null;
  done?: (e: QuestEvent, ctx: ModeContext) => boolean;
  /** Lo que dice el guía al empezar el paso (`{first}` se cambia por el nombre de la persona). */
  say?: string;
  /** Se completa solo a los `wait` segundos (p. ej. una explicación en un lugar). */
  wait?: number;
};
export type Quest = { id: string; title: string; reward: string; steps: QuestStep[] };

export function createQuests(list: Quest[]) {
  let done = new Set<string>(), quest: Quest | null = null, step = 0, stepT = 0;
  const pick = () => { quest = list.find((q) => !done.has(q.id)) ?? null; step = 0; stepT = 0; };
  pick();
  return {
    /** Misiones ya terminadas (de lo guardado). */
    load(ids: string[]) { done = new Set(ids); pick(); },
    get current() { return quest; },
    get step() { return quest ? quest.steps[step] : null; },
    /** Pasa un evento; regresa la misión si con él se terminó. */
    /** Vuelve a jugar una misión ya terminada (sin volver a dar su recompensa: eso lo decide el modo). */
    replay(id: string) { done.delete(id); pick(); },
    /** Avanza el reloj del paso; regresa la misión si con ello se terminó. */
    tick(dt: number, ctx: ModeContext): Quest | null {
      if (!quest) return null;
      stepT += dt;
      const w = quest.steps[step].wait;
      return w !== undefined && stepT >= w ? this.on({ type: "quest-wait" }, ctx) : null;
    },
    on(e: QuestEvent, ctx: ModeContext): Quest | null {
      if (!quest) return null;
      const cur = quest.steps[step];
      if (!(e.type === "quest-wait" ? cur.wait !== undefined && stepT >= cur.wait : cur.done?.(e, ctx))) return null;
      step++; stepT = 0;
      if (step < quest.steps.length) return null;
      const finished = quest; done.add(finished.id); pick();
      return finished;
    },
    /** Renglón del HUD: «🧭 Paso 2/5 · Vuela al Faro». */
    line() { return quest ? `🧭 ${step + 1}/${quest.steps.length} · ${quest.steps[step].text}` : null; },
    target(ctx: ModeContext) { return quest ? quest.steps[step].target?.(ctx) ?? null : null; },
  };
}
