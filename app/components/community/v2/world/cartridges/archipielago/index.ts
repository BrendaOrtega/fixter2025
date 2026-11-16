// Archipiélago: la vista aérea de «Ghosty sobre las islas» hecha mundo del club. Cada miembro es un
// fantasma en pixel art (Ghosty o un ghostyllo de su color) que vuela entre las islas y junta estrellas.
//
// Manifiesto: lo leen navegador y servidor (nada de DOM). La skin se carga aparte con `loadSkin`.
import type { Cartridge, GameMode, ModeContext } from "../../cartridge";
import { BIG_PAIR, BIG_R, BIG_SPOTS, GOLDEN, HIGH_FIVE, RACE_MAX, RINGS, STAR_EVERY, STAR_REACH, TAG_COOLDOWN, TAG_REACH, createStarState, starKey, starsOf, type StarState } from "./stars";
import { WORLD_ID, WORLD_NAME, structure } from "./structure";

const clock = (secs: number) => `${Math.floor(secs / 60)}:${(secs % 60).toFixed(1).padStart(4, "0")}`;

/**
 * El juego del Archipiélago, armado con señales y áreas:
 * - Estrellas: cada estrella de la tanda es un área; quien rompe el récord lo guarda con su nombre en un solo cambio.
 * - Estrella de dos: una grande por tanda que sólo se abre si otra persona está junto a ti dentro de ella.
 * - Carrera: aros fijos en orden (áreas `ring:i`), contra reloj; el mejor tiempo es récord del club (`merge: "min"`).
 * - Las traes: la estrella dorada la toma quien llegue primero y se pasa tocando a otra persona.
 * - Choca esas cinco: un saludo entre dos que están cerca suelta una lluvia de estrellas (la pinta la skin).
 */
function islandGame(st: StarState): GameMode {
  let mine = 0, wave = -1, count = 0, goldenOn = false;
  const areaId = (w: number, i: number) => `star:${starKey(w, i)}`;
  const humans = (ctx: ModeContext) => ctx.others.filter((e) => e.kind === "human");
  const nameOf = (ctx: ModeContext, id: unknown) => (id === ctx.meId ? "tú" : ctx.others.find((e) => e.id === id)?.first);
  return {
    update(ctx) {
      st.now = ctx.now;
      const now = ctx.now, p = ctx.player, w = Math.floor(now / STAR_EVERY);
      // Tanda nueva: estrellas y estrella de dos.
      if (w !== wave) {
        for (let i = 0; i < count; i++) ctx.area(areaId(wave, i), null);
        const stars = starsOf(w, structure.size, ctx.places);
        stars.forEach((s, i) => { if (!st.taken.has(starKey(w, i))) ctx.area(areaId(w, i), { kind: "circle", x: s.x, y: s.y, r: STAR_REACH }, ["star"]); });
        for (const k of st.taken) if (Number(k.split(":")[0]) < w - 1) st.taken.delete(k);
        const b = BIG_SPOTS[w % BIG_SPOTS.length];
        st.big = { x: b.x, y: b.y, taken: false };
        ctx.area("big", { kind: "circle", x: b.x, y: b.y, r: BIG_R }, ["big"]);
        wave = w; count = stars.length;
      }
      // Estrella de dos: tú adentro y alguien más junto a ti.
      if (st.big && !st.big.taken && Math.hypot(p.x - st.big.x, p.y - st.big.y) < BIG_R && humans(ctx).some((e) => Math.hypot(e.x - p.x, e.y - p.y) < BIG_PAIR)) {
        st.big.taken = true; mine += 3; ctx.area("big", null);
        ctx.sound("big"); ctx.bubble(p, "¡Estrella de dos! +3");
      }
      // Las traes: la dorada aparece sólo si nadie la trae; quien la trae la pasa tocando a alguien.
      st.it = typeof ctx.shared.it === "string" ? ctx.shared.it : null;
      if (!st.it !== goldenOn) { goldenOn = !st.it; ctx.area("golden", goldenOn ? { kind: "circle", x: GOLDEN.x, y: GOLDEN.y, r: STAR_REACH } : null, ["golden"]); }
      const itAt = typeof ctx.shared.itAt === "number" ? ctx.shared.itAt : 0;
      if (st.it === ctx.meId && now - itAt >= TAG_COOLDOWN) {
        const to = humans(ctx).find((e) => Math.hypot(e.x - p.x, e.y - p.y) < TAG_REACH);
        if (to) { ctx.commit({ it: to.id, itAt: Math.floor(now) }); ctx.bubble(to, "¡Las traes!"); ctx.sound("tag"); }
      }
      // Una vuelta que se quedó a medias se cancela sola.
      if (st.race.startedAt !== null && now - st.race.startedAt > RACE_MAX) st.race = { next: 0, startedAt: null };
      // Récord de estrellas (atómico: el dueño sólo se escribe si el récord sube).
      const best = typeof ctx.shared.best === "number" ? ctx.shared.best : 0;
      if (mine > best) ctx.commit({ best: mine, leader: ctx.meId });

      const raceBest = typeof ctx.shared.raceBest === "number" ? ctx.shared.raceBest : 0;
      const raceLine = st.race.startedAt !== null
        ? `🏁 ${clock(now - st.race.startedAt)} · aro ${st.race.next === 0 ? "meta" : `${st.race.next} de ${RINGS.length - 1}`}`
        : raceBest ? `🏁 Récord ${clock(raceBest / 10)}${nameOf(ctx, ctx.shared.raceLeader) ? ` (${nameOf(ctx, ctx.shared.raceLeader)})` : ""} · cruza la salida` : "🏁 Cruza la salida para correr";
      const who = nameOf(ctx, ctx.shared.leader);
      ctx.hud({
        title: `⭐ ${mine} · récord ${Math.max(best, mine)}${who ? ` (${who})` : ""}`,
        lines: [raceLine, st.it ? `👑 La trae ${nameOf(ctx, st.it) ?? "alguien"}` : "👑 Toma la estrella dorada", `Nueva tanda en ${Math.ceil(STAR_EVERY - (now % STAR_EVERY))} s`],
      });
    },
    on(signal, ctx) {
      const now = ctx.now, p = ctx.player;
      if (signal.type === "area-entered") {
        const { id, tags } = signal.area;
        if (tags?.includes("star")) {
          const key = id.slice("star:".length);
          if (st.taken.has(key)) return;
          st.taken.add(key); mine++; ctx.area(id, null);
          ctx.sound("star"); ctx.bubble(p, mine === 1 ? "¡Tu primera estrella!" : `${mine} estrellas`);
        } else if (tags?.includes("golden")) {
          ctx.commit({ it: ctx.meId, itAt: Math.floor(now) }); ctx.sound("tag"); ctx.bubble(p, "¡La traes tú!");
        } else if (tags?.includes("ring")) {
          const i = Number(id.split(":")[1]), r = st.race;
          if (i === 0 && r.startedAt !== null && r.next === 0) {
            // Meta: tiempo en décimas; el servidor sólo lo guarda si baja el récord.
            const tenths = Math.max(1, Math.round((now - r.startedAt) * 10));
            ctx.commit({ raceBest: tenths, raceLeader: ctx.meId });
            ctx.sound("finish"); ctx.bubble(p, `¡Meta! ${clock(tenths / 10)}`);
            st.race = { next: 1, startedAt: now }; // y arranca otra vuelta
          } else if (i === 0 && r.startedAt === null) {
            st.race = { next: 1, startedAt: now }; ctx.sound("ring"); ctx.bubble(p, "¡Arrancas! Sigue los aros");
          } else if (r.startedAt !== null && i === r.next) {
            r.next = i + 1 >= RINGS.length ? 0 : i + 1; ctx.sound("ring");
          }
        }
      } else if (signal.type === "wave") {
        // Choca esas cinco: el saludo entre dos que están cerca.
        const { from, to } = signal;
        if (Math.hypot(from.x - to.x, from.y - to.y) > HIGH_FIVE) return;
        st.showers.push({ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 });
        if (from === p || to === p) { ctx.sound("big"); ctx.bubble(p, "¡Choca esas cinco!"); }
      }
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
    hint: "Junta estrellas, cruza los aros de la carrera y pásale la estrella dorada a alguien.",
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
  mode: islandGame,
};
export default archipielago;
