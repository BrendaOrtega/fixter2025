# Taller Sistemas Agénticos — Flujo de correos y operación

Documento operativo del flujo post-compra (1ª edición, sept 2026).

## Mapa del flujo

```
Pago en Stripe (type: sistemas-agenticos-workshop)
  └─ stripeWebhook.ts
       ├─ User + curso "sistemas-agenticos" → viewer con grabaciones
       ├─ Subscriber tag: sistemas-agenticos-paid
       ├─ Inscripción a secuencia 6a790319d7dfe60e8edcb5cd
       └─ Correo inmediato: sendSistemasWelcome (fechas + GCal + qué sigue)

Secuencia "Taller Sistemas Agénticos — 1ª edición" (fechas fijas, 10 AM CDMX):
  1. 26 ago — "Prepara tu entorno" (instala GhostyCode, únete a Teams, key en camino)
  2. 31 ago — "Mañana arrancamos 🚀" (checklist + qué esperar)
  3. 11 sep — "Las 4 grabaciones ya están en tu viewer" (+ rating)
  4. 17 sep — "Tu certificado + lo que sigue" (+ siguiente edición $3,490)

Aparte (manual, cuando el tracking de consumo esté listo):
  🎁 sendSistemasKey — correo individual con la key EasyBits + tutorial
     → npx tsx --env-file=.env scripts/send-sistemas-keys.ts keys.json
     → keys.json: [{ "email": "...", "key": "eb_sk_live_..." }]
     → marca tag sistemas-key-entregada (re-corrible sin duplicar)
```

- Compradores tardíos: la secuencia les manda los correos vencidos en ráfaga
  de catch-up en el siguiente ciclo del cron (cada 5 min). Deseable.
- La invitación a Ghosty Teams se manda **desde Ghosty Teams** (alta manual);
  los correos solo la anuncian y dan WhatsApp de rescate.
- Editar los correos de la secuencia: `/admin/sequences`.

## Webinars de venta (13, 20 y 27 de agosto · 8:00 PM CDMX)

Título: **Por qué tu agente se rompe en producción** · 1 hora · gratis
Guion completo: `docs/sistemas-agenticos-webinar-trailer.md`

```
Registro en /sistemas-agenticos#webinar (form visible, no modal)
  └─ intent webinar_registration
       ├─ anti-bot (checkSignupEmail)
       ├─ Subscriber tags: webinar-sistemas-agenticos + webinar-<fecha>
       ├─ Enroll a la secuencia de ESA fecha (startAtIndex si se registra tarde)
       └─ Correo inmediato: confirmación + Google Calendar + link de sala

Por cada fecha, 3 recordatorios automáticos:
  1. Víspera 10:00 AM — "mañana nos vemos"
  2. Día del webinar 4:00 PM — "hoy a las 8, aquí está tu link"
  3. Día siguiente 10:00 AM — grabación + oferta del taller ($2,490)
```

**IDs de las secuencias** (editables en `/admin/sequences`):

| Fecha | Sequence ID |
|---|---|
| 13 ago | `6a790a151d99ed94a4258d63` |
| 20 ago | `6a790a151d99ed94a4258d67` |
| 27 ago | `6a790a151d99ed94a4258d6b` |

**⚠️ Falta una cosa para que los correos lleven a algún lado:** los correos
apuntan a `fixtergeek.com/webinar-en-vivo`, que redirige a la variable de
entorno **`WEBINAR_ROOM_URL`**. Mientras no esté configurada, esa página
muestra las fechas y un aviso de "la sala aún no abre" (no truena). En cuanto
tengas la sala de Ghosty Teams / livekit:

```bash
fly secrets set WEBINAR_ROOM_URL="https://<url-de-la-sala>"
```

Se hizo así a propósito: los recordatorios ya están programados con fecha fija,
y cambiar un secret evita reeditar correos que ya salieron.

**Para el anuncio de Meta**: manda el tráfico frío a
`https://www.fixtergeek.com/sistemas-agenticos#webinar` — cae directo en el
registro gratis en vez de estrellarse contra el precio.

**Segmentos que quedan listos para email manual** (tags en Subscriber):
`webinar-sistemas-agenticos` (todos los registrados), `webinar-2026-08-13` /
`-20` / `-27` (por fecha), `sistemas-agenticos-paid` (ya compraron — excluirlos
de los correos de venta).

## Checklist operativo (antes del 26 de agosto)

- [ ] Crear el workspace/canal del taller en Ghosty Teams e invitar a los inscritos
- [ ] Generar el pool de keys de EasyBits + definir tracking de consumo
- [ ] Repo privado con la UI inicial del agente
- [ ] Probar la grabación de livekit-svc en una sala real (la landing promete grabaciones)
- [ ] Confirmar el toggle de MSI en el dashboard de Stripe
- [ ] Webinars de venta: 13, 20 y 27 de agosto (registro pendiente de montar)

## Copys (fuente de verdad en código)

- Bienvenida: `app/mailSenders/sendSistemasWelcome.ts`
- Key 🎁: `app/mailSenders/sendSistemasKey.ts`
- Secuencia (4 correos): `scripts/create-sistemas-sequence.ts` (ya ejecutado;
  editar en `/admin/sequences`, el script no re-escribe si la secuencia existe)

## Verificación del flujo completo (dev)

```bash
stripe listen --forward-to localhost:3000/stripe/webhook
stripe trigger checkout.session.completed \
  --add checkout_session:metadata.type=sistemas-agenticos-workshop \
  --add checkout_session:metadata.courseSlug=sistemas-agenticos
```

Verificar: User con el curso, Subscriber con tag, enrollment activo
(nextEmailAt = 26 ago), correo de bienvenida. Para probar la secuencia:
`quick_enroll` con forceReset en `/admin/sequences` + `POST /api/sequences/process`.
