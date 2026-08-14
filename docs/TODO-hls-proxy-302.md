# El proxy HLS reenvía bytes en vez de redirigir a Tigris

Anotado el **2026-08-13**. Auditado e **implementado el 2026-08-14**.

## Estado: hecho

- `app/utils/tokens.ts` — `generateHlsToken` / `validateHlsToken`, HMAC crudo de **38
  caracteres** (un JWT pesaba ~200, y el token se repite en 452 líneas de playlist). Se
  firma la carpeta, no el segmento.
- `app/routes/api/hls-proxy.tsx` — la rama `.ts` ahora responde **302** al presigned; los
  rewrites de playlist cuelgan `&t=<token>`; sin token o con token de otra carpeta → **403**.
- `app/routes/playlist.$storageKey.$segment.tsx` — lo mismo para `animaciones/chunks`.

**Verificado en local** (curl + XHR real desde el navegador):

| Prueba | Resultado |
|---|---|
| Segmento con token | 302 → `t3.storage.dev`, 8.5 MB en 1.5 s |
| XHR cross-origin siguiendo el redirect | 200, `Access-Control-Allow-Origin: *` desde Tigris |
| Range request (seeking) | 206 |
| Segmento sin token | 403 |
| Token de otra carpeta / expirado / firma chueca | 403 |
| master + rendition parseados por hls.js | 3 niveles, 452 fragmentos con URLs correctas |
| mp4 legacy (`taller-ghosty`) | 302, sin cambios |
| Viewer sin suscripción | sigue bloqueando y pidiendo correo |

### El candado, cerrado del todo

Primera versión dejaba pasar el **master** sin token: quien tuviera la ruta del bucket
pedía el master, recibía dentro los tokens firmados y se veía el video completo. Ya no.

- `app/.server/hls.ts` — `buildHlsProxyUrl(url)` arma la URL del proxy **ya firmada**, en
  el servidor. Reconoce las dos formas de URL de Tigris (bucket en la ruta y bucket en el
  host) y devuelve `null` para lo que no le toca (`pong/…`, Firebase), que conserva su
  camino de siempre.
- El token del master lo emite `courseViewer.tsx`, que es el único lugar que sabe si hay
  acceso. Los de renditions y segmentos los emite el propio proxy al reescribir la playlist.
- `api/hls-proxy.tsx` **exige token en todas sus ramas**, incluido el `.mp4`. El cliente ya
  no arma rutas del proxy por su cuenta: sólo usa la que le llega del loader.
- `api/course.server.ts` usa el mismo helper.

Comprobado: master sin token → 403, mp4 sin token → 403; con token, master 200 →
rendition 452 segmentos → segmento 302 → mp4 302.

### Aparte: el póster de "bloqueado" se quedaba pegado

`VideoPlayer.tsx` decidía el póster mirando sólo `storageLink`. Los videos en HLS traen
`m3u8` y `storageLink` vacío, así que salían con `/video-blocked.png` **aunque ya hubieras
desbloqueado**. Ahora mira los dos campos.

**Falta la prueba manual**: reproducir y saltar en el player real (Chrome y **Safari
iPhone**), con sesión. El tab automatizado queda `visibilityState: hidden` y Chrome
estrangula el tick de hls.js, así que la reproducción completa no se puede comprobar desde
aquí.

Lo que sigue abajo es la auditoría que motivó el cambio.

---

## Los números (medidos, ya no aritmética)

La grabación del webinar (`primer-webinar-anatomia-de-un-sistema-agentico`) vive en
`fixtergeek/videos/6a78ff744a8e00e3b2eea500/6a7e98bebf5a7abbd633c640/hls/`:

| Rendition | Tamaño | Segmentos |
|---|---|---|
| 1080p | **2 445 MB** | 453 |
| 720p | 833 MB | 454 |
| 480p | 527 MB | 454 |

Un solo espectador en 1080p arrastra **2.4 GB** ≈ **2.6 Mbps sostenidos durante 75 minutos**,
segmento por segmento, a través de un proceso Node en una máquina `shared-cpu-1x` / 1 GB con
`min_machines_running = 1` (`fly.toml`). Dos o tres personas viendo a la vez saturan la
máquina — y esa máquina es la misma que sirve el sitio entero.

**Ahí está el fallo de Brendi.** No es un bug de permisos: `brenda@fixter.org` está
`confirmed: true`, y la rama de "ya confirmado" en `courseViewer.tsx` da acceso directo sin
OTP. Es el video atorándose porque los bytes cruzan un CPU compartido.

El costo en dólares es lo de menos (~$0.02/GB de egress en Fly: 50 vistas completas ≈ $2.50).
El costo real es que el video no se puede ver.

---

## Lo que se verificó antes de tocar código

1. **CORS del bucket** — `GetBucketCors` sobre `wild-bird-2039` devuelve
   `AllowedOrigins: ["*"]`, `AllowedMethods: [PUT, DELETE, GET]`, `AllowedHeaders: ["*"]`.
   Esto es **la condición que hace viable el 302**: hls.js pide los `.ts` por XHR, así que un
   redirect cross-origin exige `Access-Control-Allow-Origin` en la respuesta final de Tigris.
   Ya está. (Por eso la rama de `.mp4` funciona hoy sin CORS: `<video src>` no lo necesita;
   hls.js sí. Esa distinción es la que faltaba en el plan original.)
2. **Safari / iPhone** — el redirect lo resuelve el cliente HTTP, no el `<video>`, y la línea
   de la playlist sigue siendo corta (`/api/hls-proxy?path=…`). El problema de las firmas
   larguísimas en la playlist no regresa. **Falta la prueba manual en iPhone real** antes de
   dar por bueno el commit.
3. **El comentario que decía lo contrario está mal**. En
   `app/routes/playlist.$storageKey.$segment.tsx` hay un *"HLS.js no maneja bien redirects
   302"*. No es cierto: XHR/fetch siguen redirects de forma transparente. Lo que sí falla es
   un redirect sin CORS — y CORS ya está puesto.

---

## Hallazgo aparte: el acceso no está protegido en ningún lado

Esto salió al auditar y es más importante que el egress.

`app/routes/api/hls-proxy.tsx` **no verifica absolutamente nada**. Recibe un `?path=`, firma
lo que sea que le pidas dentro del bucket y te lo entrega. Lo mismo
`app/routes/playlist.$storageKey.$segment.tsx`.

El muro de pago vive **solo** en el loader de `courseViewer.tsx`, que decide `hasAccess` y, si
es que no, devuelve `storageLink: ""` y `m3u8: ""`. O sea: **el candado es esconder la URL,
no comprobar el permiso.** Quien tenga el path lo ve, sin cookie, sin sesión, sin nada.

Consecuencia directa para esta decisión: **el 302 no debilita nada, porque no hay nada que
debilitar.** De hecho mejora un poco — hoy la URL del proxy es permanente y anónima; una
presigned de 1 h por lo menos caduca.

Pero conviene arreglarlo en el mismo viaje, porque es barato:

- El **master playlist sí debe seguir pasando por el servidor** (pesa bytes, no megas) y es
  exactamente el punto donde se puede comprobar el permiso una vez.
- Al reescribir las líneas de la playlist, firmar un **token corto** (HMAC de
  `path + exp`, ~40 caracteres, no 700) y colgarlo del query string:
  `/api/hls-proxy?path=…&t=…`. La rama de los `.ts` lo valida y responde 302.
- Con eso el playlist queda corto (no regresa el bug de Safari), el permiso se comprueba de
  verdad, y el enlace caduca solo.

---

## El plan

Un commit por paso; el paso 1 es el que arregla lo de Brendi.

**1. `.ts` → 302** en `app/routes/api/hls-proxy.tsx` (~línea 63). Cambiar el
`fetch` + reenvío por el mismo `Response(null, {status: 302, Location: presignedUrl})` que ya
usa la rama de `.mp4`. Se puede quitar el manejo del header `Range`: Tigris lo atiende
directo.

**2. Lo mismo en `app/routes/playlist.$storageKey.$segment.tsx`** (~línea 55) y borrar el
comentario equivocado. Es la segunda pila de HLS del sitio (`animaciones/chunks`, 7.3 GB) y
si se deja, la mitad del catálogo sigue reenviando bytes.

**3. Token de acceso firmado** en el playlist, como se describe arriba. Convierte el muro de
"esconder la URL" en un permiso real, sin alargar las líneas de la playlist.

**4. Barrido de regresión** antes de dar por cerrado — comparte ruta con todos los videos del
sitio, no solo el webinar:
   - un video HLS nuevo (el webinar) en Chrome desktop y **Safari iPhone**, incluyendo saltar
     hacia adelante a la mitad;
   - un video legacy `video-…` sin extensión (rama `isDirectVideo`, ya usa 302 — no debería
     moverse);
   - un video de `animaciones/chunks` vía `/playlist/…`.

**5. Opcional, después:** si tras el 302 la máquina sigue justa, `shared-cpu-1x`/1 GB se
queda corto para el sitio en general — pero ese es otro problema, y el 302 lo desacopla del
video.

---

## ¿Y quedarnos con lo que hay?

No. Lo que hay ya falló con **una** persona viendo. El proxy tenía sentido cuando la
alternativa era meter firmas de 700 caracteres × 453 segmentos en la playlist; el 302 evita
las dos cosas a la vez. La única razón para no moverlo era el miedo a Safari, y ese miedo se
midió: el bucket tiene CORS, el redirect lo resuelve el cliente, y la playlist no crece.

---

Relacionado: [`docs/webinar-sistemas-agenticos/GRABACION.md`](webinar-sistemas-agenticos/GRABACION.md).
