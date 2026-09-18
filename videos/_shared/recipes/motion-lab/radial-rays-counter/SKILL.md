---
name: radial-rays-counter
description: |
  Rayos finos que salen del centro y se estiran con stagger aleatorio (semilla) detrás de un número grande
  que cuenta de A a B con sufijo y una etiqueta chica. Para soltar una cifra con impacto.
triggers:
  - "un número que cuenta con rayos saliendo del centro"
  - "cifra grande con efecto de velocidad"
  - "count-up con explosión de líneas"
origin: réplica TypeSafe (videos/replica-typesafe/scenes/12-system-one-rays), 17 sep 2026
---

# radial-rays-counter

Número mono en menta (`from → to`) + sufijo en tinta + etiqueta gris; detrás, `rayCount` rayos desde un
anillo alrededor del texto: los sólidos (menta) se estiran hacia afuera y se apagan, los punteados (verde)
corren y parpadean. Las pistas grises de todos los rayos ya están en el cuadro 0.

## Cuándo usarla
- Dato duro de un short: "240 tools", "31 alumnos", "12x más rápido".
- Remate de una secuencia; el conteo debe terminar cuando la voz dice la cifra.

## Cuándo NO (contención)
- Dos cifras seguidas: reusar la escena, no encimar dos contadores.
- Números con decimales o separadores de miles: el redondeo es a entero; formatear en `onUpdate` si hace falta.

## Cómo aplicarla
1. Copiar `recipe.html`, editar `PARAMS` (`from`, `to`, `suffix`, `label`, `seed`).
2. Alinear `timings.count` con la voz: el número llega a `to` en `0.05 + count` (ease `power2.out`, frena al final).
3. Si el número es largo (4+ dígitos) bajar `font-size` de `#speed` para que los rayos no lo toquen.

## Parámetros
| clave | tipo | default | qué controla |
|---|---|---|---|
| palette | string | "fixtergeek" | paleta de la casa |
| from / to | number | 0 / 240 | rango del conteo |
| suffix | string | " tools" | sufijo pegado al número |
| label | string | "listas en la caja" | texto chico debajo |
| rayCount | number | 160 | cantidad de rayos |
| seed | number | 20260917 | semilla del PRNG |
| timings.count | s | 1.25 | duración del conteo |
| timings.raySpread | s | 0.45 | ventana de arranque de los rayos |
| timings.rayDur | s | 0.6 | duración base de cada rayo (×0.6–1.4) |
| timings.punch | s | 0.6 | escala del número al entrar |
| duration | s | 3 | duración total |

## SFX sugerido
- Rayos: whoosh ascendente que dure `raySpread + rayDur*1.4` desde 0.
- Número: golpe grave en `punch / 3` (`back.out(2)` → 1/(2+1)) = 0.2 s.
- Conteo: tick de contador acelerado durante `count`, apagándose con el ease.

## Trampas
- Con `stroke-linecap: round`, un dash de largo 0 pinta un punto: en el cuadro 0 asomaban 90 puntitos menta.
  Los rayos sólidos van con `butt`.
- El parpadeo es `repeat: 3, yoyo` — finito y seek-safe; nunca `repeat: -1`.
- `Math.round` en `onUpdate`; no se anima `textContent` directo (GSAP lo interpola como string).
