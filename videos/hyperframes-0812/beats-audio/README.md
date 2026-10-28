# `hyperframes beats` y `hyperframes audio` (0.8.212)

Demo: `demo.mp4` (1080×1920, 13 s). Un bombo hace un golpe en cada beat que detectó `beats`; el contador
marca el compás con los downbeats; dos cortinillas caen en los cambios de sección; un sello marca el
silencio que midió `audio`. Ningún tiempo de golpe está escrito a mano: todo sale del JSON.

**Música:** Openverse no respondió (timeout de la API), así que `scripts/synth_funk.py` sintetiza un funk
de **112 BPM con el primer beat en 0.300 s**, sección A (bombo y hat) → B en el compás 3 y medio compás
en silencio en el compás 4. Como se conoce la respuesta correcta, se puede medir el error. Ni el mp3 ni
el wav se commitean (`.gitignore`).

## Qué hace cada comando

**`npx -y hyperframes@0.8.212 beats comp --json`** recibe la carpeta del proyecto, no un archivo. Busca el
`<audio data-timeline-role="music">` y escribe `comp/beats/assets/funk.mp3.json`, que Studio dibuja como
rejilla:
```json
{ "ok": true, "file": "beats/assets/funk.mp3.json", "count": 24, "bpm": 112 }
// archivo: { "audio": "assets/funk.mp3", "beats": [{ "time": 0.305, "strength": 0.755 }, …] }
```
Sólo trae los beats con su fuerza. No incluye downbeats, secciones ni `bpmConfidence`, aunque el skill
dice que sí.

**`npx -y hyperframes@0.8.212 audio <archivo> --json`** mide por defecto `kind, moments, onsets, loudness,
silence, envelope`. Con `--only beats,downbeats,bpm,sections` agrega el análisis musical. Con
`--dir comp --range 7.5,9.5` o `--element #music` mide en tiempo de película.
```json
"bpm": { "value": 112, "curve": [{ "t": 0.305, "bpm": 112 }, …] },
"downbeats": { "times": [0.305, 2.445, 4.585, 6.735, 8.875, 11.025], "meter": 4, "confidence": "low" },
"sections": { "spans": [{ "start": 0, "end": 4.585, "label": "A" }, { "start": 4.585, "label": "B" }] },
"silence": [ …, { "start": 7.913, "end": 8.87 } ],
"loudness": { "lufsIntegrated": -23.2, "truePeakDb": -1 },
"kind": { "value": "music", "confidence": 0.9 }, "onsets": { "events": [52 golpes con t y strength] }
```
Salidas completas en `out/`.

## Contra nuestros scripts

| | respuesta correcta | `beats` / `audio` | `medir-bgm.mjs` |
|---|---|---|---|
| BPM | 112 | **112** | **75** (mal, aun con la pista en bucle a 84 s) |
| fase del beat | 0.300 s | 0.305 s; error medio 6.8 ms, máximo 15 ms | no la da |
| downbeats / secciones | 6 / A→B en 4.586 | exactos (error ≤ 11 ms) / A→B en 4.585 | no |
| silencio | 7.80–8.87 | 7.913–8.870 (el hat suena hasta 7.9) | no |
| RMS / punch para rankear | — | LUFS sí; punch no | sí |

`beat-snap.js` no detecta nada: ajusta tiempos a una rejilla. `BeatSnap.beats()` lee directo los
`[{time}]` del JSON de `beats`, y la demo lo usa así (`snap(…, {impact: 1})` coloca las cortinillas).
Con `beats` ya no hace falta calcular `grid({bpm, offset})` a mano.

## Veredicto: adoptar `beats`/`audio` para medir; dejar `beat-snap.js` para ajustar

- **Adoptar** `audio --only beats,downbeats,bpm,sections` en lugar del BPM de `medir-bgm`. Aquí acertó
  donde nuestro script falló, y además da la fase, los downbeats, las secciones y los silencios.
- **`medir-bgm` queda sólo para rankear** candidatas por RMS y punch. Lo mejor sería cambiar su cálculo
  de BPM por una llamada a `audio`. Ojo: mide desde el segundo 8, así que no sirve con pistas cortas.
- **`beat-snap.js` se queda**: es el paso que viene después de medir. Desde ahora se alimenta con el JSON
  de `beats`.

## Problemas encontrados

1. Un `<script>` no puede cargar el JSON de `beats` en el render, porque el contrato prohíbe `fetch`.
   `scripts/make-beat-data.mjs` lo convierte en `comp/assets/beat-data.js`. Hay que volver a correrlo
   cuando cambie la música.
2. `beats` y `audio` trabajan por separado: los downbeats y las secciones sólo salen de `audio`.
3. En esta Mac (macOS 15) sólo corre el detector `signal`. `apple-mu` pide macOS 27 y `beat-this` pide
   `HYPERFRAMES_BEAT_THIS_PYTHON`. La confianza sale baja (0.38) aunque los beats son exactos.
4. Las ventanas de los clips (`data-start` del sello y de las cortinillas) siguen escritas en el HTML;
   sólo los tweens se calculan a partir de los datos.
5. `Archivo Black` no se cargó en el render y cayó a una sans de sistema. Se cambió por Poppins 700.
6. La pista de prueba es sintética y muy regular. Falta probar con una pista real de Jamendo cuando
   Openverse responda.

## Reproducir
```sh
python3 -I scripts/synth_funk.py assets/funk.wav && ffmpeg -i assets/funk.wav assets/funk.mp3 && cp assets/funk.mp3 comp/assets/
npx -y hyperframes@0.8.212 beats comp --json
npx -y hyperframes@0.8.212 audio assets/funk.mp3 --only beats,downbeats,bpm,sections --json > out/audio-beats.json
npx -y hyperframes@0.8.212 audio assets/funk.mp3 --json > out/audio-default.json
node scripts/make-beat-data.mjs
cd comp && npx -y hyperframes@0.8.212 render --quality delivery --output ../out/render.mp4 && cd ..
ffmpeg -i out/render.mp4 -i assets/funk.wav -filter_complex "[1:a]atrim=0:13,asetpts=PTS-STARTPTS,volume=9dB,alimiter=limit=0.89,afade=t=out:st=12.4:d=0.6,apad=whole_dur=13[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -t 13 demo.mp4
```
Verificado sobre `demo.mp4`: `start_time` = 0 en video y audio, `blackdetect` sin cuadros negros,
fotograma 0 completo, −14.9 LUFS integrados.

## v2 — `demo-funkorama.mp4` (28-oct): batería con una pista real

«Funkorama» de Kevin MacLeod (incompetech, CC BY 4.0; Openverse seguía caído), del segundo 4.2 al 24.2: intro y drop
en 4.745 s, donde `audio` puso la sección B. Cada pieza toca lo que mide **`audio --band`**:

```sh
npx -y hyperframes@0.8.212 audio track.wav --only onsets,envelope --band 30,120   --threshold 0.2 --json > kick.json   # bombo
npx -y hyperframes@0.8.212 audio track.wav --only onsets,envelope --band 1500,4000 --threshold 0.3 --json > snare.json  # tarola
npx -y hyperframes@0.8.212 audio track.wav --only onsets --band 8000,16000         --threshold 0.2 --json > hat.json    # hi-hat
node scripts/make-kit-data.mjs out/funkorama   # fuerza ≥ 0.6/0.6/0.5 y 0.17 s entre golpes → comp/assets/kit-data.js
```
Composición: `comp/index.html` (la v1 sintética quedó en `comp/index.v1.html`). Bombo que se aplasta desde el piso
con onda, polvo y tom que brinca; tarola con anticipación del palo, parche que se hunde, bordonera que tiembla y chispa;
hi-hat con palo y tapa; crash en el drop y cada dos compases; secuenciador de 3×8 corcheas con cabezal en la rejilla
de `beats`; cortinilla pegada al beat con `beat-snap` y sacudida de 4 cuadros al abrir. Render: 9.9 s.
Verificado sobre el entregado: `start_time` 0, sin cuadros negros, −14.8 LUFS, pico −0.8 dBFS.
Ojo: en funk el bajo cae en la banda del bombo; a 0.6 de fuerza salen golpes creíbles, pero no es separación de fuentes.
Crédito para la descripción: Música: «Funkorama», Kevin MacLeod (incompetech.com), CC BY 4.0.

## v3 — `demo-beats-audio.mp4` (28-oct): cinco escenas, una por medida

Funkorama no sirvió: su tarola va enterrada y la banda de 1.5–4 kHz agarraba guitarra y síncopas, así que la tarola
se veía a destiempo. Se eligió la pista **calificando 18 candidatas** (`scripts/score-tracks.mjs`: % de beats con bombo, tarola
en 2–4 contra 1–3). Ganó «Electro Cabello» (Kevin MacLeod, CC BY 4.0, 117 BPM): tarola en 2–4 = 0.69, en 1–3 = 0.20.

| escena | comando | objeto |
|---|---|---|
| 1 | `beats` | metrónomo que llega al extremo en cada beat + regla con una marca por beat |
| 2 | `audio --only onsets --band` | batería: bombo, tarola y hi-hat, cada uno con su etiqueta de banda que se enciende |
| 3 | `audio --only sections` | letrero split-flap que cambia A→B en 16.415 s + cinta de la canción entera (10 partes) |
| 4 | `audio --only downbeats` | sello que estampa el «1» de cada compás; 2, 3 y 4 se apuntan solos |
| 5 | `audio --only loudness,envelope` | vúmetro con la aguja cuadro a cuadro + envolvente dibujándose |

Lo aprendido: **tarola** = beat de la rejilla confirmado por un onset de 1.5–5 kHz (fuerza ≥ 0.65), no onsets libres.
**Bombo** en electro: los onsets de 30–120 Hz fallan (el bajo sostenido tapa el ataque); lo confiable es la **subida de
la envolvente** de esa banda en el beat (≥ 10 dB contra los 80 ms previos). Datos: `scripts/make-scenes-data.mjs`.
Verificado sobre el entregado: `start_time` 0, sin negros, −14.7 LUFS, pico −2.0 dBFS. Las versiones viejas están en `versiones/`.
