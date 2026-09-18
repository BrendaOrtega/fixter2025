---
name: pixel-wipe-sampled
description: |
  Cortinilla de celdas que muestrean la escena que se va (cada celda pinta su trozo con un velo de color
  y alfa aleatorios), aparecen en orden aleatorio, persisten como mosaico y se disuelven revelando la
  escena siguiente. Para cambiar de escena sin corte seco ni crossfade.
triggers:
  - "transición de pixeles que muestrea el fondo"
  - "cortinilla de mosaico que se disuelve a la siguiente escena"
  - "wipe de celdas con velos de color"
origin: réplica TypeSafe (videos/replica-typesafe/final, cortinilla), 17 sep 2026
---

# pixel-wipe-sampled

La escena A se cubre con una retícula de celdas de 80 px que son *ella misma* vista por trozos y teñida con velos; el mosaico queda un instante completo y luego se deshace celda por celda sobre la escena B.

## Cuándo usarla
- Cambio de escena en shorts o tutoriales donde ambas escenas están dibujadas o son planos limpios.
- Cuando se quiere que la salida "recuerde" la escena anterior (el mosaico sigue mostrando A, teñida).

## Cuándo NO (contención)
- Con escena A fotográfica sin copia estática: las celdas necesitan una imagen (`bgUri`) que muestrear; un `<video>` no se muestrea así.
- En cortes de menos de 1 s: aparecer + hold + disolver piden ~1.3 s mínimo.
- Escenas B muy oscuras con velos oscuros: el mosaico y B se confunden; cambiar `veils` a la paleta contraria.

## Cómo aplicarla
1. Copiar `recipe.html`, editar `PARAMS` (`cell`, `seed`, `veils`, `timings`).
2. Sustituir `sceneA` por el SVG real (o dar un `bgUri` a una PNG de la escena y pintar A aparte) y el contenido de `#scene-b`.
3. Poner `tEnd + tail` en `data-duration` del `#root`; los `data-start/duration` de los tres clips los recalcula el script pero conviene dejarlos coherentes en el HTML.
4. `npx hyperframes render . -c recipe.html -o out.mp4`; verificar `blackdetect`.

## Parámetros
| clave | tipo | default | qué controla |
|---|---|---|---|
| `palette` | `"fixtergeek" \| "easybits"` | `fixtergeek` | colores de ambas escenas |
| `cell` | px | `80` | tamaño de celda (1280 y 720 divisibles) |
| `seed` | entero | `20260917` | orden de aparición y velo de cada celda (mulberry32) |
| `veils` | string[] | 5 rgba | velos posibles por celda |
| `timings.start` | s | `1.0` | primera celda |
| `timings.appear` | s | `0.6` | ventana en que aparecen todas |
| `timings.hold` | s | `0.1` | mosaico completo |
| `timings.dissolve` | s | `0.6` | ventana en que se disuelven |
| `timings.cellFade` | s | `0.12` | fundido de cada celda |
| `timings.tail` | s | `1.6` | escena B a solas al final |
| `sceneA` | `(P) => svg` | ventana + caja | la escena que se va, dibujada |

## SFX sugerido
- `start → start+appear`: *granizo* de clics cortos (uno por ~8 celdas) o un *riser* granular de 0.6 s.
- `hold`: silencio de 0.1 s (el mosaico completo es el impacto visual).
- `dissolve`: *shimmer* descendente de 0.7 s.
- Escena B, `tB` con `back.out(1.6)`: *pop* en `tB + 0.4 × 1/2.6 ≈ tB + 0.15`.

## Trampas
- Las celdas muestrean con `background-image` + `background-position` negativa por celda; la imagen debe medir exactamente 1280×720 (`background-size`) o el mosaico se desfasa.
- El SVG de A se serializa a `data:` con `encodeURIComponent`; comillas dobles dentro del SVG rompen el `url("...")` — usar simples en atributos si se edita a mano.
- Escena B debe estar debajo antes de que empiece la disolución (`data-start = start + appear`); si arranca después, las celdas revelan `--bg` y parece hueco.
- El primer render dio 0.33 s negros al final: el `data-duration` estático era mayor que lo que calculaba el script. Alinear siempre.
