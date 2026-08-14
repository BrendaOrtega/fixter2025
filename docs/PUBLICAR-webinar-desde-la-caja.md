# Publicar un webinar sin que los bytes pasen por tu casa

Anotado el **2026-08-14**. Sustituye a la cadena manual de `transcode-hls-local.sh` +
`upload-hls-local.ts`, que sigue existiendo y sirve para vídeo que NO salga de un webinar.

## El problema que esto elimina

Publicar el webinar del 13-ago costó bajar un **MP4 de 2.2 GB** a la laptop (a toda
velocidad tumbaba el internet de casa: hubo que topar `curl --limit-rate 3M`),
transcodificar local y volver a subir **3.6 GB** en ~1,360 objetos. Casi 6 GB cruzando una
conexión doméstica para mover bytes que ya vivían en un servidor y acababan en otro.

Hoy la caja del evento (`livekit-svc`) genera el HLS y lo sube **ella misma** al bucket de
fixtergeek. Esta laptop sólo escribe una fila en la base.

## Lo que hace la caja, y por qué no cuesta nada

- **El 1080p sale del MISMO encode que la grabación** (`ffmpeg -f tee`): es una copia de
  stream, no un segundo encoder, así que no le quita CPU al evento en vivo. Recodificarlo
  tardaba ~3 h y quedaba peor — medido.
- **720p y 480p se hacen al PARAR**, en segundo plano. Nadie espera.
- Los headers de cada objeto son **exactamente** los de `upload-hls-local.ts`
  (`application/x-mpegURL` + `no-cache` para los `.m3u8`, `video/MP2T` +
  `private, max-age=1800` para los `.ts`): el proxy de HLS y hls.js dependen de ellos.

## Los tres pasos

1. **Crea el Video** en fixtergeek y apunta `courseId` y `videoId`.
2. **Al detener la grabación**, manda el prefijo de destino:

   ```jsonc
   { "action": "stop", "hls": true,
     "hlsPrefix": "fixtergeek/videos/<courseId>/<videoId>/hls" }
   ```

   Es el mismo layout que produce el subidor local, así que nada más de fixtergeek cambia.
   El estado se consulta con `{ "action": "hls-status", "file": "<id>.mp4" }` →
   `pending | running | ready | failed`.

3. **Apunta la fila** (esta laptop, sin subir nada):

   ```bash
   npx tsx scripts/link-hls-remote.ts <courseId> <videoId> --check
   ```

   `--check` comprueba que el `master.m3u8` esté realmente en el bucket antes de marcar
   `ready`. ⚠️ Una fila `ready` apuntando a un objeto que no existe deja el reproductor en
   NEGRO sin decir por qué, y eso se descubre con público delante.

## Credenciales

La caja sube al bucket de **fixtergeek**, no al de gs. Lo decide su env, que manda sobre el
storage de casa:

| Variable | Valor |
|---|---|
| `HLS_ENDPOINT` | `https://t3.storage.dev` |
| `HLS_BUCKET` | `wild-bird-2039` |
| `HLS_ACCESS_KEY_ID` / `HLS_SECRET_ACCESS_KEY` | las de fixtergeek |
| `HLS_REGION` | `auto` |

Sin ellas cae al storage de gs, que **no es** donde fixtergeek busca sus vídeos.

⚠️ El destino lo manda quien para la grabación (`hlsPrefix`), nunca la caja: una caja de
llamadas no tiene por qué saber qué es un curso.

## Qué queda a mano, a propósito

Crear el Video y correr el script del paso 3. Automatizarlo (un webhook que cierre la fila
al terminar la conversión) es trabajo aparte y no urge: lo caro era mover 6 GB, no escribir
una fila.

## Del otro lado: cómo se sirve

Actualizado el **2026-08-14**. Los segmentos que sube la caja ya **no** cruzan la máquina de
Fly: `/api/hls-proxy` responde 302 al presigned de Tigris. Dos cosas que importan para este
flujo:

- Los headers que pone la caja siguen siendo los correctos, pero ahora sólo los usa el
  `.m3u8`; los `.ts` los sirve Tigris directo.
- El proxy **exige un token firmado en todas sus ramas**. La URL la arma el servidor
  (`app/.server/hls.ts`), así que basta con que la fila apunte al `master.m3u8`: nada que
  cambiar en la caja ni en `link-hls-remote.ts`.

Detalle completo en `docs/TODO-hls-proxy-302.md`.
