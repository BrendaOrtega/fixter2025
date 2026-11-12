// GeekSector: la skin (cómo se ve y suena). Sólo navegador; se carga con `import()` desde el manifiesto.
import type { WorldSkin } from "../../cartridge";
import { colorOf } from "./palette";
import { createRenderer } from "./renderer";
import { drawPilot, drawShip } from "./ships";
import { sounds } from "./sounds";

const skin: WorldSkin = {
  createRenderer,
  sounds,
  // Los dibujos del selector salen de las mismas funciones que pintan el mapa.
  drawOption(ctx, slot, id, look, face) {
    if (slot === "model") drawShip(ctx, { model: id, color: look.color, pilot: look.pilot, ang: -0.35, thrust: 0.7, face }, 30, 21, 36, 0.4);
    else drawPilot(ctx, id, 28, 20, 16, face, id === "avatar" ? colorOf(look.color).fill : undefined);
  },
  swatch: (colorId) => colorOf(colorId).fill,
};
export default skin;
