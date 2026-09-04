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

# El ancho NO se fija: se deriva de la altura con `scale=-2:H`, que conserva el
# aspecto de la fuente. Fijarlo a 1280x720 deformaba cualquier grabación que no
# fuera 16:9 — y las hay 4:3, que es como sale una pantalla compartida.
# OJO con el aspecto: una grabación puede venir ANAMÓRFICA —píxeles no
# cuadrados— y entonces su tamaño de archivo no es el tamaño con el que se ve.
# Un 1440x1080 con SAR 4:3 se muestra como 1920x1080; escalarlo por sus píxeles
# lo aplasta. Lo que manda es el DAR, y las variantes salen con setsar=1 para
# que a partir de ahí ya sean píxeles cuadrados.
SRC_W=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$IN")
SRC_H=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$IN")
DAR=$(ffprobe -v error -select_streams v:0 -show_entries stream=display_aspect_ratio -of csv=p=0 "$IN")
DAR_N=${DAR%%:*}; DAR_D=${DAR##*:}
if [ -n "$DAR_N" ] && [ "$DAR_N" != "N/A" ] && [ "$DAR_D" != "0" ]; then
  DISP_W=$(( SRC_H * DAR_N / DAR_D ))
else
  DISP_W=$SRC_W
fi
DISP_W=$(( (DISP_W + 1) / 2 * 2 ))
echo "📐 fuente: ${SRC_W}x${SRC_H} · se ve como ${DISP_W}x${SRC_H} (DAR ${DAR:-cuadrado})"

# La calidad máxima sale de la fuente: si ya trae píxeles cuadrados se copia
# —instantáneo y sin perder nada—, y si viene ANAMÓRFICA se recodifica a
# píxeles cuadrados. Copiarla en ese caso deja un 1440x1080 con SAR 4:3 dentro
# del HLS, y basta con que un reproductor ignore el SAR para que el video se
# vea aplastado. Es exactamente lo que estaba pasando.
SAR=$(ffprobe -v error -select_streams v:0 -show_entries stream=sample_aspect_ratio -of csv=p=0 "$IN")
if [ "$SAR" = "1:1" ] || [ "$SAR" = "N/A" ] || [ -z "$SAR" ]; then
  echo "🎞️  1080p (copy, píxeles ya cuadrados)…"
  mkdir -p "$OUT/1080p"
  ffmpeg -y -hide_banner -loglevel warning -stats \
    -i "$IN" -c copy \
    -f hls -hls_time 10 -hls_list_size 0 \
    -hls_segment_filename "$OUT/1080p/seg_%03d.ts" \
    "$OUT/1080p/1080p.m3u8"
  QUALITIES=(
    "720p 720 2800k 128k"
    "480p 480 1400k 128k"
  )
else
  echo "🎞️  fuente anamórfica (SAR $SAR): la máxima también se normaliza."
  QUALITIES=(
    "1080p 1080 8000k 192k"
    "720p 720 2800k 128k"
    "480p 480 1400k 128k"
  )
fi

for q in "${QUALITIES[@]}"; do
  read -r NAME H VB AB <<< "$q"
  # ancho proporcional, redondeado a par (lo que exige h264)
  W=$(( (DISP_W * H / SRC_H + 1) / 2 * 2 ))
  DIR="$OUT/$NAME"
  mkdir -p "$DIR"
  echo "🎞️  $NAME ($W x $H, $VB)…"
  # -force_key_frames cada 10s: sin keyframes alineados, hls_time es una
  # sugerencia y los segmentos salen de duración despareja.
  ffmpeg -y -hide_banner -loglevel warning -stats \
    -i "$IN" \
    -vf "scale=$W:$H,setsar=1" \
    -c:v h264_videotoolbox -b:v "$VB" -maxrate "$VB" -bufsize "$VB" \
    -force_key_frames "expr:gte(t,n_forced*10)" \
    -c:a aac -b:a "$AB" \
    -f hls -hls_time 10 -hls_list_size 0 \
    -hls_segment_filename "$DIR/seg_%03d.ts" \
    "$DIR/$NAME.m3u8"
done

# Idéntico a generateMasterPlaylist() del video-processor: rutas relativas, que
# es lo que /api/hls-proxy sabe reescribir. BANDWIDTH lleva el techo (-maxrate),
# no el promedio: con el promedio el reproductor escoge una calidad que no puede
# sostener y el video se congela en los segmentos pesados. De menor a mayor, para
# que el arranque sea por la ligera.
W720=$(( (DISP_W * 720 / SRC_H + 1) / 2 * 2 ))
W480=$(( (DISP_W * 480 / SRC_H + 1) / 2 * 2 ))
cat > "$OUT/master.m3u8" <<EOF
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=1400000,AVERAGE-BANDWIDTH=1400000,RESOLUTION=${W480}x480
480p/480p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2800000,AVERAGE-BANDWIDTH=2800000,RESOLUTION=${W720}x720
720p/720p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=8000000,AVERAGE-BANDWIDTH=8000000,RESOLUTION=${DISP_W}x${SRC_H}
1080p/1080p.m3u8
EOF

echo "✅ HLS listo en $OUT"
du -sh "$OUT"
