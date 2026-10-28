---
name: beat-scenes
description: |
  Cinco escenas que tocan con la música, una por cada medida de HyperFrames 0.8.212: metrónomo con `beats`,
  batería con `audio --band`, letrero split-flap con `sections`, sello con `downbeats` y vúmetro con
  `loudness,envelope`. Ningún tiempo de golpe va escrito a mano: todo sale del JSON medido.
triggers:
  - "que los objetos peguen con el beat de la canción"
  - "una batería que toque con la música"
  - "cortar las escenas en los compases"
  - "vúmetro que siga el volumen de la pista"
  - "elegir una pista que tenga bombo y tarola claros"
origin: fixter2025/videos/hyperframes-0812/beats-audio (v3, demo-beats-audio.mp4), 28 oct 2026
---

# beat-scenes

Cinco escenas de 1080×1920 (33 s), una cada tres compases y cortadas en downbeats medidos, con una cortinilla de
rebanadas cuyo golpe cae en el downbeat:

| escena | comando | objeto |
|---|---|---|
| 1 | `beats` | metrónomo que llega al extremo en cada beat + regla con una marca por beat |
| 2 | `audio --only onsets,envelope --band` | batería: bombo, tarola y hi-hat, cada uno con su etiqueta de banda que se enciende |
| 3 | `audio --only sections` | letrero split-flap que cambia A→B + cinta de la canción entera |
| 4 | `audio --only downbeats` | sello que estampa el «1» de cada compás; 2, 3 y 4 se apuntan solos |
| 5 | `audio --only loudness,envelope` | vúmetro con la aguja cuadro a cuadro + envolvente que se dibuja |

## Cuándo usarla
- Shorts o reels con música protagonista donde los objetos deben pegar con la batería, no con un BPM aproximado.
- Como plantilla: tomar una sola escena (la batería, el sello o el vúmetro) y alimentarla con la pista del video.
- Para elegir la cama musical: `scripts/score-tracks.mjs` califica candidatas antes de gastar render.

## Cuándo NO (contención)
- Voz sobre música baja: ahí manda la palabra; usar `_lib/beat-snap.js` para afinar inicios al beat, no esta escena.
- Pistas sin batería (piano, ambiente): `beats` da rejilla, pero la batería no tendrá golpes que mostrar.
- Funk con bajo pesado o tarola enterrada: la banda de 30–120 Hz agarra el bajo y la de 1.5–5 kHz la guitarra
  (le pasó a «Funkorama»). Calificar la pista primero.

## Cómo aplicarla
1. Bajar la música (no va al repo; `*.mp3` y `*.wav` se ignoran). La de la demo:
   ```sh
   curl -L -o assets/Electro_Cabello.mp3 "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Electro%20Cabello.mp3"
   ffmpeg -ss 0.025 -t 33 -i assets/Electro_Cabello.mp3 -ac 2 out/track.wav && ffmpeg -i out/track.wav assets/track.mp3
   ```
2. Copiar `recipe.html` como `index.html` del proyecto (`beats` busca el `<audio data-timeline-role="music">` del index).
3. Medir (HyperFrames 0.8.212):
   ```sh
   npx -y hyperframes@0.8.212 beats . --json                                   # → beats/assets/track.mp3.json
   A="npx -y hyperframes@0.8.212 audio"
   $A out/track.wav --only beats,downbeats,bpm,sections --json > out/meta.json
   $A assets/Electro_Cabello.mp3 --only sections,bpm --json > out/full.json  # canción entera, para la cinta
   $A out/track.wav --json > out/signal.json                                    # loudness, envelope, silence…
   $A out/track.wav --only onsets,envelope --band 30,120    --threshold 0.2 --json > out/kick.json
   $A out/track.wav --only onsets,envelope --band 1500,5000 --threshold 0.3 --json > out/snare.json
   $A out/track.wav --only onsets,envelope --band 8000,16000 --threshold 0.2 --json > out/hat.json
   node scripts/make-scenes-data.mjs out 0.025    # → assets/scenes-data.js (2.º arg: segundo donde empieza la ventana)
   ```
4. Render: `npx -y hyperframes@0.8.212 render . -o render.mp4`. Sale con la música del `<audio>`; si se mezcla
   aparte con ffmpeg, seguir las reglas de audio de la casa.
5. Si cambia la pista o la ventana, repetir 3: `assets/scenes-data.js` es generado, no se edita a mano.

## Parámetros
Esta receta no lleva bloque `PARAMS`: lo que cambia entre usos es la música, y entra como `window.SCENES_DATA`.

| clave | de dónde sale | qué controla |
|---|---|---|
| `bpm`, `beats[]` | `beats` (rejilla) + `meta.json` | péndulo, regla, secuenciador, rejilla donde caen bombo y tarola |
| `downbeats[]` | `meta.json` | cortes de escena (cada 3 compases), golpe de las cortinillas, sello |
| `sections[]`, `song.sections[]` | `meta.json`, `full.json` | letra del split-flap y cinta de la canción entera |
| `kick[]` | `kick.json`, subida de envolvente ≥ 10 dB | golpes del bombo |
| `snare[]` | `snare.json`, onset ≥ 0.65 a ≤ 50 ms de un beat | golpes de la tarola |
| `hat[]` | `hat.json`, onsets ≥ 0.4 separados 0.12 s | hi-hat |
| `env[]`, `lufs`, `truePeak` | `signal.json` (un valor por cuadro, dB) | aguja y envolvente del vúmetro |

Umbrales en `scripts/make-scenes-data.mjs` (`riseOnBeats("kick.json", 10)`, `onBeats("snare.json", 0.65)`, `free("hat.json", 0.4, 0.12)`).

## Elegir la pista: `scripts/score-tracks.mjs`
```sh
node scripts/score-tracks.mjs candidatas/    # cada .mp3 de la carpeta: 90 s a wav, mide y cachea en .score.json
```
Imprime BPM, % de beats con bombo, tarola en 2–4 contra 1–3 y secciones. Buena pista para esta receta: tarola en
2–4 alta y en 1–3 baja. De 18 candidatas ganó «Electro Cabello» (117 BPM): tarola 2–4 = 0.69, 1–3 = 0.20.

## Cierre con la flamita
La tarjeta final lleva el CTA «Copia las recetas en github.com/blissito/ghosty-reel» y encima a la «Ghosty flamita»
(el SVG de `ghost-svg.ts` de gs, el mismo del hackatón) con su rig `sway › breath › squash › eyes`. Cae cuando la tarjeta
ya aterrizó y se aplasta. Después respira y se mece un beat por vaivén, mira la URL, parpadea y brinca en cada beat que
cabe antes del final: se agacha, despega estirada y aterriza en el beat con squash. Respira cada 0.9 s y se mece
cada 1.1 s de forma continua, como en el hackatón. Los pivotes van en unidades del viewBox (`6.5 14.1` la base, `6.5 8.2` los ojos), con `svgOrigin`.

## SFX (montados: `scripts/sfx-cues.mjs <render mudo> <salida>`)
La música ya pone los golpes; no se doblan bombo ni tarola. Sutiles y simples, con los tiempos sacados de los mismos
datos que la composición:
- cortinillas: whoosh de 0.5 s que arranca 0.3 s antes del downbeat, alternando `whoosh-short` / `whoosh-fly`, al 0.3;
- flamita: `land` cuando toca la tarjeta; en cada brinco `bean` al despegar y `pop` al aterrizar en el beat.
Los wav son el catálogo CC0 de fixter2025 (`docs/shorts-taller/sfx/`, créditos en su `CREDITOS.md`); cambia `SFX` si
los tienes en otro lado. Ganancia fija + `alimiter=…:level=disabled` (ffmpeg 9 sube la ganancia sin eso).

## Trampas
- **La tarola es un beat de la rejilla confirmado por su banda** (onset de 1.5–5 kHz ≥ 0.65 a menos de 50 ms del
  beat), no los onsets libres de esa banda: guitarras y síncopas caen ahí y la tarola se ve a destiempo.
- **El bombo de electro se detecta por la subida de la envolvente de 30–120 Hz** en el beat (≥ 10 dB contra los
  80 ms previos), no por los onsets: el bajo sostenido tapa el ataque y los onsets fallan.
- `beats <carpeta>` recibe el proyecto, no un archivo, y sólo da `[{time, strength}]` con su BPM: downbeats y
  secciones salen únicamente de `audio --only beats,downbeats,bpm,sections`.
- El render no puede hacer `fetch`: el JSON entra como `<script src="assets/scenes-data.js">`.
- Las ventanas de los clips (`data-start` de cortinillas y tarjeta final) van escritas en el HTML; sólo los tweens
  salen de los datos. Si cambia la pista, revisar que caigan cerca de los downbeats nuevos.
- Un `tl.set` doble en 0 se revierte al hacer seek: la visibilidad inicial de las escenas vive en CSS.
- En macOS 15 sólo corre el detector `signal` (confianza ~0.4 aunque los beats salen exactos); `apple-mu` pide
  macOS 27 y `beat-this` pide `HYPERFRAMES_BEAT_THIS_PYTHON`.
- `Archivo Black` no carga en el render: se usa Poppins 700.

## Crédito de la música (va en la descripción del video)
Música: «Electro Cabello», Kevin MacLeod (incompetech.com). Licencia CC BY 4.0
(<https://creativecommons.org/licenses/by/4.0/>). `preview.mp4` la lleva de fondo.
