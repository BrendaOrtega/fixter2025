# Receta: shorts 3D de Ghosty (cuartito low-poly)

Dos shorts hechos así y aprobados por el equipo (27-oct-2026, «les han gustado mucho»):

| Short | Carpeta | Entregable |
|---|---|---|
| «Ghosty te trae todo» (18 s) | `../../ghosty-3d-te-necesito/` | `short/renders/ghosty-te-trae-todo.mp4` |
| «Tú inicias sesión» (32 s, caja segura + toma de control de la app 1.0.16) | `../../ghosty-3d-inicia-sesion/` | `short/renders/ghosty-inicia-sesion.mp4` |

Para uno nuevo: copiar la carpeta de `ghosty-3d-inicia-sesion/` (la más completa) y cambiar guion, tiempos y overlays.

## Look aprobado (no moverlo sin pedirlo)

- Ghosty **sin contorno y sin toon**: `makeGhosty3D({..., outline: false, toon: false})` → vinil mate.
  Las líneas negras se veían como «dos estilos distintos» junto al cuarto con luz suave (Brenda).
- Ojos negros **planos**: sin brillo ni punto blanco. Chapitas lavanda difuminadas (gradiente radial).
- Props low-poly kawaii de la comunidad, nunca improvisados: Kenney Furniture Kit (CC0) y el osito
  «Bear» de jiang liu (Poly Pizza, CC BY 3.0, crédito obligatorio) en `_shared/peluche/`.
  Rechazados: el bear de Kenney (raro), un peluche realista de Sloyd (feo) y uno con cara de «conejo satánico».
- Ghosty **nunca da la espalda** y no saca corazones: es un agente de IA; reacciona a trabajo (entregas, palomitas).
- La «toma» de sorpresa (anticipación–estirón–rebote) **todavía no convence a bliss**: proponer otra antes de reusarla.

## 1. El cuarto (Blender headless)

`ghosty-3d-te-necesito/cuarto/armar.py`:

- `blender -b -P armar.py -- vista` → render rápido para revisar el acomodo (muebles de frente, nada atravesado).
- `blender -b -P armar.py -- hornear` → luz global (Cycles, Metal) horneada a `cuarto.png` (4096) y `cuarto.glb`.
- Las piezas que se mueven (plantas, lámparas, monitor) se separan como nodos `anim_*` con el pivote en la base.
- Ejes: Blender (x,y,z) → three (x, z, −y). El frente de Kenney mira a −y.
- Un glTF importado queda en cuaterniones: poner `rotation_mode = "XYZ"` o rotarlo no hace nada.

## 2. La escena (three.js en el navegador)

`escena/index.html` + `ambient.js` (vida del cuarto) + `ui2d.js` (UI dibujada en canvas: formulario, botones, toques, palomita).

- Todo es función de `t`: `?t=12.5` congela un cuadro; `?seq=1` expone `window.__frame(i)` para el render.
- Cámara: llaves polares `{t, az, r, y, at, fov, hold}` con Hermite; `hold: true` = tangente cero (sin rebote).
- Tarjetas que miran a cámara: `quaternion = camera.quaternion * rollZ`, nunca `rotation.z` (se voltean).
- Pantalla del monitor: normal forzada a `(0,0,-1)`; el promedio caía en el dorso y el texto salía al revés.
- Tarjetas con texto: el ancho sale de `measureText`, nunca fijo («facturas» se salía).
- Subtítulos: overlay HTML desde `subs.json` (karaoke de una línea, 72 px); se suben arriba cuando el plano
  cerrado ocupa la parte baja.
- Revisar sin render: `node foto.mjs "<carpeta>/escena/?t=7.2" verif/x.png 540 960` y hojas de contacto con
  `ffmpeg hstack/vstack` (no hay ImageMagick ni drawtext).

## 3. Render y audio (`short/`)

1. `gen-voice.sh` → voz em_santa por frase (`npx hyperframes@0.8.212 tts -v em_santa -l es`), anglicismos
   fonéticos («Gósti»). Transcribir cada frase **por separado** (`npx hyperframes transcribe … -l es --json`) y
   sacar `words.json` / `subs.json` y los tiempos de la escena de esas palabras.
2. `cues.json` → tiempos de voz, whooshes, pops, toques, aviso.
3. `node render.mjs <seg> renders/mudo.mp4` (puppeteer + chrome-headless-shell de hyperframes con
   swiftshader → ffmpeg; ~5 min para 32 s).
4. `./mix.sh` → arma `voz.sh` + `synth.py` (música y SFX sintetizados con numpy: Openverse no respondía) y
   mezcla: voz −15 LUFS, cama −26 con sidechain por la voz, SFX 0.7, ganancia fija + alimiter. Verifica sobre el
   entregado: `start_time` 0, `blackdetect`, LUFS y RMS por ventana.
5. `open -R` del entregado. Créditos en `short/CREDITOS.txt`.

## Pendiente

- Fecha en el CTA de los dos shorts (no se ha dado).
- Una animación de sorpresa que sí convenza.
