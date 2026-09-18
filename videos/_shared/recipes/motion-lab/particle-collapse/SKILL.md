---
name: particle-collapse
description: |
  Un enjambre de puntos SVG dispersos en anillo colapsa al contorno exacto de una letra y, en su lugar,
  nace la palabra completa abriéndose desde ese glifo. Para revelar un nombre de producto o un titular corto.
triggers:
  - "que las partículas formen la letra"
  - "puntos que se juntan y se vuelven la palabra"
  - "reveal del nombre con partículas"
origin: réplica TypeSafe (videos/replica-typesafe/scenes/05-particle-ring), 17 sep 2026
---

# particle-collapse

Anillo grueso de puntos menta → se condensa hasta dibujar el contorno de la "o" → la "o" tipográfica ocupa
su lugar y "Gh…sty" se abre a los lados → renglón mono en typewriter.

## Cuándo usarla
- Reveal de nombre (Ghosty, Formmy, EasyBits) en intros de 3–5 s.
- Cuando hay una letra redonda o cerrada en la palabra (o, e, a, G, O): el contorno se lee de inmediato.

## Cuándo NO (contención)
- Palabras largas (> 8 letras) a 190 px no caben en 1280; bajar `fontSize` o cambiar de receta.
- Letras sin contorno interesante (l, i, t): el colapso se ve como una raya.
- Nunca como fondo de subtítulos: 700 círculos moviéndose compiten con el texto.

## Cómo aplicarla
1. Copiar `recipe.html`, editar `PARAMS` (`word`, `glyphIndex`, `caption`, `palette`).
2. Ajustar `spread` al tamaño de la letra (≈ 1.2 × `fontSize`) y `count` (500–900).
3. Si cambia `fontSize`, revisar que `wordY + fontSize + 40` deje sitio al caption.
4. Renderizar: `npx hyperframes render . -c preview.html -o preview.mp4`.

## Parámetros
| clave | tipo | default | qué controla |
|---|---|---|---|
| palette | "fixtergeek" \| "easybits" | fixtergeek | variables CSS de color |
| word | string | "Ghosty" | palabra final |
| glyphIndex | int | 2 | letra a la que colapsan los puntos |
| caption | string | "agente en caja" | renglón mono debajo ("" = ninguno) |
| tag | string | "FIXTERGEEK / 2026" | etiqueta mono arriba a la izquierda, visible desde el cuadro 0 |
| fontSize | px | 190 | tamaño de la palabra |
| wordY | px | 250 | top de la palabra |
| count | int | 700 | partículas |
| seed | int | 20260917 | semilla del PRNG |
| spread | px | 230 | radio medio del anillo inicial |
| timings.collapse / collapseDur | s | 0.5 / 0.55 | arranque y duración del colapso |
| timings.reveal / revealDur | s | 1.35 / 0.5 | cambio a tipografía y apertura de la palabra |
| timings.caption | s | 2.0 | typewriter del renglón |
| timings.total | s | 4 | duración |

## SFX sugerido
- `collapse` → `collapse + collapseDur`: succión/riser corto (whoosh inverso), termina justo al cerrar el anillo.
- `reveal`: golpe seco (thud) cuando la letra sustituye a los puntos.
- `reveal + 0.05 … + 0.3`: barrido suave mientras las letras se abren (ease `power3.out`, sin rebote: el impacto va al inicio).
- `caption`: ticks de máquina de escribir cada 35 ms, sólo los primeros 6–8.

## Trampas
- El contorno se toma rasterizando el glifo en un canvas fuera de pantalla (lectura de píxeles, no reloj: sigue
  siendo determinista). Hay que esperar `document.fonts.ready` y construir la timeline después.
- Con `line-height:1` la línea base de la letra en el DOM está en `top + alto/2 + (ascenso − descenso)/2`;
  si se dibuja con `textBaseline:"middle"` los puntos quedan medio em arriba y el contorno se recorta.
- La diferencia angular hay que envolverla a [0, π]: sin eso, la cuarta parte de arriba de la letra queda vacía
  (los puntos con ángulo > π nunca la eligen).
- Las letras se abren con `x` desde el glifo, nunca con `letter-spacing` (no es seek-safe ni mide bien).
- `blackdetect` cuenta como negro cualquier píxel con luma < 10 %, y el fondo `#0E1317` cae ahí: mientras los
  puntos viajan el cuadro daba > 98 % "negro". Por eso el marco, la retícula de puntos (paso 40, opacidad 0.55) y la
  etiqueta van desde el cuadro 0: aportan el 2 % de píxeles claros que hacen falta. No quitarlos.
