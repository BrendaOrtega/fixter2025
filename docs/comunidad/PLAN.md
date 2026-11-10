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
