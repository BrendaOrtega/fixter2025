# Short 4 · "El caso de Osvaldo" (papercraft) — cómo retomar

Pausado el 11 sep 2026 a las 10:58 con el render al 57 % (bliss tenía que apagar). Todo lo que
cuesta trabajo ya está hecho; sólo falta renderizar y mezclar.

## Lo que ya está
- `build.mjs` aprobado en fotogramas (llave y ✕ fuera de la cara de Ghosty, fichas sin pisar la
  etiqueta, burbuja del cliente sin chocar). `build-lines.mjs` con los splits de whisper.
- `assets/_work/clip.mp4` — el corte de tres tramos, 142.6 s:
  1. ventana 27:01.6+20.3 → +111.7 (Osvaldo → "y ya está")
  2. ventana 28:41.6+21.15 → +53.45 (la recomendación: "un solo endpoint… sin cambiar la llave")
  3. ventana 43:31.6+18.6 → +37.4 ("el token debería decirlo… scope de Google… es igual")
  (segmentos HLS 162–173, 1721.6+, 2611.6+ de `1080p.m3u8`)
- `assets/face.mp4`, `face-still.png`, `transcript.json` (large-v3 del clip).
- `assets/_work/sfx.wav` — 50 golpes ya colocados (pop, pin, paper, ding, tick, stamp, whoosh, hit),
  generada con `../sfx-track.py sfx.json 153.95 …`.
- `assets/_work/bgm-lesat-theme.mp3` — "LESAT Theme" de Daniel Bautista, CC BY 3.0,
  jamendo 1501647 (319 s, arranca en 4 s). **Aún no registrada en `scripts/bgm/usadas.json`**:
  registrar al entregar.

## Lo que falta (≈ 6 min)
```sh
cd docs/shorts-taller/s4-d-papercraft
node build.mjs && npx hyperframes@0.8.27 render .        # ~4.5 min
R=$(ls renders/*.mp4); A=assets/_work
bash ../mix.sh $A/clip.mp4 $A/bgm-lesat-theme.mp3 $R /tmp/s4d-base.mp4 153.95 147.45 "" 4
bash ../mix-sfx.sh /tmp/s4d-base.mp4 $A/sfx.wav ~/Desktop/shorts-sesion-4/d-osvaldo.mp4 153.95
node ../../../scripts/bgm/registrar-bgm.mjs $A/bgm-lesat-theme.mp3 "shorts sesión 4 · d-osvaldo"
```
Verificar sobre el entregado: `start_time` 0, `blackdetect` 0, LUFS ≈ −13.5, zona segura TikTok,
y revisar en video la cortinilla de hojas (sube en cascada desde abajo; no se ha visto en render).
Crédito para la descripción: Música: "LESAT Theme" de Daniel Bautista — CC BY 3.0.

Pendiente de bliss: avisarle a Osvaldo que sale su nombre y su tienda.
