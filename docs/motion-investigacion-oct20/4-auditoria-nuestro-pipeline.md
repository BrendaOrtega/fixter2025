# 4 · Auditoría de nuestro pipeline de video (20-oct-2026)

Pregunta: qué NO estamos usando para lograr videos estilizados, 3D mezclado con motion graphics 2D,
animados y con buen ritmo. Todo se midió sin tocar los proyectos (solo lectura).

## Cómo se midió

- **Línea de tiempo real, no el código.** Cada `index.html` se cargó en Chrome headless y se recorrió
  `window.__timelines.main.getChildren()`: inicio global, duración, ease, propiedades y blancos de cada
  tween. Concurrencia = elementos distintos con un tween activo, muestreado a 30 fps.
- **Sincronía con la música:** flujo de onsets de la pista usada (mismo recorte que `mix.sh`), tempo por
  autocorrelación, y % de arranques de animación a ±60 ms de un beat contra lo que daría el azar.
- **Recetas:** búsqueda por nombre de las 105 recetas de motion-anything (85 `web/` + 20 `slides/`), sus
  94 clases `anim-*` y las 18 de motion-lab en todo `videos/` (fuera de `_shared/`).
- Proyectos: `ghosty-microvm`, `ghosty-verificado-2`, `ghosty-identidad` y `factory-cute` (los cuatro con
  render). `ghosty-teams` sólo tiene BRIEF y style frames y `fabrica-que-hago` sólo GUION, así que entran
  en la lectura cualitativa pero no en los números. Además se revisó `~/ghosty-reel` (Blender + hooks-reel).

## Diagnóstico con números

| | microvm | verificado-2 | identidad | factory-cute |
|---|---|---|---|---|
| Duración | 35.8 s | 18.5 s | 60.9 s | 42 s |
| Motor | GSAP/DOM+SVG | GSAP/DOM+SVG | GSAP/DOM+SVG | canvas 2D `draw(t)` + rough.js |
| Tweens con movimiento (+ `set`) | 259 (+308) | 99 (+117) | 386 (+291) | 1 proxy, 189 eventos |
| Duración de tween: mediana / p90 | 0.22 / 0.50 s | 0.20 / 0.40 s | 0.34 / 0.54 s | — |
| Elementos moviéndose a la vez (sin bucles): media / p90 / máx | 3.5 / 6 / 10 | 3.2 / 5 / 8 | 4.5 / 9 / 23 | — |
| Bucles idle (`repeat`/`yoyo`) | 14 % | 14 % | 22 % | — |
| Cortes (cambios de plano) | 1 cortinilla → 1 cada 36 s | 0 (plano continuo) | 8 → 1 cada 7.6 s | 9 → 1 cada 4.2 s |
| Familia `back.out` | 50 % | 49 % | 45 % | — |
| x / y / scale / opacity del total de propiedades | 84 % | 79 % | 87 % | — |
| `rotation` (2D) | 5 % | 12 % | 5 % | — |
| 3D (`perspective`, `preserve-3d`, `rotationX/Y`, three.js) | 0 | 0 | 0 | 0 |
| Cámara / parallax | no | no (1 zoom-punch) | no | no |
| Arranques en el beat (azar) | 20 % (19 %) | 25 % (22 %) | 38 % (22 %) · corchea 67 % (45 %) | rejilla de 16avos a 120 BPM |
| Imágenes generadas con IA | no | sí: 3 manoplas 3D | no | sí: atlas gpt-image-2 |

Lectura:

1. **El movimiento individual es ágil; la composición no.** Los tweens son cortos (mediana 0.2–0.34 s),
   pero se mueven 3–4 cosas a la vez sobre un plano fijo con fondo de puntos estático (ningún tween de
   `backgroundPosition`). Nunca hay un cuadro quieto (0 %), aunque el encuadre casi no cambia: microvm se
   queda 36 s en un solo plano y verificado-2 nunca corta.
2. **Vocabulario monocorde.** La mitad de los tweens son `back.out(≈2)`. El otro gran bloque es
   `sine.inOut` en bucles idle. Hay 3 `elastic`, 1 `bounce`, cero `CustomEase`, cero trayectorias en
   arco (`motionPath`) y cero `stagger` real: las cascadas se escriben a mano con tiempos sueltos. Más
   del 80 % de lo que cambia es x/y/scale/opacity.
3. **Cero profundidad.** No hay `perspective` ni `preserve-3d` en ningún nodo ni un contenedor
   «mundo» que haga de cámara. `ghosty-madrugada` usa `rotationX` sin `perspective`, así que se ve como
   un aplastado plano. El «3D» que existe hoy son PNG estáticos (las manoplas, los sprites de
   gpt-image-2) movidos en 2D.
4. **La música sólo manda en un video.** `ghosty-identidad` cuantiza escenas a beats (111.98 BPM) y
   cae en la corchea bastante por encima del azar. En microvm y verificado-2 la partitura se ancla sólo
   a las palabras de la voz, y su coincidencia con el beat es igual al azar (20 % contra 19 % y 25 %
   contra 22 %).
5. **Secondary motion escaso.** Sólo identidad tiene actuación por piezas (olanes que se mecen,
   párpados, 31 squash con `scaleY`). En los otros, los bucles idle son el 14 % y casi no hay
   follow-through: los hijos no llegan después del padre.
6. **Las reglas se cumplen.** Los `radial-gradient` que aparecen son el patrón de puntos, no
   degradados, y los «glow» viven en comentarios que los prohíben. Excepciones documentadas:
   factory-cute (grano, glow, `createRadialGradient`, piel blueprint) y las manoplas generadas.
   ⚠️ `docs/estilo-short-motion-graphics.md` todavía prescribe manchas con `blur(120px)` en el fondo,
   lo cual choca con la regla global «prohibido blur». Hay que corregir el documento.

## Recetas y herramientas que ya tenemos y no usamos

| Qué | Disponible | Usado en los 6 proyectos recientes |
|---|---|---|
| motion-anything `web/` + `slides/` | 105 | **0** (8 sólo en `replica-typesafe`, el laboratorio) |
| motion-anything clases `anim-*` | 94 | **0** |
| motion-lab (mecánicas medidas) | 18 | **0 por nombre**; factory-cute hereda la técnica `draw(t)` de blueprint-* |
| GSAP: plugins gratis desde 3.13 (MotionPath, CustomEase, CustomBounce/Wiggle, SplitText, MorphSVG, DrawSVG, Physics2D, Flip) | todos | **0**: sólo se carga `gsap.min.js` 3.14.2 |
| `~/ghosty-reel` Blender (`scene.json` con cámara y dolly, tarjetas con grosor, UI capturada en capas, Grease Pencil) | instalado (`/opt/homebrew/bin/blender`) | **0**: el último commit de `scene.py`/harness-reel es del 10-ago |

Candidatas concretas para lo que pide el estilo:

- **Profundidad sin salir de HyperFrames:** `web/tilt-3d` (perspectiva por CSS), `motion-lab/tilt-list`,
  `motion-lab/iso-bars` (cubos isométricos planos, que encajan con la caricatura) y la cámara de
  `replica-typesafe/scenes/01-blueprint` (un `#world` grande y un solo tween de x/y como paneo).
- **Cortinillas con más mecánica:** `motion-lab/pixel-wipe-sampled` (muestrea la escena que se va) y
  `slides/fx-shockwave` para sellar el corte con impacto.
- **Texto con ritmo:** `web/kinetic-headline`, `web/text-scramble`, `slides/fx-word-cascade`,
  `slides/fx-letter-explode` y `motion-lab/word-karaoke-panel` (el karaoke se reescribe a mano en cada
  proyecto).
- **Momentos de clímax:** `motion-lab/particle-collapse` (enjambre → letra/logo), `radial-rays-counter`
  y `slides/fx-confetti` (fabrica-que-hago lo pide y hoy se haría a mano).
- ⚠️ Lo que corre con `requestAnimationFrame` (dot-grid, count-up, shaders) necesita `seek(t)` o un
  port a tween. El README de motion-lab ya trae dos ejemplos.

## Los 5 huecos principales

1. **No hay cámara ni profundidad.** Todo vive en un plano fijo. Falta un rig estándar: `#world` con
   paneo y zoom en la timeline, 3 capas de parallax (fondo, medio, frente) que se desplacen a
   velocidades distintas, y `perspective` + `rotationX/Y` en tarjetas y objetos. Las tres cosas son
   seek-safe y caben en la caricatura plana: es profundidad por movimiento, no por sombreado.
2. **El 3D real está abandonado y se sustituye con PNG generados.** El pipeline Blender de ghosty-reel
   existe pero tampoco sirve tal cual para la casa: usa DOF (`dof.use_dof`, que es blur) y materiales
   emisivos, y no tiene toon ni contorno (ni Freestyle, ni Line Art, ni Shader-to-RGB en `scene.py`).
   Falta la ruta «3D en caricatura plana»: toon de 2–3 bandas + Line Art de contorno grueso + sombra
   dura proyectada + sin DOF, exportada como capas con alfa (PNG o ProRes 4444) que HyperFrames
   compone debajo y encima de los SVG. La alternativa en el navegador es three.js con `MeshToonMaterial`
   + contorno por casco invertido, manejado por `seek(t)` desde la timeline.
3. **El ritmo de montaje es lento y no lo manda la música.** Hay un cambio de plano cada 4–36 s y 3–4
   elementos activos. Las piezas de motion de estudio renuevan el encuadre cada pocos segundos, ya sea
   con corte, push de cámara o reencuadre (esto es una referencia orientativa, no algo medido aquí).
   El método de identidad (escenas en beats + `imp()` al impacto de `back.out`) sólo se aplicó una vez;
   los videos con voz dejaron de cuantizar. Falta combinar las dos anclas: palabra para el qué y beat
   o corchea para el cuándo exacto, con un push de cámara por frase.
4. **El vocabulario de movimiento es corto.** Hoy es `back.out(2)` + x/y/scale. Faltan:
   - arcos con `MotionPathPlugin`, porque hoy las trayectorias son rectas;
   - curvas propias con `CustomEase`/`CustomWiggle`;
   - anticipación y squash-stretch en todo movimiento rápido (hoy sólo Ghosty los tiene);
   - follow-through, con hijos desfasados 2–4 cuadros;
   - `stagger` con `from: "center"` o `"edges"` y distribución, en lugar de tiempos a mano;
   - morph de formas (`MorphSVG`) para transformaciones como sobre → gafete.

   Todos esos plugins vienen gratis en el GSAP que ya cargamos.
5. **La biblioteca existe y nadie la consulta.** Ninguna receta de motion-anything ni de motion-lab
   aparece en los 6 proyectos, aunque `CLAUDE.md` manda revisarla antes de escribir un efecto. Falta
   un paso obligatorio en el BRIEF: por cada beat, qué receta se usa (o por qué ninguna), comprobable
   con grep, igual que `blackdetect`. motion-lab también necesita recetas de cámara/parallax y 3D toon,
   que hoy no tiene.

## Sobre imágenes con IA

No se usa Nano Banana ni Gemini en ningún proyecto. Sí se usa gpt-image-2 (sprites de factory-cute,
experimento-arbol y fabrica-reel) y hubo imágenes 3D generadas en las manoplas de verificado y
verificado-2, aprobadas como excepción a «SVG a mano». La excepción ya se volvió el camino de facto para
«verse 3D». Los style frames son HTML; ninguno es un keyframe generado. Decisión pendiente para bliss:
- formalizar la IA como **referencia** (style frames y moodboard, que nunca llegan al render), o
- moverse al 3D toon renderizado (hueco 2), que da el mismo look con control de cámara y pose cuadro
  a cuadro, cosa que un PNG suelto no da.

## Datos crudos

Scripts y salida (temporales) en
`/private/tmp/claude-501/-Users-bliss-ghosty-studio/9471ce6c-87c0-48d9-a499-1a3a880dea9c/scratchpad/audit/`
(`measure.cjs`, `analyze.py`, `beats.py`, `raw.json`).
Para reproducir: cargar `index.html` con puppeteer-core y Chrome for Testing, y recorrer
`__timelines.main.getChildren(true,true,false)`.
