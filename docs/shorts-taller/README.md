# Shorts del taller de sistemas agénticos — el molde

Escrito el **4 sep 2026**, al cerrar los diez shorts de la sesión 2. Es el estilo "con tendencia"
que bliss aprobó con el short B: cara grande y torcida con borde verde, karaoke de una línea donde
la palabra en curso salta, y un escenario animado abajo que cambia con lo que se está diciendo.
Paleta FixterGeek: fondo `#0E1317`, menta `#85DDCB`, verde `#8DCF6E`. Las reglas generales de
shorts (fotograma 0 completo, subtítulos literales, nunca negro, CTA con verbo y URL) están en
`CLAUDE.md`; aquí va lo específico de este molde.

## Anatomía (1080×1920)

| Zona | Qué es | Dónde se toca |
|---|---|---|
| Portada (0 → 4.4 s) | Título en tres líneas: serif menta / Archivo Black blanco / caja verde girada; subtítulo serif gris; cara fija en tarjeta | `#intro` en `build.mjs` |
| Persiana (3.85 s y OUT_IN−0.62) | 8 barras verde/menta cierran en cascada desde la izquierda y abren hacia la derecha | `wipe(t)` |
| Cara (top 210) | `assets/face.mp4`, 540×504, rota −2.5°, respira y da un "punch" en las palabras clave | `punch(t)` |
| Karaoke (top 840) | Una línea a la vez, máx. 24 caracteres, palabra en curso escala 1.22 en menta y queda blanca | `build-lines.mjs` |
| Escenario (top 1180, 936×560) | Paneles `.scene` que entran y salen con lo que se dice | CSS + HTML + timeline por escena |
| Cierre (OUT_IN → TOTAL) | Cita del short, "TALLER EN VIVO · 6 SESIONES", SISTEMAS AGÉNTICOS, "Regístrate en fixtergeek.com" | `#outro` |

`TOTAL = 4.4 + BODY + 0.45 + ~6.5` (el cierre dura unos 6.5 s).

## Pipeline por short

1. **Ubicar el momento** en la lista aprobada y bajar solo los segmentos HLS que lo cubren
   (10 s cada uno, índice = ⌊t/10⌋) del bucket Tigris:
   `fixtergeek/videos/<courseId>/<videoId>/hls/1080p/seg_NNN.ts`, con `aws s3 cp --endpoint-url $AWS_ENDPOINT_URL_S3`.
   Concatenar con `cat`, pasar a mp4 con `-c copy`.
2. **Transcribir la ventana** (`npx hyperframes@0.8.27 transcribe window.wav -m large-v3 -l es --json`)
   y elegir el corte leyendo, no de oído. Si hay un hueco largo de silencio (el I tenía 7 s),
   pegar dos tramos con `concat` y tapar el salto con una persiana interna (`wipe(BO + corte − .55)`
   y un golpe más en `mix.sh`).
3. **Cortar el clip** con `-ss/-t` re-codificando (`libx264 -crf 18`) y sacar:
   cara `crop=210:196:19:432,scale=630:588` (encuadre de esta grabación), `face-still.png`,
   `voice.wav` mono 16 kHz. **Transcribir el clip**, no reutilizar la ventana.
4. **`build-lines.mjs`**: OFFSET 0.3 s (large-v3 marca antes de la voz), arreglar solo errores de
   oído ("la gente" → "el agente", "deep seek" → DeepSeek, "escribir" → describir, "tribe" →
   Drive, "wey" → güey), partir palabras pegadas ("Yentonces"), reinsertar repeticiones que whisper
   se come, quitar alucinaciones al final ("¡Gracias!"). Puntuación mínima para partir líneas.
5. **`build.mjs`**: copiar el de la plantilla y reescribir tres bloques: CSS de escenas, HTML de
   `#stage`, timeline entre `// ---- escenario` y `// ---- karaoke`; más portada, cita del cierre
   y los tiempos de `punch`. Los tiempos de escena son *tiempo del clip + 0.3*, sumados a `BO`.
6. `node build.mjs && npx hyperframes@0.8.27 check .` — se ignoran los `content_overlap` entre
   portada/cierre y cuerpo (tapan opaco). Los `gsap_css_transform_conflict` sí se arreglan:
   nada de `transform` en CSS si GSAP lo anima; se pone con `tl.set(..., 0)`.
7. `npx hyperframes@0.8.27 render .` → `renders/*.mp4` (sin audio).
8. **Música nueva** de Openverse/Jamendo (`scripts/bgm/`), medida con `medir-bgm.mjs`; el crédito
   CC BY va en `<letra>-<tema>.txt` junto al mp4. Nunca repetir pista. A bliss le gustó
   zero-project ("High hopes"): BPM bajo con levantada, clímax bajo el cierre.
9. `docs/shorts-taller/mix.sh clip.mp4 bgm.mp3 render.mp4 salida.mp4 TOTAL OUT_IN [corte]`
   — voz −15, cama −26 con sidechain, golpes en las persianas, ganancia a −14.5 LUFS, mux con
   `-c:v copy`. Imprime LUFS, negros y start_time **del archivo entregado**.
10. Hoja de contactos con ffmpeg `-ss t` + PIL y revisarla con los ojos: lo que se sale del panel,
    lo que se pisa, la portada partida en más líneas de las que caben.
11. Entregar en `~/Desktop/shorts-sesion-N/` como `<letra>-<tema>.mp4` + `.txt`, y `open -R`.

## Trampas ya pagadas

- `hyperframes snapshot` sirve para layout, no para sincronía: verificar tiempos sobre el render.
- En zsh, `$T[v]` dentro del filtro de ffmpeg es un subíndice: escribir `${T}`.
- Una etiqueta de filtro usada dos veces necesita `asplit`.
- `<video>` sin `id` renderiza congelado; el root necesita `data-composition-id`, `data-width` y `data-height`.
- `.env` del proyecto no se puede `source`: leer cada clave con `grep | cut`.
- El texto de Archivo Black a 190 px no cabe en dos palabras: 126 px y `white-space: nowrap`.
- `textContent` y `fontSize` no se animan con GSAP (reflow): cambiar el texto con `duration: .01`
  y fijar el tamaño en CSS.

## Sesión 2 (3 sep 2026) — los diez

| # | Archivo | Corte | Total | Música (CC BY) |
|---|---|---|---|---|
| A | a-mal-consejo | — | — | (sesión anterior) |
| B | b-computadora | 40:03 → 41:16 | 84.5 s | Qvimera ft BXe |
| C | c-rey-efimero | 18:18 → 19:00 | 53.7 s | Massive Beat |
| D | d-dopamina | 87:08 → 88:24 | 87.7 s | Sculpt |
| E | e-hackeada | 111:02 → 111:53 | 62.9 s | Heart beat |
| F | f-websocket | 44:19 → 44:55 | 47.4 s | Tear My Dreams Away — Blindmoore |
| G | g-herramienta | 97:35 → 98:32 | 68.1 s | High hopes — zero-project |
| H | h-frontend | 102:51 → 103:27 | 47.6 s | Silence — zero-project |
| I | i-hora-pico | 93:59 → 94:18 + 94:23 → 94:40 | 47.0 s | Upbeat Corporate — Soundrider/Dope |
| J | j-chatgpt-falso | 104:14 → 104:45 | 41.9 s | Blind Love Dub (Jeris Mix) — ccMixter |

Los proyectos HyperFrames de cada uno vivieron en el scratchpad de la sesión de Claude Code del
4 sep; lo reutilizable está en `template/` (es el del F, el más limpio).
