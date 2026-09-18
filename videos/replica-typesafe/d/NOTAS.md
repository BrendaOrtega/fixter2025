# Réplica D — bloques del registry de HyperFrames

Búsquedas hechas con `npx hyperframes catalog --query` (tier "words"): lower third, typewriter/terminal, callout/leader line, pixel/mosaic transition, corner brackets, window frame.

## Del registry (instalados con `hyperframes add`)
- `typewriter` (component): el patrón `max-width: calc(--hf-type-progress * 100%)` + `ease: steps(n)` mueve TODAS las líneas (nombre, rol, CO-CREATED, ChatGPT, RLHF y el texto del diagrama). Se tocó el CSS: fuente 15 px IBM Plex Mono en vez de 42 px negrita, caret bloque rosa `#e8679a` de 9×15.
- `grid-pixelate-wipe` (component): la cortinilla. Su 16×9 sobre 1280×720 da celdas de 80 px, justo las de la referencia. Se tocó: `stagger from:"random"` en vez de center, y color por celda (blanco/grises con LCG determinista) en vez de un solo `--grid-color`.
- `telemetry-hud` (component): sólo se rescató la receta de brackets (path `M46 3 L12 3 Q3 3 3 12 L3 46` dibujado con `stroke-dashoffset` como atributo). El bloque completo trae readouts y un stage propio; no sirve entero.

## Instalados y descartados
- `terminal-simulator`: chrome oscuro redondeado con sombra; nada que ver con una ventana de 1 px sin relleno.
- `lt-color-block` (block lower-third): bloque de color sólido; ningún `lt-*` es una ventana retro transparente.

## Escrito a mano (GSAP)
- La ventana en sí (barra de título con glifo hexagonal SVG, `×`, cuerpo que crece en altura por línea).
- La leader line (`<line>` animando x2/y2) y el bracket final.
- La escena B: retícula por `linear-gradient`, pill rosa con sombra desplazada, conector en L en SVG.

## Se acerca / no se acerca
- Se acerca: tiempos del brief al cuarto de segundo, tamaño de celda de la cortinilla, tipografía mono y caret rosa, diagrama final.
- No se acerca: la barra de título de la referencia escribe con scramble (letras aleatorias), aquí es typewriter puro; la cortinilla de la referencia parece tener celdas que persisten unos frames y las mías escalan de 0→1 (con `duration:0.05` casi es pop, pero no idéntico); la leader line en la referencia va sesgada y más larga.
- Balance: ~40 % del look sale de caja (texto tipeado + cortinilla + brackets); el 60 % restante (la ventana, la leader line, el diagrama) es diseño específico que ningún bloque cubre.

Render: `d/out.mp4` — 1280×720, 30 fps, 7.5 s, `start_time=0`, `blackdetect` limpio.
