# FixterGeek → comunidad por membresía (tipo Skool) — 10-nov-2026

Decisión de bliss: se abandona la venta de cursos sueltos; fixtergeek vende **acceso** mensual a una comunidad
(como Skool), directo en este repo, no en skool.com. Las llamadas en vivo salen de **la caja de eventos** de Ghosty
Teams (la misma del ensayo del hackatón del 10-nov).

## Qué es Skool (visto en skool.com el 10-nov)
- Membresía mensual a una comunidad privada; los cursos van incluidos como aula, no se venden aparte.
- Lo que retiene: muro con publicaciones y comentarios, llamadas en vivo semanales, el creador contesta,
  puntos/niveles que desbloquean lecciones, tabla de posiciones. Reseñas: «sigo pagando después de N meses».
- Competencia directa en su directorio: «Claude Code Club» (10.4k miembros, $9 USD/mes), «Agentic AI Academy»
  ($97), «Maker School» ($184). Casi todo en inglés: el hueco es el público hispano.
- Skool: $9/mes + 10 % o $99/mes + 2.9 %, merchant of record, sin IA.

## Lo que ya existe en fixtergeek
- `Course`/`Module`/`Video`, HLS propio (`playlist/:storageKey.m3u8`), `User`, Stripe + webhook, `mis-cursos`.
- `Community` (`/c/:slug`): hoy sólo agrupa suscriptores por correo + secuencia de bienvenida. Se reutiliza el slug.
- MentorIA (`/coach`): tutor de voz que Skool no tiene.

## La caja (Ghosty Teams, `~/ghosty-studio/docs/claude/`)
- Sala LiveKit en modo webinar/taller: chat, pedir la palabra, compartir pantalla, «al aire».
- Graba MP4 + HLS 1080p (+720/480 al parar) y transmite por RTMP a YouTube/Facebook vía OAuth
  (`transmitir-en-vivo.md`).
- **Liga personal con pase** (`?pase=`, firmada con `GHOSTY_PARTNER_SECRET`, atada a namespace + room + correo,
  caduca al fin del evento; `app/lib/hackathon/room-pass.ts`): entra directo sin login. Es justo el puente que
  necesita fixtergeek: miembro activo → pase a la llamada.
- Límite conocido: una grabación por caja (compuesto), caja de 8 vCPU / 8 GB, ~5 GB/h de disco.

## Giro (10-nov, tarde): fixtergeek es la PLATAFORMA
bliss: «vamos a darle todos los poderes a fixtergeek para que otros puedan crear comunidades y hacer llamadas».
Fixtergeek deja de ser una comunidad y pasa a ser el Skool hispano: cualquiera crea la suya, cobra y hace llamadas.
FixterGeek (la de bliss) es sólo la primera comunidad.

## Sacar la caja de «random» (leído en código, `~/sandbox-host/templates/livekit-svc/server.mjs`)
- **La caja ya no sabe de «random».** `POST /join` acepta cualquier sala: el ticket firmado trae
  `{room, name, role, mode, title, exp, jti}` (HMAC con `EVENT_TICKET_SECRET`, de un solo uso). «random» es sólo
  el nombre que le pone Teams. Fixtergeek puede abrir `comunidad-<slug>-<evento>` sin tocar la caja.
- **Quién firma:** no copiar `EVENT_TICKET_SECRET` a fixtergeek. Mejor un endpoint partner en gs
  (HMAC `GHOSTY_PARTNER_SECRET`, como `api.v2.event-recording`) que firme tickets a nombre de fixtergeek con salas
  prefijadas `fx-…`. Así gs puede limitar, auditar y rotar.
- **El chat no está en la caja** (`room.html` no tiene chat; vive en Teams). Se construye en fixtergeek: chat del
  evento + muro, ligado a la sala.
- **Lo que sí está amarrado y hay que cambiar para multi-comunidad:**
  1. **Una grabación a la vez por caja** (`let rec = null`, un Xvfb `:0`). Dos comunidades grabando al mismo
     tiempo chocan. Opciones: cola/reserva de horario, una caja por llamada (8 GB c/u) o Track Egress.
  2. **RTMP global** (`RTMP_TARGETS` en el env de la caja, cambiarlo reinicia y saca a todos). Para que cada
     comunidad transmita a SU YouTube, los destinos tienen que viajar con `/admin/recording/start`.
  3. **Bucket HLS global** (`HLS_*`): todas las grabaciones caen en un solo bucket; fixtergeek tiene que
     recogerlas y publicarlas por comunidad.
  4. Capacidad: una caja de 8 vCPU / 8 GB en el host A, que anda justo de RAM (ver hackatón).

## Fases (plataforma)
1. **Comunidades multi-dueño**: cualquiera crea su comunidad (`Community` crece: dueño, precio, portada, privada/
   pública), directorio `/comunidades`, página «about» con reseñas como Skool.
2. **Cobro por comunidad**: Stripe Connect (cada dueño cobra a su cuenta, fixtergeek se queda una comisión),
   membresía mensual/anual, alta y baja por webhook.
3. **Muro + chat**: publicaciones, comentarios, chat del evento en tiempo real.
4. **Llamadas en la caja**: evento con fecha → sala `fx-<comunidad>-<evento>` → ticket por miembro firmado vía gs →
   grabación HLS que se vuelve lección. Antes: resolver los 4 amarres de arriba (grabación única, RTMP, bucket,
   capacidad).
5. **Aula y niveles**: cursos por comunidad, puntos, niveles que abren módulos, tabla de posiciones.
6. **IA**: MentorIA / Ghosty como tutor y moderador de cada comunidad (lo que Skool no tiene).

## Decisiones de bliss (10-nov, noche)
- **Grabar es de plan pagado**: la comunidad que paga grabación tiene **su propia cajita** (una caja por comunidad
  con ese plan). Las demás llaman sin grabar en la caja compartida. Así desaparece el choque de «una grabación a la vez».
- **Destinos de transmisión amplios, versátiles y fáciles**, copiando a StreamYard (y similares: Restream, Riverside):
  conectar YouTube/Facebook/LinkedIn/Twitch/X por OAuth con un clic, RTMP personalizado, varios a la vez, elegir por
  llamada. Los destinos viajan con cada llamada, no en el env de la caja. Pendiente: estudiar el flujo de StreamYard
  antes de diseñar.
- **Bucket único está bien**: prefijo por comunidad/llamada (`fx/<comunidad>/<llamada>/…`) y objetos **privados**,
  servidos con URL firmada.
- **Capacidad**: si el host A está justo, las cajas van al **host B** (125 GB, 16 CPU).
- **Extra — marca nueva de fixtergeek**: más grande, letras más grandes, personajes coloridos. Habrá **sesión de
  exploración** con bliss antes de tocar diseño.

## Siguiente sesión (desde la oficina)
1. ~~Estudiar StreamYard y escribir el diseño de destinos~~ → hecho: `DESTINOS.md` (10-nov), con 3 decisiones pendientes.
2. Decidir comisión de fixtergeek y arrancar la fase 1 (comunidades multi-dueño).
3. Sesión de exploración de la marca nueva.

## Pendiente de bliss
- Comisión de fixtergeek (Skool: 10 % o 2.9 % + cuota) y si hay cuota mensual al dueño.
- Precio de la comunidad FixterGeek y qué reciben quienes ya compraron curso.
- Frecuencia y horario de la llamada semanal.
- Validar después del ensayo de hoy que la caja aguante la llamada (iperf3, ~20 pestañas).

## Pendiente: pasar de MongoDB a SQLite (decisión de bliss, 10-nov-2026)
bliss: «con Mongo no podremos crecer». Antes de la fase 1 (comunidades multi-dueño) hay que planear la migración de
fixtergeek a SQLite: inventario de modelos (60+, varios con `Json` heterogéneo como `User.bootcamps/payments`),
cambio de ids `ObjectId` → texto, dónde vive el archivo (volumen en la caja app-host) y respaldo (Litestream o
similar). La membresía nueva (`Membership`) ya está escrita sin nada exclusivo de Mongo.

## Llamada del club: cómo se entra (10-nov-2026)
- La llamada vive en la **caja de eventos** (`https://evento.sandboxes.easybits.cloud`), no en Teams. Sala del día:
  `fx-club-de-agentes-YYYYMMDD` (fecha de CDMX), modo webinar.
- Al dar clic en «Entrar a la llamada», fixtergeek revisa la membresía y llama a
  `getCallLink(user)` (`app/.server/services/club-call.server.ts`). Ese servicio firma la petición con la credencial
  de partner del espacio `business` de gs y pide `POST https://www.ghosty.studio/api/v2/partner/event-box/ticket`
  `{room, name, role, mode, title}`. gs firma el ticket de la caja con `EVENT_TICKET_SECRET` (que nunca sale de gs) y
  devuelve `https://evento…/room?room=…&ticket=…`. Se redirige en el acto: el ticket es de **un solo uso y dura 120 s**.
- Roles: `host` para `CLUB_CALL_HOST_EMAILS` (default `fixtergeek@gmail.com`) o `getCallLink(user, {host: true})`;
  `viewer` para los demás (levantan la mano y el host les da la palabra).
- gs sólo firma salas con el prefijo del partner (`fx-` para `business`, `EVENT_TICKET_PREFIXES` en
  `ghosty-studio/app/lib/partner/partner-event-ticket.ts`); las de Teams son `ev_*` y quedan fuera.
- Env de fixtergeek: `GHOSTY_PARTNER_KEY` (gpk_…), `GHOSTY_PARTNER_KEY_SECRET` (gps_…); opcionales `GHOSTY_API_URL`,
  `CLUB_CALL_HOST_EMAILS`, `CLUB_CALL_MODE`. Viven en `/app/secrets.env` de la caja app-host de fixtergeek y entran al
  contenedor en el siguiente reinicio (el próximo deploy de `:main`).
- La caja no deja entrar sin ticket (`/token` responde 401), así que no hay liga «pelona» para compartir.

## Caja de llamadas por comunidad (10-nov-2026, decisión de bliss)
Hoy el club usa la **caja de eventos de gs** (la de los webinars de bliss; Ghosty Teams tiene su
propia caja de llamadas). La plataforma tiene que permitir que **un cliente con su comunidad pida
su propia caja**. Cómo encaja sin rehacer nada:

- **Lo que ya separa por partner** (gs, `app/lib/partner/`):
  - `EVENT_TICKET_PREFIXES` dice qué salas puede abrir cada espacio (`business` → `fx-`).
  - `HLS_PREFIXES` dice dónde puede dejar sus videos (`fixtergeek/videos/club/`).
  - El puente `event-box/recording` sólo deja grabar y parar salas propias, y para rehacer el HLS
    de un archivo revisa la bitácora (`AuditEvent.externalId`).
- **Siguiente paso para una caja por cliente:**
  1. En gs, guardar en el partner (o en el espacio) qué caja usa. Sin ese dato, usa la caja de
     eventos compartida; con él, una caja `livekit-svc` propia, creada como `event-box.server.ts`
     con su `ADMIN_TOKEN`, su `EVENT_TICKET_SECRET` y sus llaves `HLS_*` hacia el bucket del cliente.
  2. `ticket` y `recording` resuelven `{base, secretos}` por partner en lugar de llamar a
     `eventBoxUrl()`. Las acciones no cambian.
  3. En fixtergeek, `Community` gana el prefijo de sus salas, que hoy está fijo en
     `fx-club-de-agentes` (`clubCallRoom`), y quizá su propia credencial de partner. El HLS va a
     `fixtergeek/videos/club/<communityId>/…`, así que cada comunidad ya tiene su carpeta.
- **Por qué importa la caja propia:** la caja graba una sala a la vez. Dos comunidades llamando a la
  misma hora en la caja compartida chocan, y la segunda no se puede grabar.

## Grabaciones (10-nov-2026)
- Al entrar el anfitrión se graba solo. La tarjeta de la llamada trae «Detener y guardar» y la caja
  sube el HLS a `fixtergeek/videos/club/<club>/<id>/`.
- Si el anfitrión sale sin parar, la caja se detiene sola a los 3 min y la siguiente carga del club
  pide el HLS de ese archivo.
- Una grabación cuenta como lista cuando llega `storyboard/storyboard.vtt`, que la caja sube al
  final. Se reproduce por `/api/hls-proxy` con un token firmado y sólo la ven los miembros.
- Prueba del 10-nov: una grabación de 40 s quedó en `fixtergeek/videos/club/_prueba/1794333027954/`
  con 1080/720/480, miniaturas y subtítulos.
- Pendiente en la caja (`sandbox-host/templates/livekit-svc`):
  - Que `/busy` cuente la conversión HLS en curso. Mientras tanto, `transcribe:true` la mantiene
    despierta.
  - Subir `master.m3u8` al final.

## Invitados (10-nov-2026)
- `CommunityInvite` registra cada invitado por correo. Al iniciar sesión recibe sus `giftDays` de
  regalo y entra a las llamadas de sus `callDays` aunque no pague.
- `scripts/club-invite.mts --source … --gift 90 --call AAAAMMDD correos… --write`.
- Ya invitados: los 5 confirmados del micro-hackatón (90 días, llamadas del 10 y 12-nov).

## Panel del anfitrión, contrastado con la competencia (10-nov-2026, noche)
Skool, Circle, Mighty Networks y Kajabi le dan al dueño, sin ayuda: calendario editable con series y
recordatorios, «agregar a mi calendario», un clic para ir en vivo y grabaciones por evento. Ninguno
transmite nativo a YouTube/Facebook (Mighty y Kajabi sólo incrustan un YouTube Live externo): ése es
nuestro plus, junto con la grabación automática en HLS.

**Hecho (Fase 1, sólo fixtergeek):** `/comunidad/:slug/admin` (dueño o ADMIN).
- Calendario: crear, editar y borrar eventos; «cada semana» con «hasta» (`CommunityEvent.recurrence`/`until`;
  las sesiones salen de `occurrencesOf` en `club-events.server.ts`).
- `.ics` por evento (`/comunidad/:slug/evento/:id.ics`, con RRULE) y correos 24 h y 1 h antes a miembros
  activos más invitados con pase ese día (job `club_event_reminders` de Agenda, cada 10 min, sólo en producción;
  la marca `remindedFor` evita duplicados).
- Al entrar, el anfitrión elige «Grabar» (encendido) y «Transmitir a YouTube y Facebook». La grabación queda
  ligada a su evento (`CommunityRecording.eventId`).
- Grabaciones (renombrar, ocultar, reintentar), invitados (correos, días de regalo, pase a llamadas) y miembros.

**Fase 2 (SaaS, gs + fixtergeek):** destinos de YouTube/Facebook por comunidad (`LiveDestination` por tenant,
endpoints de partner `live/connect|ls|prepare|check`), caja propia opcional y «Conectar YouTube/Facebook» en el
panel. **Fase 3:** niveles que desbloquean cosas sobre las insignias.

## Precios para creadores (propuesta en la home, 10-nov-2026)
Arranque $0 + 8 % de lo que cobra · Creador $590 MXN/mes sin comisión (le conviene arriba de ~$7,400 al mes) ·
Escuela $1,490 MXN/mes con servidor de llamadas propio. Stripe MX (3.6 % + $3 + IVA) aparte e igual en los tres.
Contra: Skool Pro US$99 + 2.9 % + 30¢ (su propio procesador; Hobby US$9 + 10 %), Circle US$89 + 2 % + Stripe,
Mighty US$79 + 2 % + Stripe (20 h de transmisión al mes), Kajabi US$143–179. Con comunidades muy grandes Skool
sale abajo porque Stripe MX cobra más que su 2.9 %; la calculadora lo muestra.
Cobro por cuenta del creador: Mercado Pago marketplace (OAuth + `marketplace_fee`, como Denik con 1 %) sirve para
pagos sueltos; las suscripciones de MP al parecer no aceptan `marketplace_fee` → Stripe Connect
(`application_fee_percent`) o cobrar cada mes como pago suelto.
Recordatorios por WhatsApp anunciados «en camino»: falta teléfono + opt-in del miembro, plantilla aprobada por Meta
y envío por el canal de Ghosty.
