// Archipiélago: la vista aérea de «Ghosty sobre las islas» hecha mundo del club. Cada miembro es un
// fantasma en pixel art (Ghosty o un ghostyllo de su color) que vuela entre las islas y junta estrellas.
//
// Manifiesto: lo leen navegador y servidor (nada de DOM). La skin se carga aparte con `loadSkin`.
import type { Cartridge, GameMode } from "../../cartridge";
import { STAR_EVERY, STAR_REACH, createStarState, starKey, starsOf, type StarState } from "./stars";
import { WORLD_ID, WORLD_NAME, structure } from "./structure";

/**
 * Modo «Estrellas»: cada estrella de la tanda es un área; al entrar en una (señal `area-entered`) la tomas.
 * Quien supera el récord del club lo propone junto con su nombre en un solo cambio; el servidor sólo lo
 * acepta si sube (`merge: "max"`).
 */
function starsMode(st: StarState): GameMode {
  let mine = 0, wave = -1, count = 0;
  const areaId = (w: number, i: number) => `star:${starKey(w, i)}`;
  return {
    update(ctx) {
      st.now = ctx.now;
      const w = Math.floor(ctx.now / STAR_EVERY);
      if (w !== wave) {
        // Tanda nueva: se quitan las áreas de la anterior y se ponen las de ésta.
        for (let i = 0; i < count; i++) ctx.area(areaId(wave, i), null);
        const stars = starsOf(w, structure.size, ctx.places);
        stars.forEach((s, i) => { if (!st.taken.has(starKey(w, i))) ctx.area(areaId(w, i), { kind: "circle", x: s.x, y: s.y, r: STAR_REACH }, ["star"]); });
        for (const k of st.taken) if (Number(k.split(":")[0]) < w - 1) st.taken.delete(k);
        wave = w; count = stars.length;
      }
      const best = typeof ctx.shared.best === "number" ? ctx.shared.best : 0, leader = ctx.shared.leader;
      if (mine > best) ctx.commit({ best: mine, leader: ctx.meId });
      const who = leader === ctx.meId ? "tú" : ctx.others.find((e) => e.id === leader)?.first;
      const left = Math.ceil(STAR_EVERY - (ctx.now % STAR_EVERY));
      ctx.hud({
        title: "⭐ Estrellas",
        lines: [`Tú: ${mine}`, best || mine ? `Récord del club: ${Math.max(best, mine)}${who ? ` (${who})` : ""}` : "Récord del club: nadie aún", `Nueva tanda en ${left} s`],
      });
    },
    on(signal, ctx) {
      if (signal.type !== "area-entered" || !signal.area.tags?.includes("star")) return;
      const key = signal.area.id.slice("star:".length);
      if (st.taken.has(key)) return;
      st.taken.add(key); mine++; ctx.area(signal.area.id, null);
      ctx.sound("star"); ctx.bubble(ctx.player, mine === 1 ? "¡Tu primera estrella!" : `${mine} estrellas`);
    },
  };
}

export const archipielago: Cartridge = {
  id: WORLD_ID,
  name: WORLD_NAME,
  description: "Ghosty sobre las islas: cada miembro es un fantasma en pixel art que vuela entre el Faro, el Mural, el Cine y la Escuelita y junta estrellas para romper el récord del club.",
  structure,
  copy: {
    loading: "Calentando motores…",
    lookButton: "Mi fantasma",
    lookTitle: "Tu fantasma",
    lookLabel: "Elegir mi fantasma y ajustes",
    modelLabel: "Fantasma",
    colorLabel: "Color",
    pilotLabel: "Cara",
    count: (n) => (n === 1 ? "1 en el aire" : `${n} en el aire`),
    roaming: "volando sobre las islas",
    hint: "Acércate a una isla o a alguien. Pasa sobre las estrellas para juntarlas.",
    hintKeys: " Flechas o WASD para volar · Shift turbo · C cambia la cámara · clic para ir a un punto · Enter para aterrizar.",
    hintMini: "Toca el mar o una isla y vuelas para allá.",
    expandMini: " el archipiélago y volar",
    mapLabel: "Archipiélago del club en pixel art, con quienes están conectados volando entre las islas. Las islas y las personas cercanas aparecen en la franja de abajo.",
    // Sin juego de disparos (`combat: null`): no se muestran.
    basicWeapon: "",
    uses: () => "",
    shootHint: "",
  },
  // Primer pintado: el mar (nunca negro plano).
  poster: { backgroundColor: "#17529f" },
  loadSkin: () => import("./skin").then((m) => m.default),
  createState: createStarState,
  mode: starsMode,
};
export default archipielago;
