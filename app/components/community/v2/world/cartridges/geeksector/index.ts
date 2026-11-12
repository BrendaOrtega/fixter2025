// GeekSector: el mundo de FixterGeek. Un pedazo de espacio donde cada miembro es una nave.
import type { Cartridge } from "../../cartridge";
import { structure } from "./structure";

// Cielo del primer pintado (antes de que arranque el canvas): puntos sólidos con la paleta.
const SKY = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><g fill="#7C8A8E"><circle cx="22" cy="34" r="1"/><circle cx="130" cy="18" r="1.2"/><circle cx="198" cy="92" r="1"/><circle cx="64" cy="150" r="1.2"/><circle cx="172" cy="204" r="1"/><circle cx="96" cy="88" r=".8"/></g><g fill="#85DDCB"><circle cx="210" cy="30" r="1.2"/><circle cx="38" cy="214" r="1.2"/><circle cx="140" cy="140" r="1"/></g><g fill="#F2F5F4"><circle cx="84" cy="48" r="1"/><circle cx="226" cy="168" r="1"/><circle cx="14" cy="118" r=".9"/></g></svg>',
)}")`;

export const geeksector: Cartridge = {
  id: "geeksector",
  name: "GeekSector",
  description: "Un pedazo de espacio: cada miembro es una nave que vuela entre la sala, el muro y las mesas.",
  structure,
  copy: {
    loading: "Preparando tu nave…",
    lookButton: "Mi nave",
    lookTitle: "Tu nave",
    lookLabel: "Elegir mi nave y ajustes",
    modelLabel: "Modelo",
    colorLabel: "Color",
    pilotLabel: "Piloto",
    count: (n) => (n === 1 ? "1 nave" : `${n} naves`),
    roaming: "volando por el club",
    hint: "Acércate a un lugar o a alguien.",
    hintKeys: " Flechas o WASD para volar · clic para ir a un punto · Enter para entrar · Espacio dispara · pasa sobre un aparato para cambiar tu disparo.",
    hintMini: "Toca el mapa o un lugar y tu nave vuela para allá.",
    expandMini: " el mundo y pilotear",
    mapLabel: "Mapa del club con las naves de quienes están conectados. Los lugares y las personas cercanas aparecen en la franja de abajo.",
    basicWeapon: "Disparo básico",
    uses: (n) => (n === 1 ? "1 tiro" : `${n} tiros`),
    shootHint: "clic derecho para disparar",
    threat: {
      arm: "recoge un aparato para defenderte",
      unarmed: "Sin aparato · recoge uno para defenderte",
      warning: (name) => `Viene el ${name}`,
      near: (name) => `El ${name} anda cerca`,
      advice: "En un lugar o sentado en una mesa no te alcanza.",
      destroyed: "Tu nave fue destruida",
      back: (n) => `Vuelves en ${n}…`,
    },
  },
  poster: { backgroundColor: "#0E1317", backgroundImage: SKY },
  loadSkin: () => import("./skin").then((m) => m.default),
};
