// GeekSector: renderizador en canvas 2D. Pinta el cuadro que le entrega el motor (cielo, lugares,
// naves, juego, efectos y etiquetas) con la cámara lógica 2D del motor (`frame.view`).
// Portado del mockup aprobado: docs/club-rediseno/mockup-micromundo.html.
//
// Estilo de la casa: ilustración plana, rellenos sólidos, borde fino. Sin gradientes ni brillos.

import { SHAKE, type Entity, type Pickup, type Place, type Shot, type View, type WorldEvent, type WorldFrame, type WorldRenderer, type WorldStructure } from "../../cartridge";
import { C, FONT, SHOT_COLORS, TAU, clamp, colorOf, roundRect, seeded, sparkle, type Ctx } from "./palette";
import { drawBase, drawPlanet, drawSatellite, drawStation, drawTable } from "./places";
import { drawEnemy, drawShip, ghosty } from "./ships";

// Efectos propios de la skin: nacen de los eventos del motor y se apagan solos.
type Fx =
  | { kind: "flash"; x: number; y: number; t: number; dur: number }
  | { kind: "ring"; x: number; y: number; t: number; dur: number; r: number; color: string }
  | { kind: "debris"; x: number; y: number; vx: number; vy: number; t: number; dur: number; color: string; rot: number; spin: number; size: number }
  | { kind: "spark"; x: number; y: number; vx: number; vy: number; t: number; dur: number; color: string };

/** Qué tan abajo del centro va la etiqueta de cada tipo de lugar. */
const LABEL_DY: Record<string, number> = { station: 104, planet: 104, satellite: 78, base: 84, table: 100 };
/** Cuánto tiembla una nave tocada y desde qué tan lejos llega en hipervelocidad. */
const SHAKE_PX = 2.6, WARP_FROM = 1100;

export function createRenderer({ canvas: cv, structure }: { canvas: HTMLCanvasElement; stage: HTMLElement; structure: WorldStructure }): WorldRenderer {
  const ctx = cv.getContext("2d") as Ctx;
  const { w: WORLD_W, h: WORLD_H } = structure.size;
  const ZONE = structure.tableZone ?? { name: "", entry: { x: 0, y: 0 }, x: 0, y: 0, w: 0, h: 0 };
  const BOT_HP = structure.combat?.bot.hp ?? 0, WARP = structure.combat?.bot.warp ?? 1;
  const seats = structure.tables[0]?.seats.length ?? 0;
  const PLAYER_HP = structure.threat?.player.hp ?? 0, THREAT_HP = structure.threat?.hp ?? 0;
  const ENEMY = colorOf("pink");
  let fx: Fx[] = [];
  let view: View = { vw: 1, vh: 1, scale: 1, camx: 0, camy: 0, ox: 0, oy: 0 }, dpr = 1;
  let frame: WorldFrame;
  const toScreen = (x: number, y: number) => ({ x: (x - view.camx) * view.scale + view.ox, y: (y - view.camy) * view.scale + view.oy });

  // ── Fondo: estrellas con la paleta (nunca negro plano) ──
  const starTile = document.createElement("canvas"); starTile.width = starTile.height = 512;
  {
    const g = starTile.getContext("2d") as Ctx, rnd = seeded(3);
    for (let i = 0; i < 90; i++) {
      const x = rnd() * 512, y = rnd() * 512, r = 0.5 + rnd() * 1.1, k = rnd();
      g.globalAlpha = 0.35 + rnd() * 0.45; g.fillStyle = k < 0.55 ? C.gray : k < 0.85 ? C.ink : C.mint;
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
    for (let i = 0; i < 7; i++) { g.globalAlpha = 0.55; g.fillStyle = i % 3 ? C.ink : C.mint; sparkle(g, 30 + rnd() * 452, 30 + rnd() * 452, 3.5 + rnd() * 3.5); g.fill(); }
  }
  const twinkles = (() => { const rnd = seeded(11); return Array.from({ length: 14 }, () => ({ x: rnd() * WORLD_W, y: rnd() * WORLD_H, r: 4 + rnd() * 5, ph: rnd() * TAU, mint: rnd() < 0.4 })); })();
  let starPattern: CanvasPattern | null = null;

  function drawDecor(t: number) {
    ctx.fillStyle = C.panel; ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(1668, 505, 150, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.soft; for (const [x, y, r] of [[1590, 450, 22], [1610, 560, 12], [1560, 512, 7]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
    ctx.save(); ctx.translate(985, 905); ctx.rotate(-0.25); ctx.lineCap = "round";
    for (const [rx, ry, a0, a1, w, col] of [[92, 30, 0.1, 2.6, 7, C.line], [92, 30, 3.3, 5.7, 7, C.line], [56, 17, 0.5, 3.0, 6, C.soft], [56, 17, 3.7, 6.0, 6, C.soft]] as const) {
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, a0, a1); ctx.stroke();
    }
    ctx.fillStyle = C.line; ctx.beginPath(); ctx.ellipse(0, 0, 16, 7, 0, 0, TAU); ctx.fill(); ctx.restore();
    ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; ctx.setLineDash([3, 11]); ctx.beginPath(); ctx.arc(800, 390, 176, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    for (const s of twinkles) { const k = 0.55 + 0.45 * Math.sin(t * 1.3 + s.ph); ctx.globalAlpha = 0.25 + 0.5 * k; ctx.fillStyle = s.mint ? C.mint : C.ink; sparkle(ctx, s.x, s.y, s.r * (0.6 + 0.4 * k)); ctx.fill(); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(20, 27, 32, .55)"; ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; ctx.setLineDash([7, 7]);
    roundRect(ctx, ZONE.x, ZONE.y, ZONE.w, ZONE.h, 34); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
  }
  function drawPlace(p: Place, t: number, boost: number, simple: boolean) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(boost, boost);
    if (p.kind === "station") drawStation(ctx, !!frame.placeStatus[p.id]?.on, t);
    else if (p.kind === "planet") drawPlanet(ctx);
    else if (p.kind === "satellite") drawSatellite(ctx, t);
    else if (p.kind === "base") drawBase(ctx);
    else drawTable(ctx, frame.tableCounts[p.table as number] > 0, simple);
    ctx.restore();
  }

  type LabelOpts = { size?: number; weight?: number; bg?: string; stroke?: string; color?: string; free?: boolean; dot?: string; img?: HTMLImageElement | null };
  /** Pastilla de texto en coordenadas de pantalla (nítida a cualquier escala). */
  function label(x: number, y: number, text: string, o: LabelOpts = {}) {
    const size = o.size ?? 11; ctx.font = `${o.weight ?? 600} ${size}px ${FONT}`;
    const lead = o.dot ? size + 7 : 0, w = ctx.measureText(text).width + 14 + lead, h = size + 8;
    // `free`: la etiqueta se va con el mundo; si no, se queda dentro del cuadro.
    const bx = o.free ? x - w / 2 : clamp(x - w / 2, 4, Math.max(4, view.vw - w - 4));
    ctx.fillStyle = o.bg ?? "rgba(20, 27, 32, .94)"; ctx.strokeStyle = o.stroke ?? C.line; ctx.lineWidth = 1;
    roundRect(ctx, bx, y, w, h, h / 2); ctx.fill(); ctx.stroke();
    if (o.dot) {
      const cx = bx + h / 2, cy = y + h / 2, cr = h / 2 - 2.5;
      ctx.fillStyle = o.dot; ctx.beginPath(); ctx.arc(cx, cy, cr, 0, TAU); ctx.fill();
      if (o.img && o.img.complete && o.img.naturalWidth) {
        // Foto real del miembro, recortada en círculo.
        ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, cr, 0, TAU); ctx.clip();
        const iw = o.img.naturalWidth, ih = o.img.naturalHeight, side = Math.min(iw, ih);
        ctx.drawImage(o.img, (iw - side) / 2, (ih - side) / 2, side, side, cx - cr, cy - cr, cr * 2, cr * 2); ctx.restore();
      }
    }
    ctx.fillStyle = o.color ?? C.ink; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(text, bx + 7 + lead, y + h / 2 + 0.5);
    return h;
  }
  function drawEdgeHints() {
    // Lugares fuera de cuadro: una flechita con su nombre en la orilla.
    const { vw, vh } = view, top = 56, m = 12;
    for (const p of frame.places) {
      if (p.kind === "table" && p.table !== 1) continue;
      const s = toScreen(p.x, p.y); if (s.x > -20 && s.x < vw + 20 && s.y > top - 40 && s.y < vh + 20) continue;
      const name = p.kind === "table" ? "Mesas" : p.short;
      ctx.font = `600 10px ${FONT}`; const w = ctx.measureText(name).width + 28, h = 20;
      const cx = clamp(s.x, m + w / 2, vw - m - w / 2), cy = clamp(s.y, top + h / 2, vh - m - h / 2 - 4);
      ctx.fillStyle = "rgba(20, 27, 32, .94)"; ctx.strokeStyle = C.line; ctx.lineWidth = 1; roundRect(ctx, cx - w / 2, cy - h / 2, w, h, 10); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.translate(cx - w / 2 + 11, cy); ctx.rotate(Math.atan2(s.y - cy, s.x - cx)); ctx.fillStyle = C.mint;
      ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-3, -4); ctx.lineTo(-3, 4); ctx.closePath(); ctx.fill(); ctx.restore();
      ctx.fillStyle = C.gray; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(name, cx - w / 2 + 20, cy + 0.5);
    }
  }

  /**
   * Hipervelocidad: la nave entra estirada desde atrás de su rumbo, con rayas de estela, y frena en seco.
   * `rest` va de 1 (lejos) a 0 (en su lugar). Con `dir = -1` es la salida: se estira hacia adelante y se va.
   */
  function drawWarp(e: Entity, t: number, left = e.warpT, dir = 1, enemy = false) {
    const u = 1 - left / WARP, rest = Math.pow(1 - u, 3), a = e.ang;
    ctx.save(); ctx.translate(e.x - dir * Math.cos(a) * WARP_FROM * rest, e.y - dir * Math.sin(a) * WARP_FROM * rest); ctx.rotate(a);
    ctx.lineCap = "round"; ctx.lineWidth = 2; ctx.globalAlpha = Math.min(1, rest * 4);
    [-15, -7, 0, 7, 15].forEach((off, i) => {
      ctx.strokeStyle = i % 2 ? (enemy ? ENEMY.fill : C.mint) : C.ink;
      ctx.beginPath(); ctx.moveTo(-22, off); ctx.lineTo(-22 - (40 + rest * 520) * (0.6 + 0.1 * ((i * 3) % 5)), off); ctx.stroke();
    });
    ctx.globalAlpha = 1; ctx.scale(1 + rest * 5, 1 - rest * 0.35); ctx.rotate(-a);
    if (enemy) drawEnemy(ctx, e, 0, 0, 60); else drawShip(ctx, e, 0, 0, 56, t);
    ctx.restore();
  }
  /** Barrita de vida plana sobre una nave: aparece al recibir daño y se oculta al recuperarse. */
  function lifeBar(x: number, y: number, part: number, color: string) {
    ctx.fillStyle = C.rockLine; roundRect(ctx, x - 18, y, 36, 5, 2.5); ctx.fill();
    if (part > 0) { ctx.fillStyle = color; roundRect(ctx, x - 18, y, Math.max(5, 36 * part), 5, 2.5); ctx.fill(); }
  }
  function drawHostile(s: Shot) {
    // Disparo de la enemiga: rombo rosa con estela oscura. Lento: se ve venir y se esquiva.
    const a = Math.atan2(s.vy, s.vx), fade = s.t > s.life - 0.2 ? (s.life - s.t) / 0.2 : 1;
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a); ctx.globalAlpha = Math.max(0, fade);
    ctx.lineCap = "round"; ctx.strokeStyle = ENEMY.dark; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-24, 0); ctx.lineTo(-11, 0); ctx.stroke();
    ctx.fillStyle = ENEMY.fill; ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(0, -6.5); ctx.lineTo(-11, 0); ctx.lineTo(0, 6.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.bg; ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(0, -2.4); ctx.lineTo(-4, 0); ctx.lineTo(0, 2.4); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function drawPickup(p: Pickup, t: number) {
    // Aparato espacial plano dentro de una burbuja: se ve que es para recoger, no un arma de verdad.
    const x = p.x, y = p.y + Math.sin(t * 1.6 + p.ph) * 3.5;
    ctx.fillStyle = C.panel; ctx.strokeStyle = C.mintDeep; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x, y, 19, 0, TAU); ctx.fill(); ctx.stroke();
    // Aro punteado que gira despacio: dice «recógeme».
    ctx.setLineDash([4, 7]); ctx.beginPath(); ctx.arc(x, y, 24, t * 0.35 + p.ph, t * 0.35 + p.ph + TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (p.kind === "triple") {
      // Bláster redondeado con tres boquillas en abanico.
      ctx.strokeStyle = C.mint; ctx.lineWidth = 4;
      for (const d of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.moveTo(x - 3, y + 2); ctx.lineTo(x - 3 + Math.cos(d - 0.35) * 14, y + 2 + Math.sin(d - 0.35) * 14); ctx.stroke(); }
      ctx.fillStyle = C.suit; ctx.beginPath(); ctx.arc(x - 4, y + 3, 6.5, 0, TAU); ctx.fill();
      ctx.fillStyle = C.mintDeep; ctx.beginPath(); ctx.arc(x - 4, y + 3, 2.4, 0, TAU); ctx.fill();
    } else if (p.kind === "ray") {
      // Antena emisora: base redondeada, varilla larga y una chispa en la punta.
      ctx.strokeStyle = C.green; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 6, y + 6); ctx.lineTo(x + 9, y - 9); ctx.stroke();
      ctx.fillStyle = C.suit; roundRect(ctx, x - 12, y + 2, 12, 9, 4); ctx.fill();
      ctx.fillStyle = C.ink; sparkle(ctx, x + 10, y - 10, 5); ctx.fill();
    } else if (p.kind === "seeker") {
      // Buscador: una flecha que da la vuelta hacia su punto.
      ctx.strokeStyle = SHOT_COLORS.seeker; ctx.lineWidth = 2.8; ctx.beginPath(); ctx.arc(x - 1, y + 2, 9, Math.PI * 0.75, Math.PI * 1.85); ctx.stroke();
      ctx.fillStyle = SHOT_COLORS.seeker; ctx.beginPath(); ctx.moveTo(x + 12, y + 2); ctx.lineTo(x + 3, y - 1); ctx.lineTo(x + 9, y - 9); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(x - 1, y + 2, 2.6, 0, TAU); ctx.fill();
    } else if (p.kind === "bounce") {
      // Rebote: una pelota que pega en el piso y sale.
      ctx.strokeStyle = C.rockLine; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x - 11, y + 10); ctx.lineTo(x + 11, y + 10); ctx.stroke();
      ctx.strokeStyle = SHOT_COLORS.bounce; ctx.lineWidth = 2.4; ctx.setLineDash([2, 5]); ctx.beginPath(); ctx.moveTo(x - 11, y - 7); ctx.lineTo(x - 2, y + 8); ctx.lineTo(x + 5, y - 3); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = SHOT_COLORS.bounce; ctx.beginPath(); ctx.arc(x + 7, y - 6, 4.6, 0, TAU); ctx.fill();
    } else if (p.kind === "bomb") {
      // Bomba de caricatura: bola redonda, mecha corta y una chispa.
      ctx.fillStyle = SHOT_COLORS.bomb; ctx.beginPath(); ctx.arc(x - 2, y + 3, 8.5, 0, TAU); ctx.fill();
      ctx.strokeStyle = C.suit; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x + 3, y - 4); ctx.quadraticCurveTo(x + 7, y - 9, x + 9, y - 8); ctx.stroke();
      ctx.fillStyle = C.ink; sparkle(ctx, x + 10, y - 9, 4.5); ctx.fill();
    } else {
      // Emisor de onda: un punto con dos arcos que se abren.
      ctx.fillStyle = C.suit; ctx.beginPath(); ctx.arc(x - 7, y + 5, 4.5, 0, TAU); ctx.fill();
      ctx.strokeStyle = C.mint; ctx.lineWidth = 2.6;
      for (const r of [9, 15]) { ctx.beginPath(); ctx.arc(x - 7, y + 5, r, -Math.PI / 2 - 0.15, 0.15); ctx.stroke(); }
    }
  }
  function drawShot(s: Shot) {
    // Destello alargado con estela corta, del color de la casa. El rayo es más largo y verde.
    const ray = s.kind === "ray";
    const a = Math.atan2(s.vy, s.vx), fade = s.t > s.life - 0.15 ? (s.life - s.t) / 0.15 : 1, len = ray ? 46 : 16;
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a); ctx.globalAlpha = Math.max(0, fade);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (s.kind === "seeker") {
      // Dardo lila con estela corta.
      ctx.strokeStyle = C.rockLine; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(-8, 0); ctx.stroke();
      ctx.fillStyle = SHOT_COLORS.seeker; ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-8, -6); ctx.lineTo(-4, 0); ctx.lineTo(-8, 6); ctx.closePath(); ctx.fill();
      ctx.restore(); return;
    }
    if (s.kind === "bounce" || s.kind === "bomb") {
      // Pelota azul (rebote) o bola ámbar más grande con chispa (bomba).
      const r = s.kind === "bomb" ? 8 : 5.5;
      ctx.strokeStyle = C.rockLine; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-r - 12, 0); ctx.lineTo(-r - 2, 0); ctx.stroke();
      ctx.fillStyle = SHOT_COLORS[s.kind]; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      ctx.fillStyle = C.ink; if (s.kind === "bomb") { sparkle(ctx, -r - 1, 0, 3 + 2 * Math.abs(Math.sin(s.t * 26))); ctx.fill(); } else { ctx.beginPath(); ctx.arc(1.5, -1.5, 1.6, 0, TAU); ctx.fill(); }
      ctx.restore(); return;
    }
    ctx.strokeStyle = C.mintDeep; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-len - 16, 0); ctx.lineTo(-len + 6, 0); ctx.stroke();
    ctx.strokeStyle = ray ? C.green : C.mint; ctx.lineWidth = ray ? 4 : 5; ctx.beginPath(); ctx.moveTo(-len + 6, 0); ctx.lineTo(6, 0); ctx.stroke();
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(6, 0, 2.6, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function render(f: WorldFrame) {
    frame = f; view = f.view;
    for (const e of fx) e.t += f.dt;
    fx = fx.filter((e) => e.t < e.dur);
    const { vw, vh, scale } = view, t = f.t, mini = f.mini, player = f.player, places = f.places;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, vw, vh);
    const px = mini ? 0 : view.camx * scale * 0.4, py = mini ? 0 : view.camy * scale * 0.4;
    if (starPattern) { ctx.save(); ctx.translate(-px, -py); ctx.fillStyle = starPattern; ctx.fillRect(px, py, vw, vh); ctx.restore(); }

    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (view.ox - view.camx * scale), dpr * (view.oy - view.camy * scale));
    drawDecor(t);
    for (const p of places) drawPlace(p, t, p.kind === "table" ? (mini ? 1.25 : 1) : mini ? 1.45 : 1, mini);
    const all = f.others;
    if (mini) {
      for (const e of all) {
        // En el mapa chico las demás naves son puntos de su color.
        ctx.fillStyle = colorOf(e.color).fill; ctx.strokeStyle = C.bg; ctx.lineWidth = 1.5 / scale;
        ctx.beginPath(); ctx.arc(e.x, e.y, (e.kind === "bot" ? 3.2 : 4.4) / scale, 0, TAU); ctx.fill(); ctx.stroke();
      }
      if (f.marker) {
        ctx.strokeStyle = C.mint; ctx.lineWidth = 1.5 / scale; ctx.setLineDash([3 / scale, 3 / scale]);
        ctx.beginPath(); ctx.moveTo(player.x, player.y); ctx.lineTo(f.marker.x, f.marker.y); ctx.stroke(); ctx.setLineDash([]);
      }
      drawShip(ctx, player, player.x, player.y, 30 / scale, t);
    } else {
      if (f.marker) {
        // A dónde va tu nave.
        const m = f.marker, k = (m.t * 1.4) % 1;
        ctx.strokeStyle = C.mint; ctx.lineWidth = 1.6; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.arc(m.x, m.y, 14, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.arc(m.x, m.y, 14 + k * 12, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
        ctx.fillStyle = C.mint; ctx.beginPath(); ctx.arc(m.x, m.y, 3, 0, TAU); ctx.fill();
      }
      if (f.nearEntity) {
        // Marca mínima de selección: un anillo alrededor de la nave que tienes cerca.
        const e = f.nearEntity;
        ctx.strokeStyle = C.mint; ctx.lineWidth = 1.6; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(e.x, e.y, 38, t * 0.6, t * 0.6 + TAU); ctx.stroke(); ctx.setLineDash([]);
      }
      if (!f.quiet) for (const p of f.pickups) if (p.alive) drawPickup(p, t);
      for (const e of [...all, player].sort((a, b) => a.y - b.y)) {
        const bob = e.kind === "me" || f.quiet ? 0 : Math.sin(t * 1.6 + e.bob) * 2.2;
        // Temblor amortiguado: 2–3 px que se apagan en un cuarto de segundo.
        const k = e.shakeT > 0 ? e.shakeT / SHAKE : 0, sx = k ? Math.sin((SHAKE - e.shakeT) * 80) * SHAKE_PX * k : 0, sy = k ? Math.cos((SHAKE - e.shakeT) * 63) * SHAKE_PX * 0.5 * k : 0;
        if (e.downT > 0) continue; // tu nave destruida: no está hasta que reaparezca
        if (e.warpT > 0) { drawWarp(e, t); continue; }
        // Recién reaparecida: parpadea mientras dura el escudo, con un aro punteado.
        const shield = e.shieldT > 0;
        if (shield) {
          ctx.strokeStyle = C.mint; ctx.lineWidth = 1.6; ctx.setLineDash([3, 6]); ctx.beginPath(); ctx.arc(e.x, e.y, 42, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
          ctx.globalAlpha = Math.floor(e.shieldT * 8) % 2 ? 0.35 : 1;
        }
        drawShip(ctx, e, e.x + sx, e.y + bob + sy, 56, t);
        if (shield) ctx.globalAlpha = 1;
        if (e.kind === "me" && PLAYER_HP && e.hp < PLAYER_HP) lifeBar(e.x, e.y - 46, e.hp / PLAYER_HP, e.hp <= PLAYER_HP * 0.3 ? ENEMY.fill : C.mint);
        // Robot golpeado: tres rayitas arriba de la nave, las que le quedan en menta.
        if (e.kind === "bot" && e.hp < BOT_HP) for (let i = 0; i < BOT_HP; i++) { ctx.fillStyle = i < e.hp ? C.mint : C.rockLine; roundRect(ctx, e.x - 13 + i * 9.5, e.y + bob - 44, 7, 4, 2); ctx.fill(); }
      }
      if (f.threat && f.threat.phase !== "warn") {
        // La nave enemiga: llega y se va en hipervelocidad; golpeada, enseña su barrita.
        const e = f.threat.entity;
        if (f.threat.phase === "leaving") drawWarp(e, t, WARP - e.leaveT, -1, true);
        else if (e.warpT > 0) drawWarp(e, t, undefined, 1, true);
        else {
          const k = e.shakeT > 0 ? e.shakeT / SHAKE : 0;
          drawEnemy(ctx, e, e.x + (k ? Math.sin((SHAKE - e.shakeT) * 80) * SHAKE_PX * k : 0), e.y, 60);
          if (e.hp < THREAT_HP) lifeBar(e.x, e.y - 46, e.hp / THREAT_HP, ENEMY.fill);
        }
      }
      for (const s of f.hostile) drawHostile(s);
      for (const s of f.shots) drawShot(s);
      for (const e of fx) if (e.kind === "ring") {
        // Un aro que crece lo que dura su sonido (onda, bomba, explosión, llegada).
        const k = e.t / e.dur; ctx.globalAlpha = 1 - k; ctx.strokeStyle = e.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * (0.14 + 0.86 * k), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
      }
      for (const e of fx) if (e.kind === "debris") {
        // Pedazos de la nave: salen girando, se frenan y se apagan.
        const k = e.t / e.dur, d = e.t * (1 - 0.4 * k);
        ctx.save(); ctx.translate(e.x + e.vx * d, e.y + e.vy * d); ctx.rotate(e.rot + e.spin * e.t); ctx.globalAlpha = 1 - k * k;
        ctx.fillStyle = e.color; roundRect(ctx, -e.size / 2, -e.size / 3, e.size, e.size * 0.66, 2); ctx.fill(); ctx.restore();
      }
      for (const e of fx) if (e.kind === "flash") {
        // Destello al atrapar: un aro que se abre y se apaga.
        const k = e.t / e.dur; ctx.globalAlpha = 1 - k; ctx.strokeStyle = C.ink; ctx.lineWidth = 3 * (1 - k) + 1; ctx.beginPath(); ctx.arc(e.x, e.y, 8 + 26 * k, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
      }
      for (const e of fx) if (e.kind === "spark") {
        const k = e.t / e.dur; ctx.globalAlpha = 1 - k; ctx.fillStyle = e.color; sparkle(ctx, e.x + e.vx * e.t, e.y + e.vy * e.t, 7 * (1 - k * 0.5)); ctx.fill(); ctx.globalAlpha = 1;
      }
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (mini) {
      for (const p of places) if (p.kind !== "table") { const s = toScreen(p.x, p.y + (p.kind === "station" ? 96 : LABEL_DY[p.kind]) * 1.45); label(s.x, Math.min(s.y, vh - 22), p.short, { size: 10 }); }
      const z = toScreen(ZONE.x + ZONE.w / 2, ZONE.y + ZONE.h); label(z.x, Math.min(z.y - 9, vh - 22), ZONE.name, { size: 10 });
      const s = toScreen(player.x, player.y); label(s.x, s.y + 17, "Tú", { size: 10, stroke: C.mint, color: C.mint });
      return;
    }
    const z = toScreen(ZONE.x + 30, ZONE.y);
    ctx.font = `600 11px ${FONT}`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    const zt = ZONE.name.toUpperCase();
    ctx.fillStyle = C.bg; ctx.fillRect(z.x - 8, z.y - 8, ctx.measureText(zt).width + 16, 16); ctx.fillStyle = C.gray; ctx.fillText(zt, z.x, z.y + 0.5);
    for (const p of places) {
      const s = toScreen(p.x, p.y + LABEL_DY[p.kind]), near = p === f.nearPlace;
      if (p.kind === "table") { label(s.x, s.y, `${p.short} · ${f.tableCounts[p.table as number]} de ${seats}`, { size: 11, weight: 500, free: true, color: near ? C.ink : C.gray, stroke: near ? C.mint : C.line }); continue; }
      const h = label(s.x, s.y, p.name, { size: 12, free: true, stroke: near ? C.mint : C.line });
      const status = frame.placeStatus[p.id];
      if (p.kind === "station" && status?.sub) { ctx.font = `500 11px ${FONT}`; ctx.textAlign = "center"; ctx.fillStyle = status.on ? C.mint : C.gray; ctx.fillText(status.sub, s.x, s.y + h + 10); }
    }
    // Con mucha gente las etiquetas se enciman: sólo llevan nombre las naves cercanas a la tuya.
    const crowded = all.length > 9;
    for (const e of all) {
      const s = toScreen(e.x, e.y); if (s.x < -80 || s.x > vw + 80 || s.y < -60 || s.y > vh + 60) continue;
      const near = e === f.nearEntity;
      if (e.warpT > 0) continue; // todavía viene llegando
      if (crowded && !near && Math.hypot(e.x - player.x, e.y - player.y) > 300) continue;
      if (e.kind === "bot") label(s.x, s.y + 31 * scale + 2, `${e.name} · robot`, { size: 10, weight: 500, free: true, color: near ? C.ink : C.gray, stroke: near ? C.mint : C.line });
      else label(s.x, s.y + 31 * scale + 2, e.first, { size: 11, weight: 500, free: true, dot: colorOf(e.color).fill, img: e.face?.img ?? null, color: near ? C.ink : C.text, stroke: near ? C.mint : C.line });
    }
    if (f.threat?.phase === "here" && f.threat.entity.warpT <= 0) {
      // La enemiga lleva su nombre en rosa; fuera de cuadro, una flecha en la orilla dice por dónde anda.
      const e = f.threat.entity, s = toScreen(e.x, e.y), name = `${e.name} · enemigo`;
      if (s.x > -30 && s.x < vw + 30 && s.y > 30 && s.y < vh + 30) label(s.x, s.y + 37 * scale + 2, name, { size: 10, weight: 600, free: true, color: ENEMY.fill, stroke: ENEMY.dark });
      else {
        ctx.font = `600 10px ${FONT}`; const w = ctx.measureText(name).width + 28, h = 20, m = 12;
        const cx = clamp(s.x, m + w / 2, vw - m - w / 2), cy = clamp(s.y, 56 + h / 2, vh - m - h / 2 - 28);
        ctx.fillStyle = "rgba(20, 27, 32, .94)"; ctx.strokeStyle = ENEMY.dark; ctx.lineWidth = 1; roundRect(ctx, cx - w / 2, cy - h / 2, w, h, 10); ctx.fill(); ctx.stroke();
        ctx.save(); ctx.translate(cx - w / 2 + 11, cy); ctx.rotate(Math.atan2(s.y - cy, s.x - cx)); ctx.fillStyle = ENEMY.fill;
        ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-3, -4); ctx.lineTo(-3, 4); ctx.closePath(); ctx.fill(); ctx.restore();
        ctx.fillStyle = ENEMY.fill; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(name, cx - w / 2 + 20, cy + 0.5);
      }
    }
    const ps = toScreen(player.x, player.y);
    if (player.downT <= 0) label(ps.x, ps.y + 31 * scale + 2, "Tú", { size: 11, free: true, stroke: C.mint, color: C.mint });
    for (const b of f.bubbles) {
      const s = toScreen(b.entity.x, b.entity.y), k = b.t / b.dur, rise = f.quiet ? 0 : Math.min(1, k * 4) * 8;
      ctx.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1; label(s.x, s.y - 36 * scale - 18 - rise, b.text, { size: 11, bg: C.ink, color: C.bg, stroke: C.ink }); ctx.globalAlpha = 1;
    }
    drawEdgeHints();
  }

  function event(ev: WorldEvent) {
    if (ev.type === "pulse") fx.push({ kind: "ring", x: ev.x, y: ev.y, t: 0, dur: ev.dur, r: ev.r, color: C.mint });
    else if (ev.type === "blast") fx.push({ kind: "ring", x: ev.x, y: ev.y, t: 0, dur: 0.3, r: ev.r, color: SHOT_COLORS[ev.shot] ?? SHOT_COLORS.bomb });
    else if (ev.type === "pickup") fx.push({ kind: "flash", x: ev.x, y: ev.y, t: 0, dur: 0.28 });
    else if (ev.type === "calm") fx = [];
    else if (ev.type === "tickle") {
      // Chispazo chico alrededor de la nave tocada.
      const e = ev.entity;
      for (let i = 0; i < 4; i++) { const b = (i * TAU) / 4 + 0.6; fx.push({ kind: "spark", x: e.x, y: e.y, vx: Math.cos(b) * 55, vy: Math.sin(b) * 55, t: 0, dur: 0.3, color: C.ink }); }
    } else if (ev.type === "greet") {
      const e = ev.entity;
      for (let i = 0; i < 8; i++) { const a = (i * TAU) / 8 + 0.3; fx.push({ kind: "spark", x: e.x, y: e.y, vx: Math.cos(a) * 70, vy: Math.sin(a) * 70, t: 0, dur: 0.8, color: i % 2 ? C.mint : C.green }); }
    } else if (ev.type === "bot-back") {
      const e = ev.entity;
      fx.push({ kind: "ring", x: e.x, y: e.y, t: 0, dur: 0.3, r: 64, color: C.ink });
      for (let k = 0; k < 6; k++) { const b = (k * TAU) / 6 + 0.4; fx.push({ kind: "spark", x: e.x, y: e.y, vx: Math.cos(b) * 80, vy: Math.sin(b) * 80, t: 0, dur: 0.35, color: C.mint }); }
    } else if (ev.type === "bot-down") {
      // La nave estalla en pedazos de su color.
      const e = ev.entity, col = colorOf(e.color);
      fx.push({ kind: "ring", x: e.x, y: e.y, t: 0, dur: 0.45, r: 78, color: C.ink });
      for (let i = 0; i < 8; i++) { const b = (i * TAU) / 8 + 0.3; fx.push({ kind: "spark", x: e.x, y: e.y, vx: Math.cos(b) * 120, vy: Math.sin(b) * 120, t: 0, dur: 0.45, color: i % 2 ? C.ink : col.fill }); }
      for (let i = 0; i < 9; i++) {
        const b = (i * TAU) / 9 + Math.random() * 0.5, v = 70 + Math.random() * 110;
        fx.push({ kind: "debris", x: e.x, y: e.y, vx: Math.cos(b) * v, vy: Math.sin(b) * v, t: 0, dur: 0.7 + Math.random() * 0.4, color: [col.fill, col.dark, C.ink][i % 3], rot: b, spin: (i % 2 ? 1 : -1) * (3 + Math.random() * 5), size: 7 + Math.random() * 7 });
      }
    }
  }

  ghosty();
  return {
    resize(v) {
      view = v; dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(v.vw * dpr); cv.height = Math.round(v.vh * dpr);
      starPattern = ctx.createPattern(starTile, "repeat");
    },
    render,
    event,
    destroy() { fx = []; },
  };
}
