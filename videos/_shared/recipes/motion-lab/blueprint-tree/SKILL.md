---
name: blueprint-tree
description: |
  Piel blueprint (azul marino, líneas finas, destellos): un árbol se arma nodo por nodo mientras una cinta de
  texto corre por una ventana tipo "tokenizer"; Ghosty vuela a colocar cada nodo en el tiempo de su nota.
triggers:
  - "un árbol que se va armando estilo plano técnico"
  - "explicar cómo se parsea algo, nodo por nodo"
  - "escena blueprint con Ghosty"
origin: réplica de "how browsers work" hecho con Claude Opus 5.5 (cute.mp4, escena "parse html into the dom"), 24 sep 2026
---

# blueprint-tree

Canvas 2D dibujado cuadro por cuadro con una función `draw(t)`. Tiene fondo azul marino con viñeta, retícula, círculos concéntricos, un arco con marcas que gira, reglas laterales y una malla hexagonal. Arriba corre una cinta de texto por la ventana del tokenizer. Cada nodo del árbol aparece con un aro que se expande y un destello de 4 puntas; su arista crece desde el padre. Al final, unas peticiones punteadas terminan en etiquetas y la ruta activa se pinta de rosa.

## Cuándo usarla
- Explicar un proceso que construye una estructura: parser → DOM, AST, árbol de componentes o de dependencias.
- Escenas «bajo el capó» de un explainer técnico en 16:9.

## Cuándo NO (contención)
- Más de ~12 nodos o más de 4 niveles: se encima.
- Piezas de FixterGeek o EasyBits con la regla de caricatura plana: esta piel usa degradado y glow a propósito.

## Cómo aplicarla
1. Copiar `recipe.html` y `assets/ghosty.png`, y editar `PARAMS`.
2. Colocar cada nodo en `x, y`, con su `parent` y su `s16` (dieciseisavo en que aparece).
3. Si hay partitura: los `s16` son los mismos tiempos de la nota de cada nodo; el personaje llega justo ahí.

## Parámetros
| clave | tipo | default | qué controla |
|---|---|---|---|
| bpm | number | 120 | tempo; `s16` se convierte a segundos con él |
| duration | s | 7.5 | duración (poner igual en `data-duration`) |
| title / stage | string | "parse html into the dom" / "2 · parse" | título y etapa del HUD |
| tapeLabel / tape | string | "tokenizer" / HTML | texto de la ventana y de la cinta |
| character | ruta | assets/ghosty.png | asset oficial, sin repintar |
| nodes[] | {k, label, x, y, parent, s16} | 10 nodos del DOM | el árbol |
| requests[] | {label, path, lx, ly, s16, dur} | css e image | líneas punteadas con punto viajero |
| active | {nodes[], s16} | head, body @40 | aristas que se pintan de rosa |
| rest | {x, y, s16} | 1060, 330 @44 | dónde se queda el personaje |

## SFX sugerido
- Nodo: campana corta en su `s16`. El destello dura 0.5 s y el sonido no debe pasar de ahí.
- Petición: pluck grave al arrancar, mientras el punto viaja `dur`.
- Ruta activa: dos notas de marimba separadas 0.25 s, una por arista.

## Trampas
- **Nada de `<` literal en los textos de `PARAMS`**: el compilador de HyperFrames rompe el `<script>` («Invalid or unexpected token») y el render sale en blanco aunque el snapshot se vea bien. Usar `<`.
- `blackdetect` no marca el fondo (#0a1130 → #1b2b66), pero no hay que oscurecer más la viñeta.
- Renderizar con `--experimental-fast-capture=false`.
