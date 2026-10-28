---
name: filmed-screen
description: |
  Pantalla real «filmada»: una captura de la UI en perspectiva 3D de monitor, con órbita, zoom y una cámara que
  persigue un elemento del DOM (el texto que se teclea, el botón de enviar). Para demos de producto (Ghosty,
  EasyBits, Formmy). Va con el parche de la casa que vuelve opciones el glow, el grano y el fondo.
triggers:
  - "demo de producto con la pantalla real en perspectiva"
  - "que la cámara siga lo que se teclea en la app"
  - "acercamiento a la caja de texto de ghosty.studio"
  - "filmar la UI como si fuera un monitor"
origin: componente `filmed-screen` del registro HyperFrames 0.8.212 + parche fixter (fixter2025/videos/hyperframes-0812/registry-smear-screen/filmed-screen), 28 oct 2026
---

# filmed-screen

Captura de ghosty.studio (3 pantallas apiladas): plano abierto en órbita → acercamiento que sigue al cursor mientras
se teclea «Hazme una cotización en PDF para 20 piezas» → la cámara se suelta al botón de enviar, que se enciende.
1080×1920, 8 s.

## Cuándo usarla
- Demos de producto donde se teclea en la UI real y el texto debe leerse (zoom ≥ 2.5 para texto chico).
- Para dar movimiento de cámara a una captura estática sin grabar pantalla.

## Cuándo NO (contención)
- Escenas dibujadas (SVG por capas): usar `camera-rig` (parallax, whip-pan, zoom-punch). No se pisan.
- Piezas donde el render debe ser rápido: requiere HTML-in-Canvas + WebGL2, 1 worker y captura por screenshot
  (8 s ≈ 27 s de render).
- Sin el parche no entra: glow, grano/scanlines y el negro fuera de la página venían fijos en el shader.

## Cómo aplicarla
1. Capturar la página: `npx -y hyperframes@0.8.212 capture <url>` y recortar las pantallas a `assets/`
   (aquí `ghosty-hero.png`, `ghosty-iphone.png`, `ghosty-social.png`, apiladas a 0.5625).
2. Copiar `recipe.html` (ya trae el componente parchado pegado). Encima del placeholder de la captura va una caja de
   texto real (`#typed`) con un `<span class="ch">` por carácter: el tecleo es `tl.set(display: "inline")`.
3. Si se instala desde el registro (`npx -y hyperframes@0.8.212 add filmed-screen`), aplicar el parche:
   `patch -p1 < filmed-screen.patch` desde el proyecto, o copiar `filmed-screen.html` (ya parchado) a
   `compositions/components/`.
4. Editar `shots[]` en `HFFilmedScreen.mount({...})`. Render: `npx -y hyperframes@0.8.212 render . -o out.mp4`.

## Parámetros
Por toma (`shots[]`): `until` (s), `tilt`/`tiltTo` (órbita `[x, y, z]`), `zoom [de, a]`, `center [x, y]`,
`focus(t)` (elemento o rect que la cámara sigue), `blur` (profundidad de campo), `palette` (5 hex o `null`),
`invert`, `transition` (`glide` | `cut` con desgarro), `glide` (s).

Globales:
| clave | default de fábrica | casa | qué controla |
|---|---|---|---|
| `glow` (parche) | 0.6 | 0 | halo de color sobre la pantalla |
| `grain` (parche) | 1 | 0 | grano y scanlines |
| `bg` (parche) | negro | `#0E1317` | color fuera de la pantalla |
| `vignette`, `aberration`, `led` | >0 | 0 | viñeta, aberración cromática, rejilla LED |
| `blur` (por toma) | >0 | 0 | profundidad de campo |
| `fadeOut` | true | false | fundido a negro final |
| `curve` | — | 0.15 | curvatura del monitor |
| `rack` | — | 0.35 | suavizado del enfoque al cambiar de objetivo |

## SFX sugerido
Teclas de teclado suave, una por carácter (cada 0.06 s desde 2.4 s), whoosh grave en cada `glide` de cámara
(2.0 s y 5.9 s) y clic de botón en el enter (5.7 s).

## Trampas
- Determinista por diseño: cámara y enfoque son función pura del tiempo; el rack promedia muestras pasadas sin
  guardar estado.
- El look de fábrica choca con la casa (blur, glow, viñeta, aberración, LED, grano, fundido y negro): todo a 0,
  `fadeOut: false` y `bg` de la paleta. El parche mantiene los defaults originales, así que hay que pasarlos.
- El texto chico de la captura sólo se lee con zoom ≥ 2.5.
- Las capturas de `assets/` son de ghosty.studio (producto de la casa); para otro producto, recapturar.
