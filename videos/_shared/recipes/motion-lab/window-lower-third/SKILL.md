---
name: window-lower-third
description: |
  Lower-third en forma de ventana retro (barra de título + cuerpo monoespaciado) que flota sobre la escena:
  el nombre entra con tracking que se cierra, el cuerpo crece renglón a renglón con typewriter y cursor,
  brackets en las esquinas y una línea guía que se dibuja. Para presentar a una persona o etiquetar algo en pantalla.
triggers:
  - "ponle un lower third de ventana con el nombre"
  - "presenta al invitado con una ventanita retro que escribe"
  - "etiqueta tipo terminal que crece renglón por renglón"
origin: réplica TypeSafe (videos/replica-typesafe/final), 17 sep 2026
---

# window-lower-third

Una ventana con borde de 2 px y barra de título que se estira, el nombre cae letra por letra con tracking abierto que se cierra, el cuerpo se abre con rebote y escribe con cursor; luego crece un renglón a la vez mientras toda la ventana deriva lentamente.

## Cuándo usarla
- Presentar a quien habla (nombre + cargo + dos o tres créditos) sobre un plano o una escena dibujada.
- Etiquetar un objeto de la escena: la línea guía apunta desde la esquina de la ventana hacia él.
- Piezas con piel "terminal / retro": Geist Mono, bordes duros, sin relleno.

## Cuándo NO (contención)
- Más de 4 renglones: la ventana se vuelve un párrafo y la deriva la saca de cuadro.
- Sobre fondos claros: los bordes son `--ink`; en claro hay que invertir la paleta, no bajar opacidad.
- Si el corte dura menos de 3 s: el typewriter del primer renglón necesita ~1 s y la línea guía otro medio.

## Cómo aplicarla
1. Copiar `recipe.html`, editar `PARAMS` (`title`, `lines`, `position`, `drift`, `palette`).
2. Sustituir el `<svg id="bg">` por el plano o la escena real (mantener `class="clip"` y `data-track-index="0"`).
3. Ajustar `data-duration` estático del `#root` y de los dos clips al valor que imprime `DUR` (el CLI lee el atributo, no el script).
4. `npx hyperframes render . -c recipe.html -o out.mp4`.

## Parámetros
| clave | tipo | default | qué controla |
|---|---|---|---|
| `palette` | `"fixtergeek" \| "easybits"` | `fixtergeek` | variables `--bg --ink --accent --accent2 --muted` |
| `title` | string | `"HÉCTOR BLISS"` | texto de la barra; entra con tracking que se cierra |
| `lines` | string[] | 4 renglones | cuerpo; el primero se escribe lento con cursor, el resto rápido |
| `position` | `{x,y,width}` | `{80,285,425}` | dónde nace la ventana y su ancho |
| `drift` | `{x,y,scale,duration}` | `{40,-85,1.06,4.5}` | deriva lenta de toda la ventana |
| `firstLineTyping` | s | `1.1` | duración del typewriter del primer renglón |
| `lineEvery` | s | `0.6` | separación entre renglones 2..n |
| `leader` | `{x2,y2}` | `{542,330}` | destino de la línea guía (relativo a la ventana) |
| `cameraBreath` | número | `1.018` | escala final del fondo (respiración de cámara) |

## SFX sugerido
- 0.25 s: barra se estira → *whoosh corto* (0.22 s).
- 0.32–0.9 s: nombre cae letra por letra → *tick* suave por stagger o un solo *slide*.
- `tBody` (0.75 s): cuerpo se abre con `back.out(1.4)` → *pop* en 0.75 + 0.28 × 1/2.4 ≈ 0.87 s.
- Typewriter: *teclas* a la misma cadencia (`firstLineTyping / caracteres`).
- Línea guía: *trazo* de 0.55 s; *clic* al aparecer la marca final.
- Cada renglón nuevo: *pop* corto en `tLine(i) − 0.08 + 0.22 × 1/2.4`.

## Trampas
- Typewriter por `display`, no por `width:auto`: si Geist Mono no cargó, `auto` mide 0 y el renglón sale vacío.
- `fromTo` con `immediateRender` pinta el estado *from* en el fotograma 0: la barra salía aplastada (`scaleX 0.3`) en la miniatura. Se oculta con `autoAlpha 0` y se anima con `to`.
- `data-duration` estático manda: el script lo recalcula, pero el CLI ya fijó los cuadros; si no coinciden salen fotogramas negros al final.
- Los brackets y la línea guía viven dentro de `#win` para que viajen con la deriva; si se sacan, se desalinean.
