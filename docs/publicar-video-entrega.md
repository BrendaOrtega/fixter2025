# Publicar el video de una entrega

De un `.mov` exportado de Final Cut a una lección visible en el viewer, con
transcripción, capítulos y su correo de la secuencia.

Ejemplo real: la entrega 2 de "Introducción a los agentes de IA"
(`grok_interfaz_web_02.mov`, 40 min, 1080p30, 2.1 GB).

---

## 0. Medir la fuente

```bash
ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height,sample_aspect_ratio,display_aspect_ratio \
  -show_entries format=duration -of default=nw=1 entrada.mov
```

`sample_aspect_ratio=1:1` significa píxeles cuadrados y el transcode no tiene que
corregir nada. Algunas grabaciones vienen **anamórficas** (SAR 4:3): el script de
transcode ya lo maneja, pero conviene saberlo antes de que la imagen salga
estirada.

La duración en minutos se usa tal cual en el campo `duration` del Video.

---

## 1. Crear la fila del Video — **antes de subir nada**

El `videoId` forma parte de las keys de S3
(`fixtergeek/videos/<courseId>/<videoId>/hls/...`), así que la fila va primero.

Se copia `scripts/create-arnes-minimo-video.ts` cambiando slug, título,
duración y descripción. Lo que importa:

| Campo | Valor | Por qué |
| --- | --- | --- |
| `accessLevel` | `"sequence"` | Los videos completos viven en el viewer y **el acceso es solo por la secuencia**. Ver `app/.server/videoAccess.ts`. |
| `moduleName` | el nombre de la secuencia | Cada secuencia entra al curso como su propio capítulo. |
| `index` | solo al **crear** | Decide el orden en el viewer y se ajusta a mano; pisarlo al actualizar manda la pieza al final. |
| `processingStatus` | `"pending"` | Lo cierra la subida del HLS. |

```bash
npx tsx --env-file=.env scripts/create-interfaz-web-video.ts
# imprime el courseId y el videoId que necesitan los pasos 3 y 4
```

La relación con el curso se guarda **en los dos lados** (`Video.courseIds` y
`Course.videoIds`): si falta cualquiera, la pieza queda invisible en el viewer o
en el admin.

---

## 2. Transcripción

```bash
# audio mono a 16 kHz, que es lo que quiere whisper
ffmpeg -y -v error -i entrada.mov -vn -ac 1 -ar 16000 -c:a pcm_s16le audio.wav

whisper-cli -m ~/.whisper-models/ggml-small.bin -f audio.wav -l es -pp \
  -of transcript -otxt --output-vtt > whisper.log 2>&1
```

**Trampa:** el `.txt` que escribe `whisper-cli` sale **sin marcas de tiempo**, y
`import-transcript.ts` las exige. Las marcas están en el **stdout**, que quedó en
`whisper.log`:

```bash
grep -E '^\[[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]+ --> ' whisper.log > transcript-marcas.txt
```

### Corregir los errores de oído antes de importar

Whisper se equivoca siempre en lo mismo, y el peor es que **oye "la gente" donde
se dijo "el agente"** — 35 veces en un video de 40 minutos. Otros habituales:

| Whisper oye | Es |
| --- | --- |
| la gente / al agente | el agente |
| Ridmy, Ridmi | README |
| play write | Playwright |
| Claudio Cot | Claude Code |
| Step Suell | Steve Sewell |
| Builder I/O | Builder.io |
| bit | Vite |

Se corrigen con un reemplazo por expresión regular **en Node, no con `sed`**: el
`sed` de macOS no acepta la bandera `I` de insensible a mayúsculas y se queda sin
aplicar nada, en silencio y con estado de salida cero.

```bash
npx tsx --env-file=.env scripts/import-transcript.ts <videoSlug> transcript-limpio.txt
```

Los capítulos se generan solos y quedan bien: sirven de índice en el viewer y de
guion para el correo.

---

## 3. HLS

```bash
bash scripts/transcode-hls-local.sh entrada.mov /ruta/salida-hls
```

Tres calidades (1080p `copy`, 720p y 480p re-encodeadas por hardware) más el
`master.m3u8`. Un video de 40 minutos toma unos minutos y ocupa ~2.7 GB.

### La subida: **por calidad, nunca de un jalón**

```bash
npx tsx --env-file=.env scripts/upload-hls-local.ts <courseId> <videoId> <dirHLS> --only=480p --skip-db
npx tsx --env-file=.env scripts/upload-hls-local.ts <courseId> <videoId> <dirHLS> --only=720p --skip-db
npx tsx --env-file=.env scripts/upload-hls-local.ts <courseId> <videoId> <dirHLS> --only=1080p
```

**Por qué así, y no en una sola corrida:** son ~730 archivos y el proceso tarda
más que un turno. Lanzado con `nohup ... &` el proceso **muere al terminar el
turno**, y muere sin ruido: sale con código 0, deja el log con solo la línea de
apertura y la fila del Video intacta. En dos intentos así subió 43 y 86 de 727
archivos, y las dos veces pareció haber terminado bien.

Partirlo por calidad hace que cada corrida quepa en un turno. `--skip-db` deja la
fila del Video sin cerrar hasta la última, que es la que la marca como lista.

**Verificar contando, no leyendo el log** — el log miente cuando el proceso muere:

```bash
find /ruta/salida-hls -type f | wc -l        # lo que debería haber
# y contra S3, listando el prefijo del video con ListObjectsV2 y paginando
```

---

## 4. Póster

La miniatura se dibuja a mano (HTML + CSS, sin imágenes generadas) copiando
`videos/grok-arnes-intro/thumb/`, y se renderiza con Chrome headless:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless \
  --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --window-size=1280,720 --screenshot=renders/thumb.png "file://$PWD/index.html"
```

Reglas que ya costaron caro:

- **Nada importante en los últimos ~140 px**: los controles de YouTube los tapan.
- Los círculos de color necesitan `filter: blur(...)`; sin eso se leen como una
  mancha plana pegada encima del fondo.
- La retícula morada y el retrato se repiten en toda la serie: es lo que hace que
  se reconozca de lejos.

Para el correo, un JPG de 1200 px de ancho pesa ~58 KB:

```bash
ffmpeg -y -v error -i thumb.png -vf scale=1200:-2 -q:v 6 poster-email.jpg
```

Se sube a Tigris con **`ACL: "public-read"`** — en un correo no hay quien firme
una URL, y sin ACL la imagen da 403 y el correo sale con un hueco.

---

## 5. El correo de la entrega

El script de la secuencia (`scripts/update-agentes-sequence-3-4.ts`) es
idempotente y hace upsert por `order`. Dos cosas aprendidas a golpes:

- **`delayDays` no se toca al actualizar.** La espera se acomoda a mano desde el
  riel de `/secuencias/:id`, y pisarla desde el script borra ese ajuste en
  silencio — se ve como si la UI no guardara.
- **El copy se escribe con el transcript enfrente.** El titular que uno imagina
  antes de ver el video casi nunca es el de la sesión: aquí lo que había que
  contar era spec-driven y Agent Native, no el detalle del cajón.

---

## Orden recomendado

Transcode y transcripción corren **en paralelo** con lo demás; la subida del HLS
es lo único que hay que vigilar.

1. Medir la fuente
2. Crear la fila del Video → anotar `courseId` y `videoId`
3. Lanzar el transcode **y** la transcripción
4. Importar el transcript (con las correcciones aplicadas)
5. Subir el HLS por calidad, verificando por conteo
6. Miniatura → PNG para el viewer, JPG público para el correo
7. Actualizar el correo con la card real y el póster
