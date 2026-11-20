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
1. Open the access link. Click the confirm button: you are signed in as the host of a test community.
2. You land on the host dashboard, tab “Transmisión” (Live streaming).
3. Click “Conectar con YouTube”. Google shows the consent screen requesting the YouTube scope. Choose an
   account that owns a YouTube channel with live streaming enabled and click Allow.
4. Back in the dashboard the card shows “Canal: <your channel>”. That is the only data read from YouTube.
5. Open `https://www.fixtergeek.com/comunidad/google-review` and click the button to open the call room.
6. In the room, turn on “En vivo” and click “Grabar”. The app creates an unlisted live broadcast on your
   channel (`liveStreams` + `liveBroadcasts`) and streams the call to it. The watch link appears on screen.
7. Click “Detener” to end the broadcast.
8. Back in the dashboard, click “Desconectar”: the token is deleted and revoked at Google.

## Estado al 20-nov (tarde)
- En producción: aviso (es/en), revocación al desconectar, sala por comunidad, `unlisted`, aviso de canal sin en
  vivo (`liveReady`), cuenta de prueba. Comprobado con la liga del revisor: entra, ve el panel y llega al
  consentimiento en inglés; la caja contestó que no tiene destinos fijos.
- Toma 1 del video (`~/Movies/oauth-youtube/toma1.mov`, 88 s): panel → consentimiento en inglés con el client_id
  → «Canal: Mailmask» → sala `fx-google-review-<día>` → «En vivo». Se detuvo ahí: el canal Mailmask no tiene
  activado el en vivo en YouTube (`liveStreamingNotEnabled`).
- En YouTube Studio del canal Mailmask se pidió el acceso para transmitir; YouTube pide **verificar el teléfono**
  (lo hace bliss) y luego tarda hasta 24 h.
- La comunidad `google-review` quedó con el canal Mailmask conectado: **desconectarlo antes de mandar la liga**.

## Pendiente
- Con el en vivo activo en Mailmask (o usando FixterGeek, que ya lo tiene; en esta comunidad sale oculto):
  regrabar desde «Iniciar llamada ahora» → «En vivo · YouTube» → «Grabar» → liga de YouTube → «Detener» →
  «Desconectar» → `myaccount.google.com/permissions`. Marcas en inglés y `rec render --aspect native`.
- Subir el video a YouTube como oculto y ponerlo en la respuesta.
- Respuesta al correo de Google y «Resubmit» en Cloud Console → Verification Center (con el ok de bliss).
- Si rechazan otra vez, leer el motivo antes de reenviar: el aviso y el video ya cubren lo que pidieron.
