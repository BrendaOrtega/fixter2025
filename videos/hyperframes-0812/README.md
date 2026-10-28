# HyperFrames 0.8.212 — demos de lo nuevo (28-oct-2026)

Cada carpeta trae su demo y un README con comandos y veredicto.

| carpeta | qué | veredicto |
|---|---|---|
| `beats-audio/` | `beats` y `audio` | adoptar para medir la música; `beat-snap.js` se queda y toma el JSON de `beats`. `medir-bgm` dio un BPM equivocado (75 contra 112); sólo sirve ya para RMS y punch |
| `registry-smear-screen/` | `echo-smear`, `filmed-screen` | echo-smear: adoptar. filmed-screen: adoptar con el parche (`glow`, `grain` y `bg` como opciones); es lento |
| `shaders-blur/` | 30 shaders WebGPU, motion blur | sólo en piezas que rompen la caricatura plana a propósito o como fondo de EasyBits. Hay que parchear el bundle para usar varios shaders por documento. Sin GPU el render cambia |
| `audio-prores/` | `data-fx-chain`, `truepeak`, `--prores-profile 4444`, `check` de audio | se puede mezclar dentro de la composición, pero sin sidechain (la cama se agacha con una curva de volumen). ProRes 4444: adoptar |
| `tools-check/` | parakeet, `--to srt`, `remove-background`, `keyframes`/`snapshot`/`check --range` | large-v3 sigue de estándar y parakeet queda de segunda opinión. Adoptar las herramientas con `--range` y `keyframes --shot` |

Bug arreglado de paso: `alimiter` en ffmpeg 9 sube la ganancia solo → `:level=disabled` en `docs/shorts-taller/mix.sh` y `mix-sfx.sh`.
Pendiente: probar `beats` con una pista real de Jamendo (Openverse no respondió el 28-oct).
