# Verificación OAuth de Google: permiso `youtube` (20-nov-2026)

Proyecto de Google `fixter-67253` (590084716663), app «Fixtergeek.com». El mismo cliente sirve al login y a
«Transmisión» de las comunidades (`club-live.server.ts`), que pide `https://www.googleapis.com/auth/youtube`.
El 20-nov Google contestó la solicitud pidiendo tres cosas. Correo: «[Action Needed] OAuth Verification
Request Acknowledgement».

| Pidió | Cómo quedó |
|---|---|
| Aviso de privacidad: con quién se comparten los datos de Google | `/aviso-de-privacidad#google` (es) y `#google-user-data` (en), sección 9 |
| Aviso: conservación y borrado | misma sección; «Desconectar» borra el token y lo revoca en Google (`revokeGoogleToken`) |
| Video demo del permiso funcionando | grabado con `rec`, en YouTube como oculto (liga abajo) |
| Cuenta de prueba sin bloqueos + pasos | comunidad `google-review` con su anfitrión y liga de acceso de 60 días |

## Lo que cambió en el producto
- **Cada comunidad tiene su sala**: `fx-<slug>-<día>` (`clubCallRoom(d, slug)`); la del club se llama igual que antes.
  Modera, graba y transmite el dueño de la comunidad o un correo de casa (`isCallHost`).
- **`Community.unlisted`**: fuera del directorio de la portada y sus transmisiones a YouTube salen como ocultas.
  El club sigue siempre público.
- **Destinos fijos de la caja**: el panel avisa si la caja de llamadas trae `RTMP_TARGETS` en su env, porque toda
  transmisión saldría también por ahí (`boxFixedTargets`).
- `?hl=en` en el panel (`/comunidad/<slug>/admin?tab=transmision&hl=en`) pone el consentimiento de Google en inglés.

## Cuenta de prueba
`npx tsx --env-file=.env scripts/google-review-community.mts --write` crea (o renueva) el anfitrión
`google-oauth-review@fixtergeek.com`, la comunidad `google-review` y la liga de acceso. La liga vence a los 60 días:
si Google tarda más, se vuelve a correr y se les manda la nueva.

Límites que el revisor comparte con el club (una sola caja de llamadas): un grabador a la vez y 3 salas con gente.
Si el revisor deja grabando, la caja se detiene sola a los 3 minutos sin nadie publicando.

## Pasos que se le mandan al revisor (inglés)
1. Open the access link and click the confirm button: you are signed in as the host of a test community.
2. You land on the host dashboard, tab “Transmisión” (Live streaming).
3. Click “Conectar con YouTube”. Google shows the consent screen requesting the YouTube scope. Choose an
   account whose YouTube channel already has live streaming enabled, and allow access.
4. Back in the dashboard the card shows “Canal: <your channel>”. The channel name and ID are the only data read.
5. In the left menu click “Eventos”, then “Iniciar llamada ahora”, then “Entrar a la llamada”.
6. In the call toolbar turn on “En vivo · YouTube” and click “Grabar”. The app creates an unlisted live
   broadcast on your channel (`liveStreams` + `liveBroadcasts`) and streams the call to it.
7. The dashboard (“Transmisión” tab) shows “Ver la última transmisión”, the link to the broadcast on YouTube.
8. Click “Detener” in the call toolbar to end the broadcast.
9. Back in the dashboard click “Desconectar”: the token is deleted and revoked at Google.

## Estado al 20-nov (11:15)
- **Video demo grabado completo** con el canal FixterGeek (toma de 134 s, con `rec`):
  `~/Movies/oauth-youtube/fixtergeek-youtube-scope-demo.mp4` (1668×1444, textos en inglés en la franja de abajo,
  sin la tira de pestañas). Se ve: panel → consentimiento en inglés con el `client_id` en la barra y «Manage your
  YouTube account» → «Canal: FixterGeek» → sala → «En vivo · YouTube» + «Grabar» → el en vivo en YouTube como
  «No listada» → «Detener» → «Desconectar» → aviso de privacidad.
- Subido a YouTube (canal FixterGeek): `https://youtu.be/12EVdJloKGs`. Quedó **privado**: falta el clic
  «Publicar de todas formas» para dejarlo oculto (lo confirma bliss).
- La transmisión de prueba `https://www.youtube.com/watch?v=CkOp6tfU8HM` (oculta, 40 s) sigue en el canal: borrarla.
- La comunidad `google-review` quedó sin canal conectado, lista para el revisor. Quedó una grabación de 40 s en
  su pestaña «Grabaciones».
- El canal Mailmask sigue sin el en vivo: YouTube pide verificar el teléfono (no hace falta para esta verificación).

## Respuesta para Google (borrador, se manda con el ok de bliss)
> Hello,
>
> Thank you for the review. We have addressed the three items:
>
> 1. Demo video (unlisted): https://youtu.be/12EVdJloKGs — it shows the full flow of the
>    `https://www.googleapis.com/auth/youtube` scope: the OAuth consent screen in English with our client ID
>    in the address bar, the connected channel, a live broadcast created on the channel through the YouTube
>    Data API, stopping it, and disconnecting (which deletes and revokes the token).
> 2. Test access, no sign-up, phone or payment needed: <ACCESS LINK>. It signs you in as the host of a
>    test community. Steps: <los 9 pasos de arriba>. Note: YouTube only allows live streaming on channels
>    that already have it enabled, so please use a channel with live streaming enabled.
> 3. Privacy policy, updated and published: https://www.fixtergeek.com/aviso-de-privacidad#google-user-data
>    It now has the sections “Data sharing, transfer and disclosure” (we do not share Google user data with
>    anyone) and “Data retention and deletion”, plus the Limited Use statement.
>
> The scope is used only to create, on the host’s own channel, the live broadcast of a call the host starts.
> We do not read videos, comments, subscribers or analytics.

## Enviado (20-nov, ~11:40)
- Video oculto en YouTube: `https://youtu.be/12EVdJloKGs`.
- bliss envió la respuesta al correo de Google (sólo a Google) con el video, la liga de acceso (vence ~19-ene-2027),
  los pasos y la liga del aviso.
- Cloud Console → Verification Center: «Your app's data access is under review», sin botón de reenviar; la URL del
  aviso ya era la correcta, así que no hubo nada que volver a mandar ahí.

## Pendiente
- Esperar la respuesta de Google. Si piden algo más, leer el motivo antes de contestar.
- Si tardan más de 60 días: `scripts/google-review-community.mts --write` y mandarles la liga nueva.
- La transmisión de prueba `watch?v=CkOp6tfU8HM` (oculta, 40 s) sigue en el canal FixterGeek: borrarla si bliss lo pide.
- No conectar ningún canal a `google-review` ni borrar esa comunidad mientras dure la revisión.
