---
name: word-karaoke-panel
description: |
  Panel con borde, etiqueta mono que se teclea y un párrafo cuyas palabras se encienden de --muted a --ink
  al ritmo de una lista de tiempos (voz transcrita) o de un ritmo fijo. Para avisos, disclaimers y lecturas guiadas.
triggers:
  - "un aviso que se va leyendo palabra por palabra"
  - "disclaimer con las palabras que se encienden"
  - "karaoke de un párrafo dentro de un panel"
  - "que el texto se ilumine conforme lo dice la voz"
origin: réplica TypeSafe (videos/replica-typesafe/scenes/15-disclaimer), 17 sep 2026
---

# word-karaoke-panel

Panel tintado con borde de tinta, celda de logo, etiqueta mono sobre placa de acento que se teclea con caret, y un párrafo gris que se enciende palabra por palabra.

## Cuándo usarla
- Avisos, disclaimers, "letra chica" leída en voz alta.
- Cualquier párrafo largo que acompaña una narración: cada palabra se enciende cuando la voz la dice (`wordTimes` desde `npx hyperframes transcribe ... --json`).
- Lecturas sin voz, con `wordsPerSecond` fijo (3–4 para lectura cómoda).

## Cuándo NO (contención)
- Titulares de una línea: usar `kinetic-headline` de motion-anything; aquí el valor es el párrafo.
- Subtítulos de un clip hablado: el karaoke de subtítulos va en una sola línea a 72 px (regla de la casa), no en panel.
- Si el párrafo pasa de ~90 palabras, partirlo en dos escenas.

## Cómo aplicarla
1. Copiar `recipe.html`, editar `PARAMS` (`label`, `text`, `palette`).
2. Con voz: transcribir el clip y pasar `wordTimes` (un instante por palabra, mismo número de palabras que `text`). Sin voz: `wordsPerSecond` + `firstWordAt`.
3. Ajustar `data-duration` en el `#root` y en el `.clip` = última palabra + `lightDuration` + `tail`; la consola avisa el valor exacto si no coincide (el render lee el atributo estático, no el DOM).
4. Renderizar: `npx hyperframes render . -c recipe.html -o out.mp4`.

## Parámetros
| clave | tipo | default | qué controla |
|---|---|---|---|
| palette | "fixtergeek" \| "easybits" | fixtergeek | variables `--bg --ink --accent --accent2 --muted` |
| label | string | "AVISO" | etiqueta mono que se teclea |
| text | string | … | párrafo; se parte por espacios |
| wordTimes | number[] \| null | null | instante de encendido por palabra; manda sobre el ritmo fijo |
| wordsPerSecond | number | 4 | ritmo fijo si `wordTimes` es null |
| firstWordAt | s | 0.7 | primera palabra en ritmo fijo |
| labelStart / charStep | s | 0.05 / 0.045 | inicio y cadencia del tecleo |
| lightDuration | s | 0.12 | fundido de gris a tinta por palabra |
| tail | s | 1.0 | aire al final |
| panel | {left, top, width, height, tint} | 40/46/1200/646/0.12 | caja del panel; `tint` = % de acento mezclado sobre `--bg` |
| fontSize / lineHeight / letterSpacing | px | 34 / 52 / −1.1 | tipografía del párrafo |

## SFX sugerido
- Tecleo: un `tick` corto por letra en `labelStart + i·charStep`; el último con `pop` cuando el caret se apaga.
- Palabras: sin SFX por palabra (satura). Un `whoosh` suave al arrancar la primera (`firstWordAt`) basta.

## Trampas
- El renderizador toma `data-duration` del HTML estático; cambiarlo desde JS no sirve. Por eso el script sólo avisa.
- La placa de la etiqueta tiene padding aunque esté vacía: `.txt:not(:has(.on)) { padding: 0 }` evita el cuadrito de acento en el fotograma 0.
- Revelar letras por `display`, nunca por `width: auto` (mide 0 si Geist Mono no cargó).
- `wordTimes` debe tener exactamente tantos elementos como palabras; si falta uno, esa palabra queda apagada.
