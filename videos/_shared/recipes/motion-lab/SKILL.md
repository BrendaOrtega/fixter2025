---
name: motion-lab
description: Treinta recetas de motion graphics (la mayoría medidas cuadro a cuadro sobre videos reales) reescritas como recetas HyperFrames + GSAP parametrizadas (PARAMS), deterministas y en dos paletas — ventana retro con typewriter, lista inclinada, cortinilla que muestrea la escena, partículas que colapsan a una letra, malla de barril, cubos isométricos, barras/tabla/scatter animados, árbol de nodos, reloj de arena de curvas, rayos con contador, karaoke por palabra, cajas apiladas, textura dither, pasos numerados, cortinillas, cámara, Ghosty con gestos, escenas al beat medido, estela automática y pantalla real filmada. Úsala ANTES de animar a mano un lower-third, una lista, un chart o una cortinilla en un reel o short; copia recipe.html y edita PARAMS. Galería con previews en https://blissito.github.io/ghosty-reel/motion-lab/
---

# motion-lab

Ver `README.md` (tabla de recetas, reglas y trampas) y `MOLDE.md` (contrato de cada receta).

## Cómo usar una receta
1. `ls` las carpetas y lee el `SKILL.md` de la que se parezca a lo que necesitas (cuándo sí, cuándo no, parámetros, SFX).
2. Copia `recipe.html` a tu composición y edita sólo el bloque `PARAMS` (textos, colores, tiempos, N, semilla, `palette`).
3. Mantén el `data-duration` del HTML igual a la duración que calcule tu timeline.
4. Renderiza con `npx hyperframes render . -o out.mp4` y verifica sobre el archivo: `start_time` 0, `blackdetect` sin hallazgos, cuadro 0 completo.
5. Monta los SFX que sugiere el `SKILL.md` con ffmpeg fuera del render.

Objeto 3D en caricatura plana (three.js toon + contorno + sombra dura): `toon-object/`. Animación a mano en 2D: `on-twos/` (personaje a 12 fps, cámara fluida), `squash-hop/` (salto con squash, sombra que dice la altura y SFX en `__sfxCues`), `smear-dash/` (smear y múltiplos en vez de blur). Ghosty actuando (brinca, parpadea, guiña, mira, contento/orgulloso/apenado, saluda, entra y sale con squash; accesorios como capa): `ghosty-rig/` — nunca lo redibujes. Cámara con parallax por capas, whip-pan, zoom-punch y dolly (dirección de cámara en 2D, sin Blender): `camera-rig/`. Para pegar inicios al beat o a la palabra: `_lib/beat-snap.js` (sección «Ritmo al beat» del README). Escenas que tocan con la música medida (`hyperframes beats`/`audio`, batería por bandas, elegir pista con `score-tracks.mjs`): `beat-scenes/`. Estela automática para entradas rápidas: `echo-smear/`. Demo de producto con la UI real en perspectiva y cámara que sigue lo que se teclea: `filmed-screen/` (con parche). Pasos numerados: `numbered-medallion/`; cortinilla con título que se traba: `chase-lock-wipe/`. Explainers en canvas 2D con rough.js: `blueprint-tree/`, `blueprint-route/`, `sketch-layers/`; pastilla de vidrio: `glass-pill/`.
