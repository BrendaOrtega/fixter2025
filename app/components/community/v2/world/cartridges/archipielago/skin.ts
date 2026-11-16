// Archipiélago: la skin (cómo se ve y suena). Sólo navegador; se carga con `import()` desde el manifiesto.
import type { WorldSkin } from "../../cartridge";
import { GHOSTLING_INK, ghostSprite, inkOf, loadGhosts } from "./ghost";
import { createRenderer } from "./renderer";
import { sounds } from "./sounds";

loadGhosts();

const skin: WorldSkin = {
  createRenderer,
  sounds,
  // Selector (56×40): el mismo sprite del mapa, ampliado sin suavizado.
  drawOption(ctx, slot, id, look) {
    const sp = slot === "model" ? ghostSprite(id, look.color) : ghostSprite(look.model, look.color);
    if (!sp) return;
    ctx.imageSmoothingEnabled = false;
    const k = Math.floor(Math.min(36 / sp.h, 50 / sp.w) * 2) / 2 || 1;
    ctx.drawImage(sp.frames[0], 28 - (sp.w * k) / 2, 20 - (sp.h * k) / 2, sp.w * k, sp.h * k);
  },
  swatch: (colorId) => (GHOSTLING_INK[colorId] ?? inkOf("ghosty", colorId)).body,
};
export default skin;
