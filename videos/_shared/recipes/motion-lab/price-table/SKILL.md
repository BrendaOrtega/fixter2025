---
name: price-table
description: |
  Tabla comparativa de dos columnas (p. ej. INPUT / OUTPUT) con barras y valores que cuentan por fila,
  ejes con ticks por columna y una fila destacada a la que la cámara empuja y que se enmarca al final.
  Para precios, tokens, límites o cualquier par de métricas por modelo/plan.
triggers:
  - "tabla de precios animada con barras"
  - "comparativa de dos columnas con la fila nuestra enmarcada"
  - "input y output por modelo que cuentan"
origin: réplica TypeSafe (videos/replica-typesafe/scenes/13-cheaper-charts, escena C), 17 sep 2026
---

# price-table

Título y subtítulo, dos columnas separadas por una línea, filas con nombre en mono, barra y valor por columna; las filas entran en cascada, las barras crecen y los valores cuentan; luego la cámara empuja hacia `highlightRow`, el resto se atenúa y la fila se enmarca con sombra dura.

## Cuándo usarla
- Dos métricas por elemento con escalas distintas (cada columna tiene su `max` y sus `ticks`).
- Hasta 9 filas; una de ellas es la nuestra (puede ser de texto: "GRATIS").

## Cuándo NO (contención)
- Una sola métrica: `hbar-chart` (tiene cajita de grupo y eje único).
- Tres métricas o más: no cabe legible en 1280×720; parte en dos tablas.
- Relación entre dos variables continuas: `scatter-reveal`.

## Cómo aplicarla
1. Copiar `recipe.html`, editar `PARAMS` (`columns`, `rows`, `highlightRow`).
2. Fila de texto: `{ label, values: [0, 0], text: ["$0.0", "GRATIS"] }` — sin barra, en color de acento.
3. `data-duration` = `timings.zoomAt + 0.8 + timings.hold`; la consola avisa si difiere.

## Parámetros
| clave | tipo | default | qué controla |
|---|---|---|---|
| palette | "fixtergeek" \| "easybits" | fixtergeek | paleta |
| title / subtitle | string | — | arriba izquierda / arriba derecha |
| columns | {name,max,ticks}[] (2) | — | encabezado, tope de escala (290 px) y ticks por columna |
| prefix | string | "$" | se antepone a valores y ticks |
| rows | {label,values[2],text?[2]}[] | — | filas; `text` sustituye barras por celdas de texto |
| highlightRow | number | 6 | fila enmarcada; -1 desactiva el zoom y el marco |
| timings.rowStagger | s | 0.09 | cascada de filas |
| timings.barDur | s | 0.9 | crecimiento y contador |
| timings.zoomAt | s | 1.6 | inicio del empuje de cámara (0.6 s) |
| timings.zoomScale | number | 1.3 | escala del empuje, anclado a la izquierda |
| timings.hold | s | 1.4 | quieto al final |

## SFX sugerido
- 0.10 s + i·0.09: tic de papel por fila (dos samples alternados).
- 0.35 s: whoosh suave mientras crecen las barras (0.9 s).
- `zoomAt`: riser corto de 0.6 s; `zoomAt + 0.45`: sello cuando el marco entra (`back.out(1.6)` de 0.35 s → golpe a 0.135 s).

## Trampas
- El zoom centrado corta los nombres de la izquierda: el empuje va anclado a `x: 0`; sólo se desplaza en `y` (acotado para no salir del lienzo).
- `#dim` tapa también la fila destacada; hay que moverla al `#front` que vive después de `#dim` en el DOM (subirle la opacidad no basta).
- `ROW_H` se calcula con `Math.min(52, 480 / N)` para que 9 filas quepan sobre el eje.
- `data-duration` estático, igual que en `hbar-chart`.
