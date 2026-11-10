# Destinos de transmisión por llamada (diseño, 10-nov-2026)

Objetivo de bliss: transmitir a donde sea, varios a la vez y eligiendo en cada llamada, tan fácil como StreamYard.

## Lo que hace StreamYard (visto el 10-nov)
- **Conectar una sola vez**: Destinos → «Añadir destino» → OAuth del proveedor. Nativos: YouTube, Facebook,
  LinkedIn, X, Twitch, Kick y Vimeo. Más **RTMP personalizado** (URL + clave), que es de plan pagado.
- **Crear la transmisión**: Inicio → «Live Stream» → marcar los destinos → título, descripción y privacidad →
  «Programar para después» (fecha en tu zona y miniatura de 1280×720, que sólo admiten YouTube, Facebook y
  LinkedIn) → «Crear». Con varios destinos, **«Personalizar» por destino** cambia título y descripción, porque cada
  red tiene sus límites (X sólo acepta título).
- **Al programar crea el evento en cada red**, así la liga se puede compartir antes. Con X y con RTMP personalizado
  no se puede programar.
- **Límite por plan**: Free con 1 destino, Essential con 2 (US$18.99), Core con 3 más RTMP personalizado (US$44.99)
  y Advanced con 8 (US$88.99).
- **Destinos de invitado**: el invitado con cuenta conecta hasta 2 destinos suyos, con un tope de 6 por transmisión.
  No cuentan contra el límite del anfitrión, pero el anfitrión no puede moderar los comentarios que llegan de ahí.
- Los comentarios de todas las redes caen juntos en el estudio.

## Lo que ya tenemos (Ghosty Studio + caja)
- `~/ghosty-studio/app/lib/live/`: YouTube (stream reutilizable + broadcast con autoStart/autoStop) y Facebook
  (`live_videos`, clave por video) por OAuth, con tokens que no caducan. Hay **un destino por proveedor por
  espacio** (`LiveDestination`).
- La caja ya manda a N destinos con un solo encode (`-f tee`, `onfail=ignore`, `rec.live` con el estado de cada
  uno). Lo que la amarra: los destinos se leen de `RTMP_TARGETS` en el env y cambiarlos reinicia la caja. Esto es
  a propósito: si el navegador mandara las claves, cualquiera con el ADMIN_TOKEN podría desviar la transmisión.

## Diseño
1. **`StreamDestination` por comunidad, varios por proveedor**: `{communityId, provider, accountName, targetId
   (canal/página/perfil), tokens cifrados, status}`. Proveedores en orden: YouTube → Facebook (páginas) →
   RTMP personalizado → Twitch → LinkedIn (live requiere aprobación de LinkedIn) → X, Kick.
   Se reutiliza el núcleo `youtube-live.ts`/`facebook-live.ts`: se copia a un paquete compartido sin imports de
   la app (ya está escrito así).
2. **Por llamada**: `CallBroadcast {callId, destinationId, title?, description?, privacy, thumbnail?,
   externalId, ingestUrl cifrada, watchUrl, state}`. En la pantalla de la llamada: switches por destino, título y
   descripción comunes y «Personalizar» por destino. Al programar se crea el evento en cada red (como StreamYard)
   y la liga se comparte en el muro de la comunidad.
3. **La caja recibe los destinos firmados, no del navegador**: `/admin/recording/start` acepta `targets` dentro de
   un sobre HMAC que firma el backend (el mismo patrón del ticket, con `exp` y `jti` de un solo uso). Así se
   mantiene la regla «el cliente nunca manda una URL», desaparece `RTMP_TARGETS` del env y ya no hay que reiniciar
   la caja. `rec.live` reporta el estado por `destinationId`.
4. **Límites por plan de la comunidad**: gratis con 1 destino sin RTMP personalizado; pagado con 3 y RTMP; el plan
   con caja propia (grabación) con 8. Son los números de StreamYard: hay que ajustarlos cuando se decida la comisión.
5. **Comentarios**: la fase 1 sólo trae el chat de fixtergeek. Juntar los de YouTube y Facebook en el chat del
   evento (como StreamYard) va después; YouTube `liveChatMessages` cuesta cuota de la API.
6. **Invitados**: los destinos de invitado quedan fuera de la v1.

## Riesgos y trámites
- La app de Google sigue sin verificar para el alcance `youtube` (espera la revisión de Ads) y Meta «Ghosty Live»
  necesita App Review de `publish_video`. Para fixtergeek hay que decidir si se usan **las mismas apps** (marca
  Ghosty en la pantalla de permisos) o unas nuevas con la marca FixterGeek (con su propia revisión cada una).
- La cuota de YouTube Data API es de 10k unidades/día por proyecto, y crear un broadcast + bind cuesta ~100.
  Alcanza para ~50 llamadas al día en todo fixtergeek; hay que pedir más cuota antes de abrir la plataforma.

## Decisiones para bliss
1. ¿Apps OAuth propias de FixterGeek o las de Ghosty?
2. ¿Te parecen bien los límites 1 / 3 / 8 por plan?
3. ¿Qué tercer proveedor va en la v1: Twitch o LinkedIn?
