# HyperFrames 0.8.212: prueba de herramientas (28-oct-2026)

Todo con `npx -y hyperframes@0.8.212`. Material copiado: voz de `ghosty-3d-inicia-sesion/short/voz.wav` (32 s) con su
`words.json` de referencia, `hector.jpg` y la receta `squash-hop`. Se comparó con `node compare-words.mjs`
(resultado en `transcribe-compare.txt`).

## Transcripción y subtítulos
- **parakeet**: `models install parakeet` (33 s, una vez) y luego `transcribe voz.wav -e parakeet --json`. Sí entiende español,
  pero **sin `-l es`**: con `-l es` se regresa en silencio a whisper `small` (o `small.en` sin `--json`). Tarda 3 s contra
  10 s de large-v3. Contra `words.json` acertó 79/85 palabras (whisper: 81/85) y la mediana de |Δ| de arranque es 0.14 s
  (whisper: 0.25 s), con tiempos redondeados a 80 ms. Falló «Se»→«Te» y «citas»→«cita»; los dos escriben «Gosti».
  **Adopción: parcial.** Sirve como segunda opinión rápida de tiempos. El estándar sigue siendo `-m large-v3 -l es` porque
  da mejor texto.
- **`--to srt|vtt`**: `transcribe voz.wav -e parakeet --to srt -o voz.srt` o, desde un JSON ya corregido,
  `transcribe transcript.json --to vtt -o voz.vtt`. Agrupa por número de palabras y no por puntuación («…todo lo / demás.»).
  **Adopción: sí, sólo para el sidecar de YouTube/TikTok**, exportado del JSON ya corregido. El karaoke sigue con nuestras
  reglas (corte en pausas mayores de 0.6 s).
- Ojo: cada corrida sobrescribe `transcript.json` en la carpeta. Hay que copiarlo antes de la siguiente corrida.

## Recorte
- `remove-background hector.jpg -o hector-alpha.png` tarda 0.4 s en CoreML (más 20 s de instalación la primera vez) y
  deja bordes limpios (`cutout/hector-on-mint.png`). Con `-o x.mov` sale ProRes 4444 `yuva444p12le`, nuestro formato de
  overlay. En un clip de 3 s sin personas (`clip/monitor-3s.mp4`, 200 ms por cuadro) devolvió alfa casi vacío: **sólo
  recorta personas.** **Adopción: sí para fotos y tomas de bliss**, en lugar de recortar a mano.

## Composición (`comp/proj` = squash-hop)
- `keyframes . --selector '#hopPos' --shot onion-hop-path.png --samples 12` dibuja la trayectoria real con tiempos.
  Para squash en su lugar se usa `--layout strip --from 0.3 --to 1.3`. **Adopción: sí, para revisar un movimiento antes
  del render.**
- `snapshot . --range 0.3,1.3 --frames 6` entrega 6 PNG y un `contact-sheet.jpg` sólo de esa ventana. **Adopción: sí.**
- `check --json --range 0.3,1.5` corre runtime, layout y contraste sólo en el rango; el lint sigue siendo de todo el
  proyecto. **Adopción: sí, después de cada cambio puntual.**
- `inspect`: alias obsoleto de `check` y no acepta `--range`. **No la usamos.**
- `compare proj variant-easybits variant-low --at 0.7 --labels ... --out compare-sheet.png` arma una hoja de variantes
  lado a lado. **Adopción: sí, para elegir entre opciones.**
- `grade-compare --for hector.jpg --grades grades.json` compara grades sobre un cuadro. **Adopción: opcional**, sólo
  cuando hay metraje real.

## Audio (vistazo)
- `audio voz.wav --only moments,loudness,silence` da el onset (0.465 s, igual que `words.json`), los silencios, los LUFS
  y el true peak. **Adopción: sí, para ubicar la voz y validar las pausas del karaoke.** `--read` pide `--transcript`.

## Lo que NO cambia
Ninguna de estas herramientas lee el **archivo entregado**. Frame 0, `blackdetect`, `ffprobe start_time` y la
transcripción ventana por ventana con large-v3 siguen igual con ffmpeg sobre el mp4 final.
