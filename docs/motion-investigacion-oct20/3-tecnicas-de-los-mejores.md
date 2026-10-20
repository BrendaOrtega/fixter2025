# Técnicas de los mejores videos de motion (2025-2026), traducidas a HyperFrames

Investigación del 20-oct-2026. Lo que se desmonta es la **técnica**, no la marca. Todo aplica a nuestro
stack: HyperFrames (HTML + CSS + GSAP + SVG cuadro a cuadro), caricatura plana (contorno grueso,
relleno sólido, sombra dura `8px 8px 0`, sin gradiente/blur/glow), vertical 1080×1920, ~40 s.

## Qué se encontró (y qué no)

- **No hay breakdowns publicados** de los lanzamientos de Linear, Vercel, Raycast, Arc ni Stripe
  Sessions. Esas casas los producen en equipo interno (Linear y Stripe tienen puestos de «Motion
  Storyteller» y «Motion Designer, Experiential», con sistemas de motion por tokens de tiempo) y no
  publican el proyecto. Lo que se ve en ellos es UI animada + tipografía cinética + corte al beat.
- **Notion 3.0 «Agents» (sep-2025)**: iconos 2D y tipografía cinética sobre fondo oscuro, sin
  personajes. **Figma Config 2025**: grabaciones de UI rápidas, sin voz, cortadas a la música.
- **Sí hay proceso publicado** de estudios: Buck (Mailchimp «All in a Day's Work»: 2D tradicional con
  tactilidad 3D, se siente stop-motion y es 100 % CG), Ordinary Folk («Join the Movement», curso
  gratis de School of Motion con 3 h de proceso, incluye un módulo de **3D falso contra 3D real**), y
  Apple «The Mighty Mac» (Mac mini M6, ago-2026, plastilina real de Blinkink + Stoopid Buddy, con video
  detrás de cámaras).
- **Código legible**: GSAP 3.13 liberó gratis todos sus plugins (SplitText, MorphSVG, DrawSVG,
  CustomBounce…), Codrops publicó demos de cada uno, Zdog (MIT) hace 3D falso plano en SVG, y
  HyperFrames es Apache-2 (`heygen-com/hyperframes`).

## Las 14 técnicas

### 1. Rejilla de beats: el reloj es la música, no los segundos
Los lanzamientos admirados cambian de plano cada 2-4 compases y ponen **un evento por beat**: algo
aterriza, se escribe una palabra o pega un sello. A 100-120 BPM, 40 s dan 16-24 planos (1.6-2.5 s
cada uno); el gancho de los 3 primeros segundos lleva 3-4 eventos.
```js
const BPM = 112, beat = 60 / BPM, bar = beat * 4;
const at = (b) => b * beat;           // posición en beats
tl.from("#taza", { y: -900, duration: beat * 0.75, ease: "back.out(2)" }, at(8));
tl.to("#s2", { xPercent: 0, duration: beat / 2, ease: "power4.inOut" }, at(16)); // corte en el 1 del compás 5
```
Se mide el BPM de la cama antes de animar, y los SFX salen de la misma lista de beats.

### 2. Anticipación → acción → overshoot → asentarse
Todo objeto que entra **se encoge antes de salir** (10-15 % del tiempo), viaja rápido, se pasa y
regresa. Es el tic que hace que la UI de Linear o los iconos de Notion se sientan «caros». El breakdown
de Codrops de las mascotas de Claude usa `sine.out` para la subida y `power3.in` para la caída, con un
pequeño overshoot al aterrizar («sin eso el aterrizaje se siente tieso»).
```js
tl.to(o, { scale: 0.88, duration: 0.12, ease: "power2.in" })          // anticipación
  .to(o, { y: -220, duration: 0.28, ease: "sine.out" })
  .to(o, { y: 0, duration: 0.22, ease: "power3.in" })
  .to(o, { scale: 1, duration: 0.35, ease: "back.out(2.6)" });          // overshoot
```
Regla de la casa: el SFX de impacto va en `1/(s+1)` del tween `back.out(s)`.

### 3. Squash & stretch conservando volumen
Al chocar se aplasta (`scaleX 1.25, scaleY 0.75`) y al volar se estira (`0.85 / 1.18`):
`scaleX × scaleY ≈ 1`. El pivote va en la base del objeto. GSAP `CustomBounce` genera la curva de
rebote **y** su curva de squash sincronizada (el loader de Chris Gannon usa `scaleX ≈ 1.23, scaleY ≈
0.7` en el contacto). Josh Comeau lo aplica a iconos SVG, que es nuestro caso, no a pelotas.
```js
CustomBounce.create("rebote", { strength: 0.6, squash: 2, squashID: "rebote-squash" });
tl.from("#caja", { y: -700, duration: 1.1, ease: "rebote" }, t)
  .to("#caja", { scaleX: 1.25, scaleY: 0.75, svgOrigin: "540 1300", duration: 1.1, ease: "rebote-squash" }, t);
```
(En `<svg>` siempre `svgOrigin`, nunca `transformOrigin`.)

### 4. Sombra dura que dice la altura
Nuestra sombra `8px 8px 0` es una herramienta de animación, no adorno: cuando el objeto se eleva, la
sombra se aleja (14-18 px) y cuando se aplasta casi desaparece (2-3 px). Da profundidad sin blur ni
3D. Es el equivalente plano del contacto de sombra que Buck usa para que el 2D «pese».
```js
tl.to("#carta", { y: -60, "--sh": "18px", duration: 0.3, ease: "sine.out" })
  .to("#carta", { y: 0, "--sh": "3px", duration: 0.18, ease: "power3.in" })
  .to("#carta", { "--sh": "8px", duration: 0.3, ease: "back.out(3)" });
/* CSS: box-shadow: var(--sh) var(--sh) 0 #0E1317;  en SVG: un <use> desfasado con x/y = --sh */
```

### 5. Animar «a dos» (12 fps) los personajes, cámara fluida
El look stop-motion de Apple «The Mighty Mac» y el «parece stop-motion pero es CG» de Buck sale de
**dos cadencias a la vez**: el personaje cambia de pose cada 2 cuadros (12 fps) y la cámara/fondo se
mueve a 30 fps. En HyperFrames basta con cuantizar el tiempo del tween del personaje.
```js
const twos = (n) => `steps(${n})`;            // n = duración × 12
tl.to("#ghosty-brazo", { rotation: 25, svgOrigin: "520 900", duration: 0.5, ease: twos(6) }, t);
tl.to("#mundo", { scale: 1.08, duration: 2, ease: "sine.inOut" }, t); // cámara suave
```
Para curvas con forma (no lineales), envolver: `ease: p => Math.floor(gsap.parseEase("back.out(2)")(p) * 6) / 6`.

### 6. Smear y múltiplos en lugar de motion blur
En plano no hay blur, así que lo rápido se dibuja: **1-2 cuadros** del objeto estirado en la
dirección del movimiento (smear) o 2-3 copias en estela que desaparecen en escalón (múltiplos). Es la
técnica clásica de 2D para lo que pasa más rápido que el cuadro.
```js
tl.set("#mano", { scaleX: 1.6, skewX: -12 }, t)          // cuadro de smear
  .set("#mano", { scaleX: 1, skewX: 0 }, t + 1/30);
// múltiplos: 3 <use href="#mano"> desfasados 30/60/90 px, opacity 1→0 con steps(1) en 2 cuadros
```

### 7. 3D falso plano (extrusión con capas y giro por escala)
El módulo «3D falso vs 3D real» de Ordinary Folk y los pesos de 2D+3D de Buck se traducen así:
volumen = **pila de copias** del contorno desplazadas 1 px (canto sólido, color más oscuro, sin
degradado); giro = `scaleX` de 1 a 0, cambiar la cara al pasar por 0, y de 0 a 1. Para objetos
redondos con volumen real, **Zdog** (MIT, metafizzy) renderiza a SVG figuras 3D como formas planas
con trazo grueso: encaja directo con nuestra piel si se le fija el ángulo por `tl` (no por su ticker).
```js
// giro de moneda/tarjeta
tl.to("#cara", { scaleX: 0, svgOrigin: "540 960", duration: 0.18, ease: "power2.in" })
  .set("#cara", { attr: { href: "#reverso" } })
  .to("#cara", { scaleX: 1, svgOrigin: "540 960", duration: 0.3, ease: "back.out(2)" });
// Zdog en HyperFrames: illo.rotate.y = estado.rot; illo.updateRenderGraph(); dentro de onUpdate del tl
```

### 8. Cámara multiplano 2.5D (dolly y parallax)
Tres grupos —fondo, medio, frente— con magnitudes distintas del mismo movimiento (0.3× / 1× / 1.8×).
Un **dolly-in** es escalar el mundo desde el punto focal, con el frente creciendo más rápido. Es lo
que da «cámara» a las piezas 2D de Buck sin cámara 3D.
```js
const dolly = (t, d) => tl
  .to("#fondo", { scale: 1.04, svgOrigin: "540 900", duration: d, ease: "sine.inOut" }, t)
  .to("#medio", { scale: 1.12, svgOrigin: "540 900", duration: d, ease: "sine.inOut" }, t)
  .to("#frente", { scale: 1.30, y: 40, svgOrigin: "540 900", duration: d, ease: "sine.inOut" }, t);
```
Con 1-2 % de deriva permanente del fondo la escena nunca está muerta.

### 9. Zoom-punch / match cut a través de un objeto
La transición más usada en lanzamientos 2025: la cámara **se mete** en un objeto (un botón, la
pantalla de la laptop, la letra «o») hasta que su relleno sólido llena el cuadro y ese color ya es el
fondo de la escena siguiente. Cero crossfade, cero corte seco, y cumple la regla de cortinilla.
```js
tl.to("#mundo", { scale: 14, svgOrigin: "612 1040", duration: 0.45, ease: "power4.in" }, t) // centro del objeto
  .set("#escena2", { autoAlpha: 1 }, t + 0.45)
  .from("#escena2 .contenido", { scale: 0.6, duration: 0.4, ease: "back.out(1.8)" }, t + 0.45);
```
Variante «punch» en la palabra clave: escala 1 → 1.18 → 1 en 6 cuadros sobre el acento de la voz.

### 10. Cortinillas con forma (máscaras y rebanadas)
`clipPath` con la silueta de un objeto de la historia (círculo que crece, rebanadas sesgadas con
stagger y `back.out`), siempre tapando las 4 esquinas y con un glifo enorme que sella. La versión
plana del «shape wipe» de los reels de Jitter.
```js
// 5 rebanadas <rect> rotadas -12°, cada una con su clip
tl.from(".rebanada", { xPercent: -130, duration: 0.38, ease: "back.out(1.4)", stagger: 0.05 }, t)
  .from("#sello", { scale: 3, rotation: -20, duration: 0.3, ease: "back.out(3)" }, t + 0.22);
```

### 11. Tipografía cinética palabra por palabra
Notion, ClickUp y casi todo SaaS 2025 usan esto: cada palabra entra **cuando la voz la dice**, con
máscara (sube desde abajo de su línea), y la palabra clave cambia de color/peso y recibe un punch.
SplitText (gratis desde 3.13) trae `mask: "words"` y `autoSplit`; Codrops publicó demos de
SplitText+ScrambleText y de masking.
```js
const st = SplitText.create("#titular", { type: "words", mask: "words" });
words.forEach((w, i) => tl.from(st.words[i], { yPercent: 110, duration: 0.28, ease: "back.out(2)" }, w.start)); // tiempos de transcribe
tl.to(".clave", { color: "#85DDCB", scale: 1.15, duration: 0.12, yoyo: true, repeat: 1 }, tClave);
```
Los tiempos salen de `npx hyperframes transcribe … -l es --json`.

### 12. Overlap y follow-through (secondary motion)
Nada se mueve en bloque: el cuerpo llega, la antena/etiqueta/sombra llegan **2-4 cuadros después** y
oscilan una vez. Es lo que distingue a Buck y Ordinary Folk de un template. En GSAP es un offset
negativo y un `elastic` corto, siempre finito.
```js
tl.from("#robot", { x: -800, duration: 0.5, ease: "power3.out" }, t)
  .from("#robot-antena", { rotation: -35, svgOrigin: "600 700", duration: 0.9, ease: "elastic.out(1, 0.35)" }, t + 0.1)
  .from("#robot-etiqueta", { y: 30, autoAlpha: 0, duration: 0.3, ease: "back.out(2)" }, t + 0.13);
```

### 13. Stagger con orden de lectura
Las listas, cuadrículas e iconos entran en el orden en que el ojo los va a leer (arriba-izq →
abajo-der), o desde el centro si es una explosión. Separación 40-70 ms: menos se ve en bloque, más se
ve lento.
```js
tl.from(".icono", { scale: 0, rotation: -15, duration: 0.4, ease: "back.out(2.2)",
  stagger: { each: 0.05, grid: [3, 3], from: "start" } }, t);
```

### 14. Línea que se dibuja y forma que se transforma
Objeto que nace dibujando su contorno grueso (DrawSVG o `stroke-dashoffset`) y **luego** recibe su
relleno sólido de golpe (en un cuadro, con pop). Para cambiar de idea sin corte, MorphSVG transforma
un objeto en el siguiente (la taza se vuelve servidor). Ambos plugins gratis desde 3.13.
```js
tl.from("#taza-contorno", { drawSVG: 0, duration: 0.6, ease: "power2.inOut" }, t)
  .from("#taza-relleno", { autoAlpha: 0, scale: 0.9, duration: 0.15, ease: "back.out(3)" }, t + 0.6)
  .to("#taza-contorno", { morphSVG: "#servidor-contorno", duration: 0.5, ease: "power3.inOut" }, t + 1.6);
```

## El presupuesto de capas (la regla que une todo)

En las piezas que se sienten «hermosas y con ritmo» casi nunca hay más de **3 cosas moviéndose a la
vez**: 1 protagonista con la acción del beat, 1-2 secundarias en follow-through y el fondo en deriva
lenta. Todo lo demás en hold. Si un beat pide dos protagonistas, se separan medio beat. Revisión
rápida: pausar en cualquier cuadro y contar tweens activos (`tl.getChildren(true, true, false)
.filter(c => c.isActive())`); si pasan de 4, sobra algo.

Duraciones de referencia (de las guías de easing de Jitter y Material): reacción 0.1-0.15 s, cambio de
estado 0.2-0.3 s, entradas 0.4-0.8 s, salidas ≈ 75 % de la entrada, ease-out al entrar, ease-in al
salir, nunca `linear` salvo en la deriva del fondo.

## Ligas

- GSAP 3.13, todo gratis: https://gsap.com/blog/3-13/ · CustomBounce: https://gsap.com/docs/v3/Eases/CustomBounce
- Codrops, 5 demos con los plugins gratis (SplitText, DrawSVG, MorphSVG): https://tympanus.net/codrops/?p=93244
- Codrops, tips de GSAP (SplitText con mask): https://tympanus.net/codrops/2025/09/03/7-must-know-gsap-animation-tips-for-creative-developers/
- Codrops, mascotas de Claude con SVG + GSAP (anticipación, salto, aterrizaje): https://tympanus.net/codrops/?p=114688
- Loader CustomBounce de Chris Gannon (MIT): https://freefrontend.com/code/gsap-custombounce-loading-loader-2026-01-18/
- Josh Comeau, squash & stretch en iconos SVG: https://joshwcomeau.com/animation/squash-and-stretch
- Zdog, 3D falso plano a SVG (MIT): https://github.com/metafizzy/zdog
- HyperFrames: https://github.com/heygen-com/hyperframes
- Ordinary Folk, curso gratis con el proceso de «Join the Movement» (3D falso vs real): https://schoolofmotion.com/courses/a-motion-design-masterpiece
- Buck, Mailchimp «All in a Day's Work» (2D con tactilidad 3D): https://buck.co/work/mailchimp-all-in-a-days-work · Devsisters «Brixity» (2D↔3D en una narrativa): https://buck.co/work/devsisters-brixity
- Apple «The Mighty Mac», detrás de cámaras (ago-2026): https://9to5mac.com/2026/08/25/apple-shares-behind-the-scenes-video-for-its-fun-new-mac-mini-ad/
- School of Motion, cel shading y look híbrido: https://schoolofmotion.com/blog/cel-shading-inspiration
- Smears, teoría y variantes (tesis Hagenberg): https://theses.fh-hagenberg.at/index.php/system/files/pdf/Lendenfeld18.pdf
- Jitter, curvas de easing: https://help.jitter.video/en/articles/16072578-fix-robotic-animations-with-the-right-easing-curve
- Ganadores Motion Awards 2025: https://motionawards.com/winners-2025.html
- Notion 3.0 (sep-2025): https://www.notion.com/es-es/blog/introducing-notion-3-0

## Dónde va cada técnica en ghosty-reel

Repo `/Users/bliss/ghosty-reel` (`blissito/ghosty-reel`). Motor 2D = HTML + GSAP sobre HyperFrames, con la
ruta por defecto `partitura-reel/` (`score.mjs` → `score.gen.js` para la imagen y `score.gen.json` para
`synth.py`). Motor 3D = Blender headless: `scene.json` dirige y `scene.py` construye y anima con `key()`;
`skills/blender-ad/grease-pencil.py` traza. Voz Kokoro, `music.py`, `plan.py` (SFX al beat), `mix.sh`.

| # | Técnica | Motor | Dónde se escribe |
|---|---|---|---|
| 1 | Rejilla de beats | 2D (y 3D) | `score.mjs`: cada acento es un `ev(at(escena, s16, tri), id, inst, nota)`; la imagen lo lee de `T[id]` en `index.html` y el sonido sale del mismo evento en `synth.py`. En Blender, el beat va como frame en `scene.json` y `plan.py` le cuelga el SFX. Ya está hecho; lo nuevo es exigir un evento por beat en el gancho. |
| 2 | Anticipación → overshoot | 2D | `index.html`: hoy la entrada es `fromTo(scale 0.3→1, back.out(2.5))` en `T[id]`. Agregar el `to(scale 0.88)` que arranca un dieciseisavo antes (`T[id] - S16`) para que el impacto siga en su nota. |
| 2b | Lo mismo en 3D | 3D | `scene.py`: tres `key(obj, "scale", …)` (anticipación, viaje, overshoot) con `interp="BACK"` en el último; los frames en `scene.json`. |
| 3 | Squash & stretch | 2D / 3D | 2D: `CustomBounce` en `index.html`, con `svgOrigin` en la base y el contacto en el `T[id]` del `kick`/`stamp`. 3D: `key(obj, "scale", f, (1.25, 1.25, 0.75))` en el frame de contacto que manda `plan.py`. |
| 4 | Sombra que dice la altura | 2D | `index.html`: variable CSS `--sh` en el `box-shadow`; el patrón ya existe en el `btnApprove` (`x: 6, y: 6, boxShadow: 0px 0px 0`). Generalizarlo a todo lo que salta. En 3D no aplica: la sombra la da la luz. |
| 5 | Personaje «a dos» | 2D (y 3D) | `index.html`: `ease: steps(n)` sólo en los tweens del personaje (Ghosty y robots); fondos (`.stripes`, `.grid`) siguen continuos con `ease: "none"`. En Blender: modificador `Stepped` en las F-curves del personaje desde `scene.py` (`fcurves()` ya expone las curvas). |
| 6 | Smear y múltiplos | 2D | `index.html`: dos `tl.set` a un cuadro (1/30 s) dentro del evento que viaja más rápido. Para los múltiplos, sprites `<use>` en el SVG de la escena. |
| 7 | 3D falso plano | 2D | Receta `skills/motion-lab/iso-bars` (cubos de 3 caras en SVG) y `stacked-boxes`. El giro de tarjeta por `scaleX` va en `index.html`. Zdog sólo si un objeto redondo lo pide. |
| 7b | 3D real con look plano | 3D | `scene.py` + Grease Pencil: ya trae `view_transform = 'Standard'` (AgX apagado), `lay.use_lights = False` y `solid(..., emit)`. Para el contorno grueso: modificador **Line Art** de GPv3 sobre las mallas (por probar). Va sólo cuando la cámara tiene que girar alrededor del objeto. |
| 8 | Cámara multiplano | 3D (y 2D) | Lo natural es Blender: `scene.json → camera.moves` (dolly en Z) con texturas por capa de `capture.sh` a distintas Z; el parallax sale gratis. En 2D: tres grupos `#fondo/#medio/#frente` en `index.html` con escalas 1.04/1.12/1.30. |
| 9 | Zoom-punch / match cut | 2D / 3D | 2D: un tween de `scale: 14` sobre el contenedor de la escena, al final de la `len` de esa escena en `score.mjs`; sustituye a la cortinilla de esa escena. 3D: `camera.moves` hacia el objeto + `only_between()` para cambiar de set. |
| 10 | Cortinillas con forma | 2D | `index.html`, donde hoy se arma la cortinilla con `SCORE.scenes[i].glyph/color`: agregar `wipe: "rebanadas" | "circulo" | "silueta"` en `SCENES` de `score.mjs`. |
| 11 | Tipografía cinética | 2D / 3D | 2D: receta `motion-lab/word-karaoke-panel` + `SplitText` con `mask`; tiempos de `npx hyperframes transcribe`. 3D: ya existe en `scene.json → titles` (`stagger`, `word_dur`) y en `blender-ad/SKILL.md` § «Texto animado palabra por palabra». |
| 12 | Overlap / follow-through | 2D | `index.html`: el secundario entra en `T[id] + 0.1` con `elastic.out(1, 0.35)`. Si lleva sonido, que sea un `ev` aparte con nota más baja, no el mismo. |
| 13 | Stagger en orden de lectura | 2D | Ya es el patrón de `score.mjs` (un archivo por dieciseisavo, `file:${i}`). Para cuadrículas, ordenar `i` por fila-columna antes de asignar el dieciseisavo. |
| 14 | Línea que se dibuja / morph | 2D / 3D | 2D: `strokeDashoffset` ya se usa en `index.html` (barra `bp`); `drawSVG` y `morphSVG` vienen gratis. 3D: Grease Pencil trazándose solo (`harness-reel`), modulando los puntos visibles por frame. |

**Regla para elegir motor** (la de `hooks-reel`): por defecto 2D en `partitura-reel`. Blender sólo
cuando la técnica es de cámara o volumen de verdad (8 y 7b) o cuando la UI capturada en capas es la
protagonista. Mezclar los dos en un short = renderizar el plano 3D aparte y meterlo como `<video>` en
la composición de HyperFrames; nunca dos mezclas de audio.

## Relación con lo que ya tenemos

- `videos/_shared/recipes/motion-anything/` ya trae `kinetic-headline`, `stagger-list`, `bounce-cards`,
  `count-up` y `toggle-spring`: sirven de base para las técnicas 11 y 13. Las que usan gradiente,
  blur o shader (`aurora`, `gradual-blur`, `liquid-chrome`…) **no** van con la piel de caricatura.
- Las técnicas 4, 5, 6 y 7 no tienen receta todavía; son las que más diferencia harían. Candidatas a
  receta nueva de `motion-lab`: «sombra que dice la altura», «personaje a dos» y «giro de moneda».
