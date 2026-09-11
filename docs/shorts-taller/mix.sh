#!/usr/bin/env bash
# Mezcla de audio y mux de un short del taller.
# Uso: mix.sh <clip.mp4> <bgm.mp3> <render.mp4> <salida.mp4> <TOTAL> <OUT_IN> [corte_interno_s]
#   clip.mp4   → el corte de la grabación (voz)
#   bgm.mp3    → pista de Openverse/Jamendo (nueva en cada short, nunca al repo)
#   render.mp4 → lo que sacó `hyperframes render`
#   TOTAL      → duración del short; OUT_IN → segundo en que entra el cierre
#   corte_interno_s → opcional: segundo (en el short) de una persiana a mitad del cuerpo
#   bgm_desde_s     → opcional (default 3): dónde empieza a sonar la pista. La cama debe
#                     entrar YA con ritmo: medir con medir-bgm.mjs dónde levanta y arrancar
#                     ahí, para que el pulso llegue antes del segundo 2 del short.
set -euo pipefail
CLIP=$1; BGM=$2; RENDER=$3; OUT=$4; T=$5; OUT_IN=$6; MID=${7:-}; BGSS=${8:-3}
HERE=$(cd "$(dirname "$0")" && pwd)
TURN=$HERE/sfx/turn.wav        # riser 1.1 s + golpe grave: dura lo que dura la persiana
BO=4.4                         # la portada dura 4.4 s; el cuerpo arranca aquí
TMP=$(mktemp -d)

# voz a −15 LUFS, cama a −26 LUFS con fade de salida bajo el cierre
ffmpeg -y -loglevel error -i "$CLIP" -vn -af "loudnorm=I=-15:TP=-1.5:LRA=11" -ar 48000 -ac 2 "$TMP/voice.wav"
ffmpeg -y -loglevel error -ss "$BGSS" -t 90 -i "$BGM" -af "loudnorm=I=-26:TP=-3:LRA=11,afade=t=in:d=0.35,afade=t=out:st=$(python3 -c "print($T-2.5)"):d=2.5" -ar 48000 -ac 2 "$TMP/bgm.wav"

# golpes de transición: 3.85 s (entra el cuerpo), OUT_IN−0.62 (entra el cierre) y el corte interno si lo hay
T1=3850; T2=$(python3 -c "print(int(($OUT_IN-0.62)*1000))")
HITS="[2:a]adelay=${T1}:all=1,apad=whole_dur=${T}[t1];[2:a]adelay=${T2}:all=1,apad=whole_dur=${T}[t2]"; INS="[t1][t2]"; N=4
if [ -n "$MID" ]; then HITS="$HITS;[2:a]adelay=$(python3 -c "print(int($MID*1000))"):all=1,apad=whole_dur=${T}[t3]"; INS="[t1][t2][t3]"; N=5; fi

# la cama se agacha bajo la voz (sidechain); todo con apad antes de amix; nunca $T[v] en zsh: usar ${T}
ffmpeg -y -loglevel error -i "$TMP/voice.wav" -i "$TMP/bgm.wav" -i "$TURN" -filter_complex \
  "[0:a]adelay=$(python3 -c "print(int($BO*1000))"):all=1,apad=whole_dur=${T},asplit=2[va][vb];[1:a]atrim=0:${T},apad=whole_dur=${T}[bg];${HITS};[bg][va]sidechaincompress=threshold=0.02:ratio=8:attack=8:release=500[bd];[vb][bd]${INS}amix=inputs=${N}:normalize=0:duration=first[m];[m]atrim=0:${T}[out]" \
  -map "[out]" -ar 48000 "$TMP/premix.wav"

# ganancia fija a −14.5 LUFS + limitador, y mux sin recodificar el video
L=$(ffmpeg -i "$TMP/premix.wav" -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+I:" | tail -1 | awk '{print $2}')
G=$(python3 -c "print(round(-14.5-($L),2))")
ffmpeg -y -loglevel error -i "$TMP/premix.wav" -af "volume=${G}dB,alimiter=limit=0.84" "$TMP/mix.wav"
ffmpeg -y -loglevel error -i "$RENDER" -i "$TMP/mix.wav" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -t "$T" "$OUT"

# verificación sobre el archivo entregado, no sobre el render
echo "LUFS: $(ffmpeg -i "$OUT" -af ebur128 -f null - 2>&1 | grep -E "^\s+I:" | tail -1 | awk '{print $2}')"
echo "negros: $(ffmpeg -i "$OUT" -vf blackdetect=d=0.05:pic_th=0.98 -an -f null - 2>&1 | grep -c black_start || true)"
ffprobe -v error -select_streams v -show_entries stream=start_time,width,height,duration -of csv=p=0 "$OUT"
rm -rf "$TMP"
