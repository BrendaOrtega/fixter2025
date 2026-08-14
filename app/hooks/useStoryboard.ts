import { useEffect, useState } from "react";

/**
 * Las miniaturas que se ven al pasar el cursor por la barra.
 *
 * Todas viven en UNA sola imagen (un sprite), y un WebVTT dice qué recorte corresponde a
 * cada momento con un fragmento `#xywh=x,y,ancho,alto`. Ésa es toda la gracia: una
 * petición en vez de cuatrocientas cincuenta.
 */

export type Tile = {
  desde: number;
  hasta: number;
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

/** `01:02:03.500` → 3723.5 */
const aSegundos = (marca: string): number => {
  const partes = marca.trim().split(":").map(Number);
  if (partes.length === 3) return partes[0] * 3600 + partes[1] * 60 + partes[2];
  if (partes.length === 2) return partes[0] * 60 + partes[1];
  return partes[0] || 0;
};

export const parseStoryboardVTT = (texto: string): Tile[] => {
  const tiles: Tile[] = [];
  // Cada cue son dos líneas útiles: la de tiempos y la del recorte.
  for (const cue of texto.split(/\n\s*\n/)) {
    const m = /([\d:.]+)\s*-->\s*([\d:.]+)\s*\n\s*(\S+)/.exec(cue);
    if (!m) continue;
    const [, ini, fin, recorte] = m;
    const [src, frag] = recorte.split("#xywh=");
    if (!frag) continue;
    const [x, y, w, h] = frag.split(",").map(Number);
    if ([x, y, w, h].some((n) => !Number.isFinite(n))) continue;
    tiles.push({ desde: aSegundos(ini), hasta: aSegundos(fin), src, x, y, w, h });
  }
  return tiles;
};

/** El recorte que toca a ese segundo; el último se reusa para lo que caiga después. */
export const tileEn = (tiles: Tile[], segundo: number): Tile | undefined => {
  const exacto = tiles.find((t) => segundo >= t.desde && segundo < t.hasta);
  if (exacto) return exacto;
  const ultimo = tiles[tiles.length - 1];
  return ultimo && segundo >= ultimo.hasta ? ultimo : undefined;
};

/**
 * Se pide una sola vez por video. Si el video no tiene storyboard, el endpoint responde
 * 404 y aquí no pasa nada: el globo del hover funciona igual, sólo que sin imagen.
 */
export const useStoryboard = (videoSlug?: string) => {
  const [tiles, setTiles] = useState<Tile[]>([]);

  useEffect(() => {
    if (!videoSlug) return;
    let vivo = true;
    fetch(`/api/storyboard/${videoSlug}`)
      .then((r) => (r.ok ? r.text() : null))
      .then((t) => {
        if (!vivo || !t) return;
        const parsed = parseStoryboardVTT(t);
        setTiles(parsed);

        // Precarga. Sin esto el sprite no se empieza a bajar hasta el PRIMER hover, y
        // como además lleva un 302 al presigned, la primera miniatura tardaba en salir
        // justo cuando la persona está buscando dónde saltar. Son uno o dos sprites,
        // así que se piden todos.
        for (const src of new Set(parsed.map((tile) => tile.src))) {
          const img = new Image();
          img.decoding = "async";
          img.src = src;
        }
      })
      .catch(() => {});
    return () => {
      vivo = false;
      setTiles([]);
    };
  }, [videoSlug]);

  return tiles;
};
