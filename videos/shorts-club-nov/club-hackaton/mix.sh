#!/usr/bin/env bash
# Montaje del short club + hackatón: render mudo + voz em_santa por beat (tiempos de la partitura) + cama + efectos CC0 (sfx.wav).
# Voz −15 LUFS, cama −26 LUFS con sidechain (llave: la voz sola), efectos al 0.7 ya aplicado en sfx.py.
# apad=whole_dur en cada entrada, nunca -shortest, ganancia fija medida + alimiter (level=disabled); nada de loudnorm al final.
set -euo pipefail
cd "$(dirname "$0")"
BGM=${BGM:-assets/bgm/the-second-secret.mp3}; OFF=${OFF:-18}; F=${OUT:-club-hackaton.mp4}
DUR=$(python3 -c "import json;print(json.load(open('score.gen.json'))['duration'])")
TMP=$(mktemp -d)
python3 - "$TMP" <<'PY'
import json, subprocess, sys
tmp = sys.argv[1]; s = json.load(open("score.gen.json")); v = s["voice"]
ins = sum([["-i", x["file"]] for x in v], [])
fc = "".join(f"[{i}:a]aresample=48000,aformat=channel_layouts=stereo,adelay={int(round(x['t']*1000))}|{int(round(x['t']*1000))},apad=whole_dur={s['duration']}[v{i}];" for i, x in enumerate(v))
fc += "".join(f"[v{i}]" for i in range(len(v))) + f"amix=inputs={len(v)}:normalize=0:duration=longest[a]"
subprocess.run(["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", fc, "-map", "[a]", "-t", str(s["duration"]), f"{tmp}/voz-raw.wav"], check=True)
PY
ffmpeg -v error -y -ss $OFF -t $DUR -i "$BGM" -af "aresample=48000,aformat=channel_layouts=stereo,afade=t=in:d=0.4,afade=t=out:st=$(python3 -c "print(round($DUR-1.2,3))"):d=1.2" $TMP/bed-cut.wav
lufs() { ffmpeg -hide_banner -i "$1" -af ebur128 -f null - 2>&1 | awk '/^ +I:/{print $2}' | tail -1; }
gain() { python3 -c "print(round($1 - ($2), 2))"; }
GV=$(gain -15 "$(lufs $TMP/voz-raw.wav)"); GB=$(gain -26 "$(lufs $TMP/bed-cut.wav)")
echo "ganancias: voz ${GV} dB · cama ${GB} dB · efectos 0.7 (en sfx.py)"
ffmpeg -v error -y -i $TMP/voz-raw.wav -i $TMP/bed-cut.wav -i sfx.wav -filter_complex "\
[0:a]volume=${GV}dB,apad=whole_dur=${DUR},asplit=2[v][key];\
[1:a]volume=${GB}dB,apad=whole_dur=${DUR}[b];\
[b][key]sidechaincompress=threshold=0.02:ratio=6:attack=20:release=400[bd];\
[2:a]aresample=48000,apad=whole_dur=${DUR}[x];\
[v][bd][x]amix=inputs=3:normalize=0:duration=longest[a]" -map "[a]" -t $DUR $TMP/pre.wav
ffmpeg -v error -y -i renders/mudo.mp4 -i $TMP/pre.wav -filter_complex "[1:a]alimiter=limit=0.89:level=disabled,aresample=48000[a]" -map 0:v -map "[a]" -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -profile:v high -c:a aac -b:a 256k -ar 48000 -movflags +faststart $F
cp $TMP/voz-raw.wav renders/voz.wav
echo "start $(ffprobe -v error -select_streams v:0 -show_entries stream=start_time -of csv=p=0 $F) · dur $(ffprobe -v error -show_entries format=duration -of csv=p=0 $F) · negros $(ffmpeg -hide_banner -i $F -vf blackdetect=d=0.05:pic_th=0.98 -an -f null - 2>&1 | grep -c black_start || true) · LUFS $(lufs $F)"
