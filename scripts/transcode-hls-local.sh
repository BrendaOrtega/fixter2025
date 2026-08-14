#!/usr/bin/env bash
# Transcodifica un mp4 a HLS multi-calidad, con el MISMO layout que produce
# `app/.server/services/video-processor.ts` (mismas calidades, mismos nombres de
# archivo, mismo master.m3u8), para poder subirlo a mano con
# `scripts/upload-hls-local.ts`.
#
# Por qué a mano: el job de Agenda `process_video_hls` tiene lockLifetime de 10
# minutos y un video de más de una hora en tres calidades no cabe ahí.
#
# Diferencia deliberada con el server: aquí se usa `h264_videotoolbox` (el
# encoder por hardware del Mac) en vez de libx264. libx264 tardaría horas; el
# hardware va varias veces más rápido a bitrate equivalente.
#
#   bash scripts/transcode-hls-local.sh <entrada.mp4> <directorio-salida>
set -euo pipefail

IN="${1:?falta el mp4 de entrada}"
OUT="${2:?falta el directorio de salida}"

mkdir -p "$OUT"

# 1080p NO se recodifica: la grabación ya viene 1920x1080 h264/aac a ~4 Mbps.
# Segmentarla con `-c copy` es casi instantáneo y además conserva la calidad
# original — recodificarla costaba tres horas para quedar PEOR.
echo "🎞️  1080p (copy, sin recodificar)…"
mkdir -p "$OUT/1080p"
ffmpeg -y -hide_banner -loglevel warning -stats \
  -i "$IN" -c copy \
  -f hls -hls_time 10 -hls_list_size 0 \
  -hls_segment_filename "$OUT/1080p/seg_%03d.ts" \
  "$OUT/1080p/1080p.m3u8"

# Las dos chicas sí se recodifican (encoder por hardware del Mac).
# name  ancho  alto  bitrate_video  bitrate_audio
QUALITIES=(
  "720p  1280  720 2800k 128k"
  "480p   852  480 1400k 128k"
)

for q in "${QUALITIES[@]}"; do
  read -r NAME W H VB AB <<< "$q"
  DIR="$OUT/$NAME"
  mkdir -p "$DIR"
  echo "🎞️  $NAME ($W x $H, $VB)…"
  # -force_key_frames cada 10s: sin keyframes alineados, hls_time es una
  # sugerencia y los segmentos salen de duración despareja.
  ffmpeg -y -hide_banner -loglevel warning -stats \
    -i "$IN" \
    -vf "scale=$W:$H" \
    -c:v h264_videotoolbox -b:v "$VB" -maxrate "$VB" -bufsize "$VB" \
    -force_key_frames "expr:gte(t,n_forced*10)" \
    -c:a aac -b:a "$AB" \
    -f hls -hls_time 10 -hls_list_size 0 \
    -hls_segment_filename "$DIR/seg_%03d.ts" \
    "$DIR/$NAME.m3u8"
done

# Idéntico a generateMasterPlaylist() del video-processor: rutas relativas, que
# es lo que /api/hls-proxy sabe reescribir.
cat > "$OUT/master.m3u8" <<'EOF'
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=4200000,RESOLUTION=1920x1080
1080p/1080p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720
720p/720p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=852x480
480p/480p.m3u8
EOF

echo "✅ HLS listo en $OUT"
du -sh "$OUT"
