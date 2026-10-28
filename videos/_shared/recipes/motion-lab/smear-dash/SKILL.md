---
name: smear-dash
description: |
  Objeto que cruza rápido dibujado con smear frames (forma estirada 1–2 cuadros), múltiplos (copias en estela
  que se apagan en escalón) y líneas de velocidad en vez de motion blur; anticipación antes y frenón con
  overshoot después. Exporta los instantes de SFX (`window.__sfxCues`).
triggers:
  - "que el coche pase rapidísimo sin blur"
  - "smear frames"
  - "objeto que sale disparado con estela"
  - "dash con líneas de velocidad"
origin: técnica 6 de fixter2025/docs/motion-investigacion-oct20/3-tecnicas-de-los-mejores.md, 20 oct 2026
---

# smear-dash

Un cochecito estacionado tiembla, se agacha hacia atrás, cruza en 3–4 cuadros estirado con copias detrás,
frena de golpe con el cuerpo hacia adelante y se asienta; luego sale disparado y vuelve a entrar al centro.

## Cuándo usarla
- Cualquier cosa que viaja más rápido que el cuadro: entradas/salidas de un objeto, un cursor que salta,
  un sobre que se envía, Ghosty que cruza la pantalla.

## Cuándo NO (contención)
- Movimientos de más de ~6 cuadros: ahí ya se lee el movimiento y el smear se ve como error.
- Texto: estirado 2× deja de leerse; para texto usar cortinillas de `motion-anything`.

## Cómo aplicarla
1. Copiar `recipe.html`, cambiar el SVG de `#carArt` (base en `y = 0`, frente en `x = 120`).
2. Editar `PARAMS.dashes`: cada dash = `at` (cuadro), `from`, `frames[]` a mano y `rest` (dónde se asienta; `null`
   si sale de cuadro). Cada elemento de `frames` es UN cuadro: `{x, sx, sk, ghosts}`.
3. Si el frente del objeto no está en `x = 120`, cambiar el `svgOrigin` de `#carBody` (el estirado sale hacia atrás).

## Parámetros
| clave | tipo | default | qué controla |
|---|---|---|---|
| palette | "fixtergeek" \| "easybits" | fixtergeek | variables de color |
| fps | number | 30 | fps del render: los cuadros a mano caen en `n/fps` |
| groundY / park | px | 540 / 280 | piso y x de arranque |
| dashes[] | {at, from, frames[], rest} | 3 dashes | cada cruce, cuadro por cuadro |
| frames[i] | {x, sx, sk, ghosts[]} | — | posición, estirado (`scaleX`), inclinación (`skewX`°), x de las copias |
| anticip | {frames, sx, sk} | 6 / 0.9 / 12 | agacharse hacia atrás antes de arrancar |
| settle | {duration, s} | 0.45 / 3 | frenón: `back.out(s)` de x y skew |
| ghostOpacity | number[] | 0.55, 0.3 | opacidad de cada copia (la más cercana primero) |
| label | bool | true | pastilla |

## SFX sugerido (instantes del preview, en `window.__sfxCues`)
- `whoosh` en el primer cuadro rápido de cada dash: 0.833, 2.100, 2.700 s.
- `screech` (llanta) en el cuadro del frenón: 0.933 y 2.800 s.
- `clunk` en el rebote del frenón: `frenón + settle/(s+1)` = +0.1125 s → 1.046 y 2.913 s.
- No repetir el mismo `whoosh` dos veces seguidas: alternar dos samples.

## Trampas
- Los cuadros a mano van con `tl.set` en `n/fps − 0.004`: justo en `n/fps` el seek del render a veces cae antes por
  redondeo y se salta el cuadro.
- Las copias (`ghosts`) son `<use href="#carArt">` del dibujo SIN estirar; la sombra dura es `<use href="#carBody">`
  (sí hereda el smear). Si las copias heredan el estirado, se vuelve una mancha.
- Sólo se apagan con un `pose` posterior: el último cuadro de un dash que sale de pantalla debe traer `ghosts: []`.
- Giro de ruedas con valor absoluto acumulado, no `"+=540"` (relativo depende de en qué orden se inicializa al hacer seek).
- El estirado también estira las ruedas (salen ovaladas): es correcto en smear, no corregirlo.

## Línea (guía `fixter2025/docs/motion-investigacion-oct20/5-estilo-de-linea.md`)
- Silueta UNIDA (`#carSil`: cabina + carrocería + llantas) trazada a 18 px DETRÁS del relleno → contorno de 9 px;
  copia corrida `(2, 3)` = peso extra abajo-derecha. Todo con `vector-effect="non-scaling-stroke"`: con `scaleX 2.4`
  el contorno sigue en 9 px.
- Unión cabina/carrocería, manija, líneas de velocidad (cola afilada) y flecha de los letreros: pincel horneado con
  perfect-freehand y pegado como `d` (no hierve). Sólo trazos horizontales: un pincel vertical engordaría 2.4× con el
  smear; por eso el rayo de la rueda es `stroke` de 4.5 px con `non-scaling-stroke`.
- Ventanas y faro: sub-objetos con contorno interior de 4.5 px, separados de la línea de unión (nada encimado).
- La misma gramática en los tres sitios: cuadros de smear (`#carBody`), copias (`<use href="#carArt">`, con opacidad
  de grupo, así no se ven los trazos internos) y sombra (`--sh`, ahora `--muted`). El camino pasó a `--accent` para
  que la sombra `--muted` se lea encima; letreros con la misma silueta unida a peso de entorno (5.5 px).
