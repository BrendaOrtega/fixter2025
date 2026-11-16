// Archipiélago: la skin (cómo se ve y suena). Sólo navegador; se carga con `import()` desde el manifiesto.
import type { WorldSkin } from "../../cartridge";
import { createRenderer } from "./renderer";
import { sounds } from "./sounds";
import { TAU, colorOf, ghosty, spriteCache, vehicle } from "./sprites";

const cache = spriteCache();

const skin: WorldSkin = {
  createRenderer,
  sounds,
  // Selector de aspecto (56×40): el mismo sprite ampliado sin suavizado.
  drawOption(ctx, slot, id, look, face) {
    ctx.imageSmoothingEnabled = false;
    if (slot === "model") {
      const v = vehicle(cache, id, look.color, false);
      if (v) { const k = Math.min(36 / v.height, 50 / v.width); ctx.drawImage(v, 28 - (v.width * k) / 2, 20 - (v.height * k) / 2, v.width * k, v.height * k); return; }
      // «Volando solito»: sólo la sombra; la cara la pone el piloto.
      ctx.fillStyle = "#0F3F4C"; ctx.fillRect(18, 30, 20, 4);
      ctx.fillStyle = colorOf(look.color).fill; ctx.beginPath(); ctx.arc(28, 18, 9, 0, TAU); ctx.fill();
      return;
    }
    ctx.imageSmoothingEnabled = true;
    const g = ghosty();
    if (id === "ghosty" && g?.complete && g.naturalWidth) { const h = 32, w = (h * g.naturalWidth) / g.naturalHeight; ctx.drawImage(g, 28 - w / 2, 4, w, h); return; }
    ctx.fillStyle = face?.bg ?? colorOf(look.color).fill; ctx.beginPath(); ctx.arc(28, 20, 14, 0, TAU); ctx.fill();
    if (face?.img?.complete && face.img.naturalWidth) {
      ctx.save(); ctx.beginPath(); ctx.arc(28, 20, 14, 0, TAU); ctx.clip(); ctx.drawImage(face.img, 14, 6, 28, 28); ctx.restore();
    } else if (face) { ctx.fillStyle = face.fg; ctx.font = "700 13px ui-monospace, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(face.initials, 28, 21); }
  },
  swatch: (colorId) => colorOf(colorId).fill,
};
export default skin;
