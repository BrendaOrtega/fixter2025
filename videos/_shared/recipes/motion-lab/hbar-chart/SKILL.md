---
name: hbar-chart
description: |
  Gráfica de barras horizontales con etiqueta de grupo en cajita, barras que crecen en cascada y
  valores que cuentan pegados a la punta; al final oscurece y enmarca la fila ganadora. Para
  comparativas de "menor es mejor" (tasa de error, latencia, costo) donde una fila es la nuestra.
triggers:
  - "gráfica de barras horizontales que crecen"
  - "comparativa con la fila destacada al final"
  - "barras con contador y cajita de proveedor"
origin: réplica TypeSafe (videos/replica-typesafe/scenes/10-error-chart), 17 sep 2026
---

# hbar-chart

Panel con marco, título, N filas (cajita de grupo + etiqueta + barra + valor), eje con ticks; el panel entra con zoom, las barras crecen con `power3.out` y el valor viaja con la punta; luego el panel se atenúa y la fila `highlight` reaparece encima, enmarcada con sombra dura.

## Cuándo usarla
- Comparar de 4 a 9 elementos en una sola métrica, con proveedores/familias agrupadas.
- Cuando hay una fila que es la nuestra y merece el remate (el enmarcado es el clímax).

## Cuándo NO (contención)
- Más de 9 filas: se vuelve tabla, usa `price-table` o parte en dos.
- Dos métricas por fila: usa `price-table` (dos columnas).
- Sin fila ganadora: pon `highlight: -1`, pero entonces el cierre es plano; piensa otro remate.

## Cómo aplicarla
1. Copiar `recipe.html`, editar `PARAMS` (`rows`, `max`, `ticks`, `highlight`).
2. Ajustar `data-duration` del `#root` a `timings.highlightAt + 0.3 + timings.hold` (la consola avisa si difiere).
3. Renderizar; mirar el cuadro 0 (todo el panel visible, barras en cero) y el último (fila enmarcada).

## Parámetros
| clave | tipo | default | qué controla |
|---|---|---|---|
| palette | "fixtergeek" \| "easybits" | fixtergeek | variables CSS `--bg --ink --accent --accent2 --muted` |
| title | string | — | título; entra palabra por palabra deslizando |
| unit | string | "%" | sufijo de valores y ticks |
| decimals | number | 2 | decimales del contador |
| max | number | 10 | valor en el extremo derecho del eje (620 px) |
| ticks | number[] | [0,5,10] | guías verticales y rótulos |
| rows | {group,label,value}[] | — | `group` vacío hereda la cajita de arriba |
| highlight | number | 0 | índice de la fila que se enmarca; -1 desactiva |
| timings.zoomIn | s | 0.7 | zoom del panel 0.76 → 1 |
| timings.rowStagger | s | 0.05 | cascada de filas y arranque de barras |
| timings.barDur | s | 1.2 | crecimiento de la barra y su contador |
| timings.highlightAt | s | 2.4 | instante en que se atenúa y sale el marco |
| timings.hold | s | 1.2 | tiempo quieto al final |

## SFX sugerido
- 0.00 s whoosh grave corto (zoom del panel, 0.7 s).
- 0.35 s + i·0.07: tick suave por barra (tipo "pop" seco), no repetir el mismo sample dos veces seguidas: alternar dos.
- `highlightAt`: golpe/sello; el marco entra con `back.out(1.6)` de 0.3 s, el impacto va a 0.3/2.6 ≈ 0.115 s después del arranque.

## Trampas
- El renderizador lee `data-duration` **estático**; cambiarlo desde JS no sirve (dejó 3 cuadros negros al final la primera vez). Por eso la consola avisa y se edita a mano.
- Barra máxima al 100 % del eje tapa su valor: la barra ocupa 620 de 720 px para que el valor siempre quepa a la derecha. No poner valores "adentro" de la barra: mientras crece quedan invisibles.
- El valor debe viajar con la punta (`onUpdate` mueve `left`); si se deja en su posición final, el cuadro 0 muestra ceros flotando a media pantalla.
- `.from()` con `immediateRender: false` para que el cuadro 0 muestre las filas completas.
