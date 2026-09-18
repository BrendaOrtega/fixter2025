---
name: dither-corners
description: |
  Capa reutilizable de textura half-tone/dither en las esquinas sobre `--bg`: manchas circulares cuya
  densidad baja con la distancia al centro, en bandas planas (puntos con tamaño por distancia o ruido
  feTurbulence con umbral). Sin gradientes suaves. Va debajo del contenido de cualquier tarjeta.
triggers:
  - "textura de puntos en las esquinas"
  - "half-tone en las esquinas de la tarjeta"
  - "dither retro de fondo"
  - "manchas de trama tipo impresión en el fondo"
origin: réplica TypeSafe (videos/replica-typesafe/scenes/03-pink-cards y 15-disclaimer), 17 sep 2026
---

# dither-corners

Tres manchas de trama muerden las esquinas del lienzo; al arrancar hacen un pulso (`back.out`) y se quedan fijas bajo una tarjeta central.

## Cuándo usarla
- Como capa de fondo bajo tarjetas, paneles y titulares: da textura "impresa" sin romper la caricatura plana.
- Para variar dos escenas con el mismo layout: distinta `seed` y distintas `corners`.
- Modo `dots` para look retícula/serigrafía; modo `noise` para grano de risografía.

## Cuándo NO (contención)
- No es protagonista: si la escena ya tiene ilustración con mucho detalle, la trama compite. Bajar `density` a 0.4 o quitar esquinas.
- Nunca subir `density` de 0.7: las bandas del centro se pegan y la mancha se vuelve sólida.
- Detrás de subtítulos: las esquinas inferiores chocan con el karaoke en vertical; usar sólo `tl`/`tr`.

## Cómo aplicarla
1. Copiar `recipe.html`; el `<svg id="dither">` es la capa: se deja como primer hijo del `.clip` y el contenido de la escena va encima.
2. Editar `PARAMS`: `corners` por nombre o `{x, y, radius}` (el centro puede quedar fuera del lienzo), `density`, `bands`, `seed`, `tint`.
3. `reveal.enabled: false` si la capa debe estar quieta; con `holdFrame0: true` el fotograma 0 ya trae la trama completa (el reveal es un pulso 0.7 → 1).
4. `data-duration` (root y clip) la dicta la escena que la use.
5. Renderizar: `npx hyperframes render . -c recipe.html -o out.mp4`.

## Parámetros
| clave | tipo | default | qué controla |
|---|---|---|---|
| palette | "fixtergeek" \| "easybits" | fixtergeek | variables `--bg --ink --accent --accent2 --muted` |
| mode | "dots" \| "noise" | dots | trama de puntos con tamaño por banda, o feTurbulence + umbral discreto |
| corners | (string \| {x,y,radius})[] | ["tl","br","tr"] | manchas; por nombre el centro queda 40 px fuera de la esquina |
| radius | px | 320 | radio de las manchas nombradas |
| density | 0..1 | 0.6 | cobertura en el centro; cae con `(1−k/bands)^1.5` |
| bands | int | 6 | anillos cuantizados (planos) por mancha |
| cell | px | 8 | paso de la trama en modo `dots` |
| seed | int | 20260917 | PRNG mulberry32 (jitter de radios) y semilla de feTurbulence |
| tint | "ink" \| "accent" \| "accent2" \| "muted" \| #hex | ink | color de la trama |
| opacity | 0..1 | 0.9 | opacidad de la capa |
| reveal | {enabled, duration, stagger, ease} | true / 0.6 / 0.12 / back.out(1.4) | pulso de entrada por mancha |
| holdFrame0 | bool | true | frame 0 con la trama ya puesta (pulso desde 0.7) en vez de crecer desde 0 |

## SFX sugerido
- Un `pop` suave por mancha en `i·stagger + duration/2.4` (golpe de `back.out(1.4)`); tres pops distintos, no el mismo.
- Sin reveal: la capa es muda.

## Trampas
- **No rotar los patrones** (`patternTransform: rotate`): contra la rejilla de píxeles produce moiré en ondas. Los anillos varían por jitter de radio, no por giro.
- `feTurbulence` da luminancia apretada alrededor de 0.5: un umbral "intuitivo" (0.8) deja todo vacío y uno de 0.3 lo llena. Calibrado en Chrome: cobertura ≈ 0.5 − 4·(umbral − 0.5), con `luminanceToAlpha` y `color-interpolation-filters="sRGB"`; el script convierte `density` a umbral con esa recta.
- La cobertura lineal por banda (`1 − k/bands`) pega las tres bandas centrales; la curva `^1.5` las separa.
- Los anillos se dibujan del más grande al más chico, cada uno tapa al anterior: el orden importa.
- Escala de cada mancha con `svgOrigin` en su centro (nunca `transformOrigin` dentro del SVG).
