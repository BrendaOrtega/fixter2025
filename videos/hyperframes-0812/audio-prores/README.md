# HyperFrames 0.8.212: mezcla dentro de la composición y ProRes 4444

Prueba del 28-oct-2026. Todo se corrió con `npx -y hyperframes@0.8.212`.

## Veredicto

**Sí podemos dejar de usar ffmpeg para la mezcla, con una condición: no hay sidechain.**
La cama se agacha con una lane `data-automation` de volumen. Esa lane la genera
`audio-duck.mjs` a partir de los tiempos de palabra del transcript. El agachado sigue
lo que dice el transcript, no la señal de la voz. Para voz hablada funciona igual o
mejor: −12.4 dB parejos, sin el bombeo que deja `sidechaincompress`. El nodo
`compressor` del fx-chain no acepta una pista llave (key input).

Nuestras reglas en HyperFrames:
- Voz −15 LUFS: `highpass` 80 Hz → `compressor` (−30 dB, 4:1, makeup +15.4) → `truepeak` −1.5 en el `data-fx-chain` de la voz. Medido en el stem: **−15.0 LUFS, −1.5 dBTP**.
- Cama −26 LUFS: `data-volume` que calcula `normalize-audio`, más la lane del agachado. Medido: **−25.6 libre y −38.0 agachada**.
- SFX al 0.7: `data-volume="0.7"` en cada `<audio>`.
- Ganancia fija + limitador, sin loudnorm al final: `data-fx-chain` en la raíz con `gain` +1.8 dB → `truepeak` −1.5. Este es el master bus.

## Mediciones (ebur128 por ventana; `measure/report.md`, los stems están en `measure/*/`)

| Mezcla | Voz 3–11.3 s | Cama libre 0–3 s | Cama agachada 3.5–11 s | Agachado | Mezcla 0–14 s |
|---|---|---|---|---|---|
| HyperFrames | −13.4 LUFS / −1.5 TP | −24.2 | −36.6 | −12.4 dB | **−14.7 LUFS / −1.3 dBTP** |
| mix.sh tal cual | −13.2 / −1.0 | −22.3 | −40.0 | −17.7 dB | **−13.1 LUFS / +0.1 dBTP** |
| mix.sh con `alimiter level=disabled` | −13.2 / −1.0 | −22.3 | −40.0 | −17.7 dB | −14.6 LUFS / −1.4 dBTP |

Los stems ya llevan la ganancia del master. Por eso las dos cadenas dejan la voz
cerca de −13.3 y no de −15: así lo diseñó mix.sh, que lleva el total a −14.5.
Archivo entregado `demo-mix.mp4`: −14.7 LUFS integrado, −1.3 dBTP, `start_time` 0 y 0 negros.

## Hallazgos

1. **Bug en nuestro mix.sh**: en ffmpeg 9, `alimiter` trae `level=true` por default
   (auto-ganancia). El short sale a −13.1 LUFS con pico de +0.1 dBTP, aunque la
   ganancia fija apuntaba a −14.5. La corrección es `alimiter=limit=0.84:level=disabled`.
   No lo toqué, porque está fuera de esta carpeta.
2. `normalize-audio --lufs -15` sobre la voz de Kokoro se detiene en −21.6 porque
   la frena el true-peak. Hace falta el compresor en el fx-chain. El nodo `gain`
   llega a +12 dB como máximo; por eso el makeup va en el compresor.
3. La salida de `audio-duck.mjs` pone el nivel absoluto en la lane (0.172), pero la lane
   **multiplica** `data-volume`. Hay que escribirla relativa (1 → 0.25).
4. `truepeak` −1.5 deja pasar hasta −1.3 dBTP en la mezcla. Coincide con lo que dice su doc ("hasta ~1.7 dB").
5. `check`: en una copia rota detectó audio sin `id` (silencio en el render), un archivo inexistente
   y un clip que pasa de la duración. **No avisa** de `data-volume="0"` (`measure/check-roto.txt`).
6. `media-use` con SFX: Openverse no respondió desde esta máquina (timeout, también con
   curl), así que cayó al banco incluido y trajo `whoosh-short`. No se pudo probar un SFX nuevo de Openverse.
7. `render --format mov --prores-profile 4444`: `overlay.mov` sale en `prores 4444`,
   `yuva444p12le`, con alfa real (sólo la pastilla es opaca; `measure/overlay-alpha.png`).

## Archivos

- `index.html`: tarjeta 1080×1920 con la mezcla completa → `demo-mix.mp4`
- `overlay/index.html` → `overlay.mov`
- `tools/stems.sh`: render completo y en solos (voz, cama) · `tools/ref-mix.sh`: la misma cadena que mix.sh · `tools/report.sh`: la tabla
- Cama sintetizada con ffmpeg (sin licencia que acreditar); SFX de `docs/shorts-taller/sfx/`
