---
name: ghosty-rig
description: |
  Ghosty oficial en vectores, partido en piezas con ids estables (`ghosty.svg`), y `rig.js`: una API pequeña que
  agrega gestos a una timeline GSAP pausada — hop, blink, wink, look, happy, proud, shy, wave, idle, enter/exit con
  squash y accesorios en capa aparte. Determinista cuadro a cuadro (HyperFrames). Úsala siempre que Ghosty actúe en
  un video, en lugar de redibujarlo o animarlo a mano.
triggers:
  - "que Ghosty brinque / parpadee / guiñe / mire"
  - "Ghosty contento, orgulloso o apenado"
  - "anima a Ghosty"
  - "Ghosty con gafete / sombrero"
  - "que Ghosty entre y salga de cuadro"
  - "Ghosty sorprendido / confundido / pensando / triste / asustado / riéndose"
  - "que Ghosty diga sí o no, se incline, festeje, duerma, espere, trabaje o siga algo con la mirada"
origin: rig de fixter2025/videos/ghosty-identidad (7 oct 2026) + gestos de ghosty-verificado-2 (16 oct 2026), extraído el 20 oct 2026
---

# ghosty-rig

Ghosty flota, parpadea, mira a los lados, guiña, brinca con ojitos felices, se pone su gafete, se infla de orgullo,
se apena, saluda con el cuerpo, sale disparado y vuelve a caer con squash. La demo dura 6.9 s, sobre el fondo de
ghosty.studio.

## Reglas de marca (no negociables)
- **Ghosty nunca se redibuja ni se repinta.** `gBody`, los ojos, las chapitas y los lentes son byte a byte los
  trazos de `ghosty-studio/public/ghosty.svg`. Nada de `fill` nuevo, ni siquiera por una escena (ghosty-identidad lo
  pintó de rosa para «Pastelería Lulú»: no se repite).
- **Sin boca.** Las emociones salen de ojos, postura y olanes.
- **Sin placa de fondo** (ni círculo, ni tarjeta, ni halo detrás) y **nunca sobre un bloque morado**: el lila se pierde.
  Sí vale la sombra plana del piso (`#gShadow`).
- **Se anima, no se muta**: los olanes se mecen desde su unión (la forma vuelve exacta con amplitud 0); nada de giros
  de 360°, estirones verticales ni «puro brinco». El estirón por velocidad va a lo largo del movimiento, con área
  constante y tope de 6 %.
- **Los ojos se mueven completos** (párpado + pupila: `eyeL` = `lidL` + `pupL`). «Animado» = actuación: miradas,
  guiño, entrecerrar. Los ojitos `^^` (`gHappyL/R`) son la única pieza dibujada aparte y viven dentro de `gPup`.
- **Accesorios = capas aparte** dentro de `#gAcc` (`gBadge`, `gHat`, o los tuyos con `data-origin`), ocultos por
  defecto. Nunca se dibujan sobre el cuerpo ni lo tapan entero. Los disfraces deben leerse solos.
- **Los lentes son parte del logo oficial**, no un accesorio: `gGl` va siempre visible; es capa sólo para que lleguen
  tarde (follow-through) al moverse.

### Contra el asset oficial (`https://formmy.app/logo.png`, 512×592)
Comparado lado a lado el 20 oct 2026: silueta, olanes, lentes (`#D4D4D7`) y cuerpo (`#9A99EA`) coinciden. Difieren
dos tonos: **pupilas** `#11151A` en el SVG contra `#191A20` en el PNG, y **chapitas** `#8886D9` contra `#8C8BE2`. La
diferencia es imperceptible a tamaño de video; se deja el SVG tal cual porque es el vector que usa ghosty.studio. Si
alguien pide igualarlo al PNG, se cambian esos dos `fill` en `ghosty.svg`, en ningún otro sitio.

## Cuándo usarla
- Cualquier video donde Ghosty aparece: ganchos, cierres, reacciones, «Ghosty recibe su gafete», tutoriales.
- Encima de otra escena: el rig sólo necesita un `<svg>` que contenga las piezas.

## Cuándo NO (contención)
- Ghosty quieto como logo (miniatura, marca de agua): usa el PNG/SVG oficial sin rig.
- Manos: Ghosty no tiene brazos. `wave` es un balanceo del cuerpo; si la historia pide manos, son otra pieza
  (ver LECCIONES de ghosty-verificado-2: manoplas aparte, nunca brazos de sábana).
- Más de 3 emociones en 6 s cansa; la demo las enseña todas sólo porque es catálogo.

## Cómo aplicarla
1. Copia `rig.js` junto a tu composición y pega el `<g id="gHop">…</g>` de `ghosty.svg` dentro de tu `<svg>` de
   escena (o usa `recipe.html` completa y edita `PARAMS`).
2. Crea el rig y encadena gestos (los tiempos son segundos de la timeline):
   ```js
   const tl = gsap.timeline({ paused: true });
   const rig = GhostyRig.create(tl, { root: "#stage", shadow: "#gShadow", floorY: 600 });
   rig.place(640, 600, 1.5)               // pie (base de los olanes) en x, y del lienzo; escala
      .idle(0, 6.9)                        // flotación finita
      .blink(0.25).look(0.5, "left").wink(1.3)
      .happy(1.8).hop(1.8, { h: 90 })
      .accessory("gBadge", 2.5).proud(2.6).shy(3.75)
      .wave(4.85).exit(5.45).enter(6.0);
   rig.finalize(6.9);                     // SIEMPRE al final: agrega el driver del cuerpo
   window.__sfxCues = rig.cues;
   window.__timelines["main"] = tl;
   ```
3. `data-duration` del HTML = lo que pasas a `finalize`.
4. Render: `npx hyperframes render . -c recipe.html -o out.mp4` (desde una copia fuera del repo, para no dejar
   `.hyperframes/`). Verifica `start_time` 0, `blackdetect` y cuadro 0 completo.

## API (`GhostyRig.create(tl, { root, shadow?, floorY? })`)
| método | opciones (default) | qué hace |
|---|---|---|
| `place(x, y, s)` | — | posición de reposo (pie) y escala; llamar primero |
| `idle(t0, t1, o)` | `amp 8, period 1.6` | flota y mece los olanes entre t0 y t1; entra y sale suave, nunca `repeat:-1` |
| `blink(t, o)` | `double false` | parpadeo de ojo completo (0.12 s; doble = 0.24 s) |
| `wink(t, o)` | `side "R", hold 0.4` | un ojo pasa a `^` y ladea 3° hacia ese lado |
| `look(t, dir, o)` | `dur 0.22` | `left right up down upLeft upRight downLeft downRight center` o `[x, y]` (px del vector, ≤ 8) |
| `happy(t, o)` | `hold 0.8` | ojitos `^^`, rebote de 6 px, olanes animados |
| `hop(t, o)` | `h 80, dur 0.5, anticip 0.1` | se agacha, parábola de `h` px, aterriza con squash amortiguado |
| `proud(t, o)` | `hold 0.9` | se infla parejo (1.05), mira arriba entrecerrando, luego baja la vista a su gafete |
| `shy(t, o)` | `hold 0.9` | se ladea −6° y encoge, mira abajo de lado, entrecierra, te mira un instante y vuelve a desviar |
| `wave(t, o)` | `dur 0.6, times 2, deg 7` | saludo con el cuerpo: balanceo desde la base |
| `exit(t, o)` | `to [x, -320], dur 0.4, anticip 0.14` | se agacha y sale disparado (ease out) |
| `enter(t, o)` | `from [x, -260], to place, dur 0.42` | cae con gravedad (ease in) y aterriza con squash |
| `moveTo(t, x, y, o)` | `dur 0.6, arc 60` | vuela en arco a otro punto |
| `accessory(id, t, o)` | `show true, dur 0.34` | muestra (`back.out(2.4)`) u oculta una capa de `#gAcc` |
| `finalize(dur)` | — | agrega el driver; devuelve `tl` |
| `cues` | — | `[{t, sfx, gesture}]` para montar SFX |

## Gestos v2 (20 oct 2026, aditivos; demo `emociones.html`, 30.2 s)
Los gestos v1 no cambiaron: con la demo vieja, los 207 cuadros salen idénticos byte a byte antes y después.
Todos los nuevos llevan overlap: los olanes y los lentes llegan ~0.09 s tarde a cada pose nueva.

| gesto | firma | dura | emoción / para qué | cue de SFX (`rig.cues`) |
|---|---|---|---|---|
| `surprise` | `(t, {hold 0.7})` | ~1.1 s | sorpresa: se agacha 0.08 s, respinga hacia atrás, ojos ×1.22 con overshoot | `gasp` en t+0.08 |
| `confused` | `(t, {hold 1.3, side "R"})` | ~1.65 s | confusión: se ladea 8°, un ojo entrecerrado con párpado inclinado, pupilas que buscan | `hmm` |
| `think` | `(t, {hold 1.5, dir "upRight"})` | ~1.95 s | pensar: mira arriba de lado, sube y flota lento, parpadeo lento | `bubble` |
| `sad` | `(t, {hold 1.3})` | ~1.75 s | tristeza: se encoge, párpados caídos hacia afuera, mira abajo, olanes sin vida | `deflate` |
| `scared` | `(t, {hold 0.9})` | ~1.2 s | miedo: se encoge hacia atrás, ojos ×0.7, temblor a 12 fps | `shiver` |
| `laugh` | `(t, {hold 1.1, beats 4})` | 1.1 s | risa: ojitos `^^`, rebotes y vaivén al ritmo | `giggle` |
| `doubleTake` | `(t, dir, {hold 0.5})` | ~1.5 s | doble toma: mira, regresa y vuelve de golpe con ojos grandes | `tick` en t, `zip` en t+0.72 |
| `hopAnticipated` | `(t, {h 90, dur 0.5, anticip 0.22})` | ~1.2 s | brinco con anticipación marcada (mira arriba, se agacha hondo) | `whoosh` despegue, `thud` contacto |
| `nod` | `(t, {times 2, dur 0.7})` | 0.76 s | sí; las pupilas llegan tarde | `tock` |
| `shake` | `(t, {times 3, dur 0.8, deg 5})` | 0.9 s | no; las pupilas hacen contra-giro con retraso | `wobble` |
| `lean` | `(t, dir, {hold 0.9, deg 9, dx 18})` | ~1.3 s | señalar algo sin manos: contra-movimiento, se ladea con overshoot y lo mira | `slide` en t+0.08 |
| `celebrate` | `(t, {h1 70, h2 100})` | ~1.9 s | festejo: vuelta sugerida (se angosta y las pupilas barren; nunca 360°), dos brincos, squash | `twirl`, `whoosh`, `thud`, `whoosh`, `thud`, `tada` |
| `land` | `(t, {k 0.11})` | 0.7 s | squash de aterrizaje (tras un `moveTo` o una caída propia) | `thud` |
| `sleep` | `(t0, t1, {amp 5, period 3})` | t1−t0 | dormido: ojos cerrados, respira, flota lento; despierta al final | `snooze` en t0+0.3, `tick` en t1−0.35 |
| `wait` | `(t0, t1, {amp 4, period 2.4})` | t1−t0 | espera: ojos relajados, mira a los lados, parpadeo lento | `ticktock` |
| `work` | `(t, {lines 3, lineDur 0.55})` | lines×lineDur | trabajando: lee renglones de izquierda a derecha y el cuerpo acompaña | `keys` |
| `follow` | `(t0, t1, path, {space "canvas", reach 7})` | t1−t0 | las pupilas siguen un camino `[[x, y], …]` del lienzo (o `u → [x, y]`; `space "eye"` = px del vector); se ladea un poco hacia allá | `glance` |

Piezas nuevas: los párpados superior e inferior (`gLidsL/R`) son rectángulos **del color de `gBody`**, recortados a la
silueta del ojo y metidos en `eyeL`/`eyeR`. `rig.js` los crea sólo cuando un gesto los pide (confused, think, sad),
así que un `<svg>` pegado de la v1 sigue sirviendo sin cambios. `GhostyRig.pathAt(pts, u)` da el mismo camino que usa
`follow` (para mover el objetivo en la escena). `nod`, `shake` y `celebrate` fijan la pupila desde el centro: úsalos
con la mirada al frente.

## Parámetros de `recipe.html`
| clave | tipo | default | qué controla |
|---|---|---|---|
| palette | "ghosty" \| "fixtergeek" | ghosty | piel (ghosty.studio `#f4f5fb` / FixterGeek) |
| duration | s | 6.9 | igual a `data-duration` |
| home | {x, y, s} | 640, 600, 1.5 | pie de Ghosty y escala |
| idle | {amp, period} | 7, 1.6 | flotación |
| badge | [string, string] | "Agente", "ghosty.studio" | textos del gafete |
| steps | [t, gesto, args, código, texto][] | la demo | qué gesto y cuándo; el código y el texto sólo son para las tarjetas |

## SFX sugerido (instantes en `window.__sfxCues`)
- `whoosh` al despegar de `hop`/`exit` (t + anticip) y al empezar `enter`/`moveTo`.
- `thud` en el contacto de `hop` y `enter` (fin de la caída): es el cuadro del squash fuerte, no el final del rebote.
- `pop` del accesorio en `t + dur/3.4` (`back.out(2.4)` cruza su valor final en 1/(s+1) del tween).
- `tick` en `blink`/`wink`, `sparkle` en `happy`, `swell` en `proud`, `aww` en `shy`, `swish` en `wave`.
- Nunca el mismo dos veces seguidas: alterna dos `thud` y dos `whoosh`.
- v2: los cues de cada gesto nuevo están en la tabla de «Gestos v2».

## Trampas
- **`svgOrigin` de GSAP se mide en el `<svg>` raíz**: en ghosty-identidad funcionaba porque Ghosty tenía su propio
  `<svg>` con el viewBox oficial y se movía con CSS. Metido en un escenario, el gafete apareció a 350 px de Ghosty.
  Por eso el rig anima objetos proxy (`face`, `acc`) y escribe `transform` como atributo con el pivote en
  coordenadas del vector (`about([x, y], sx, sy)`). Nada de `transformOrigin` dentro de SVG.
- El driver del cuerpo arranca en 0, así que la timeline lo pinta ANTES que los tweens de la cara que empiezan después;
  cada tween de cara llama `applyFace` en su `onUpdate` para que el cuadro quede con el último valor.
- `rig.finalize()` va al final: la trayectoria (`place`, `moveTo`, `enter`, `exit`) se resuelve una vez, en orden.
- El estado del cuadro 0 de cualquier capa HTML va en el DOM, no en un `tl.set(…, 0)` (la lista de la demo salió
  vacía en el cuadro 0 por eso).
- `gsap.fromTo` siempre con `immediateRender: false`.
- Los olanes se reescriben como `d` del path (`hem`): depende de las coordenadas oficiales; si cambias el trazo del
  cuerpo, el mecido deja de respetar las uniones.
- El texto del gafete usa Poppins: cárgala en la composición o cae a Inter.
