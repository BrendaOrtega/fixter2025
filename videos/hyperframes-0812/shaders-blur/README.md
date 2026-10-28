# HyperFrames 0.8.212: fondos shader WebGPU y motion blur de captura

Demos hechas el 28-oct-2026 con `npx -y hyperframes@0.8.212` en una Mac con Apple M4 (GPU integrada, sin GPU dedicada).

- `shaders.mp4`: hoja de contactos de 1080×1920 y 10 s con 6 fondos. Proyecto en `shaders/`.
- `motion-blur.mp4`: el mismo cohete y el mismo tween en dos carriles, uno con blur y otro sin blur, 1080×1920 y 8 s. Proyecto en `motion-blur/`.
- `renders/`: los dos renders de prueba de determinismo, el render en SwiftShader y los logs.

## Fondos shader

`catalog --tag webgpu` regresa 40 entradas: ~36 shaders de la librería Shaders 4.0.0 (MIT) más 4 bloques compuestos. Cada bloque es un `<canvas data-shader="Name">`, y los colores se cambian con `data-shader-props='{"colorA": "#..."}'` (MeshGradient usa `stops`).

| Shader | FixterGeek | EasyBits | Props usadas |
|---|---|---|---|
| plasma | sí (menta sobre `#0E1317`) | **sí**, el mejor | `colorA #7c3aed`, `colorB #0b0b0f` |
| swirl | regular (se ve pastel) | sí; la mezcla morado-ámbar da tonos rosados | `colorA #7c3aed`, `colorB #fbbf24` |
| mesh-gradient | sí | **sí** | `stops` `#0b0b0f` → `#7c3aed` → `#fbbf24` |
| aurora | sí, pero casi todo el cuadro queda negro | sí | `colorA #85DDCB`, `colorB #8DCF6E`, `colorC #7C8A8E` |
| voronoi | **sí**, el más «objeto» de los seis | sí | `colorA #0E1317`, `colorB #85DDCB`, `colorBorder #8DCF6E` |
| godrays | **sí** | sí (rayos ámbar) | `rayColor #85DDCB`, `backgroundColor #0E1317` |

Lo que encontré:
- **Un solo shader por documento.** El bundle `lib/shaders.iife.js` sólo inicia el primer `canvas[data-shader]`, así que si montas varios bloques en la misma composición, sólo se pinta el primero. Para la hoja hice `compositions/lib/shaders-multi.iife.js`: es el mismo bundle con un parche en las últimas líneas para que inicie un renderer por canvas. Vale reportarlo upstream.
- Pon `data-no-timeline` en el host de cada bloque. Sin eso, el render espera 45 s (`sub_timeline_readiness_timeout`): el render tardó 56 s en vez de 9 s.
- **Determinismo:** dos renders con GPU dieron los 300 cuadros idénticos (`framemd5` igual, PSNR = inf).
- **Sin GPU dedicada:** funciona con la GPU integrada del M4 (`hardware gpu`, 9 s). Con `--no-browser-gpu` falla, a menos que pongas `PRODUCER_ALLOW_SOFTWARE_WEBGPU=true`. Así renderiza en SwiftShader en 36 s (4×), pero **no da los mismos píxeles que la GPU**: voronoi y aurora cambian (PSNR 23 dB). En un render en la nube o en Docker sin GPU, el resultado puede cambiar.

## Motion blur de captura

- Se activa con `data-motion-blur="on"` en la raíz de la composición. Hay opciones: `data-motion-blur-shutter` (0–720 grados, default 240; usé 270), `data-motion-blur-samples` (2–64) y `data-motion-blur-events="on"` si el movimiento sale de un callback.
- Se apaga para una parte con `data-motion-blur="off"` en ese subárbol (así está el carril OFF) y para todo un render con `render --page-motion-blur=off`.
- El tier se elige solo. Translación pura usa el filtro barato. Giros y zooms usan la captura con html-in-canvas: este demo salió `tier=capture`, porque el cohete gira en el tercer cruce.
- **Cuándo se apaga o se degrada** (`check` lo explica con `motion_blur_off`, `motion_blur_filter_fallback` o `motion_blur_no_movers`):
  - Hay un canvas WebGL/WebGPU en la composición: la captura lo congela y baja al filtro, que sólo suaviza los giros. **Shaders y blur de captura no se juntan en la misma composición.** Lo comprobé en una copia de la hoja con blur.
  - `backface-visibility` en 3D, `<iframe>`/`<object>` en la raíz, opacity o blend-mode en la raíz, un `<canvas layoutsubtree>` anidado, HDR o render distribuido.
  - Movers que no son HTML: un `<svg>` animado directo no se detecta (`movers=0`, sin blur). Hay que envolverlo en un `<div>` y animar el div.
- **Costo:** 8.4 s con blur contra 6.3 s sin blur (+33 %, 8 s de video). El render se va forzosamente a screenshot capture.

## Veredicto

Las dos cosas funcionan bien. Los shaders son deterministas con GPU, se recolorean con props y renderizan rápido en el M4. El motion blur se ve como en cine y cuesta poco.

**Pero nuestra regla de caricatura plana prohíbe gradiente, blur y glow.** Por eso ninguna de las dos entra en los shorts normales de FixterGeek ni en Ghosty. Sólo sirven en dos casos:
1. Piezas que rompen la regla a propósito, como `glass-pill`.
2. El fondo animado de la marca EasyBits: plasma o mesh-gradient en morado y ámbar.

Godrays y voronoi en menta son la única opción razonable para FixterGeek, y aun así cuentan como excepción a la regla.
