---
name: iso-bars
description: |
  Cuadrícula isométrica dibujada en SVG plano (placa + líneas) de la que crecen cubos de tres caras; el alto y el
  tono de cada cubo salen de un valor 0–1, con leyenda de escalones y zoom de cámara al pico. Para mostrar una
  distribución o "mapa de calor" con volumen sin usar 3D real.
triggers:
  - "gráfica isométrica de barras"
  - "cubos que crecen según el valor"
  - "mapa de calor en 3D plano"
origin: réplica TypeSafe (videos/replica-typesafe/scenes/09-parallel-iso, escena 3), 17 sep 2026
---

# iso-bars

Placa isométrica tintada con 8×8 celdas; los cubos nacen bajitos, crecen del centro hacia afuera (power2.out),
entra la leyenda, la cámara se acerca al pico y se escribe una etiqueta verde.

## Cuándo usarla
- Distribuciones por celda (agentes × sesiones, días × horas, tests × módulos) donde importa ver el pico.
- Cuando se quiere volumen sin Blender: todo es `<polygon>` con tres tonos sólidos por cubo.

## Cuándo NO (contención)
- Series de tiempo o comparaciones de 3–5 valores: una barra plana se lee mejor (`count-up` + barras).
- Más de 12×12: los cubos se apilan sin canal y el pico se pierde; agrupar antes.
- Nunca girar la cámara: la iso es fija (2:1); un giro real necesita 3D.

## Cómo aplicarla
1. Copiar `recipe.html`, editar `PARAMS`: pasar `values` como matriz `[[0..1]]` (filas × columnas) o dejar `null`
   y generar un montículo con `rows/cols/seed`.
2. `cube.w/h` fijan el rombo (2:1 → h = w/2); `gap` deja canal entre cubos; `maxHeight` el alto del valor 1.
3. `origin` es el vértice superior de la placa: mover para dejar sitio al titular.
4. Renderizar: `npx hyperframes render . -c preview.html -o preview.mp4`.

## Parámetros
| clave | tipo | default | qué controla |
|---|---|---|---|
| palette | "fixtergeek" \| "easybits" | fixtergeek | colores (incluye `panel` y `low`, el tono del valor 0) |
| values | number[][] \| null | null | alto y tono por celda; null = montículo generado |
| rows, cols, seed | int | 8, 8, 3 | tamaño y semilla del montículo generado |
| cube.w, cube.h | px | 40, 20 | medio ancho / medio alto del rombo |
| cube.gap | px | 6 | canal entre cubos |
| cube.maxHeight, cube.minHeight | px | 220, 8 | alto del valor 1 y alto inicial (cuadro 0) |
| origin | {x,y} | {850,250} | vértice superior de la placa |
| kicker, title | string, string[] | … | renglón mono y titular por líneas |
| callout | string | "pico: agente 12" | etiqueta verde al final ("" = ninguna) |
| legend | {title,lo,hi,steps} | … | leyenda de escalones |
| timings.stage / grow / growDur | s | 0.2 / 0.5 / 0.7 | entrada de la placa y crecimiento |
| timings.legend / zoom / callout | s | 1.0 / 2.6 / 3.2 | leyenda, cámara al pico, etiqueta |
| timings.total | s | 5 | duración |

## SFX sugerido
- `stage`: whoosh corto (0.4 s) mientras la placa escala.
- `grow … grow + 0.7`: crecimiento en cascada — un riser suave o 4–5 "pops" graves en los anillos (dist 0, 2, 4, 6),
  nunca uno por cubo (64 sonarían a lluvia).
- `zoom`: barrido de cámara de 0.9 s (ease inOut, sin golpe).
- `callout`: click + ticks de typewriter.

## Trampas
- La cámara escala `#cam` con `svgOrigin` apuntando al pico; `transformOrigin` dentro del `<svg>` desplaza todo.
- Las tres caras se recalculan en `onUpdate` a partir de `cube.h`: GSAP anima el objeto JS, no el atributo, para que
  las tres coincidan en cada cuadro.
- Orden de pintado por `i + j` (de atrás hacia adelante); si se cambia el origen, respetar ese orden o los cubos
  de atrás tapan a los de adelante.
- Sin gradientes: el "sombreado" son tres sólidos (`top`, `×0.72`, `×0.5`) por cubo; los escalones de la leyenda se
  generan con la misma función `tone(v)` para que coincidan con los cubos.
- El `#0E1317` cuenta como negro para `blackdetect`; la placa tintada y los cubos bajos desde el cuadro 0 sostienen
  el umbral.
