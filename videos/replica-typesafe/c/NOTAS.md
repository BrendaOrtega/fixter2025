# Réplica C — todo en un solo SVG

- Técnica: un `<svg viewBox="0 0 1280 720">` sobre el `<video>`; bordes y leader line se dibujan con `stroke-dasharray/dashoffset`, texto mono como `<text>` con un `<tspan>` por carácter (scramble determinista, sin `Math.random`), cursor rosa `<rect>` que salta celda por celda, cortinilla = 144 `<rect>` de 80 px con orden seudoaleatorio de semilla fija (LCG). Toda la ventana va en `<g id="win">` con deriva lenta (`svgOrigin: "0 0"`).
- Se acerca: timeline por beat (0.25 / 0.75 / 4.0 / 4.75 / 5.25 / 6.0 / 6.75), el borde que "se dibuja", el cursor rosa delante del texto, el cuerpo que crece por renglón con la marca de esquina siguiéndolo, y el cierre blanco con retícula + pill RLHF + conector en L.
- No se acerca: la referencia trae la ventana quemada en `clip.mp4`, así que en el render se ven las dos (la mía encima, unos px desfasada); la fuente del original es más ligera que IBM Plex Mono 400 y el pixel-wipe original mezcla bloques semitransparentes con muestras del video, el mío sólo usa grises planos.
- La deriva/escala de la ventana original (más grande y abajo al inicio, se asienta hacia 5.5 s) está aproximada a ojo, no medida por frame.
- Render: `npx hyperframes@0.8.44 render . -o out.mp4 -f 30`; verificado `start_time=0`, 225 frames, `blackdetect` sin hallazgos. El cuadro 0 con plano abierto viene así en `ref/clip.mp4`.
