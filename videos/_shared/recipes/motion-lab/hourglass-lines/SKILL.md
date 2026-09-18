---
name: hourglass-lines
description: |
  Decenas de curvas bezier entran por la izquierda, convergen en un glifo central y se abren a la derecha,
  con cuadritos sobre las curvas, pulsos que las recorren y dos etiquetas (arriba/abajo) en embudo.
  Para "muchas entradas → un punto → muchas salidas".
triggers:
  - "muchas líneas que convergen en un punto y se abren del otro lado"
  - "reloj de arena de líneas"
  - "embudo: posibilidades arriba, aplicaciones abajo"
origin: réplica TypeSafe (videos/replica-typesafe/scenes/11-hourglass), 17 sep 2026
---

# hourglass-lines

Un reloj de arena hecho de líneas: `count` curvas por lado, un cuadro central con un glifo grande y dos
etiquetas con embudo. En el cuadro 0 ya están las pistas grises, los cuadritos y las etiquetas; lo que se
anima es el trazo en color por encima, el rebote del centro y los pulsos blancos.

## Cuándo usarla
- "Todo pasa por aquí": un protocolo, un runtime, un modelo que concentra entradas y reparte salidas.
- Cierre de una explicación de arquitectura: el glifo es la marca (λ, ◆, "ACP").

## Cuándo NO (contención)
- Para pocas piezas con nombre: usar `node-tree`.
- Si el glifo es una palabra larga no cabe en 120 px: máximo 3 caracteres o bajar `font-size` en `.glyph`.

## Cómo aplicarla
1. Copiar `recipe.html`, editar `PARAMS` (`labels`, `glyph`, `count`, `seed`).
2. Cambiar `seed` hasta que el enredo se vea bien (no todas las semillas reparten parejo).
3. `timings.pulseAt` va después de que terminen de dibujarse las curvas (`0.1 + draw + count*2*drawStagger`).

## Parámetros
| clave | tipo | default | qué controla |
|---|---|---|---|
| palette | string | "fixtergeek" | paleta de la casa |
| count | number | 16 | curvas por lado |
| seed | number | 11 | semilla del PRNG |
| labels.top / .bottom | string | "Posibilidades" / "Aplicaciones" | etiquetas |
| glyph | string | "λ" | carácter central |
| timings.centerIn | s | 0.45 | rebote del centro y etiquetas |
| timings.draw | s | 0.9 | trazo de cada curva |
| timings.drawStagger | s | 0.02 | separación entre curvas |
| timings.pulseAt | s | 1.3 | inicio de los pulsos |
| timings.pulseDur | s | 0.9 | duración de cada pulso |
| duration | s | 3.5 | duración total |

## SFX sugerido
- Centro: pop en `centerIn / 2.4` (`back.out(1.4)` → 1/(1.4+1)) ≈ 0.19 s.
- Curvas: un solo whoosh largo que dure `draw + count*2*drawStagger` desde 0.1 s.
- Pulsos: tick suave por grupo (7 grupos separados 0.15 s desde `pulseAt`), no uno por pulso.

## Trampas
- Los pulsos con `dasharray "60 L"` asoman un trozo blanco en la orilla en el cuadro 0; van con `opacity 0`
  hasta su `at` y se apagan al terminar.
- `getPointAtLength` para los cuadritos exige que el `<path>` ya esté en el DOM (por eso primero se agrega).
- Escalas en `<g>` con `svgOrigin: "640 354"`, nunca `transformOrigin`; los cuadritos (rects sueltos) sí usan
  `transformOrigin: "50% 50%"` porque cada uno gira sobre sí mismo.
