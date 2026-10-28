---
name: chase-lock-wipe
description: |
  Cortinilla: losas sesgadas entran en diagonal una tras otra y tapan la pantalla. Encima, las letras de un título
  caen una por semicorchea partidas en dos mitades desfasadas; una llave baja a la cerradura, gira y las mitades
  se traban como candado. El título sella el corte y todo sale por la misma diagonal destapando la escena nueva.
  Exporta los instantes de SFX (`window.__sfxCues`).
triggers:
  - "cortinilla con título que se traba"
  - "transición de espías con llave y cerradura"
  - "glifo enorme que sella el corte"
  - "losas diagonales que tapan y destapan"
origin: mecánica de spy-titles (lemomo-ai/lemo-opuscar, MIT; commit b5e8ef9), reescrita en SVG + GSAP sin copiar código ni arte, 21 oct 2026
---

# chase-lock-wipe

Siete losas de la paleta cruzan en diagonal, «MOTION» se arma letra por letra, la llave cierra el título
y la cortinilla se va por arriba a la derecha.

## Cuándo usarla
- Corte entre dos actos de un short (antes → después, problema → receta). Sella el corte con un glifo
  grande al centro, como pide la regla de transiciones.
- Títulos de 4–8 letras, mayúsculas.

## Cuándo NO (contención)
- Más de una vez por video: el truco de la llave se gasta.
- Palabras largas o con minúsculas: la tabla `widths` sólo trae mayúsculas comunes.
- Escenas que no pueden perder 2.5 s de pantalla tapada.

## Cómo aplicarla
1. Copiar `recipe.html`, editar `word`, `lockIndex` (una O: el ojo cae en su hueco) y las escenas.
2. Si la palabra trae letras fuera de `widths`, agregar su ancho en em (Inter 900). Si no está, usa 0.75 y el espaciado sale disparejo.
3. En un video real, `sceneA` y `sceneB` se reemplazan por las composiciones de antes y después. A se apaga
   cuando la última losa termina de entrar (`covered`).
4. `data-duration` ≥ `exitAt + (losas−1)·exitGap + exitDur + 0.5`.

## Parámetros
| clave | tipo | default | qué controla |
|---|---|---|---|
| palette | "fixtergeek" \| "easybits" | fixtergeek | variables de color |
| word / lockIndex | string / int | "MOTION" / 4 | título y letra con cerradura |
| fontSize / widths / tracking | px / {letra: em} / em | 190 / tabla / 0.03 | tamaño y espaciado (sin medir la fuente) |
| titleY / split | px | 430 / 44 | línea base y desfase de las mitades antes de trabarse |
| slant / slabColors | grados / claves | 30 / 7 colores | inclinación y colores de las losas |
| slabStart / slabGap / slabIn / slabEase | s | 0.3 / 0.06 / 0.45 / 1.4 | entrada de las losas, `back.out(s)` |
| bpm / letterStart / letterIn / letterEase | | 120 / 0.95 / 0.35 / 1.7 | letras en semicorcheas (60/bpm/4) |
| keySlide / keyTurn / lock | s | 0.3 / 0.12 / 0.08 | llave baja, gira, las mitades se cierran |
| exitAt / exitGap / exitDur | s | 2.95 / 0.05 / 0.45 | salida por la diagonal (`power3.in`) |

## SFX sugerido
- Losas: un `whoosh` largo de 0.8 s desde `slabStart`.
- Cada letra: `tick` distinto alternado en `t + letterIn/(letterEase+1)`.
- Llave: `slide` al bajar, `key-turn` al girar, `clack-seal` grave cuando las mitades se cierran (es el golpe del corte).
- Salida: `whoosh` corto en `exitAt`.

## Trampas
- Las losas se calculan para cubrir las cuatro esquinas del 1280×720 con la inclinación dada. Si cambias `slant` o el lienzo, revisa un cuadro con todo tapado.
- Dos recortes que comparten la misma línea dejan una costura gris por el antialias, y el traslape la empeora porque la sombra de la mitad de abajo pinta sobre la de arriba. Al trabarse se sustituyen por una copia entera (`#titleWhole`).
- No medir el texto: el ancho cambia cuando carga Inter. Por eso va la tabla `widths`; con avance fijo, «MOTION» se ve «MOT I ON».
- Dentro de SVG: `svgOrigin`. La posición de cada letra va en el `<g>` de afuera y la animación en el de adentro.
