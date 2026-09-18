# Molde para una receta de motion-lab

Cada receta vive en `motion-lab/<nombre>/` con exactamente estos archivos:

## `recipe.html`
Composición HyperFrames autocontenida, 1280×720, 30 fps. Estructura obligatoria:
```html
<div id="root" data-composition-id="main" data-start="0" data-width="1280" data-height="720" data-duration="{{DUR}}">
  ...
</div>
<script>
  // Parámetros: TODO lo que cambia entre usos vive aquí (textos, colores, tiempos, N, semilla)
  const PARAMS = {
    palette: "fixtergeek",         // "fixtergeek" | "easybits"
    ...
  };
  const PALETTES = {
    fixtergeek: { bg: "#0E1317", ink: "#F2F5F4", accent: "#85DDCB", accent2: "#8DCF6E", muted: "#7C8A8E" },
    easybits:   { bg: "#0b0b0f", ink: "#ffffff", accent: "#7c3aed", accent2: "#fbbf24", muted: "#8a8a99" },
  };
  // se aplican como variables CSS --bg --ink --accent --accent2 --muted en #root
  ...
  const tl = gsap.timeline({ paused: true });
  ...
  window.__timelines["main"] = tl;
</script>
```
Reglas:
- GSAP 3 desde `https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js`; fuentes Inter / Geist Mono de Google Fonts.
- Determinista: nada de `requestAnimationFrame`, `Math.random`, `Date`, CSS con reloj propio. Azar = PRNG mulberry32 con `PARAMS.seed`.
- Fotograma 0 completo (nunca vacío ni negro). Fondo = `--bg` de la paleta, nunca `#000`.
- Sin marca de TypeSafe ni texto de su video: textos de ejemplo de la casa (FixterGeek, EasyBits, Ghosty, Formmy, taller de sistemas agénticos…).
- Identificadores en inglés, comentarios en español. Sin gradientes, blur ni glow (caricatura plana).
- Dentro de `<svg>`: `svgOrigin`, nunca `transformOrigin`.
- Typewriter: revelar por `display`, no por `width:auto` (mide 0 si la fuente no cargó).

## `preview.html`
Copia de `recipe.html` con `PARAMS` de ejemplo en paleta FixterGeek, 2–5 s. Se renderiza a `preview.mp4`
(`npx hyperframes render . -o preview.mp4` desde la carpeta, con `preview.html` como composición — si el CLI toma
`index.html`, renderiza con `npx hyperframes render preview.html -o preview.mp4`) y `preview.png` = un cuadro
representativo (no el 0). Verificar sobre `preview.mp4`: `ffprobe -show_entries stream=start_time` = 0,
`blackdetect` sin hallazgos.

## `SKILL.md`
```md
---
name: <nombre>
description: |
  Una o dos frases: qué hace y cuándo se usa.
triggers:
  - "frase en español con la que alguien lo pediría"
  - "otra"
origin: réplica TypeSafe (videos/replica-typesafe/<origen>), 17 sep 2026
---

# <nombre>

Una línea de qué se ve.

## Cuándo usarla
## Cuándo NO (contención)
## Cómo aplicarla
1. Copiar `recipe.html`, editar `PARAMS`.
2. ...
## Parámetros
| clave | tipo | default | qué controla |
## SFX sugerido
Qué sonido en cada movimiento y en qué instante (con `back.out(s)` el golpe va en 1/(s+1) del tween).
## Trampas
Lo que costó al replicarla.
```
