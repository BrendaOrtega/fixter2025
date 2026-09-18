# Laboratorio: réplica del video de TypeSafe AI (17 sep 2026)

Ejercicio: ubicar las ~18 escenas de motion graphics de un video corporativo (2:56, 1280×720),
analizarlas cuadro a cuadro y ver si se replican con el pipeline de la casa (HyperFrames + GSAP,
ffmpeg). Primero cuatro enfoques en paralelo sobre la primera escena (`a/` GSAP, `b/` recetas
motion-anything, `c/` todo SVG, `d/` bloques del registry), luego una versión propia con los
arreglos de oficio (`final/`), la rueda (`wheel/`) y las 15 escenas restantes en paralelo
(`scenes/NN-*/`), cada una con brief, notas y autocalificación.

**Veredicto:** se replica al 75–80 %. De 16 escenas, 10 quedaron en 4/5 y 6 en 3–3.5/5. Lo que no
se iguala no es herramienta: la grotesca estrecha del original, el entrevistado en movimiento
(aquí va congelado porque no hay cuadro limpio), los glifos de marca, y dos efectos que piden más
horas (bulto esférico de la malla y colapso orgánico del reloj de arena). El anillo de partículas,
que se daba por imposible, salió con 900 círculos SVG en 6 s de render.

**Lo reutilizable salió a `videos/_shared/recipes/motion-lab/`** (15 recetas parametrizadas, sin
marca ajena) y a la galería <https://blissito.github.io/ghosty-reel/motion-lab/>.

En el repo sólo van fuentes (`index.html`, `NOTAS.md`, briefs). No van: `ref/` (el video ajeno y
sus cuadros), renders `*.mp4`, `*.png`, ni `assets/` (cuadros congelados del video).
