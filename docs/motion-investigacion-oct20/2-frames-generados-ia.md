# Frames generados con IA para shorts estilizados (investigación, 20-oct-2026)

Pregunta de bliss: **«¿acaso no estamos dibujando suficientes frames con Nano Banana?»**

## Respuesta corta

No es un problema de *cantidad* de frames. Quienes logran el look no dibujan cada cuadro con un
modelo de imagen: dibujan **pocos keyframes muy cuidados** (1 a 2 por toma de 3–8 s) y dejan que un
modelo de video o un interpolador rellene los 24 fps. Si generas cada cuadro por separado con Nano Banana,
cada uno sale «de nuevo» y la imagen hierve (flicker): la consistencia empeora con más frames, no mejora.

Las excepciones donde sí se generan muchos cuadros a mano:
- **Sprites / ciclos** (caminar, saltar, parpadear): 4–8 poses **en UNA sola imagen** (rejilla 2×2 o 3×3),
  sostenidas «a dos» o «a tres» (8–12 fps). Que salgan en la misma imagen es lo que las hace consistentes.
- **Rotoscopia por ejemplo** (EbSynth): pintas 1 keyframe cada ~10–30 cuadros, o uno más cuando el sujeto
  gira o se tapa, y el software propaga el estilo.

## Cómo lo hace la comunidad (2025–2026)

### 1. Style frame → keyframes → primer/último cuadro → video
El flujo dominante entre creadores: Nano Banana (2.5 Flash Image, Pro o 2) genera el cuadro inicial y el
final de cada toma; Kling 3.0, Veo 3.1 o Wan 2.2 FLF2V generan el movimiento entre los dos. Para encadenar
tomas, el último cuadro del clip anterior se vuelve el primero del siguiente. Los arreglos de consistencia se
hacen **en las fotos fijas, antes del video**.
- Kling + Nano Banana, start/end: https://heatherbcooper.substack.com/p/google-goes-bananas-kling-start-and
- Caso de anuncio con Nano Banana Pro + Kling 3.0: https://www.fooh.com/blog/skims-toothpaste-ai-ad
- Transiciones «hook» con frames de Kling 3.0: https://gotranscript.com/public/create-viral-hook-transitions-with-kling-30-frames

**Cuántos keyframes:** no hay un estándar publicado. Lo que se repite: 2 por toma (inicio y fin), tomas de
3–8 s, y un keyframe extra cuando la toma cambia mucho (giro, oclusión). Un short de 30 s ≈ 6–10 tomas ≈
**12–20 keyframes**, no cientos.

### 2. Consistencia de personaje y estilo
- **Hoja de personaje / rejilla**: una imagen 3×3 (o 4 cuadros apilados, que conserva más detalle) con todos
  los ángulos y tomas; luego se escala cada panel en vez de recortarlo. Un caso: dos personajes consistentes en
  70 s sin LoRA. https://invideo.io/faq/how-do-you-use-ai-character-sheet-grid-panels-to-keep/ ·
  https://www.atlabs.ai/es/blog/master-cinematic-ai-video-how-to-control-camera-angles-consistency-with-nano-banana-pro
- **Imágenes de referencia**: Nano Banana Pro y Veo 3.1 (hasta 3 referencias) reciben la misma referencia en
  cada llamada.
- **LoRA de estilo** (lo open source): Qwen-Image y Wan con LoRA de color plano:
  - `motimalu/qwen-flat-color-v2` (imagen, Apache-2): https://huggingface.co/motimalu/qwen-flat-color-v2
  - `motimalu/wan-flat-color-v2` (video, base Wan 2.1 T2V 14B, Apache-2, disparadores «flat color, no lineart»):
    https://huggingface.co/motimalu/wan-flat-color-v2
  - Ojo: las dos son **sin contorno**. Nuestro look pide contorno grueso: habría que entrenar una LoRA propia
    con 20–40 ilustraciones de la casa (las SVG ya existentes, rasterizadas).

### 3. Muchos keyframes + interpolación (open source)
- **Wan 2.2 FLF2V** en ComfyUI, workflow oficial (`WanFirstLastFrameToVideo`, LoRA «lightning» de 4 pasos para
  ir rápido): https://comfy.org/workflows/video_wan2_2_14B_flf2v-7016f027bcf1/ · tutorial:
  https://stable-diffusion-art.com/?p=18698
- **Wan VACE con N keyframes** en posiciones fijas (regla de 4n+1 cuadros, lados múltiplos de 16):
  `WanVaceKeyframeBuilder` (TrentNodes) https://www.runcomfy.com/comfyui-nodes/TrentNodes/wan-vace-keyframe-builder ·
  `WanVideoVACEStartToEndFrame` de kijai (ComfyUI-WanVideoWrapper)
  https://www.runcomfy.com/comfyui-nodes/ComfyUI-WanVideoWrapper/wan-video-vace-start-to-end-frame
- **LTX-2** (Lightricks): condicionamiento por varios keyframes + LoRA de estilo; licencia comunitaria
  gratis para empresas con menos de USD 10M de ingresos. https://comfy.org/workflows/model/ltx/
- **ToonCrafter** (CUHK/Tencent, Apache-2): interpolación pensada para caricatura entre dos cuadros, con boceto
  opcional que guía los intermedios. Límite real: 512×320 y 16 cuadros; es investigación, no producto.
  https://github.com/Doubiiu/ToonCrafter
- Interpoladores clásicos para subir fps sin generar: RIFE (https://github.com/hzwer/Practical-RIFE) y FILM de
  Google (https://github.com/google-research/frame-interpolation). En caricatura plana conviene **lo contrario**:
  bajar a 12 fps sosteniendo cuadros. Así se ve dibujado y se esconde la papilla de los intermedios.

### 4. Sprites y rotoscopia
- Rejilla de sprites con Nano Banana (ciclo de 6 cuadros, fondo transparente, alinear la línea base):
  https://rosebud.ai/blog/how-to-create-a-sprite-sheet-with-ai-using-google-gemini-and-nano-banana-easy-guide
- `sprite-sheet-creator` (open source, Nano Banana Pro por fal, ciclos de 4 cuadros en 2×2):
  https://github.com/thinhlpg/sprite-sheet-creator · workflow de ComfyUI: https://comfy.org/workflows/use-cases/sprite-sheet-generator/
- Advertencia común: hay que limpiar a mano rejillas chuecas y cuadros fuera de modelo.
- **EbSynth 2** (oct-2025, escritorio y GPU, síntesis por ejemplo sin modelo entrenado): pintas un cuadro y lo
  propaga; más keyframes donde el sujeto gira. https://digitalproduction.com/2025/09/24/ebsynth-v2-real-time-preview-timeline-layers/

### 5. Lo generado debajo, motion graphics vectoriales encima
Es el patrón de los anuncios que mejor se ven: el fondo o el b-roll lo pone el video generado, y encima van
texto, flechas, pastillas y logo en vector. Es justo lo que ya hace HyperFrames y encaja con nuestras reglas
(ver la evaluación de abajo).

## Costos aproximados (USD, precios de lista de terceros, sept–oct 2026; verificar antes de presupuestar)

| Pieza | Precio | Fuente |
|---|---|---|
| Nano Banana (2.5 Flash Image) | ~$0.039/imagen (batch $0.0195) | https://benchlm.ai/media-pricing/nano-banana |
| Nano Banana Pro (Gemini 3 Pro Image) | $0.134 (1–2K), $0.24 (4K) | ídem |
| Nano Banana 2 (3.1 Flash Image) | $0.067 (1K), $0.101 (2K) | ídem |
| Veo 3.1 Standard / Fast / Lite | $0.40 / $0.10–0.12 / $0.05–0.08 por s (audio incluido) | https://invideo.io/blog/ai-video-model-pricing |
| Kling 3.0 | ~$0.07–0.10/s (Atlas, PiAPI) a $0.17–0.34/s (fal) | https://aireiter.com/blog/kling-3-api-pricing-guide-2026 |
| Wan 2.2 local o GPU rentada | sólo GPU: ~$0.03–0.10/s de video (estimado: H100 a ~$2–3/h, 5 s 720p en minutos con LoRA lightning) | estimación propia |

**Por segundo de short terminado** (2 keyframes por toma de 5 s): ~$0.02/s en imágenes + video ⇒
Veo 3.1 Fast ≈ **$0.12–0.15/s**, Kling 3 ≈ $0.10–0.35/s, Wan local ≈ $0.05–0.12/s. Un short de 30 s con
**todo** generado sale en ~$4–10 por intento; en la práctica son 3–5 intentos por toma, así que hay que
presupuestar ×3 a ×5.

## Licencias y uso comercial

- **Gemini API (Nano Banana, Veo)**: Google no reclama propiedad de lo generado; la responsabilidad del uso es
  tuya. Todo lleva marca de agua invisible **SynthID** (imagen y cada cuadro de Veo). https://ai.google.dev/gemini-api/terms
- **Wan 2.2**: Apache-2, «no reclamamos derechos sobre lo que generes», sin tope de ingresos ni de territorio.
  https://huggingface.co/Wan-AI/Wan2.2-I2V-A14B
- **Qwen-Image / LoRA flat-color de motimalu**: Apache-2.
- **LTX-2**: licencia comunitaria, gratis con ingresos < USD 10M; arriba de eso, licencia pagada.
- **HunyuanVideo**: licencia de Tencent que **excluye la UE, el Reino Unido y Corea del Sur** (modelo y
  salidas). https://www.thundercompute.com/blog/best-open-source-ai-video-generation-models
- **FLUX**: Kontext [dev] y klein 9B son no comerciales (BFL pide licencia); **sólo FLUX.2 klein 4B es
  Apache-2**. https://help.bfl.ai/articles/3670520907-can-i-use-the-api-for-a-commercial-application
- **ToonCrafter**: Apache-2 en el repo, pero se declara «exploración de investigación».
- **Kling y Veo**: servicios cerrados; se usan por sus términos de API y no hay pesos.

## Evaluación honesta contra las reglas de la casa

Reglas que mandan: caricatura plana (contorno grueso, rellenos sólidos, sombra dura, **sin gradiente, blur,
glow ni grano**), tarjetas **SVG a mano, nunca imágenes generadas**, Ghosty **no se repinta** (asset oficial
`https://formmy.app/logo.png`).

**Dónde NO cabe:**
- **Ghosty**: nunca pasa por un modelo. Ni como referencia para «animarlo»: los modelos de video lo deforman
  (boca, contorno, proporciones). Va siempre como PNG oficial compuesto encima.
- **Tarjetas y objetos de las escenas**: la regla de SVG a mano sigue en pie. Un frame rasterizado no se anima
  con GSAP por partes, no se le cambia la paleta y no pasa el filtro de «nada de gradiente».
- **Texto, logos y datos** dentro de lo generado: siempre van como vector encima.
- **Video generado crudo en caricatura plana**: Veo, Kling y Wan meten por default sombreado suave, motion
  blur y degradados; eso rompe la regla. Sin LoRA de estilo y sin posproceso, no entra.

**Dónde SÍ cabe (con permiso de bliss para matizar la regla):**
1. **Fondos y escenarios** (calle, oficina, fonda) detrás de las tarjetas, generados en plano y luego
   **vectorizados** con `vtracer` (MIT, https://github.com/visioncortex/vtracer) para obtener SVG de verdad,
   con la paleta cuantizada a la de la marca. Así el resultado vuelve a ser SVG y se puede animar.
2. **Transiciones y b-roll de 1–2 s** (una puerta que se abre, un zoom a una ciudad isométrica), generados
   con FLF2V entre dos keyframes planos y pasados por **cuantización de paleta** (ffmpeg `paletteuse` con la
   paleta de la marca, sin dither) + **12 fps sostenidos**. Eso mata los degradados y el blur.
3. **Escenas 3D estilizadas** (isométricas, «toy»): aquí el video generado aporta lo que el SVG a mano no
   da barato, que es la cámara y la profundidad. Es el caso más fuerte, pero choca con «plano»: usarlo sólo
   como b-roll aislado, nunca en la misma toma que las tarjetas.
4. **Sprites de objetos** (no de Ghosty): una rejilla de 4–6 poses de un objeto concreto (taza, teléfono,
   tamal), vectorizada y montada como ciclo finito.

Comprobación automática si se adopta: medir en cada cuadro del entregable cuántos colores únicos hay fuera
de la paleta (después de la cuantización deben ser ~0), y una detección de blur (varianza del laplaciano) por
toma. Si falla, la toma no entra.

## Top 3 para probar

1. **Fondo plano → SVG** (barato, cabe en las reglas casi tal cual): Nano Banana 2 o Qwen-Image + LoRA
   flat-color generan 3 fondos con la paleta FixterGeek; `vtracer` los pasa a SVG; se animan en HyperFrames
   con parallax. Costo: ~$0.30. Lo que se mide: si el SVG resultante pasa el filtro de plano y pesa < 300 KB.
2. **Transición de 1.5 s con Wan 2.2 FLF2V** (ComfyUI, workflow oficial + LoRA lightning, Apache-2): dos
   keyframes planos (dibujados por nosotros o generados) → video → paleta cuantizada → 12 fps. Comparar contra
   la misma transición en Veo 3.1 Fast (~$0.20). Lo que se mide: que no salgan degradados ni morphing después
   del posproceso.
3. **Ciclo de sprite de un objeto** con `sprite-sheet-creator` (rejilla 2×2 de Nano Banana Pro, ~$0.13 por
   rejilla), vectorizado y sostenido a 8 fps como acento de una tarjeta. Lo que se mide: si 4 poses salen en
   modelo sin retocar.

Si los tres pasan, se le propone a bliss matizar la regla: **«SVG a mano o SVG vectorizado de una imagen
generada en plano; nunca raster generado en la toma final, nunca Ghosty»**.
