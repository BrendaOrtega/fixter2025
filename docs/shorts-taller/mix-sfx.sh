#!/usr/bin/env bash
# Monta la pista de efectos encima de un short ya mezclado por mix.sh, sin tocar el video.
# Uso: mix-sfx.sh <short.mp4> <sfx.wav> <salida.mp4> <TOTAL>
set -euo pipefail
IN=$1; SFX=$2; OUT=$3; T=$4; TMP=$(mktemp -d)
ffmpeg -y -loglevel error -i "$IN" -i "$SFX" -filter_complex "[1:a]volume=0.45,apad=whole_dur=${T}[s];[0:a][s]amix=inputs=2:normalize=0:duration=first,volume=-0.8dB,alimiter=limit=0.89[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -t "$T" "$OUT"
echo "LUFS: $(ffmpeg -i "$OUT" -af ebur128 -f null - 2>&1 | grep -E "^\s+I:" | tail -1 | awk '{print $2}')"
