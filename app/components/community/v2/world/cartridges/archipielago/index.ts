// Archipiélago: la vista aérea de «Ghosty sobre las islas» hecha mundo del club. Cada miembro es un
// fantasma en pixel art (Ghosty o un ghostyllo de su color) que vuela entre las islas y junta estrellas.
//
// Manifiesto: lo leen navegador y servidor (nada de DOM). La skin se carga aparte con `loadSkin`.
import type { Cartridge, GameMode, ModeContext, Objective } from "../../cartridge";
import { createQuests, type Quest } from "../../quests";
import { CATCH_R, HIDE_TIME, SEEK_TIME, STORM_EVERY, STORM_HP, STORM_LIFE, STORM_REACH, stormAt, FORMATION_ANGLE, FORMATION_EVERY, FORMATION_HOLD, FORMATION_REACH, FORMATION_SPEED, RACE_COUNTDOWN, RACE_GO, RACE_LIMIT, START_R, BIG_PAIR, BIG_R, BIG_SPOTS, GOLDEN, HIGH_FIVE, RINGS, RING_R, STAR_EVERY, STAR_REACH, TAG_COOLDOWN, TAG_REACH, createStarState, starKey, starsOf, type StarState } from "./stars";
import { WORLD_ID, WORLD_NAME, structure } from "./structure";

/**
 * Recorrido de bienvenida: Ghosty vuela contigo como guía (personaje que sólo tú ves), se adelanta a cada
 * isla, te espera si te quedas atrás y explica qué hay en cada una con el cuadro de diálogo.
 */
const placeObj = (id: string, label: string) => (ctx: ModeContext): Objective | null => { const pl = ctx.places.find((q) => q.id === id); return pl ? { x: pl.x, y: pl.y, label } : null; };
const entered = (id: string) => (e: { type: string }) => e.type === "place-entered" && (e as unknown as { place: { id: string } }).place.id === id;
function welcomeQuest(st: StarState): Quest {
  const nearestStar = (ctx: ModeContext): Objective | null => {
    const w = Math.floor(ctx.now / STAR_EVERY), p = ctx.player;
    let best: Objective | null = null, bd = Infinity;
    starsOf(w, structure.size, ctx.places).forEach((s, i) => { if (st.taken.has(starKey(w, i))) return; const d = Math.hypot(s.x - p.x, s.y - p.y); if (d < bd) { bd = d; best = { x: s.x, y: s.y, label: "Estrella" }; } });
    return best;
  };
  return {
    id: "bienvenida",
    title: "Recorrido con Ghosty",
    reward: "+10 estrellas",
    steps: [
      { text: "Sigue a Ghosty al Faro", say: "¡Hola, {first}! Soy Ghosty. Te enseño las islas del club. ¡Sígueme al Faro!", target: placeObj("live", "Faro"), done: entered("live") },
      { text: "Escucha a Ghosty", say: "Este es el Faro: aquí es la sala en vivo. Cuando hay sesión se enciende la luz; te acercas, presionas Enter y ya estás en la llamada.", wait: 7 },
      { text: "Junta 3 estrellas", say: "Las estrellas salen cada 30 segundos sobre las islas. Pasa encima de ellas: ¡junta 3!", target: nearestStar, done: (e) => e.type === "star" && Number((e as { total?: number }).total) >= 3 },
      { text: "Sigue a Ghosty al Cine", say: "¡Muy bien! Ahora vamos al Cine.", target: placeObj("recs", "Cine"), done: entered("recs") },
      { text: "Escucha a Ghosty", say: "En el Cine están las grabaciones de las sesiones pasadas. Si te perdiste una, aquí la ves.", wait: 6 },
      { text: "Sigue a Ghosty a la Escuelita", say: "Ahora la Escuelita. ¡Vamos!", target: placeObj("courses", "Escuelita"), done: entered("courses") },
      { text: "Escucha a Ghosty", say: "En la Escuelita están los cursos del club, a tu ritmo.", wait: 5 },
      { text: "Entra al aro coral", say: "Lo último: este aro coral es la salida de la carrera. Entra y sigue la flecha amarilla de aro en aro.", target: () => ({ x: RINGS[0].x, y: RINGS[0].y, label: "Salida" }), done: (e) => e.type === "area-entered" && (e as unknown as { area: { id: string } }).area.id === "start" },
    ],
  };
}

const clock = (secs: number) => `${Math.floor(secs / 60)}:${(secs % 60).toFixed(1).padStart(4, "0")}`;

/**
 * El juego del Archipiélago, armado con señales y áreas:
 * - Estrellas: cada estrella de la tanda es un área; quien rompe el récord lo guarda con su nombre en un solo cambio.
 * - Estrella de dos: una grande por tanda que sólo se abre si otra persona está junto a ti dentro de ella.
 * - Carrera: sólo se ve la salida. Sin nadie más, entrar arranca tu contrarreloj. Con gente, entrar la convoca
 *   (`raceAt`) y a los 5 s salen juntos los que estén ahí; quien llega tarde arranca su propia vuelta. Los aros
 *   sólo se ven (y cuentan) mientras corres; la vuelta termina en la meta o a los 90 s. Récord con `merge: "min"`.
 * - Las traes: la estrella dorada la toma quien llegue primero y se pasa tocando a otra persona.
 * - Formación: volar junto a alguien, en la misma dirección y rápido, suma una estrella cada 4 s.
 * - Tormenta: cada 4 min cruza el mapa; sólo cae si le pegan (clic derecho) con alguien más junto a ella.
 * - Escondidillas: quien entra al círculo busca; los demás se esconden 15 s y quien busca sólo ve de cerca.
 * - Choca esas cinco: un saludo entre dos que están cerca suelta una lluvia de estrellas (la pinta la skin).
 */
function islandGame(st: StarState): GameMode {
  let mine = 0, wave = -1, count = 0, goldenOn = false, together = 0, formT = 0, phase: "off" | "countdown" | "on" = "off", beep = -1;
  let downWave = -1, hitWave = -1, lonely = 0, hidePhase: "off" | "hiding" | "seek" = "off", caught = false;
  const found = new Set<string>();
  let hideWasMine = false, wasInStart = false;
  const startLap = (ctx: ModeContext, at: number, msg: string) => { st.race = { next: 1, startedAt: at }; lap = []; lapT = 0; ctx.sound("finish"); ctx.bubble(ctx.player, msg); };
  // Fantasma del récord: tu vuelta se muestrea; si es récord, viaja resumida en 20 puntos y cualquiera corre contra ella.
  let lap: Array<{ t: number; x: number; y: number }> = [], lapT = 0;
  const GHOST = "fantasma:record", GHOST_N = 20;
  const b36 = (v: number) => Math.max(0, Math.min(1295, Math.round(v / 4))).toString(36).padStart(2, "0");
  const lapAt = (path: Array<{ t: number; x: number; y: number }>, t: number) => {
    let i = 1; while (i < path.length - 1 && path[i].t < t) i++;
    const a = path[i - 1], b = path[i], k = Math.max(0, Math.min(1, (t - a.t) / Math.max(0.001, b.t - a.t)));
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
  };
  const encodeLap = (total: number) => {
    if (lap.length < 2) return "";
    let out = "";
    for (let i = 0; i < GHOST_N; i++) { const q = lapAt(lap, (total * i) / (GHOST_N - 1)); out += b36(q.x) + b36(q.y); }
    return out;
  };
  const decodeLap = (s: unknown) => {
    if (typeof s !== "string" || s.length !== GHOST_N * 4) return null;
    const pts: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < GHOST_N; i++) { const x = parseInt(s.slice(i * 4, i * 4 + 2), 36) * 4, y = parseInt(s.slice(i * 4 + 2, i * 4 + 4), 36) * 4; if (!Number.isFinite(x) || !Number.isFinite(y)) return null; pts.push({ x, y }); }
    return pts;
  };
  // Misión del día: una distinta cada día (hora de CDMX), con +5 estrellas.
  const DAILY = [
    { text: "Junta 10 estrellas", goal: 10, on: "star" },
    { text: "Termina una vuelta de la carrera", goal: 1, on: "lap" },
    { text: "Saluda a 2 fantasmas", goal: 2, on: "wave" },
  ] as const;
  let dailyN = 0, dailyDay = 0, dailyDone = 0, dailyMsgT = 0;
  const dayOf = (now: number) => { const d = new Date((now - 6 * 3600) * 1000); return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate(); };
  const dailyOf = (now: number) => DAILY[Math.floor((now - 6 * 3600) / 86400) % DAILY.length];
  const dailyHit = (kind: (typeof DAILY)[number]["on"], ctx: ModeContext) => {
    const today = dayOf(ctx.now), d = dailyOf(ctx.now);
    if (!ctx.progress || d.on !== kind) return;
    if (dailyDay !== today) { dailyDay = today; dailyN = 0; }
    if (Math.max(dailyDone, ctx.progress.stats.daily ?? 0) >= today) return;
    if (++dailyN < d.goal) return;
    dailyDone = today; mine += 5; ctx.save({ daily: today, dailies: 1 });
    ctx.sound("finish"); ctx.dialog({ who: "Ghosty", text: `¡Misión de hoy cumplida, ${ctx.player.first}! +5 estrellas. Mañana hay otra.` }); dailyMsgT = 6;
  };
  // Misiones y progreso guardado: `saved` es cuánto de `mine` ya se mandó a guardar.
  const quests = createQuests([welcomeQuest(st)]);
  let saved = 0, greeted = false, byeT = 0, lastStep: unknown = null, farT = 0;
  const GUIDE = "guia:ghosty", ghostyLook = { model: "ghosty", color: "sky", pilot: "avatar" };
  const quest = (e: Parameters<typeof quests.on>[0], ctx: ModeContext) => {
    if (!ctx.progress) return;
    finish(quests.on(e, ctx), ctx);
  };
  function finish(q: Quest | null, ctx: ModeContext) {
    if (!q) return;
    if (!ctx.progress?.quests.includes(q.id)) { mine += 10; ctx.save({}, [q.id]); }
    ctx.sound("finish");
    ctx.dialog({ who: "Ghosty", text: `¡Listo, ${ctx.player.first}! Ya conoces el archipiélago. ${q.reward}. Si quieres repetir el recorrido, salúdame: ando dando vueltas al Faro.` });
    byeT = 7;
  }
  /** Ghosty guía: va al objetivo del paso, pero si te quedas lejos regresa por ti. */
  function guide(ctx: ModeContext, dt: number) {
    const step = quests.step, p = ctx.player;
    if (byeT > 0) {
      byeT -= dt;
      const faro = ctx.places.find((q) => q.id === "live");
      ctx.npc(GUIDE, { name: "Ghosty · tu guía", look: ghostyLook, to: faro ? { x: faro.x, y: faro.y } : p, speed: 260 });
      if (byeT <= 0) { ctx.npc(GUIDE, null); ctx.dialog(null); }
      return;
    }
    if (!ctx.progress || !step) { ctx.npc(GUIDE, null); return; }
    if (step !== lastStep) {
      lastStep = step;
      if (step.say) ctx.dialog({ who: "Ghosty", text: step.say.replace("{first}", p.first) });
      ctx.sound("ring");
    }
    const g = ctx.npc(GUIDE, { name: "Ghosty · tu guía", look: ghostyLook, to: p, speed: 340 });
    if (!g) return;
    const tgt = step.target?.(ctx), dMe = Math.hypot(g.x - p.x, g.y - p.y);
    let to: { x: number; y: number };
    if (!tgt) to = { x: p.x + 70, y: p.y - 60 }; // explica: flota junto a ti
    else if (dMe > 420) { to = { x: p.x + (tgt.x - p.x) * 0.15, y: p.y + (tgt.y - p.y) * 0.15 }; farT += dt; if (farT > 3) { farT = 0; ctx.bubble(g, "¡Por aquí!"); } }
    else { const d = Math.hypot(tgt.x - p.x, tgt.y - p.y) || 1, ahead = Math.min(d, 260); to = { x: p.x + ((tgt.x - p.x) / d) * ahead, y: p.y + ((tgt.y - p.y) / d) * ahead - 30 }; farT = 0; }
    ctx.npc(GUIDE, { name: "Ghosty · tu guía", look: ghostyLook, to });
  }
  const areaId = (w: number, i: number) => `star:${starKey(w, i)}`;
  const humans = (ctx: ModeContext) => ctx.others.filter((e) => e.kind === "human");
  // Cambios que deben entrar sí o sí (convocar, meta, estrella dorada): se reintentan cada cuadro hasta
  // que el estado compartido los refleje o se venzan. Un envío rechazado (p. ej. por frecuencia) ya no se pierde.
  let pending: { changes: Record<string, string | number>; until: number; done?: (ctx: ModeContext) => boolean } | null = null;
  const want = (changes: Record<string, string | number>, now: number, secs = 4, done?: (ctx: ModeContext) => boolean) => { pending = { changes, until: now + secs, done }; };
  const nameOf = (ctx: ModeContext, id: unknown) => (id === ctx.meId ? "tú" : ctx.others.find((e) => e.id === id)?.first);
  return {
    update(ctx, dt) {
      st.now = ctx.now;
      if (pending) {
        const pd = pending;
        const landed = pd.done ? pd.done(ctx) : Object.entries(pd.changes).every(([k, v]) => ctx.shared[k] === v);
        if (landed || ctx.now > pd.until) pending = null; else ctx.commit(pd.changes);
      }
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
        if (to && !pending) { want({ it: to.id, itAt: Math.floor(now) }, now, 3, (c) => c.shared.it !== ctx.meId); ctx.bubble(to, "¡Las traes!"); ctx.sound("tag"); }
      }
      // Formación: alguien cerca, con rumbo parecido, y los dos volando rápido.
      const fast = (e: { vx: number; vy: number }) => Math.hypot(e.vx, e.vy) > FORMATION_SPEED;
      const mates = fast(p) ? humans(ctx).filter((e) => fast(e) && Math.hypot(e.x - p.x, e.y - p.y) < FORMATION_REACH && Math.abs(Math.atan2(Math.sin(e.ang - p.ang), Math.cos(e.ang - p.ang))) < FORMATION_ANGLE) : [];
      together = mates.length ? together + dt : 0;
      const wasOn = st.formation.length > 0;
      st.formation = together >= FORMATION_HOLD ? [ctx.meId, ...mates.map((e) => e.id)] : [];
      if (st.formation.length && !wasOn) { formT = 0; ctx.sound("big"); ctx.bubble(p, mates.length > 1 ? `¡Formación de ${mates.length + 1}!` : "¡Formación!"); }
      if (st.formation.length) { formT += dt; if (formT >= FORMATION_EVERY) { formT -= FORMATION_EVERY; mine += mates.length; ctx.sound("star"); ctx.bubble(p, `+${mates.length} en formación`); } }
      // Carrera: cuenta regresiva del grupo, arranque de quienes estén en la salida y límite de cada vuelta.
      st.raceAt = typeof ctx.shared.raceAt === "number" ? ctx.shared.raceAt : 0;
      const ph = !st.raceAt || now >= st.raceAt + RACE_GO ? "off" : now < st.raceAt ? "countdown" : "on";
      const inStart = Math.hypot(p.x - RINGS[0].x, p.y - RINGS[0].y) <= START_R, running = st.race.startedAt !== null && st.race.next >= 0;
      if (ph === "countdown") {
        const n = Math.ceil(st.raceAt - now);
        if (n !== beep) { beep = n; if (inStart) ctx.sound("ring"); else if (wasInStart) ctx.bubble(p, `¡Vuelve al aro coral! Arranca en ${n}`); }
      }
      if (ph === "on" && phase !== "on" && inStart && !running) startLap(ctx, st.raceAt, "¡Ya! Sigue la flecha amarilla");
      if (ph !== phase) { phase = ph; beep = -1; }
      wasInStart = inStart;
      if (running) { lapT -= dt; if (lapT <= 0) { lapT = 0.2; lap.push({ t: now - (st.race.startedAt as number), x: p.x, y: p.y }); } }
      // El fantasma del récord corre contigo: repite la vuelta récord desde tu salida.
      const ghostPath = running ? decodeLap(ctx.shared.raceGhost) : null, ghostSecs = typeof ctx.shared.raceBest === "number" ? ctx.shared.raceBest / 10 : 0;
      const gt = running ? now - (st.race.startedAt as number) : 0;
      if (ghostPath && ghostSecs > 0 && gt <= ghostSecs + 1) {
        const f = Math.max(0, Math.min(1, gt / ghostSecs)) * (GHOST_N - 1), i = Math.min(GHOST_N - 2, Math.floor(f)), k = f - i;
        const owner = ctx.shared.raceLeader === ctx.meId ? "tu récord" : typeof ctx.shared.raceLeaderName === "string" && ctx.shared.raceLeaderName ? `récord de ${ctx.shared.raceLeaderName}` : "récord";
        ctx.npc(GHOST, { name: `👻 ${owner} · ${clock(ghostSecs)}`, look: { model: "flame", color: "amber", pilot: "avatar" }, to: { x: ghostPath[i].x + (ghostPath[i + 1].x - ghostPath[i].x) * k, y: ghostPath[i].y + (ghostPath[i + 1].y - ghostPath[i].y) * k }, speed: 1200 });
      } else ctx.npc(GHOST, null);
      if (dailyMsgT > 0) { dailyMsgT -= dt; if (dailyMsgT <= 0 && !quests.current && byeT <= 0) ctx.dialog(null); }
      if (running && now - (st.race.startedAt as number) > RACE_LIMIT) { st.race = { next: -1, startedAt: null }; ctx.bubble(p, "Se acabó el tiempo de la vuelta"); }
      // Tormenta: dónde va, cuántos golpes lleva esta tanda y si ya cayó.
      const sw = Math.floor(now / STORM_EVERY), sv = typeof ctx.shared.storm === "number" ? ctx.shared.storm : 0;
      const hits = Math.floor(sv / 100) === sw ? sv % 100 : 0, spos = stormAt(now, structure.size);
      st.storm = { ...spos, alive: now % STORM_EVERY < STORM_LIFE && hits < STORM_HP, hits };
      if (hits >= STORM_HP && downWave !== sw) {
        downWave = sw; st.showers.push(spos); ctx.sound("thunder");
        if (hitWave === sw) { mine += 5; ctx.save({ storms: 1 }); ctx.bubble(p, "¡Tumbaron la tormenta! +5"); }
      }
      lonely = Math.max(0, lonely - dt);
      // Escondidillas.
      const seeker = typeof ctx.shared.seeker === "string" ? ctx.shared.seeker : null, hideAt = typeof ctx.shared.hideAt === "number" ? ctx.shared.hideAt : 0;
      const hp = !seeker || !hideAt || now >= hideAt + SEEK_TIME ? "off" : now < hideAt ? "hiding" : "seek";
      st.hide = { seeker, at: hideAt, phase: hp };
      if (hp !== hidePhase) {
        if (hp === "hiding") { found.clear(); caught = false; if (seeker !== ctx.meId) { ctx.sound("tag"); ctx.bubble(p, `¡Escóndete! ${nameOf(ctx, seeker) ?? "Alguien"} cuenta ${HIDE_TIME} s`); } }
        else if (hp === "seek") { ctx.sound("finish"); ctx.bubble(p, seeker === ctx.meId ? "¡A buscar!" : "¡Ya te buscan!"); }
        else if (hidePhase === "seek") {
          if (seeker === ctx.meId || hideWasMine) { mine += found.size * 2; ctx.save({ found: found.size }); ctx.bubble(p, `Encontraste ${found.size}`); }
          else if (!caught) { mine += 3; ctx.save({ hides: 1 }); ctx.sound("big"); ctx.bubble(p, "¡No te encontraron! +3"); }
        }
        hideWasMine = seeker === ctx.meId; hidePhase = hp;
      }
      if (hp === "seek") {
        if (seeker === ctx.meId) {
          for (const e of humans(ctx)) if (!found.has(e.id) && Math.hypot(e.x - p.x, e.y - p.y) < CATCH_R) { found.add(e.id); ctx.sound("tag"); ctx.bubble(e, "¡Te encontré!"); }
        } else if (!caught) {
          const s = ctx.others.find((e) => e.id === seeker);
          if (s && Math.hypot(s.x - p.x, s.y - p.y) < CATCH_R) { caught = true; ctx.sound("tag"); ctx.bubble(p, `¡Te encontró ${s.first}!`); }
        }
      }
      // Récord de estrellas (atómico: el dueño sólo se escribe si el récord sube).
      const best = typeof ctx.shared.best === "number" ? ctx.shared.best : 0;
      if (mine > best) ctx.commit({ best: mine, leader: ctx.meId, leaderName: p.first.slice(0, 24) });

      if (ctx.progress) finish(quests.tick(dt, ctx), ctx);
      guide(ctx, dt);
      // Guardar estrellas nuevas (el motor junta y manda por lotes).
      if (mine > saved) { ctx.save({ stars: mine - saved }); saved = mine; }
      // A dónde ir: en carrera, el aro que sigue; si no, el paso de la misión.
      const racing = st.race.startedAt !== null && st.race.next >= 0;
      ctx.objective(racing ? { x: RINGS[st.race.next].x, y: RINGS[st.race.next].y, label: st.race.next === 0 ? "Meta" : `Aro ${st.race.next}` } : ctx.progress ? quests.target(ctx) : null);

      const raceBest = typeof ctx.shared.raceBest === "number" ? ctx.shared.raceBest : 0;
      const savedName = (k: string) => (typeof ctx.shared[k] === "string" && ctx.shared[k] ? (ctx.shared[k] as string) : undefined);
      const raceLeader = nameOf(ctx, ctx.shared.raceLeader) ?? savedName("raceLeaderName");
      const raceLine = phase === "countdown" && !racing ? `🏁 Carrera en ${Math.ceil(st.raceAt - now)} s · quédate en el aro coral`
        : st.race.next > 0 || (st.race.next === 0 && st.race.startedAt !== null) ? `🏁 ${clock(now - (st.race.startedAt ?? now))} · ${st.race.next === 0 ? "¡a la meta!" : `aro ${st.race.next} de ${RINGS.length - 1}`}`
        : raceBest ? `🏁 Récord ${clock(raceBest / 10)}${raceLeader ? ` (${raceLeader})` : ""} · entra a la salida` : "🏁 Entra a la salida para convocar una carrera";
      const who = nameOf(ctx, ctx.shared.leader) ?? savedName("leaderName");
      const dq = dailyOf(now), dDone = Math.max(dailyDone, ctx.progress?.stats.daily ?? 0) >= dayOf(now);
      const dailyLine = !ctx.progress || quests.current ? null : dDone ? "📅 Misión de hoy: cumplida ✓" : `📅 Misión de hoy: ${dq.text}${dq.goal > 1 ? ` (${dailyDay === dayOf(now) ? dailyN : 0}/${dq.goal})` : ""} · +5`;
      const stormLine = st.storm.alive ? `⛈ Tormenta ${hits}/${STORM_HP} · clic derecho junto con alguien` : `⛈ Tormenta en ${clock(Math.max(0, STORM_EVERY - (now % STORM_EVERY))).replace(/\.\d$/, "")}`;
      const hideLeft = Math.ceil(hp === "hiding" ? hideAt - now : hideAt + SEEK_TIME - now);
      const hideLine = hp === "off" ? "🫣 Escondidillas: entra al círculo para buscar"
        : seeker === ctx.meId ? (hp === "hiding" ? `🙈 Cuenta… ${hideLeft} s` : `🔎 Encontraste ${found.size} · ${hideLeft} s`)
        : hp === "hiding" ? `🫣 ¡Escóndete! ${hideLeft} s` : caught ? "🫣 Te encontraron" : `🤫 Te buscan · ${hideLeft} s`;
      ctx.hud({
        title: `⭐ ${mine}${ctx.progress ? ` · ${ctx.progress.stats.stars ?? 0} de por vida` : ""} · récord ${Math.max(best, mine)}${who ? ` (${who})` : ""}`,
        board: [
          { label: "Récord de carrera", value: raceBest ? `${clock(raceBest / 10)}${raceLeader ? ` · ${raceLeader}` : ""}` : "Nadie todavía" },
          { label: "Más estrellas", value: Math.max(best, mine) ? `${Math.max(best, mine)}${who ? ` · ${who}` : ""}` : "Nadie todavía" },
          ...(ctx.progress?.stats.bestLap ? [{ label: "Tu mejor vuelta", value: clock(ctx.progress.stats.bestLap / 10) }] : []),
        ],
        lines: [...(ctx.progress && quests.line() ? [quests.line() as string] : []), ...(dailyLine ? [dailyLine] : []), raceLine, stormLine, hideLine, st.it ? `👑 La trae ${nameOf(ctx, st.it) ?? "alguien"}` : "👑 Toma la estrella dorada", `Nueva tanda en ${Math.ceil(STAR_EVERY - (now % STAR_EVERY))} s`],
      });
    },
    on(signal, ctx) {
      const now = ctx.now, p = ctx.player;
      if (signal.type === "progress-loaded") {
        quests.load(ctx.progress?.quests ?? []);
        if (quests.current && !greeted) { greeted = true; ctx.sound("waveIn"); }
        return;
      }
      quest(signal, ctx);
      if (signal.type === "area-entered") {
        const { id, tags } = signal.area;
        if (tags?.includes("star")) {
          const key = id.slice("star:".length);
          if (st.taken.has(key)) return;
          st.taken.add(key); mine++; ctx.area(id, null);
          ctx.sound("star"); ctx.bubble(p, mine === 1 ? "¡Tu primera estrella!" : `${mine} estrellas`);
          quest({ type: "star", total: mine }, ctx);
          dailyHit("star", ctx);
        } else if (tags?.includes("golden")) {
          want({ it: ctx.meId, itAt: Math.floor(now) }, now, 3, (c) => !!c.shared.it); ctx.sound("tag"); ctx.bubble(p, "¡La traes tú!");
        } else if (tags?.includes("hide")) {
          if (st.hide.phase === "off") { want({ seeker: ctx.meId, hideAt: Math.floor(now) + HIDE_TIME }, now); ctx.bubble(p, "Tú buscas: cuenta 15 s"); }
        } else if (tags?.includes("start")) {
          const r = st.race, running = r.startedAt !== null && r.next >= 0;
          if (running && r.next === 0) {
            // Meta: tiempo en décimas; el servidor sólo lo guarda si baja el récord («stale» si no, y está bien).
            const tenths = Math.max(1, Math.round((now - (r.startedAt as number)) * 10));
            const ghost = encodeLap(tenths / 10);
            want({ raceBest: tenths, raceLeader: ctx.meId, raceLeaderName: p.first.slice(0, 24), ...(ghost ? { raceGhost: ghost } : {}) }, now, 3, (c) => typeof c.shared.raceBest === "number" && c.shared.raceBest <= tenths);
            ctx.sound("finish"); ctx.bubble(p, `¡Meta! ${clock(tenths / 10)}`);
            ctx.save({ races: 1, bestLap: tenths });
            dailyHit("lap", ctx);
            st.race = { next: -1, startedAt: null };
          } else if (!running) {
            if (phase === "countdown") ctx.bubble(p, `¡Quédate aquí! Arranca en ${Math.ceil(st.raceAt - now)}`);
            else if (!humans(ctx).length || phase === "on") startLap(ctx, now, "¡Contra reloj! Sigue la flecha amarilla");
            else {
              // Con más gente: se convoca y salen juntos los que estén aquí.
              want({ raceAt: Math.floor(now) + RACE_COUNTDOWN }, now, 4, (c) => typeof c.shared.raceAt === "number" && c.now < c.shared.raceAt + RACE_GO);
              ctx.sound("tag"); ctx.bubble(p, `¡Carrera en ${RACE_COUNTDOWN} s! Quédate en el aro`);
            }
          }
        } else if (tags?.includes("ring")) {
          const i = Number(id.split(":")[1]), r = st.race;
          if (r.startedAt !== null && r.next > 0 && i === r.next) { r.next = i + 1 >= RINGS.length ? 0 : i + 1; ctx.sound("ring"); }
        }
      } else if (signal.type === "action") {
        // Golpe a la tormenta: sólo cuenta si hay alguien más cerca de ella.
        const sm = st.storm;
        if (!sm.alive || Math.hypot(p.x - sm.x, p.y - sm.y) > STORM_REACH) return;
        st.zaps.push({ x: sm.x, y: sm.y, t: now });
        ctx.sound("zap");
        const company = humans(ctx).some((e) => Math.hypot(e.x - sm.x, e.y - sm.y) < STORM_REACH);
        if (!company) { if (lonely <= 0) { lonely = 4; ctx.bubble(p, "Sin compañía no cae: trae a alguien más"); } return; }
        hitWave = Math.floor(now / STORM_EVERY);
        ctx.commit({ storm: hitWave * 100 + Math.min(99, sm.hits + 1) });
      } else if (signal.type === "wave" && signal.to.id === "bot:ghosty" && signal.from === p && !quests.current && byeT <= 0) {
        // Saludar a Ghosty cuando ya terminaste: repite el recorrido (sin volver a dar la recompensa).
        quests.replay("bienvenida"); lastStep = null;
      } else if (signal.type === "wave") {
        if (signal.from === p) dailyHit("wave", ctx);
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
    hint: "Junta estrellas, convoca una carrera, juega escondidillas, tumba la tormenta en equipo (clic derecho) y pásale la estrella dorada a alguien.",
    hintKeys: " Flechas o WASD para volar · Shift turbo · C cambia la cámara · clic derecho o Espacio golpea la tormenta · clic para ir a un punto · Enter para aterrizar.",
    hintMini: "Toca el mar o una isla y vuelas para allá.",
    expandMini: " el archipiélago y volar",
    mapLabel: "Archipiélago del club en pixel art, con quienes están conectados volando entre las islas. Las islas y las personas cercanas aparecen en la franja de abajo.",
    // Sin juego de disparos (`combat: null`): no se muestran.
    basicWeapon: "",
    uses: () => "",
    shootHint: "",
    // En celular, la acción (clic derecho / Espacio en escritorio) tiene su botón.
    action: { label: "Golpear", sub: "tormenta" },
  },
  // Primer pintado: el mar (nunca negro plano).
  poster: { backgroundColor: "#17529f" },
  loadSkin: () => import("./skin").then((m) => m.default),
  createState: createStarState,
  mode: islandGame,
};
export default archipielago;
