# Grabación del webinar → primer video del curso de sistemas agénticos

Anotado el **2026-08-13**.

## Qué es

La grabación de la llamada del webinar de sistemas agénticos (Ghosty Teams / LiveKit).
Va a ser el **primer video del curso nuevo de sistemas agénticos**, publicado aquí en
`fixter2025` con **HLS**.

## Dónde está el archivo

- **Disco duro (la copia buena):** `~/Downloads/grabacion-e945719a.mp4`
  - 2.2 GB · 4520 s (1 h 15 min) · verificado con `ffprobe`, no está truncado.
- **Enlace firmado en Tigris — CADUCA EL 2026-08-21** (7 días desde el 2026-08-14):
  `https://t3.storage.dev/ghosty-teams/t3/e945719a-4005-4572-b6cc-db20750d61ec-mssb2q1h-cc2ad2.mp4?…`
  Pasada esa fecha hay que pedir una URL firmada nueva desde Ghosty Teams; el objeto sigue
  en el bucket, lo que vence es la firma.

⚠️ Bajarlo a toda velocidad **tumba el internet de casa** (2.2 GB). Si hay que volver a
bajarlo: `curl -L -C - --limit-rate 3M --retry 30 --retry-all-errors -o <archivo> "<url>"`.
`-C -` reanuda desde donde quedó, así que un corte no cuesta nada.

## Lo que NO hay que construir: el HLS ya existe en este repo

| Pieza | Dónde |
|---|---|
| Transcode a HLS | `app/.server/services/video-processor.ts` |
| Subida / storage | `app/.server/services/s3-video.ts` |
| Playlist y segmentos | `app/routes/playlist.$storageKey.m3u8.tsx` · `playlist.$storageKey.$segment.tsx` |
| Proxy | `app/routes/api/hls-proxy.tsx` |
| Player | `app/hooks/useSecureHLS.ts` · `app/components/viewer/VideoPlayer.tsx` |

El trabajo real es: transcodificar el mp4, subir los segmentos, y crear la fila del
curso + lección para que aparezca en `courseViewer`.
