# Réplica de una escena de motion graphics (video de TypeSafe AI, 1280×720, 30 fps)

Trabaja SOLO en tu carpeta `scenes/<id>/`. Dentro de `ref/` tienes: `clip.mp4` (la escena original, sin audio), `sheet.png` (hoja de contactos a 4 fps con timestamps) y `f_NNN.png` (cuadros a 5 fps, f_001 = t 0.0). MIRA la hoja y varios cuadros antes de escribir: mide posiciones, tamaños, tiempos y eases sobre los cuadros (los timestamps son relativos al clip).

## Reglas
- Composición HyperFrames en `index.html` (invoca el skill `hyperframes` para la estructura mínima: `data-composition-id="main"`, `data-duration` = duración del clip, GSAP en una sola timeline pausada registrada en `window.__timelines["main"]`). Fuentes de Google Fonts (Inter para sans, Geist Mono para mono) o sistema.
- Todo determinista frame a frame: nada de `requestAnimationFrame`, `Math.random` sin semilla ni CSS con reloj propio. Si necesitas azar, PRNG con semilla fija (mulberry32).
- Si la escena tiene entrevistado de fondo: usa un cuadro limpio (sin gráficos) del clip como imagen congelada, o el propio `ref/clip.mp4` si no hay cuadro limpio (dilo en NOTAS).
- Antes de escribir un efecto a mano, revisa `/Users/bliss/fixter2025/videos/_shared/recipes/motion-anything/` (README.md) y el registry (`npx hyperframes catalog`); usa lo que exista, sólo CSS/WAAPI seek-safe.
- Paleta de la referencia: rosa `#e8679a`/`#ee6f9f`, blanco, negro, grises. Textura dither/half-tone: PNG generado o SVG `feTurbulence` + umbral, nunca gradiente.
- Identificadores en inglés, comentarios en español.

## Entregable
1. `index.html` + assets en tu carpeta.
2. `out.mp4` con `npx hyperframes render . -o out.mp4` (mismo tamaño y duración que `ref/clip.mp4`). Si el render avisa `sub_timeline_readiness_timeout` es que tu script tiró error: revisa en consola.
3. `cmp.mp4`: lado a lado ref|tuyo: `ffmpeg -y -i ref/clip.mp4 -i out.mp4 -filter_complex "[0:v]scale=640:-1[r];[1:v]scale=640:-1[m];[r][m]hstack" -r 30 -pix_fmt yuv420p cmp.mp4` y una hoja `cmp.png` (`-vf "fps=2,tile=2xN"`). MÍRALA y corrige al menos una vez lo que más se desvíe (tamaño, posición, tiempo).
4. Verifica sobre out.mp4: `ffprobe -show_entries stream=start_time,nb_frames` (start_time 0), `blackdetect` (0 hallazgos salvo que la referencia sea negra), frame 0 no vacío.
5. `NOTAS.md` (5 líneas): técnica, qué recetas/bloques usaste, qué se acerca, qué no, y una calificación honesta 1–5 de parecido.

Responde con: ruta de out.mp4, si pasó, calificación y 2 líneas de qué no se acerca.
