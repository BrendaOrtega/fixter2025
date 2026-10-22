---
name: glass-pill
description: |
  Pastilla de vidrio tipo Apple Liquid Glass (refracción en el filo, desenfoque saturado, borde especular)
  con ícono de objeto y dos renglones, que entra con rebote, dibuja su palomita y cruza un brillo una vez.
  Para un aviso corto sobre un plano de cámara: «los pasos van en la descripción», «link en el perfil».
triggers:
  - "ponle la pastilla de vidrio con el aviso"
  - "un callout glass tipo apple sobre el video"
  - "aviso de cristal con palomita encima de la persona"
origin: estilo de un short de «Drama 3» que mandó bliss (22 oct 2026), subido a Liquid Glass
---

# glass-pill

Una pastilla de vidrio que dobla el fondo en su filo, lo desenfoca y lo satura; adentro, un portapapeles blanco que dibuja su palomita y dos renglones que suben palabra por palabra. Un brillo la cruza una vez y sale con un leve encogimiento.

## Cuándo usarla
- Aviso de una línea o dos sobre un **plano de cámara** (persona, escritorio): el vidrio necesita algo detrás para lucir.
- CTA suave: «los pasos van en la descripción», «guárdalo para después», «link en el perfil».
- Shorts verticales 1080×1920 (la receta ya viene en ese lienzo).

## Cuándo NO (contención)
- Sobre fondo plano o liso: sin textura detrás, el vidrio se ve como un rectángulo gris.
- Piezas en caricatura plana: **rompe a propósito la regla** (lleva blur, brillo y degradado del sheen), igual que las `blueprint-*`.
- Más de dos renglones o más de ~22 caracteres por renglón: la pastilla se vuelve tarjeta.
- Zona segura TikTok: no subir de `y 240` ni bajar de `y 1400`; la derecha entre `y 880–1400` la tapan los botones (`x > 930`).

## Cómo aplicarla
1. Copiar `recipe.html`, editar `PARAMS` (`lines`, `position`, `tone`).
2. Sustituir el `<svg id="bg">` por el plano real (`<video>`/`<img>` con `class="clip"` y `data-track-index="0"`).
3. Cambiar el ícono si el aviso no es de «pasos»: siempre un objeto concreto en blanco, con un trazo que se dibuja.
4. `npx hyperframes render . -o out.mp4` (con `recipe.html` como `index.html`).

## Parámetros
| clave | tipo | default | qué controla |
|---|---|---|---|
| `lines` | string[] | 2 renglones | texto; sube palabra por palabra |
| `position` | `{x,y}` | `{210,1090}` | esquina superior izquierda de la pastilla |
| `height` / `radius` | px | `230` / `52` | alto y redondeo; el ancho sale del texto |
| `tone` | `"dark" \| "light"` | `dark` | velo oscuro (texto blanco legible sobre fondo claro) o claro |
| `veil` | 0–1 | `0.22` | opacidad del velo |
| `blur` | px | `9` | desenfoque del fondo |
| `saturate` | número | `1.7` | saturación del fondo a través del vidrio |
| `refraction` | px | `80` | cuánto se dobla el fondo en el filo |
| `bezel` | px | `44` | ancho del filo que refracta |
| `tIn` / `tSheen` / `tOut` | s | `0.15` / `1.25` / `3.35` | entrada, brillo, salida |

## SFX sugerido
- `tIn` con `back.out(1.6)` de 0.6 s → *pop* de vidrio en 0.15 + 0.6 × 1/2.6 ≈ 0.38 s.
- `tIn + 0.45` (0.6 s): palomita → *tick* corto (0.3 s).
- `tSheen` (1.25 s): brillo → *shimmer* suave de 0.9 s, bajo.
- `tOut` (3.35 s): salida → *whoosh* corto de 0.4 s.

## Trampas
- **`backdrop-filter: url()` sólo existe en Chromium.** El render de HyperFrames es Chrome, así que sale; un preview en Safari se ve sin refracción.
- El mapa de desplazamiento se genera con el tamaño REAL de la pastilla: si cambias texto o fuente, `fitFilter()` lo recalcula cuando cargan las fuentes. No fijes el ancho a mano.
- Sin `tone: "dark"` el texto blanco desaparece sobre paredes o sillones claros (pasó en el primer intento).
- La refracción fuerte (`refraction` > 120) deforma caras: en un plano de persona, mantenerla por debajo.
