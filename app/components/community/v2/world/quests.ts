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
  done: (e: QuestEvent, ctx: ModeContext) => boolean;
};
export type Quest = { id: string; title: string; reward: string; steps: QuestStep[] };

export function createQuests(list: Quest[]) {
  let done = new Set<string>(), quest: Quest | null = null, step = 0;
  const pick = () => { quest = list.find((q) => !done.has(q.id)) ?? null; step = 0; };
  pick();
  return {
    /** Misiones ya terminadas (de lo guardado). */
    load(ids: string[]) { done = new Set(ids); pick(); },
    get current() { return quest; },
    get step() { return quest ? quest.steps[step] : null; },
    /** Pasa un evento; regresa la misión si con él se terminó. */
    on(e: QuestEvent, ctx: ModeContext): Quest | null {
      if (!quest) return null;
      if (!quest.steps[step].done(e, ctx)) return null;
      step++;
      if (step < quest.steps.length) return null;
      const finished = quest; done.add(finished.id); pick();
      return finished;
    },
    /** Renglón del HUD: «🧭 Paso 2/5 · Vuela al Faro». */
    line() { return quest ? `🧭 ${step + 1}/${quest.steps.length} · ${quest.steps[step].text}` : null; },
    target(ctx: ModeContext) { return quest ? quest.steps[step].target?.(ctx) ?? null : null; },
  };
}
