# motion-lab — mecánicas de motion graphics medidas cuadro a cuadro

Treinta recetas HyperFrames + GSAP. Las primeras quince salieron de replicar, el 17 sep 2026, las escenas de
motion graphics de un video corporativo de TypeSafe AI (laboratorio en `videos/replica-typesafe/`). No son
copias de esas escenas: se midieron posiciones, tamaños, eases y tiempos sobre los cuadros y se
reescribió **la mecánica**, parametrizada, determinista y en las paletas de la casa. Galería con
previews en video: <https://blissito.github.io/ghosty-reel/motion-lab/>.

Las demás llegaron después: tres en canvas 2D (24 sep) que replican el explainer «how browsers work» con rough.js
con semilla y Ghosty oficial (`blueprint-tree`, `blueprint-route`, `sketch-layers`; rompen a propósito la caricatura
plana: glow, degradado y grano de papel); `glass-pill` (22 oct); las de la investigación de motion del 20–21 oct;
y tres de HyperFrames 0.8.212 (28 oct): `beat-scenes`, `echo-smear` y `filmed-screen`. Varias son 1080×1920.

**Fuente de verdad: este repo (`blissito/ghosty-reel`, `skills/motion-lab/`).** La copia de
`fixter2025/videos/_shared/recipes/motion-lab/` se sincroniza desde aquí.

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
| `on-twos` | personaje con poses a 12 fps (reloj cuantizado) y cámara/parallax fluidos a 30/60 | investigación motion 20 oct (técnica 5) |
| `squash-hop` | objeto que salta con anticipación, squash & stretch y overshoot; sombra del piso y sombra dura que dicen la altura; `__sfxCues` | investigación motion 20 oct (técnicas 2–4) |
| `smear-dash` | objeto que cruza con smear de 1–2 cuadros, múltiplos y líneas de velocidad en vez de blur; frenón con `back.out` | investigación motion 20 oct (técnica 6) |
| `camera-rig` | cámara virtual por capas: `camera.to({x, y, zoom, rot, yaw})` con parallax real por profundidad, push-in, paneo, whip-pan con smear que transmuta de escena, zoom-punch y dolly-out con corte invisible; 1080×1920 | investigación motion 20 oct (técnicas 8–9, hueco 1 de la auditoría) |
| `toon-object` | escena 3D en three.js: caja de regalo hueca en una mesa, la tapa vuela y sale un robot que saluda; toon de 3 tonos, una silueta de tinta por objeto (redonda, interiores delgados), sombra dura gris, dolly + cambio de ángulo, titular palabra por palabra y CTA que se escribe | investigación motion 20 oct (3D toon en HTML) |
| `ghosty-rig` | Ghosty oficial por piezas (`ghosty.svg`) + `rig.js`: `hop`, `blink`, `wink`, `look`, `happy`, `proud`, `shy`, `wave`, `idle`, `enter`/`exit` con squash y accesorios en capa aparte; ojos completos, olanes que se mecen, sin redibujar ni repintar | rig de ghosty-identidad + gestos de ghosty-verificado-2 (20 oct) |
| `numbered-medallion` | medallón de estrella con número que cae girando y abre en iris la escena del siguiente paso; `__sfxCues` | mecánica de midcentury-toon (lemo-opuscar, MIT), reescrita (21 oct) |
| `chase-lock-wipe` | cortinilla de losas sesgadas con título que cae por semicorchea y se traba con llave y cerradura; `__sfxCues` | mecánica de spy-titles (lemo-opuscar, MIT), reescrita (21 oct) |
| `blueprint-tree` | árbol que se arma nodo por nodo con cinta de tokenizer; Ghosty coloca cada nodo (canvas 2D) | "parse html into the dom" de cute.mp4 (24 sep) |
| `blueprint-route` | ida y vuelta con parada fallida y respuesta tecleada; Ghosty carga el dato (canvas 2D) | "dns lookup" de cute.mp4 (24 sep) |
| `sketch-layers` | página que se inclina y se separa en hojas, piel de boceto técnico con rough.js | "layers" de cute.mp4 (24 sep) |
| `glass-pill` | pastilla de vidrio tipo Apple Liquid Glass (refracción en el filo, blur saturado) con ícono que se dibuja; 1080×1920 | aviso «steps in the caption» de un short (22 oct) |
| `beat-scenes` | cinco escenas que tocan con la música medida: metrónomo (`beats`), batería (`audio --band`), split-flap (`sections`), sello (`downbeats`) y vúmetro (`loudness,envelope`); `score-tracks.mjs` elige la pista; 1080×1920 | demo de `beats`/`audio` de HyperFrames 0.8.212 (28 oct) |
| `echo-smear` | estela automática que escala con la velocidad (Echo de AE, operador Maximum) pegada a cualquier tween con una línea; 1080×1920 | componente del registro HyperFrames 0.8.212 (28 oct) |
| `filmed-screen` | captura real de la UI en perspectiva de monitor, con órbita y cámara que persigue lo que se teclea; parche con `glow`, `grain` y `bg` como opciones; 1080×1920 | componente del registro HyperFrames 0.8.212 + parche (28 oct) |

Las captions cinéticas, scrambles y cortinillas de texto ya están en `../motion-anything/`.

## Reglas de uso
- Todo corre en una sola timeline GSAP pausada registrada en `window.__timelines["main"]`: seek-safe.
- Nada de `requestAnimationFrame`, `Math.random` sin semilla ni CSS con reloj propio. Azar = mulberry32 con `PARAMS.seed`.
- Fotograma 0 completo y fondo `--bg` de la paleta (FixterGeek `#0E1317` / EasyBits `#0b0b0f`), nunca `#000`.
- Un SFX por movimiento, montado con ffmpeg fuera del render; cada `SKILL.md` sugiere cuáles y en qué instante.
- Render: `npx hyperframes render . -c preview.html -o preview.mp4` (el CLI toma un directorio; `-c` elige la composición).

## Ritmo al beat: `_lib/beat-snap.js` (y `_lib/beat_snap.py`)
La palabra decide **qué** entra; el beat decide **cuándo** exacto. `snap()` mueve un inicio al beat (o a la palabra)
más cercano sólo si cae a ≤ `maxShift` (0.12 s); si no, lo deja. Con `impact` alinea el golpe visible, no el inicio
(`back.out(s)` → `1/(s+1)` del tween). Redondea al cuadro (30 fps).

```html
<script src="../_lib/beat-snap.js"></script>   <!-- o copiar el archivo junto a la composición -->
<script>
  const beats = BeatSnap.grid({ bpm: 112, offset: 0.21, subdiv: 2, duration: 30 }); // o BeatSnap.beats(detectados)
  const words = BeatSnap.words(TRANSCRIPT);   // JSON de `npx hyperframes transcribe … --json`
  // 1) un tiempo suelto: entra con la palabra «agente» y se afina a la corchea
  T.leap = BeatSnap.snap(BeatSnap.wordAt(words, "agente"), { beats });
  // 2) toda la timeline ya armada: cada tween se corre al beat; los back.out(s) alinean su golpe
  BeatSnap.snapTimeline(tl, { beats, maxShift: 0.1 });
  // 3) pegar a palabras en vez de beats: { words, to: "word" }  ·  a lo que esté más cerca: { beats, words, to: "both" }
</script>
```
**Medir en vez de calcular la rejilla (HyperFrames 0.8.212):** `npx hyperframes@0.8.212 beats <carpeta>` escribe
`beats/assets/<pista>.json` con `{beats: [{time, strength}]}`, y `npx hyperframes@0.8.212 audio <pista> --only
beats,downbeats,bpm,sections --json` agrega downbeats, BPM y secciones. Los dos alimentan `BeatSnap.beats()`
directo (lee los `[{time}]`), así que `grid({bpm, offset})` a mano queda sólo de respaldo. Como el render no puede
hacer `fetch`, el JSON entra como `<script>` generado (ver `beat-scenes/scripts/make-scenes-data.mjs`).

En `plan.py` (SFX derivados de beats): `sys.path.insert(0, "skills/motion-lab/_lib"); from beat_snap import grid, words, word_at, snap`
— mismo contrato (`max_shift`, `impact`, `duration`, `to`), así imagen y sonido se ajustan con la misma regla.

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
- `beats` recibe la carpeta del proyecto (busca `<audio data-timeline-role="music">`), no un archivo, y sólo da beats
  con su fuerza; downbeats y secciones salen únicamente de `audio --only beats,downbeats,bpm,sections`.
- Batería medida: la tarola es un beat de la rejilla confirmado por su banda (1.5–5 kHz), no un onset libre; el bombo
  de electro se detecta por la subida de la envolvente de 30–120 Hz (≥ 10 dB), no por los onsets. Calificar la
  pista con `beat-scenes/scripts/score-tracks.mjs` antes de animar.
- La música (`*.mp3`, `*.wav`) no va al repo: cada receta dice de dónde bajarla y el crédito CC BY va en la descripción.
- Componentes del registro HyperFrames: revisar su look de fábrica contra la casa antes de adoptarlos;
  `filmed-screen` traía glow, grano y negro fijos en el shader y sólo entra con el parche (`filmed-screen.patch`).
- `echo-smear` obliga a la captura por screenshot (render más lento) y con `maximum` los contornos oscuros de las
  copias se pierden: se lee como mancha plana.
