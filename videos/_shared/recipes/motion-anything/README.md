# Recetas de motion-anything (Apache-2.0)

Copiadas el 14 sep 2026 de `nexu-io/motion-anything` para usarlas en nuestras tarjetas de shorts y
videos. Licencia en `LICENSE`; créditos de terceros en `ATTRIBUTION.md` (35 de `web/` son ports de
react-bits, redistribuidos con permiso del autor). Contrato de cada receta en `MOTION-SPEC.md`.

- `web/` — 85 efectos dependency-free (texto cinético, shaders, fondos, entradas). Cada carpeta trae
  `SKILL.md` (cuándo usarla), `preview.html` y el `.css`/`.js` que se copia.
- `slides/` — 20 efectos para tarjetas y títulos (typewriter, count-up, fx-*).
- `css/` — ~100 clases de animación estilo animate.css (`anim-bouncein`, `anim-backinup`…).

**Cómo usarlas en HyperFrames:** todo lo que anima con CSS keyframes o WAAPI es seek-safe y entra
directo; lo que usa `requestAnimationFrame` o WebGL con reloj propio (shaders, canvas) NO es
determinista frame a frame — o se le expone un `seek(t)` o se evita. Reglas de la casa aplican
igual: sin gradientes ni glow en piezas de FixterGeek (caricatura plana), paleta por marca, bucles
finitos.
