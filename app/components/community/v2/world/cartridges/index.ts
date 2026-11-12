// Registro de cartuchos del «Mundo». Para agregar uno: importarlo y sumarlo a `CARTRIDGES`.
// Lo importan el navegador y el servidor: aquí sólo entran los manifiestos (la skin de cada uno
// se carga aparte con `loadSkin`). Manual: docs/club-rediseno/MUNDO-CARTUCHOS.md.
import type { Cartridge } from "../cartridge";
import { geeksector } from "./geeksector";
import { islaMenta } from "./isla-menta";

export const CARTRIDGES: readonly Cartridge[] = [geeksector, islaMenta];

/** El mundo de una comunidad que no ha elegido otro. */
export const DEFAULT_CARTRIDGE_ID = geeksector.id;

export const hasCartridge = (id: unknown): id is string => typeof id === "string" && CARTRIDGES.some((c) => c.id === id);

/** El cartucho con ese id; si no existe (id viejo o desconocido), el de la casa. */
export const getCartridge = (id: string | null | undefined): Cartridge => CARTRIDGES.find((c) => c.id === id) ?? geeksector;
