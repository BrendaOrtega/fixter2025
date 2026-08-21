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

## Ya no queda nada a mano (2026-08-14)

Los tres pasos de arriba son ahora **automáticos**. El room de Ghosty Teams guarda el id del
taller (se pega una vez, en los ajustes del canal) y al detener la grabación:

1. Teams pide a `POST /api/ingest/recording` con `intent:"draft"` → se crea el `Video` en
   BORRADOR y devuelve su id. ⚠️ Es lo PRIMERO: ese id va dentro de la llave de todos los
   objetos que se van a subir.
2. Con él arma el `hlsPrefix` y se lo pasa a la caja, que transcodifica y sube.
3. Cuando el HLS está listo, `intent:"ready"` cierra la fila (`m3u8`, portada, duración) y
   guarda el `Transcript` con segmentos y quién hablaba — de ahí salen los subtítulos, los
   capítulos y el buscador del curso.

Autenticación: HMAC con `FIXTERGEEK_PARTNER_SECRET` (canonical `${ts}.${body}`, ventana de
5 min), secreto PROPIO — no se comparte el de plataforma con un tercero.

⚠️ **La transcripción puede llegar tarde**: whisper tarda ~1/4 de lo que dure el audio y el
vídeo se publica en cuanto el HLS está. En ese caso la publicación queda en `partial` y se
completa cuando alguien vuelve a abrir el room. El disco de la caja no se libera hasta que
están las dos cosas: borrar antes se lleva el `transcript.json`, y el audio vivía ahí.

⚠️ **Cada grabación es una pieza distinta**: el slug lleva fecha Y HORA. Con sólo la fecha,
dos grabaciones del mismo día caían en el mismo `upsert` y la segunda sobrescribía a la
primera, dejando un vídeo apuntando al HLS de otro.

`scripts/link-hls-remote.ts` se queda para lo que ya existe y para reparar a mano.

## Borrar: dos ciclos de vida

- **En el room** se borra la SALA: el MP4 original, su transcripción y la fila. La pieza del
  curso NO se toca.
- **En `/admin/programas/<slug>`** se borra la pieza Y sus archivos del bucket
  (`app/.server/video-files.ts`).

Es a propósito: limpiar un room no puede despublicar algo que la gente está viendo.

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

## Después de publicar: lo que NO se actualiza solo

Anotado el **2026-08-21**, después de publicar el webinar 2 (sandboxing). El pipeline deja
la pieza lista dentro del curso y ahí se detiene. Todo lo que la anuncia hacia afuera sigue
apuntando al webinar anterior, y nadie avisa — la landing se ve perfecta, sólo que
promociona la grabación vieja.

**Repasar en este orden, con la pieza ya revisada:**

1. **Abrirla.** Nace en `isPublic: false` a propósito: un webinar arranca con minutos de
   sala vacía. Mientras siga cerrada, cualquier enlace que le pongas a la landing lleva a
   un 404.
2. **Verificar que el vídeo REPRODUCE**, no que la fila diga `ready`. Son cosas distintas:
   una fila `ready` apuntando a un bucket vacío deja el reproductor en negro sin decir por
   qué. Pasó el 20-ago-2026.
3. **La landing del taller** — `app/routes/sistemas-agenticos.tsx`. La constante
   `WEBINAR_RECORDING_SLUG` alimenta DOS bloques: la tarjeta «¿Te perdiste el primero?
   Míralo completo» junto al formulario, y el estado «Esta serie de webinars ya terminó».
   Con más de una grabación publicada, «el primero» deja de ser cierto y el copy hay que
   reescribirlo, no sólo cambiar el slug.
4. **La portada.** La fila la trae puesta, y aun así el admin puede decir «sin portada»:
   la caja sube el `poster.jpg` **sin ACL**, y en Tigris eso son 403 por URL directa. Los
   vídeos no lo notan porque van por presigned; las imágenes se sirven directo y sí lo
   notan. Se arregla copiando el objeto sobre sí mismo con `ACL: public-read` y
   `MetadataDirective: REPLACE` — es la única forma de cambiarle la ACL a algo que ya
   existe. Comprobarlo con un `curl` a la URL cruda, no mirando la fila.
5. **Los capítulos**, si el transcript llegó sin ellos. Un transcript sin capítulos es un
   caso normal —los genera quien publica—, y el panel del viewer se comporta distinto:
   sin ellos la transcripción ocupa el panel entero, con ellos es una ventanita de karaoke
   debajo de la lista (`app/components/viewer/TranscriptPanel.tsx`).

⚠️ **Lo del punto 3 no tiene test ni aviso.** El día que se publique el webinar 3, esa
tarjeta seguirá ofreciendo la grabación del 13 de agosto a quien acaba de perderse la del
27, y la landing se verá impecable mientras lo hace.
