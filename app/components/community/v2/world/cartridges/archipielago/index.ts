// Archipiélago: la vista aérea de «Ghosty sobre las islas» hecha mundo del club. Cada miembro es un
// fantasma en pixel art (Ghosty o un ghostyllo de su color) que vuela entre las islas y junta estrellas.
//
// Manifiesto: lo leen navegador y servidor (nada de DOM). La skin se carga aparte con `loadSkin`.
import type { Cartridge, GameMode } from "../../cartridge";
import { STAR_EVERY, STAR_REACH, starKey, starState, starsOf } from "./stars";
import { WORLD_ID, WORLD_NAME, structure } from "./structure";

/** Modo «Estrellas»: cada quien junta las suyas; quien supera el récord del club se queda con él. */
function starsMode(): GameMode {
  let mine = 0;
  return {
    update(ctx) {
      starState.now = ctx.now;
      const wave = Math.floor(ctx.now / STAR_EVERY), p = ctx.player;
      starsOf(wave, structure.size, ctx.places).forEach((s, i) => {
        const key = starKey(wave, i);
        if (starState.taken.has(key) || Math.hypot(s.x - p.x, s.y - p.y) > STAR_REACH) return;
        starState.taken.add(key); mine++;
        ctx.sound("star"); ctx.bubble(p, mine === 1 ? "¡Tu primera estrella!" : `${mine} estrellas`);
      });
      // Sólo guardamos las tandas recientes.
      if (starState.taken.size > 60) for (const k of starState.taken) if (Number(k.split(":")[0]) < wave - 1) starState.taken.delete(k);
      const best = typeof ctx.shared.best === "number" ? ctx.shared.best : 0, leader = ctx.shared.leader;
      if (mine > best) { ctx.propose("best", mine); ctx.propose("leader", ctx.meId); }
      const who = leader === ctx.meId ? "tú" : ctx.others.find((e) => e.id === leader)?.first;
      const left = Math.ceil(STAR_EVERY - (ctx.now % STAR_EVERY));
      ctx.hud({
        title: "⭐ Estrellas",
        lines: [`Tú: ${mine}`, best ? `Récord del club: ${Math.max(best, mine)}${who ? ` (${who})` : ""}` : "Récord del club: nadie aún", `Nueva tanda en ${left} s`],
      });
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
  mode: starsMode,
};
export default archipielago;
