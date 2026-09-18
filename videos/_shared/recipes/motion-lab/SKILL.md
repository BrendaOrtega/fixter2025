---
name: motion-lab
description: Quince mecánicas de motion graphics medidas cuadro a cuadro sobre un video real y reescritas como recetas HyperFrames + GSAP parametrizadas (PARAMS), deterministas y en dos paletas — ventana retro con typewriter, lista inclinada, cortinilla que muestrea la escena, partículas que colapsan a una letra, malla de barril, cubos isométricos, barras/tabla/scatter animados, árbol de nodos, reloj de arena de curvas, rayos con contador, karaoke por palabra, cajas apiladas y textura dither. Úsala ANTES de animar a mano un lower-third, una lista, un chart o una cortinilla en un reel o short; copia recipe.html y edita PARAMS. Galería con previews en https://blissito.github.io/ghosty-reel/motion-lab/
---

# motion-lab

Ver `README.md` (tabla de recetas, reglas y trampas) y `MOLDE.md` (contrato de cada receta).

## Cómo usar una receta
1. `ls` las carpetas y lee el `SKILL.md` de la que se parezca a lo que necesitas (cuándo sí, cuándo no, parámetros, SFX).
2. Copia `recipe.html` a tu composición y edita sólo el bloque `PARAMS` (textos, colores, tiempos, N, semilla, `palette`).
3. Mantén el `data-duration` del HTML igual a la duración que calcule tu timeline.
4. Renderiza con `npx hyperframes render . -o out.mp4` y verifica sobre el archivo: `start_time` 0, `blackdetect` sin hallazgos, cuadro 0 completo.
5. Monta los SFX que sugiere el `SKILL.md` con ffmpeg fuera del render.
