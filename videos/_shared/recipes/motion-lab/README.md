# motion-lab — mecánicas de motion graphics medidas cuadro a cuadro

Quince recetas HyperFrames + GSAP que salieron de replicar, el 17 sep 2026, las escenas de motion
graphics de un video corporativo de TypeSafe AI (laboratorio en `videos/replica-typesafe/`). No son
copias de esas escenas: se midieron posiciones, tamaños, eases y tiempos sobre los cuadros y se
reescribió **la mecánica**, parametrizada, determinista y en las paletas de la casa. Galería con
previews en video: <https://blissito.github.io/ghosty-reel/motion-lab/>.

Cada carpeta trae `SKILL.md` (cuándo usarla, parámetros, SFX sugerido, trampas), `recipe.html`
(la composición con un bloque `PARAMS` al inicio), `preview.html` + `preview.mp4` + `preview.png`.
El contrato de una receta está en `MOLDE.md`. Hoja de contactos: `GALERIA.png`.

| receta | qué hace | de dónde salió |
|---|---|---|
| `window-lower-third` | ventana retro con typewriter, tracking que se cierra, cuerpo que crece, leader line | lower-third de presentación |
| `tilt-list` | lista donde el activo queda horizontal y los demás se inclinan por distancia | lista "disco" de tres puntos |
| `pixel-wipe-sampled` | cortinilla de celdas que muestrean la escena que se va, persisten y se disuelven | transición a diagrama |
| `particle-collapse` | enjambre de puntos que colapsa al contorno de una letra y abre la palabra | anillo → "System One" |
| `barrel-grid` | malla con distorsión de barril, llenado secuencial o paralelo, contador n/N | "el LLM genera secuencialmente" |
| `iso-bars` | cubos isométricos de tres caras con alto y tono por valor | mapa de confianza |
| `hbar-chart` | barras horizontales con grupo en cajita y valores que cuentan | tasa de error por modelo |
| `price-table` | tabla de dos columnas con barras y fila destacada | precios por millón de tokens |
| `scatter-reveal` | dispersión con ejes log, series y marco que se dibuja | inteligencia / costo |
| `node-tree` | nodo central + cajas con cables ortogonales que se dibujan | acrónimo desplegado |
| `hourglass-lines` | curvas que convergen en un glifo y se abren | posibilidades → aplicaciones |
| `radial-rays-counter` | rayos desde el centro + número que cuenta | "38x faster" |
| `word-karaoke-panel` | párrafo que se enciende por palabra en un panel con etiqueta | disclaimer |
| `stacked-boxes` | cajas con `back.out` apiladas sobre guías | "Prod / Not God" |
| `dither-corners` | textura half-tone en esquinas, modos `dots` y `noise` | fondo rosa de las tarjetas |

Las captions cinéticas, scrambles y cortinillas de texto ya están en `../motion-anything/`.

## Reglas de uso
- Todo corre en una sola timeline GSAP pausada registrada en `window.__timelines["main"]`: seek-safe.
- Nada de `requestAnimationFrame`, `Math.random` sin semilla ni CSS con reloj propio. Azar = mulberry32 con `PARAMS.seed`.
- Fotograma 0 completo y fondo `--bg` de la paleta (FixterGeek `#0E1317` / EasyBits `#0b0b0f`), nunca `#000`.
- Un SFX por movimiento, montado con ffmpeg fuera del render; cada `SKILL.md` sugiere cuáles y en qué instante.
- Render: `npx hyperframes render . -c preview.html -o preview.mp4` (el CLI toma un directorio; `-c` elige la composición).

## Trampas aprendidas (valen para cualquier composición)
- El renderizador lee el `data-duration` **estático** del HTML; ponerlo desde JS deja cuadros negros al final.
- `gsap.set` fuera de la timeline no sobrevive al seek del render: todo estado inicial va como `tl.set(…, 0)`.
- Typewriter: revelar por `display`, no por `width:auto` (mide 0 si la fuente no cargó). No medir `offsetWidth` antes de que cargue la fuente.
- `blackdetect` (pix_th 0.10) cuenta `#0E1317` como negro: el cuadro 0 necesita panel, retícula o pistas grises además del título.
- Un `div` gigante rotado se rasteriza con arista: usar `<circle>` en SVG. Dentro de SVG, `svgOrigin`; y `gsap.set` con `svgOrigin` sobre un `<g>` reescribe su `transform` a matriz — guardar x,y aparte.
- `animation-fill-mode: both` rellena hacia atrás durante el delay: todo aparece desde el cuadro 0; usar `forwards`.
- `ffmpeg -ss T` antes de `-i` cae en el keyframe equivocado: extraer cuadros de referencia por número (`select='eq(n,N)'`).
- `dot-grid` y `count-up` de motion-anything usan rAF: no sirven en render (aquí van como `<pattern>` SVG y tween sobre objeto).
- `feTurbulence` tiene la luminancia apretada en 0.5: el umbral del dither se calibra como `0.625 − cobertura/4`.
- No rotar patrones SVG (moiré). Las series de un chart no pueden ser la menta ni el verde de la casa (poco croma); `dataviz/validate_palette.js` da `#199E70 #D95926 #9085E9 #C98500` sobre `#0E1317`.
