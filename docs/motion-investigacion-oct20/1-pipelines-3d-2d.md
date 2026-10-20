# 1 · Pipelines open source para mezclar 3D con motion 2D (20-oct-2026)

**Pregunta.** ¿Qué usa la comunidad open source en 2026 para shorts estilizados (lanzamientos SaaS,
explainers) que mezclan 3D con motion graphics 2D a buen ritmo? ¿Y cómo se saca 3D con look
caricatura plana (contorno grueso, relleno sólido, sombra dura; sin gradiente, blur ni glow)?

**Contexto propio.** El pipeline real es `~/ghosty-reel` (blissito/ghosty-reel). Tiene dos motores:
Blender headless (`scene.json` + `scene.py`, Grease Pencil y UI capturada por Chrome como textura) y
HTML + GSAP con HyperFrames (`hooks-reel`, `partitura-reel`, `fabrica-reel`). Comparten voz Kokoro,
`music.py`, `plan.py` y `mix.sh`. Las recomendaciones de abajo cambian archivos de ese repo y no
proponen una herramienta nueva.

**Método.** Leí código, no sólo blogs: clones de `heygen-com/hyperframes`,
`ouerf-man/brand-motion-design-skill`, `ouerf-man/kinetic-editorial-skill` y
`remotion-dev/template-three`; fuentes de `three.js` (`OutlineEffect.js`, `ToonOutlinePassNode.js`,
`MeshToonMaterial.js`) y de `@remotion/three` (`ThreeCanvas.tsx`); `scene.py` y
`skills/blender-ad/SKILL.md` de ghosty-reel. Las estrellas y fechas salen de la API de GitHub del
20-oct-2026.

---

## Veredicto en 3 renglones

1. **Ya tenemos los dos motores correctos.** La comunidad converge en «HTML/GSAP cuadro a cuadro
   + three.js por seek» (HyperFrames, 68k ★, Apache-2) y en «Blender headless por script». Remotion
   es la alternativa grande, pero su licencia no es libre y nos obligaría a reescribir en React.
2. **El hueco no es de herramienta, es de estilo.** `scene.py` hoy renderiza **contra la marca**:
   Principled BSDF con luces de área, bloom (`setup_glow`), DOF (`fstop`), AgX y una sombra de
   gradiente radial (`build_shadow`). Falta un modo `toon` en él.
3. **HyperFrames ya trae un adaptador `three` oficial** (seek por evento `hf-seek`). Un objeto 3D
   toon dentro de un reel HTML es una receta de motion-lab, no un motor nuevo.

---

## Hallazgos por candidato

### HyperFrames (+ adaptador `three`, `typegpu`, `lottie`, html-in-canvas): el que ya usamos
- [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes): Apache-2.0, **68.1k ★**,
  v0.8.181 del 20-oct-2026, con commits diarios.
- Es determinista: la doc dice «same input, same frames, same output». El motor
  (`@hyperframes/engine`, Puppeteer + FFmpeg) busca cada cuadro.
- **3D:** el adaptador `three` vive en `packages/core/src/runtime/adapters/three.ts`. Pone
  `window.__hfThreeTime`, dispara `CustomEvent("hf-seek", {detail:{time}})` y espera a que el
  `THREE.DefaultLoadingManager` termine de cargar. El contrato está en
  `skills/hyperframes-animation/adapters/three.md`:
  - render desde `time`, nunca con `requestAnimationFrame`;
  - `data-duration` obligatorio en la raíz, porque el adaptador no infiere la duración;
  - `AnimationMixer.setTime(t)` para clips de glTF;
  - cortes de cámara declarados como constantes (`CUT_B = 23`);
  - nada de post-procesos que dependan del cuadro anterior;
  - `window.__hf.buildReady[...]` para compilaciones pesadas.
- Ejemplos para copiar: la prueba `packages/producer/tests/distributed/three-boundary/src/index.html`
  (escena mínima) y el componente `registry/components/three-orbiting-cards`.
- Además trae `typegpu.md` (WebGPU/WGSL) y `html-in-canvas-patterns.md`, que convierte cualquier
  HTML en textura de WebGL o three. El propio skill lo recomienda para 1–3 beats «héroe» por video.
- **Integración 3D↔2D:** un `<canvas>` de three con `alpha: true` va en una capa debajo o encima
  del DOM/SVG animado con GSAP. Las dos capas leen el mismo reloj.

### Remotion + @remotion/three
- [remotion-dev/remotion](https://github.com/remotion-dev/remotion): 65.5k ★, v4.0.537 (19-oct-2026).
  **Su licencia no es OSI**: es gratis para personas y empresas de hasta 3 personas; de 4 en
  adelante se paga la Company License ([pricing](https://www.remotion.dev/docs/license/pricing)).
  El texto anuncia cambios en la v5.
- Es determinista. En `packages/three/src/ThreeCanvas.tsx`, mientras renderiza pone
  `frameloop='never'`, hace `advance()` en cada `useCurrentFrame()` y retiene el cuadro con
  `delayRender` hasta que R3F lo pinta. También trae `webgpu.tsx` y `useOffthreadVideoTexture`
  (video como textura de un modelo 3D).
- Ejemplo: [remotion-dev/template-three](https://github.com/remotion-dev/template-three) (MIT,
  116 ★): un teléfono 3D con un video de pantalla como textura. Ver también
  [remotion-dev/skills](https://github.com/remotion-dev/skills) (5.4k ★) y
  [Rieranthony/product-film-skill](https://github.com/Rieranthony/product-film-skill)
  (MIT, 418 ★), el skill de «film de producto» en Remotion del que salió el port a HyperFrames.
- **Para nosotros:** duplica lo que ya hace HyperFrames y exige React y una licencia de pago al
  crecer. No conviene.

### Motion Canvas / Revideo
- [motion-canvas/motion-canvas](https://github.com/motion-canvas/motion-canvas): MIT, 19.4k ★,
  último push el 2-jul-2026. Anima con generadores en canvas 2D y es determinista.
  **No tiene 3D nativo**; el plugin comunitario
  [motion-canvas-3d](https://github.com/tristan-f-r/motion-canvas-3d) está muerto desde 2023.
- [midrender/revideo](https://github.com/midrender/revideo) (antes redotvideo): MIT, 4.1k ★,
  push del 15-jul-2026. Es un fork pensado para render en servidor (`renderVideo()`, Cloud Run,
  workers en paralelo). Su 3D es proyección hecha a mano, como el cubo Rubik del README.
- **Para nosotros:** son un tercer paradigma y no aportan 3D. Se descartan.

### Theatre.js
- [theatre-js/theatre](https://github.com/theatre-js/theatre): Apache-2.0 (core) / AGPL (studio),
  12.8k ★. **El último push a main fue el 14-ago-2024** y el último release es v3.18.0-alpha
  (feb-2025). Sirve como editor visual de keyframes para three/R3F, pero está prácticamente
  dormido. Se descarta.

### React Three Fiber / three.js cuadro a cuadro
- [mrdoob/three.js](https://github.com/mrdoob/three.js) (MIT, 116.7k ★, r186 del 24-sep-2026),
  [pmndrs/react-three-fiber](https://github.com/pmndrs/react-three-fiber) (MIT, 33.1k ★) y
  [pmndrs/drei](https://github.com/pmndrs/drei) (MIT, 10k ★).
- Se renderiza determinista si cada cuadro se dibuja desde `t`. En HyperFrames eso es `hf-seek`;
  en Remotion, `frameloop="never"` con `advance`.
- **Piezas toon que vienen en three.js (leídas en el repo):**
  - `src/materials/MeshToonMaterial.js` da sombreado por bandas con `gradientMap`. Con una
    `DataTexture` de 2–3 px y `NearestFilter`, las bandas quedan duras y sin degradado.
  - `examples/jsm/effects/OutlineEffect.js` hace el contorno por casco invertido: re-renderiza
    con `BackSide` y empuja los vértices por la normal. Toma `defaultThickness` y `defaultColor`
    (lo pondríamos en tinta `#0E1317`). Sólo funciona con `WebGLRenderer`. **Es la pieza para el
    contorno grueso.** Ejemplo: `examples/webgl_materials_toon.html`.
  - `src/nodes/display/ToonOutlinePassNode.js` es el equivalente para WebGPU/TSL y sólo afecta a
    `MeshToonMaterial`. Ejemplo: `webgpu_materials_toon.html`.
  - `SobelOperatorShader.js` / `SobelOperatorNode.js` detectan bordes en pantalla; sirven para
    líneas interiores si se pasan normales y profundidad (técnica de
    [Codrops](https://tympanus.net/codrops/?p=65958) y
    [OmarShehata/webgl-outlines](https://github.com/OmarShehata/webgl-outlines), MIT).
  - ⚠️ **`OutlinePass.js` está prohibido para nosotros:** su borde lleva blur y `edgeGlow`, que
    viola la regla de la marca. Pasa lo mismo con `UnrealBloomPass`.

### Blender headless (Geometry Nodes, Grease Pencil, NPR, render por script)
- [blender/blender](https://github.com/blender/blender): GPL. Blender 5.0 salió el 20-nov-2025;
  ghosty-reel ya corre en 5.2. Render por script: `blender -b -P scene.py`. Es determinista, con
  la única salvedad del ruido de muestreo en Cycles.
- **Grease Pencil 5.0** ([release notes](https://developer.blender.org/docs/release_notes/5.0/grease_pencil/)):
  motion blur, esquinas Sharp/Flat por punto, herramienta Pen, interpolación Bézier y export SVG de
  curvas. No hay cambios de Line Art.
- **Line Art** sigue vivo en GPv3:
  [`GreasePencilLineartModifier` en la API 5.0](https://docs.blender.org/api/5.0/bpy.types.GreasePencilLineartModifier.html),
  con fuente `SCENE`, `COLLECTION` u `OBJECT`. Saca el contorno de las mallas 3D como **trazo de
  Grease Pencil**, al que luego se le puede poner modificador Build para que se dibuje solo.
- **Freestyle** sigue en 5.x según lo que encontré. En 2023 se planteó reemplazarlo junto con Line
  Art ([devtalk](https://devtalk.blender.org/t/2023-10-30-line-art/31809)), pero no hallé que se
  haya quitado. Corre en CPU y da grosor real en píxeles.
- **Proyecto NPR oficial** ([diseño #120403](https://projects.blender.org/blender/blender/issues/120403)):
  es un motor híbrido entre render y composición, con EEVEE como primer blanco. Hasta 5.0 no vi
  que haya salido a producción. Hoy el toon en EEVEE se arma con `Shader to RGB` → `ColorRamp`
  en modo `CONSTANT` → `Emission`, o con emisión pura.
- **Comunidad:**
  - [ahujasid/mcp-for-blender](https://github.com/ahujasid/mcp-for-blender) (MIT, **31.8k ★**,
    activo hoy) maneja Blender desde un LLM. No hace falta para render por script, pero es útil
    para explorar.
  - [chsh2/nijiGPen](https://github.com/chsh2/nijiGPen) (GPL-3, 383 ★, activo): add-on de
    Grease Pencil.
  - Los shaders toon «pro» (Stylized BSDF, VRtoon) son de pago.
- Blender no tiene un compositor 2D de motion propio para nuestro caso. Por eso la UI entra como
  textura y el texto como planos, que es lo que ya hace `scene.py`.

### Rive y Lottie / dotLottie
- **Rive:** los runtimes son MIT ([rive-runtime](https://github.com/rive-app/rive-runtime) 1.2k ★,
  [rive-wasm](https://github.com/rive-app/rive-wasm) 1k ★), pero **el editor es propietario** y
  exportar video es de los planes de pago
  ([docs](https://rive.app/docs/editor/exporting/exporting-for-video-and-static-design.md)).
  No tiene seek determinista documentado: el loop de bajo nivel avanza con
  `requestAnimationFrame`, y el `rive-mcp` comunitario graba en tiempo real con MediaRecorder.
  No sirve para render cuadro a cuadro.
- **Lottie:** [airbnb/lottie-web](https://github.com/airbnb/lottie-web) (MIT, 32k ★, push de
  sep-2025) y [dotlottie-web](https://github.com/LottieFiles/dotlottie-web) (MIT, v0.81 de
  oct-2026). **HyperFrames ya trae adaptador `lottie` con seek.** Es 2D puro y viene bien para
  ícono o personaje en loop hecho por otro. Ojo: nuestra regla pide SVG a mano.

### Manim
- [ManimCommunity/manim](https://github.com/ManimCommunity/manim) (MIT, 41.7k ★, v0.22 del
  8-oct-2026) y [3b1b/manim](https://github.com/3b1b/manim) (95k ★). Es determinista y trae
  `ThreeDScene`. Su estética es matemática (pizarrón de 3Blue1Brown), no de lanzamiento SaaS.
  Sirve sólo para un beat de fórmula o gráfica.

### GSAP + WebGL
- GSAP 3 es gratis desde 2025 con todos sus plugins, bajo una licencia propia que no es OSI. Ya es
  el reloj de HyperFrames. Con WebGL, el patrón es el adaptador `three` de arriba o
  `@hyperframes/shader-transitions` para cortinillas por shader.

### Lo nuevo de 2025–2026 que está pegando
- **Skills de agente sobre HyperFrames + three:**
  - [ouerf-man/brand-motion-design-skill](https://github.com/ouerf-man/brand-motion-design-skill)
    (MIT, 37 ★, sep-2026) es un port de product-film a HyperFrames. Su `kit/three.js`, `PF.film`
    (un reloj y `draw(t)` puro) y `cues.js` (hoja de beats única para la imagen, el audio y las
    capturas) valen la pena de leer. **Su estética es la opuesta a la nuestra** (glossy, bloom,
    partículas), pero trae una lección útil en `SKILL.md`: «lo que debe igualar un swatch va en
    `MeshBasicMaterial` con `toneMapped:false`». Además: «3D en GL por software ≈ 1 cuadro/s con
    bloom».
  - [ouerf-man/kinetic-editorial-skill](https://github.com/ouerf-man/kinetic-editorial-skill):
    karaoke por palabra con HyperFrames y three.
- [dmtrKovalenko/fframes](https://github.com/dmtrKovalenko/fframes): Rust + SVG en GPU, MIT,
  2.9k ★, activo. Es rápido, pero no tiene escena 3D.
- [codedbytahir/motionforge](https://github.com/codedbytahir/motionforge): MIT, 93 ★. Se vende
  como «Remotion libre» con R3F, pero tiene poca tracción.
- Composición y edición, no 3D: [diffusionstudio/core](https://github.com/diffusionstudio/core)
  (MPL, WebCodecs), [etro](https://github.com/etro-js/etro) (GPL) y
  [twick](https://github.com/ncounterspecialist/twick).
- **No encontré** un framework nuevo y adoptado que sea «3D toon para motion». La comunidad arma
  el look con three o Blender más shaders toon.

---

## Tabla comparativa

| Herramienta | Licencia | Cuadro a cuadro headless | 3D ↔ 2D | ★ / actividad | Look toon plano | Para ghosty-reel |
|---|---|---|---|---|---|---|
| **HyperFrames + `three`** | Apache-2.0 | Sí (Puppeteer + seek `hf-seek`) | canvas three bajo/sobre DOM-SVG-GSAP, mismo reloj | 68k · diario | MeshToon + OutlineEffect (casco invertido) | **Ya es el motor 2D**: falta receta |
| **Blender headless** | GPL | Sí (`-b -P`) | UI/texto como texturas o planos, GP en el espacio | 21k (espejo) · diario | Emission/ColorRamp CONSTANT + Solidify invertido + Line Art/Freestyle | **Ya es el motor 3D**: falta modo `toon` |
| Remotion + @remotion/three | Fuente disponible, pago 4+ personas | Sí (`frameloop never` + `advance`) | `<ThreeCanvas>` dentro de React | 65k · diario | igual que three | No: duplica y obliga a React |
| Motion Canvas | MIT | Sí | Sin 3D nativo | 19k · jul-2026 | n/a | No |
| Revideo | MIT | Sí (servidor) | 3D a mano | 4.1k · jul-2026 | n/a | No |
| Theatre.js | Apache/AGPL | Depende del host | Editor de keyframes de three | 12.8k · **dormido 2024** | n/a | No |
| R3F / three puro | MIT | Si se dibuja desde `t` | n/a | 33k / 117k · diario | piezas oficiales | Vía HyperFrames |
| Rive | Runtime MIT, editor propietario | **No** (rAF; video de pago) | 2D | 1k · diario | sí (2D) | No |
| Lottie / dotLottie | MIT | Sí (adaptador HF) | 2D | 32k / 0.9k | sí (2D) | Opcional, para loops |
| Manim | MIT | Sí | `ThreeDScene` | 42k / 95k · oct-2026 | look pizarrón | Sólo para un beat de fórmula |
| fframes | MIT | Sí (GPU) | SVG, sin 3D | 2.9k · oct-2026 | n/a | No |

---

## Top 3 para nosotros: qué tocar en ghosty-reel

### 1. Modo `toon` en la ruta Blender: `scene.json` + `scene.py` (+ sección en `skills/blender-ad/SKILL.md`)

**Por qué.** Hoy `scene.py` contradice la marca en cinco puntos (leído en el archivo):
- `solid()` usa Principled BSDF iluminado por dos luces de área (`build_lights`), así que salen
  degradados de luz;
- `setup_glow()` mete bloom en el compositor;
- `build_camera()` prende DOF (`dof.use_dof = True`, `fstop` en `scene.json`), o sea, blur;
- `configure_render()` fuerza AgX con «Medium High Contrast», que lava los hex de la marca
  (el propio `SKILL.md` lo advierte en «Color plano: apaga AgX», pero el script no lo aplica);
- `build_shadow()` y `build_shockwave()` son gradientes radiales.

**Qué cambiar.** Una llave `"style": "toon"` en `scene.json`. Con ella:
- `solid()` devuelve **Emission plana** con el hex exacto. Si se quiere volumen, una sola banda
  dura con `Shader to RGB` → `ColorRamp` (`interpolation='CONSTANT'`, 2 paradas) → `Emission`.
- **Contorno grueso:** un modificador Solidify de casco invertido en cada malla que se despega
  (`use_flip_normals=True`, grosor negativo, `material_offset` hacia un material de tinta
  `#0E1317` con `use_backface_culling=True`). Es barato, determinista y el grosor se controla en
  unidades de mundo. Las líneas interiores (pliegues) van con un objeto Grease Pencil con
  `GreasePencilLineartModifier` (fuente `COLLECTION`), opcional.
- **Sombra dura `8px 8px 0`:** `build_shadow` cambia el gradiente por un duplicado del contorno
  del botón en tinta sólida, desplazado en x/y y apenas detrás en z. `build_shockwave` pasa a ser
  un anillo de borde duro.
- `configure_render()` pone `view_transform='Standard'`, `look='None'` y salta `setup_glow`
  (hoy sólo se apaga con `NOGLOW`). Apaga `use_gtao` y `use_raytracing`. `build_camera()` pone
  `dof.use_dof=False`.

**Verificación.** `PREVIEW=1 FRAMES=…` y comparar el color de píxeles en un cuadro contra la
paleta. Es lo mismo que pide la regla de entregables, convertido en chequeo automático.

⚠️ Blender no está instalado ahora en esta Mac: `/opt/homebrew/bin/blender` apunta a un `.app`
que no existe. Los nombres de API salen de la doc 5.0 y hay que probarlos en 5.2 antes de
dar el cambio por bueno.

### 2. Receta `toon-object` en `skills/motion-lab/`: 3D toon dentro de los reels HTML

**Por qué.** Es la forma más barata de meter un objeto 3D real (el teléfono, la caja, el cubo de
la fábrica) en `partitura-reel` o `fabrica-reel` sin salir de HyperFrames ni de la partitura.
El adaptador `three` ya existe y es oficial.

**Qué es.** Una carpeta nueva `skills/motion-lab/toon-object/` con la forma de las otras 15
recetas (ver `MOLDE.md`):
- `<canvas>` de three con `alpha:true`, `setPixelRatio(1)` y tamaño fijo;
- `MeshToonMaterial` con `gradientMap` de 2 px (`NearestFilter`) en colores de la paleta;
- `OutlineEffect(renderer, {defaultThickness: ~0.008, defaultColor: tinta})`;
- la sombra dura como un plano `MeshBasicMaterial` con `toneMapped:false` desplazado;
- `renderAt(t)` escuchando `hf-seek` y `data-duration` en la raíz.

Las etiquetas, pastillas y SVG siguen en el DOM encima, animadas con GSAP. Se copia la escena
mínima de `hyperframes/packages/producer/tests/distributed/three-boundary/src/index.html` y el
patrón `CUT_*` de `three.md`.

**Prohibido en la receta:** `OutlinePass`, `UnrealBloomPass`, `MeshStandardMaterial` con
environment map y cualquier `requestAnimationFrame`.

**Costo.** Sin bloom, three en GL por software es mucho más rápido que el ~1 cuadro/s que reporta
brand-motion-design con bloom, pero hay que medirlo en la caja `hyperframes-svc`.

### 3. Contorno que se dibuja solo: Line Art + Build sobre mallas 3D (extiende `skills/blender-ad/grease-pencil.py`)

**Por qué.** `harness-reel` ya demostró que Grease Pencil se ve bien y renderiza barato (110
cuadros a 540×960 en 9 s, según el SKILL). Line Art convierte el contorno de cualquier modelo 3D
en trazo de GP, y el modificador Build lo dibuja en el tiempo. El resultado es un objeto 3D que
«se entinta» frente a cámara: es el gesto de caricatura más fuerte y no existe en HTML.

**Qué agregar.** En `grease-pencil.py`, una función `lineart_for(collection, color, radius)` que
cree el objeto GP con `GreasePencilLineartModifier`, el material de tinta y `build_in()` (ya
existe en ese archivo) sobre los trazos generados. Hay que documentar en `SKILL.md` que el orden
de composición GP-sobre-malla en EEVEE (ya anotado ahí) también aplica a estas líneas.

### Descartados y por qué (en una línea cada uno)
- **Remotion:** duplica HyperFrames, obliga a React y pide licencia de pago desde 4 personas.
- **Motion Canvas y Revideo:** no tienen 3D.
- **Theatre.js:** está dormido desde 2024.
- **Rive:** sin render determinista y con editor propietario.
- **Manim:** su look no es el nuestro.
- **Lottie:** se queda como opción para loops ajenos, porque la regla es SVG a mano.
