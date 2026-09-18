---
name: tilt-list
description: |
  Lista donde el renglón activo queda horizontal y los demás se inclinan según su distancia a él, como
  un disco que gira; cada paso baja la lista y cambia el color del activo. Para enumerar 3–5 puntos
  de uno en uno mientras la voz los nombra.
triggers:
  - "lista que gira como rueda y el activo queda derecho"
  - "enumera los tres puntos inclinando los que no están activos"
  - "lista de disco con punto que baja"
origin: réplica TypeSafe (videos/replica-typesafe/wheel), 17 sep 2026
---

# tilt-list

Un disco tintado a la izquierda, un punto de acento y renglones grandes en Inter; el activo está horizontal y en `--ink`, los demás inclinados y en `--muted`, y todo rota sobre su extremo izquierdo al pasar al siguiente.

## Cuándo usarla
- Enumerar puntos que se van nombrando uno a uno (problemas, pasos, los tres tipos de memoria).
- Cuando el siguiente punto debe verse venir: la lista muestra vecinos inclinados, no uno solo.

## Cuándo NO (contención)
- Más de 5 renglones: los lejanos se salen del cuadro por arriba y abajo.
- Renglones largos: a 96 px caben ~16 caracteres antes de cortarse por la derecha; bajar `fontSize`.
- Cuando hace falta explicar cada punto: aquí sólo hay títulos.

## Cómo aplicarla
1. Copiar `recipe.html`, editar `PARAMS` (`items`, `stepEvery`, `fontSize`, `palette`).
2. Cuadrar `startAt` y `stepEvery` con el transcript (cada paso cuando la voz nombra el siguiente).
3. Poner el mismo `DUR` en `data-duration` del `#root` y de la `<section>`.
4. `npx hyperframes render . -c recipe.html -o out.mp4`.

## Parámetros
| clave | tipo | default | qué controla |
|---|---|---|---|
| `palette` | `"fixtergeek" \| "easybits"` | `fixtergeek` | colores; `panel` es el tinte del disco (más claro que `bg`, nunca negro) |
| `items` | string[] | 3 renglones | la lista |
| `stepEvery` | s | `1.1` | separación entre pasos |
| `startAt` | s | `1.2` | primer paso |
| `offsets` | tabla `{distancia: [dy, °]}` | ±6°/±12°/±21° | pose de cada renglón según distancia al activo |
| `rise` / `dotRise` | px | `75` / `42` | cuánto baja la lista y el punto por paso |
| `fontSize` | px | `96` | tamaño de los renglones |
| `stepDuration` | s | `0.5` | duración del giro |

## SFX sugerido
- 0–0.7 s (entrada, `power3.out`): *whoosh* de 0.7 s.
- Cada paso (`power3.inOut`, 0.5 s): *tick* de trinquete al arrancar y *clac* suave al terminar; el cambio de color va a 0.4 del giro, sin sonido propio.
- No repetir el mismo tick dos pasos seguidos: alternar dos muestras.

## Trampas
- El disco es un `<circle>` fijo en SVG: rotar un `div` grande deja arista serrada. Va tintado con `panel`, no negro (regla de la casa).
- `transform-origin: -40px 54px` en cada renglón: el pivote está fuera del texto, a la izquierda; si se cambia el `left`, el pivote debe seguir fuera.
- La tabla `offsets` se midió con 3 renglones; con distancia > 3 se extrapola (+140 px, +7° por renglón).
- `data-duration` estático manda sobre el `DUR` del script.
