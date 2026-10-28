# echo-smear y filmed-screen (registro HyperFrames 0.8.212)

Demos 1080×1920, 8 s, paleta FixterGeek. Render: `cd <proyecto> && npx -y hyperframes@0.8.212 render . -o ../<nombre>.mp4`.
Verificado sobre los mp4: `start_time` = 0, `blackdetect` sin hallazgos, fotograma 0 completo.

## echo-smear → `echo-smear.mp4` (proyecto `echo-smear/`)
Un sobre menta cruza al buzón, flota lento, gira, sale disparado arriba y regresa, zigzag final.

- **Parámetros** (`attachEchoSmear(targets, tl, opts)`): `length` (% del recorrido que cubre la estela, 100),
  `threshold` (px/cuadro antes de que aparezca, 40), `countMult`, `maxEchoes` (60), `measurePoint`,
  `edgeSpacing` (suaviza bordes en giros, 1.5), `subframes` (8), `operator` (`maximum` = lighten | `normal`), `fps`, `callbacks`.
- **Determinista**: sí. Graba la trayectoria una vez al adjuntar y luego cada cuadro es función del tiempo.
  Render con 1 y 4 workers: PSNR mín. 59.6 dB (idénticos a la vista).
- **Reglas de la casa**: no usa blur ni glow ni gradiente; son copias del objeto con `mix-blend-mode: lighten`.
  El estirado sale de las copias, no de un filtro. Ojo: obliga a la captura por screenshot (más lenta) y con
  `maximum` los contornos oscuros de las copias se pierden bajo el relleno claro: se lee como mancha sólida, plana.
- **vs smear-dash**: smear-dash es a mano, cuadro por cuadro (estirado + skew + múltiplos + anticipación + frenón + SFX cues).
  echo-smear es automático: se pega a cualquier tween y escala con la velocidad, cero trabajo por cuadro, pero
  sin estirado del objeto ni múltiplos separados (estela continua). La anticipación y el frenón van aparte.
- **Veredicto: ADOPTAR** como default para entradas y salidas rápidas de cualquier objeto o tarjeta. smear-dash
  se queda para el plano heroico donde importa el estilo de animación a mano.

## filmed-screen → `filmed-screen.mp4` (proyecto `filmed-screen/`)
Captura real de ghosty.studio (`hyperframes capture`, 3 pantallas apiladas). Plano abierto en órbita → acercamiento
que sigue al cursor mientras se teclea «Hazme una cotización en PDF para 20 piezas» → se suelta al botón de enviar.

- **Parámetros** (`HFFilmedScreen.mount`): `shots[]` con `until`, `tilt`/`tiltTo` (órbita), `zoom [de, a]`, `center`,
  `focus(t)` (elemento o rect que la cámara sigue), `blur` (profundidad de campo), `palette` (5 hex), `invert`,
  `transition` (`glide` | `cut` con desgarro), `glide`. Globales: `rack`, `vignette`, `aberration`, `led`, `curve`, `fadeOut`, `zIndex`.
- **Determinista**: sí por diseño (cámara y enfoque son función pura del tiempo; el rack de enfoque promedia
  muestras pasadas sin guardar estado). Requiere HTML-in-Canvas + WebGL2; renderiza con 1 worker y captura por screenshot (8 s ≈ 27 s).
- **Reglas de la casa**: el look de fábrica CHOCA: profundidad de campo (blur), glow, viñeta, aberración cromática,
  LED, grano y scanlines, fundido a negro final y negro fuera de la página. Sin blur sí funciona (`blur: 0`).
  Glow, grano/scanlines y el negro de fuera venían fijos en el shader; **parcheé** el componente instalado
  (`compositions/components/filmed-screen.html`, original en `filmed-screen.orig.html` junto a él) con opciones `glow`, `grain` y `bg`
  (defaults = original). La demo va con todo en 0, `fadeOut: false` y `bg: #0E1317`.
- **vs camera-rig**: camera-rig mueve capas SVG con parallax, whip-pan y zoom-punch para escenas dibujadas.
  filmed-screen es para UI real: perspectiva 3D de monitor, curvatura y una cámara que persigue un elemento del DOM
  (el texto que se teclea). No se pisan.
- **Veredicto: ADOPTAR con el parche** para demos de producto (Ghosty, EasyBits, Formmy) donde se teclea en la UI.
  Sin el parche no entra (grano y glow fijos). El texto chico de la captura se lee sólo con zoom ≥ 2.5.
