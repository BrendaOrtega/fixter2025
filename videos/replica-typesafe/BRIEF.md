# Réplica: lower-third "ventana" de TypeSafe AI (escena 1.0–8.5 s)

Referencia: `ref/clip.mp4` (1280×720, 30 fps, 7.5 s), frames en `ref/f_XX.png` (4 fps), `ref/sheet.png` (hoja de contactos con timestamps), `ref/detail.png` (acercamiento de la ventana).

## Qué se ve (timeline medido)
- 0.00 s: sólo el entrevistado. Ya hay dos marcas de esquina finas ("corner brackets") tenues arriba-izq y abajo-der del futuro cuadro.
- 0.25–0.50 s: aparece la barra de título de una ventana retro: icono de la marca (glifo hexagonal) + `DIOGO ALMEIDA` en monoespaciada, y una `×` a la derecha. El texto se escribe rápido (typewriter/scramble, ~0.3 s). Borde blanco de 1 px, sin relleno (fondo transparente sobre el video). Posición: x≈180, y≈90, ancho≈340.
- 0.75–2.0 s: se abre el cuerpo de la ventana debajo y se escribe `founder of TypeSafe AI` letra por letra con un cursor rosa (`#e8679a` aprox) que corre delante del texto (~1.2 s).
- 2.0–3.75 s: sostiene. Una línea diagonal fina va desde la esquina inferior derecha de la ventana hacia abajo-derecha (leader line), con una marca de esquina al final.
- 4.0 s: aparece `CO-CREATED` (typewriter, ~0.25 s).
- 4.75 s: `└ ChatGPT`; 5.25 s: `└ RLHF` (cada una typewriter ~0.25 s).
- 6.0–6.75 s: **cortinilla de píxeles**: bloques cuadrados (~80 px) blancos y grises que aparecen aleatorios y tapan la escena; del otro lado queda un fondo blanco con retícula fina y el diagrama: pill rosa `RLHF` con conector en L a la izquierda y el texto `The post ⚲ training algorithm` que se escribe (6.75–7.5 s).
- Tipografía: la ventana en monoespaciada (tipo JetBrains Mono / IBM Plex Mono) 14–16 px; el diagrama final en sans grotesca (Inter) ~28 px.
- Todo sobre el video real: usar `ref/clip.mp4` como capa de fondo para que la comparación sea justa.

## Entregable
- `index.html` autocontenido (fuentes de Google Fonts o sistema) que dure 7.5 s a 1280×720.
- Render a `out.mp4` (30 fps, H.264, sin audio) con `npx hyperframes render` o el método que uses; el fotograma 0 debe traer el video de fondo (nunca negro).
- `NOTAS.md` de 5 líneas: qué técnica usaste, qué se acerca y qué no.
- Identificadores en inglés, comentarios en español.
