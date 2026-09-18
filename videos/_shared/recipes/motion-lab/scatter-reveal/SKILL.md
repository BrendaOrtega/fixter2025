---
name: scatter-reveal
description: |
  Diagrama de dispersión con ejes lineales o logarítmicos, retícula, leyenda por serie, puntos que
  aparecen con stagger y rebote, y un marco que se dibuja alrededor del punto nuestro antes de que
  la cámara empuje hacia él. Para "calidad vs costo", "latencia vs precio" y frentes de Pareto.
triggers:
  - "scatter de calidad contra costo"
  - "dispersión con eje logarítmico y el punto nuestro enmarcado"
  - "gráfica de puntos por proveedor con leyenda"
origin: réplica TypeSafe (videos/replica-typesafe/scenes/13-cheaper-charts, escena D), 17 sep 2026
---

# scatter-reveal

Título centrado, leyenda con forma y color por serie, SVG con retícula mayor/menor (décadas en log), puntos con anillo del fondo (no se pegan) y etiqueta directa; un rectángulo se dibuja con `strokeDashoffset` alrededor del punto de foco, sale su rótulo con sombra dura y la cámara empuja 1.4× hacia él.

## Cuándo usarla
- Relación entre dos variables continuas por hasta 4 series (colores validados con `dataviz`).
- Cuando hay un punto que gana en ambas dimensiones y merece el marco.

## Cuándo NO (contención)
- Más de 4 series: la paleta categórica se agota; junta en "Otros" o facetar.
- Menos de 5 puntos en total: es una lista, no un scatter — usa `hbar-chart`.
- Valores ≤ 0 en eje log (el log no existe): usa `scale: "linear"`.

## Cómo aplicarla
1. Copiar `recipe.html`, editar `PARAMS.axes` (`scale`, `min`, `max`, `ticks`, `fmt`) y `series`.
2. Cada punto: `[x, y, etiqueta, dx, dy]`; mover `dx/dy` cuando la etiqueta choque con otro punto o con el marco (el foco lleva la etiqueta abajo: `dy: 24`).
3. `focus`: `{ series, point, tag }`; `data-duration` = `timings.zoomAt + 1.2 + timings.hold`.

## Parámetros
| clave | tipo | default | qué controla |
|---|---|---|---|
| palette | "fixtergeek" \| "easybits" | fixtergeek | paleta + `series[]` de 4 colores accesibles |
| title | string | — | título centrado |
| axes.x / axes.y | {label,scale,min,max,ticks,fmt} | log / linear | escala por eje y formato de tick |
| series | {name,color,shape,points[]}[] | 4 series | `color` = índice en `palette.series`; `shape` circle \| diamond |
| focus | {series,point,tag} | Ghosty | punto enmarcado y su rótulo |
| timings.gridAt | s | 0.15 | fundido de la retícula (stagger 0.008) |
| timings.pointsAt | s | 0.6 | primer punto |
| timings.pointStagger | s | 0.08 | entre puntos (`back.out(2)`, 0.35 s) |
| timings.focusAt | s | 2.2 | trazado del marco (0.5 s) y rótulo (+0.15 s) |
| timings.zoomAt | s | 2.6 | empuje de cámara 1.4× (1.2 s), acotado al lienzo |
| timings.hold | s | 1.4 | quieto al final |
| seed | number | 7 | reservado para jitter determinista si se agrega |

Colores de serie (validados con `dataviz/scripts/validate_palette.js --mode dark`, PASS en las 5 comprobaciones):
FixterGeek sobre `#0E1317`: `#199E70 #D95926 #9085E9 #C98500`; EasyBits sobre `#0b0b0f`: `#9085E9 #C98500 #199E70 #D95926`.
La menta `#85DDCB` y el verde `#8DCF6E` de la casa NO pasan como serie (demasiado claros y con poco croma); quedan para acento, marco y rótulo.

## SFX sugerido
- `pointsAt` + i·0.08: pop por punto; con `back.out(2)` de 0.35 s el golpe va a 0.35/3 ≈ 0.12 s de cada arranque. Alternar dos o tres samples.
- `focusAt`: trazo de lápiz de 0.5 s mientras se dibuja el marco; `focusAt + 0.15 + 0.17`: sello del rótulo (`back.out(1.7)` de 0.45 s).
- `zoomAt`: riser de 1.2 s que cae en silencio al llegar.

## Trampas
- `gsap.set` sobre un `<g>` con `svgOrigin` reescribe su `transform` a matriz: leer `translate(...)` del atributo después falla (`null[1]`, la timeline nunca se creó y el render salía estático). Guardar `x, y` aparte al crear cada punto y aplicar `svgOrigin` en el mismo `set`.
- El foco reutiliza su punto de la serie; la etiqueta directa choca con el marco si va arriba: ponerla abajo con `dy: 24`.
- Retícula menor sólo en ejes log (2..9 por década); en lineal no tiene sentido.
- `data-duration` estático, como en las otras dos.
