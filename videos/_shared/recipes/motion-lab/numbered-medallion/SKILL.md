---
name: numbered-medallion
description: |
  Pasos numerados: un medallón de estrella con el número cae girando con rebote sobre la escena actual
  y desde su centro se abre en iris (círculo que crece, con aro de tinta) la escena del siguiente paso.
  Exporta los instantes de SFX (`window.__sfxCues`).
triggers:
  - "paso uno, paso dos, paso tres con medallón"
  - "instructivo numerado que cambia de escena"
  - "transición de iris desde un número"
  - "tutorial en tres pasos estilo comercial de los 50"
origin: mecánica del medallón + iris de midcentury-toon (lemomo-ai/lemo-opuscar, MIT; commit b5e8ef9), reescrita en SVG + GSAP sin copiar código ni arte, 21 oct 2026
---

# numbered-medallion

Tres tarjetas de color, una por paso. El número viejo se encoge, el nuevo cae girando y la tarjeta siguiente
abre en círculo desde el medallón.

## Cuándo usarla
- Instructivos de 2–4 pasos (instalar → pedir → renderizar), onboarding, «cómo funciona».
- Cuando cada paso cabe en un título corto + una línea + un objeto concreto.

## Cuándo NO (contención)
- Más de 4 pasos: el iris repetido cansa; usar `stacked-boxes` o `tilt-list`.
- Pasos que necesitan párrafo: el título es de 2–4 palabras.
- Dos iris seguidos sin `rest` ≥ 0.8 s: no da tiempo de leer (texto ÷ 15 + 1.5 s).

## Cómo aplicarla
1. Copiar `recipe.html` y editar `PARAMS.steps` (`title`, `sub`, `icon`, `fill`). `fill` es una clave de la paleta; dos pasos seguidos con distinto `fill`, o el iris no se ve.
2. Iconos disponibles: `terminal`, `clapper`, `film`. Uno nuevo se agrega a `ICONS` dibujado en una caja de ~300×200 centrada en 0,0 (contorno 8 px, sombra dura corrida 10 px).
3. `data-duration` (root y clip) ≥ `start + 0.56 + hold + (n−1)·(swapOut + 0.7·drop + iris + rest)`.
4. `npx hyperframes render . -c recipe.html -o out.mp4`.

## Parámetros
| clave | tipo | default | qué controla |
|---|---|---|---|
| palette | "fixtergeek" \| "easybits" | fixtergeek | variables de color |
| badge | {x, y} | 250, 330 | centro del medallón y origen del iris |
| steps[] | {title, sub, icon, fill} | 3 pasos | contenido de cada tarjeta |
| start | s | 0.25 | pulso del medallón 1 (el cuadro 0 ya trae el paso 1 completo) |
| hold / rest | s | 0.75 / 1.1 | lectura antes del cambio / después del iris |
| swapOut / drop / dropEase | s, s, s | 0.18 / 0.5 / 2.2 | salida del número viejo, caída del nuevo, `back.out(s)` |
| iris | s | 0.7 | apertura del círculo (`power2.in`: arranca lento, termina rápido) |
| star | {points, outer, inner} | 16 / 72 / 60 | estrella del medallón |

## SFX sugerido
- Pulso inicial: `pop` en `start`.
- Número viejo que se va: `swish` corto en `t0`.
- Caída del nuevo: `clack` en `tDrop + drop/(s+1)` (el rebote del `back.out`).
- Iris: `whoosh` que dure lo que el iris (0.7 s), arrancando con él.

## Trampas
- El medallón vive en una capa encima de las escenas: si va dentro de la escena nueva queda recortado por su propio iris (r = 0) y no se ve caer.
- Posición en un `<g transform="translate">` de afuera y animación en el `<g>` de adentro con `svgOrigin: "0 0"`; `gsap.set` con `svgOrigin` sobre el mismo `<g>` reescribe el `translate` a matriz.
- El radio final del iris se calcula a la esquina más lejana de la tarjeta (+20 px); uno fijo deja una esquina sin cubrir.
- La estrella elige un color distinto al de la tarjeta donde cae y al de la que abre; con el mismo color se pierde.
- Texto e ícono comparten renglón: con `sub` largo a 30 px mono el ícono va en `translate(1060 330) scale(0.9)` para no encimarse.
