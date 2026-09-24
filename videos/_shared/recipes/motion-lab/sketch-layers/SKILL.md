---
name: sketch-layers
description: |
  Piel de boceto técnico (papel con grano, sombras rayadas a mano): una página plana se inclina a vista
  axonométrica y se separa en hojas con grosor, guías y etiquetas; un anillo a mano marca lo que se mueve solo.
triggers:
  - "vista explotada de capas"
  - "separar una pantalla en capas estilo dibujo técnico"
  - "cómo compone el navegador las capas"
origin: réplica de "how browsers work" hecho con Claude Opus 5.5 (cute.mp4, escena "layers"), 24 sep 2026
---

# sketch-layers

Una página con header, texto, imagen y botón. Se inclina con **una sola matriz afín** por hoja (`ctx.setTransform`), sin perspectiva, así que los bordes quedan paralelos como en la referencia. Luego se separa en 4 hojas translúcidas con grosor, guías punteadas entre esquinas, etiquetas con línea guía y una llave dorada. Ghosty cae de un salto con estela punteada y un aplaste amortiguado. Un anillo rosa trazado a mano rodea el botón, que se mueve solo en su hoja.

## Cuándo usarla
- Explicar composición por capas: navegador, apps móviles, Figma, capas de una arquitectura.
- Cualquier «esto parece una cosa pero son varias encimadas».

## Cuándo NO (contención)
- Más de 5 hojas: la pila se sale del cuadro.
- Marcas con estilo plano obligatorio (FixterGeek, Ghosty Studio): esta piel lleva grano y rayado a propósito.

## Cómo aplicarla
1. Copiar `recipe.html` y `assets/ghosty.png`, y editar `PARAMS` (`labels` de abajo hacia arriba y `ringLabel`).
2. El contenido de cada hoja son funciones `content*` en coordenadas locales centradas (W×H = 460×300).
3. `s16.sep`/`sepStep` y `label`/`labelStep` marcan el ritmo; ponerlos en la rejilla de la partitura.

## Parámetros
| clave | tipo | default | qué controla |
|---|---|---|---|
| bpm / duration | number / s | 120 / 7 | tempo y duración |
| title / stage | string | "layers" / "6 · composite" | HUD |
| character | ruta | assets/ghosty.png | asset oficial, sólo escala y giro |
| labels | string[4] | page … animated button | etiquetas de abajo hacia arriba |
| ringLabel | string | moves without repaint | texto del anillo |
| s16 | objeto | tilt 4 … slideBack 50 | tiempos de cada momento |

## SFX sugerido
- Inclinación: barrido suave que dura el giro (0.75 s).
- Cada hoja que se separa: campana, subiendo de tono de abajo hacia arriba.
- Etiquetas: pluck por etiqueta, al ritmo de su tecleo.
- Salto: «boing» ascendente; al caer, bombo suave en `land`. Con aplaste amortiguado no hay golpe extra.
- Anillo: campana larga; el botón que sale y vuelve, un pluck cada vez.

## Trampas
- rough.js necesita `seed` en cada figura o las líneas «hierven» entre cuadros.
- El grano se calcula una vez en un canvas aparte y se aplica en `multiply` en cada cuadro. Si se calculara por cuadro, el render tardaría demasiado.
- El personaje de la referencia (robot rojo) es de ellos: aquí va Ghosty oficial, sin repintar.
