---
name: node-tree
description: |
  Nodo central grande con cajas alrededor conectadas por cables ortogonales que se dibujan (dashoffset)
  y textos que se teclean encima de una versión fantasma. Para explicar "X y sus piezas".
triggers:
  - "un nodo al centro con cajas conectadas por cables"
  - "diagrama de piezas que se van dibujando"
  - "las cajas se conectan con líneas en L"
origin: réplica TypeSafe (videos/replica-typesafe/scenes/06-new-list-rlcd), 17 sep 2026
---

# node-tree

Un título al centro; cuatro (o N) cajas mono alrededor, unidas por cables en L con esquinas redondeadas.
En el cuadro 0 todo está en gris (pista punteada + cajas fantasma); el cable menta se dibuja encima, la caja
pasa a tinta con un rebote chico y el texto se teclea letra por letra.

## Cuándo usarla
- Presentar un sistema y sus componentes (Ghosty → ACP / Sandbox / Memoria / Tools).
- Un acrónimo y qué significa cada letra (cada caja una palabra).

## Cuándo NO (contención)
- Más de 6 cajas: se encima; usar `hourglass-lines` para "muchas entradas".
- Jerarquías de más de un nivel: es estrella, no árbol profundo.

## Cómo aplicarla
1. Copiar `recipe.html`, editar `PARAMS` (`center`, `nodes`, `palette`).
2. Cada nodo: `side` (left/right/top/bottom) y `offset` perpendicular; con `offset: 0` el cable es recto.
3. Ajustar `timings.stagger` al ritmo de la voz (una caja por palabra dicha).

## Parámetros
| clave | tipo | default | qué controla |
|---|---|---|---|
| palette | string | "fixtergeek" | paleta de la casa |
| center | string | "Ghosty" | texto del nodo central |
| centerY | number | 360 | altura del centro |
| nodes[] | {label, side, offset} | 4 nodos | cajas alrededor |
| gap | number | 150 | distancia centro→caja |
| timings.start | s | 0.2 | primera caja |
| timings.stagger | s | 0.35 | separación entre cajas |
| timings.draw | s | 0.3 | trazo del cable |
| timings.type | s | 0.45 | tecleo del texto |
| timings.centerRise | s | 0.5 | subida del central |
| duration | s | 3.5 | duración total |

## SFX sugerido
- Cable: whoosh/zip corto que dura `timings.draw`, arranca en `start + i*stagger`.
- Caja: pop en `start + i*stagger + draw` (+0.075 s por el `back.out(3)`, 1/(3+1) del tween de 0.3 s).
- Tecleo: clicks de teclado a `type / label.length` por letra.

## Trampas
- `blackdetect` marcaba 0–1.4 s cuando el cuadro 0 sólo traía el título: el fondo `#0E1317` cuenta como negro.
  Por eso las cajas, las pistas punteadas y una retícula de puntos están desde el cuadro 0.
- Los anchos no se miden (la fuente puede no haber cargado al render): `CHAR_W` y `NODE_CHAR` son aproximaciones.
- El tecleo va por `display: none → inline`, no por `width: auto`.
