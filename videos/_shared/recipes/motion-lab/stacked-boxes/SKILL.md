---
name: stacked-boxes
description: |
  Cajas de texto con borde que entran con `back.out` y se apilan escalonadas a los lados de una línea guía
  vertical, con líneas horizontales que se dibujan bajo cada una y una retícula de cruces de fondo.
  Para frases de tres golpes ("Construimos / prod / no demos") y lemas escalonados.
triggers:
  - "cajas apiladas que entran con rebote"
  - "frase en tres cajas escalonadas con líneas guía"
  - "lema en cajas con retícula de cruces"
  - "texto en cajas que salen de una línea vertical"
origin: réplica TypeSafe (videos/replica-typesafe/scenes/14-prod-not-god), 17 sep 2026
---

# stacked-boxes

Una guía vertical de acento entra con rebote; luego cada caja sale de detrás de la guía (o del borde de la pantalla) y se apila en zigzag mientras una línea fina se dibuja bajo su pie.

## Cuándo usarla
- Lemas de 2–4 golpes cortos donde cada palabra pesa (una caja por golpe).
- Cierres de escena que necesitan estructura de "layout técnico": retícula, guías, esquinas.
- Cuando la voz dice los golpes con pausa: alinear `timings.gap` a la cadencia de la voz.

## Cuándo NO (contención)
- Más de 4 cajas o textos de más de dos palabras: se vuelve tabla, no lema. Usar `stagger-list` de motion-anything.
- Como apertura de video: el fotograma 0 es sólo retícula + guía (las cajas están fuera). Ponerla después de otra escena o adelantar `timings.start` a 0 y aceptar que el frame 0 no trae las cajas.
- Fondos con foto: la retícula de cruces se pierde; apagar `grid`.

## Cómo aplicarla
1. Copiar `recipe.html`, editar `PARAMS.boxes` (texto, `x`, `y`, `height`, `fontSize`, `from`).
2. Decidir de qué lado de `guides.vertical` vive cada caja: se calcula solo por `x` (`x < vertical` = izquierda). Una caja no debe cruzar la guía: su ancho cabe en su lado.
3. `from: "line"` sale de detrás de la guía; `from: "edge"` entra desde el borde de la pantalla.
4. Ajustar `data-duration` (root y clip) ≥ `start + (n−1)·gap + duration + 0.5`.
5. Renderizar: `npx hyperframes render . -c recipe.html -o out.mp4`.

## Parámetros
| clave | tipo | default | qué controla |
|---|---|---|---|
| palette | "fixtergeek" \| "easybits" | fixtergeek | variables `--bg --ink --accent --accent2 --muted` |
| boxes[] | {text, x, y, height, fontSize, from} | 3 cajas | texto y caja; `from` = "line" \| "edge" |
| guides.vertical | px | 805 | x de la guía vertical (de acento) |
| guides.horizontal | bool | true | línea fina al pie de cada caja, dibujada desde la guía |
| guides.corners | bool | true | esquinas pequeñas de acento por fuera, del lado exterior |
| ease | string | "back.out(1.3)" | ease de la guía y de cada caja |
| timings | {start, gap, duration, hlineDuration} | 0.2 / 0.55 / 0.65 / 0.5 | inicio, separación entre cajas, duración de entrada, dibujo de la horizontal |
| grid | bool | true | retícula de cruces (`--muted` al 35 %) |

## SFX sugerido
- Guía vertical: `whoosh` corto en `start`; con `back.out(1.3)` el golpe cae en `start + duration/2.3` ≈ +0.28 s.
- Cada caja: `thud` o `clack` distinto por caja en `t0 + duration/2.3`; nunca el mismo dos veces seguidas.
- Línea horizontal: `tick` fino cuando termina de dibujarse (`t0 + 0.6·duration + hlineDuration`).

## Trampas
- No medir `offsetWidth` para calcular el desplazamiento inicial: el timeline se arma antes de que cargue Inter y el ancho cambia después, dejando un pedazo de caja asomado en el fotograma 0. Recorrido fijo de 1280 px.
- Las ventanas recortadas (`.win`) terminan justo en la guía: si una caja es más ancha que su lado, se corta en la línea. Ajustar `x` o `fontSize`.
- `transformOrigin` de la horizontal va en % relativo al ancho total (`vertical/1280`), para que se dibuje desde la guía.
