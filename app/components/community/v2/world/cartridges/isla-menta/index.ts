// Isla Menta: mapa de aventura en 3D. Una isla low-poly vista en ángulo, con caminos entre los
// lugares del club y un muñequito que camina por cada persona conectada.
//
// Este archivo es el manifiesto (lo leen navegador y servidor): no importa three. La skin se carga
// aparte con `loadSkin`. Para registrarlo: sumarlo a `CARTRIDGES` en `../index.ts`.
import type { Cartridge } from "../../cartridge";
import { WORLD_ID, WORLD_NAME, structure } from "./structure";

export const islaMenta: Cartridge = {
  id: WORLD_ID,
  name: WORLD_NAME,
  description: "Una isla en 3D: cada miembro es un muñequito que camina por los caminos entre el Foro, el Mural, el Cine, la Escuelita y el Campamento.",
  structure,
  copy: {
    loading: "Preparando tu muñequito…",
    lookButton: "Mi muñequito",
    lookTitle: "Tu muñequito",
    lookLabel: "Elegir mi muñequito y ajustes",
    modelLabel: "Forma",
    colorLabel: "Color",
    pilotLabel: "Cara",
    count: (n) => (n === 1 ? "1 persona" : `${n} personas`),
    roaming: "caminando por la isla",
    hint: "Acércate a un lugar o a alguien.",
    hintKeys: " Flechas o WASD para caminar · clic para ir a un punto · Enter para entrar.",
    hintMini: "Toca la isla o un lugar y tu muñequito camina para allá.",
    expandMini: " la isla y caminar",
    mapLabel: "Isla del club con los muñequitos de quienes están conectados. Los lugares y las personas cercanas aparecen en la franja de abajo.",
    // Sin juego de disparos (`combat: null`): estos textos no se muestran.
    basicWeapon: "",
    uses: () => "",
    shootHint: "",
  },
  // Primer pintado, antes de que cargue three: el color del mar (nunca negro plano).
  poster: { backgroundColor: "#12272E" },
  loadSkin: () => import("./skin").then((m) => m.default),
};
export default islaMenta;
