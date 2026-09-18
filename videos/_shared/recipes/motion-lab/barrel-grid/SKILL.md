---
name: barrel-grid
description: |
  Malla n×m de celdas redondeadas con distorsión de barril (lente) precalculada, dentro de un panel tintado,
  que se llena una por una con contador n/N (modo secuencial) o de golpe (modo paralelo). Para contrastar
  ejecución en serie vs en paralelo, progreso de tareas o "N sandboxes listas".
triggers:
  - "malla que se va llenando con contador"
  - "cuadrícula de tareas secuencial vs paralelo"
  - "grid con efecto lente"
origin: réplica TypeSafe (videos/replica-typesafe/scenes/08-grid-bulge + la malla de 09-parallel-iso), 17 sep 2026
---

# barrel-grid

Panel a la derecha con 36 celdas abultadas como lente; titular por palabras a la izquierda; una etiqueta mono
se escribe y una línea guía se dibuja hasta el panel; las celdas se encienden en menta con pop y el contador
sube "17/36 LISTAS".

## Cuándo usarla
- Explicar secuencial vs paralelo: renderizar dos veces (`mode: "sequential"` y `"parallel"`) y encadenarlas.
- Progreso de un lote (tests, sandboxes, correos) donde el número importa tanto como la malla.

## Cuándo NO (contención)
- Más de 10×10 celdas: se vuelven puntos y el barril deja de leerse; usar `dot-grid` de motion-anything.
- Si no hay nada que contar: la malla sola sin contador es decorativa; usar `stagger-list`.

## Cómo aplicarla
1. Copiar `recipe.html`, editar `PARAMS` (`rows`, `cols`, `mode`, `headline`, `label`, `counterWord`).
2. `bulge` entre 0.08 y 0.18; con 0 queda malla plana. `cell` y `pitch` escalan la malla: para 8×8 usar `cell: 48, pitch: 58`.
3. Ajustar `timings.words` a la cadencia de la voz si hay narración.
4. Renderizar: `npx hyperframes render . -c preview.html -o preview.mp4`.

## Parámetros
| clave | tipo | default | qué controla |
|---|---|---|---|
| palette | "fixtergeek" \| "easybits" | fixtergeek | colores (incluye `panel` y `empty` propios) |
| rows, cols | int | 6, 6 | tamaño de la malla |
| mode | "sequential" \| "parallel" | sequential | una por una con contador, o todas en 0.35 s |
| bulge | 0–0.2 | 0.12 | fuerza del barril (posición y tamaño por celda) |
| cell, pitch | px | 62, 76 | lado máximo y separación al centro |
| seed | int | 7 | orden aleatorio en modo parallel |
| headline | string[] | ["Cada","tarea","en","su","sandbox"] | titular por palabras |
| accentWord | int | 4 | palabra en color de acento (-1 = ninguna) |
| kicker | string | "TALLER · SISTEMAS AGÉNTICOS" | renglón mono superior |
| label | string | "Ejecución secuencial" | etiqueta mono con línea guía |
| counterWord | string | "LISTAS" | palabra del contador |
| timings.panel | s | 0.2 | entrada del panel y contador |
| timings.words | s[] | [0.3,…,0.8] | pop de cada palabra |
| timings.label | s | 0.9 | etiqueta + línea guía |
| timings.fill / fillDur | s | 1.3 / 2.6 | arranque y duración del llenado |
| timings.total | s | 5 | duración |

## SFX sugerido
- Cada palabra del titular: pop corto; con `back.out(2)` el golpe cae a 1/3 del tween (0.1 s tras `words[i]`).
- `label + 0.2 … + 0.7`: trazo/pluma mientras se dibuja la guía; click al llegar el punto (`label + 0.73`).
- Secuencial: tick por celda (36 ticks a `fillDur/N` s), variar dos o tres muestras para no repetir el mismo seguido.
- Paralelo: un solo "crac" en `fill` y un sello en `fill + 0.35` cuando el contador salta a N.

## Trampas
- `gsap.set` fuera de la timeline no sobrevive al seek del render: la línea guía salía dibujada en el cuadro 0.
  Todo estado inicial va como `tl.set(…, 0)`.
- `strokeDasharray` en una sola cifra deja un guion al inicio de la ruta; usar `"L L"`.
- Los `tl.call` del contador no se revierten solos al hacer seek atrás; hay un `call` en t=0 que lo pone en 0.
- El titular está visible desde el cuadro 0 (escala 0.7, opacidad 0.6) y lo que se anima es el pop; si se arranca
  con `autoAlpha: 0` el cuadro 0 queda sin titular.
- `#0E1317` cuenta como negro para `blackdetect`: el panel tintado (`--panel`) y las celdas vacías (`--empty`) son
  lo que mantiene el cuadro por encima del umbral, no quitarlos.
