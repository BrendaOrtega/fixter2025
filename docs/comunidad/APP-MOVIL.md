# App móvil de marca para las comunidades (plan, 10-nov-2026)

Encargo de bliss (desde la sesión fixter2025-28): clonar la «Branded App» de Circle para las comunidades de
FixterGeek. Este documento es sólo el plan; todavía no hay código. Cada dato de Circle lleva su fuente
(consultadas el 10-nov-2026).

## 1. Qué hace Circle

**App genérica.** Se llama «Circle Communities» y la publica CircleCo Inc. Tiene feed, eventos, mensajes y lives
(«Join and host live streams»), cursos con lecciones y quizzes, segmentos de notificaciones y búsqueda.
<https://apps.apple.com/us/app/circle-communities/id1509651625>
Trae selector de comunidades. **No permite registrarse como miembro nuevo**; la Branded sí permite registrarse.
<https://help.circle.so/p/basics/getting-started/circle-features-desktop-vs-mobile-apps>

**Branded App, un build por creador:**
- Cada creador tiene su propia ficha en App Store y en Play Store.
  <https://help.circle.so/p/branded-apps/branded-apps/get-to-know-branded-apps>
- La app se publica **bajo la cuenta de desarrollador del creador**. El creador abre una cuenta de organización
  (necesita número D-U-N-S; el EIN no sirve en su lugar) y le da acceso de admin a Circle. Circle sube la app.
  <https://help.circle.so/p/branded-apps/implementation-and-launch/setting-up-app-developer-accounts>
- La aprobación tarda «1-2 weeks». Circle crea en la comunidad un usuario «iOS Reviewer» que no se debe borrar.
  <https://help.circle.so/p/branded-apps/implementation-and-launch/what-to-expect-during-the-app-submission-process>
- El estudio de diseño de Circle hace el ícono, el splash y las capturas. Los colores y el logo (claro y oscuro)
  se cambian desde la configuración de la comunidad.
  <https://help.circle.so/p/branded-apps/implementation-and-launch/required-design-assets-for-the-app-submission-process>
- Pantallas personalizadas, onboarding y navegación propia: <https://circle.so/branded-app>
- El creador puede apagar su comunidad en la app genérica para que sus miembros entren sólo por la suya.
  <https://help.circle.so/p/branded-apps/implementation-and-launch/disabling-community-access-on-the-circle-mobile-apps>
- La Branded App requiere un dominio propio para los deep links y los push (página «get to know» de arriba).

**Precio y lema.** La Branded App sólo viene en Circle Plus, que tiene «Custom pricing». Los otros planes cuestan
Professional $89, Business $199 y Scale $419 al mes con pago anual. <https://circle.so/_llms/pricing.md>
Lemas de venta: «Want more engagement and revenue? There's an app for that — yours.» (<https://circle.so/branded-app>)
y «Be the app your members download, launch, and trust» (<https://circle.so/plus>).

**Push.**
- **Manual:** el admin lo manda desde la web. Puede mandarlo al momento o programarlo, por segmento, rol, tag o
  suscripción. El push lleva a un espacio, un post, un evento, una lección o una URL. Límites: 40 caracteres de
  título y 140 de cuerpo. Sólo existe en Branded.
  <https://help.circle.so/p/branded-apps/branded-apps/create-custom-push-notifications>
- **Automático:** sale cuando empieza un live.
  <https://help.circle.so/p/members/live-and-events/join-a-live-stream>

**En vivo.**
- Se transmite y se entra desde la app.
  <https://help.circle.so/p/live-and-events/live-setup/circle-live-overview>
- Un live room se abre con ➕ > Go live; por defecto sólo los admins pueden.
  <https://help.circle.so/p/live-and-events/live-setup/host-a-live-room-in-your-community>
- Si las grabaciones se ven en la app: no lo encontramos.

**Pagos.**
- En la Branded se cobra con **IAP nativo**: 30 %, o 15 % si el creador entra al programa de pequeños
  desarrolladores. Apple y Google le pagan directo al creador.
  <https://help.circle.so/p/branded-apps/in-app-purchases/in-app-purchases-overview>
- En la app genérica de iOS, el botón de pagar abre el navegador (página de features de arriba).
- Hay ligas externas de pago sólo en EE. UU. y la EEE, con su propia comisión.
  <https://help.circle.so/p/branded-apps/account-and-app-management/enroll-in-google-and-apple-s-external-content-link-programs>
- **México no aparece** en esos programas.

**Stack técnico de Circle:** no lo publican.

## 2. Lo que ya tenemos

**`~/ghosty-app` (iOS, SwiftUI, en tienda, versión 1.0.18):**
- El código está partido en `Core/` (compartido) y `GhostyApp/` (la app). La idea era que de ahí salieran
  varias apps como targets, nunca como forks.
- Ya tiene push por APNs (`Core/Data/Avisos.swift`) y una extensión `NotificationService` que pone la foto del
  remitente en el aviso.
- El login es con `ASWebAuthenticationSession` y Universal Link.
- El SDK de LiveKit 2.17 ya está enlazado y el video funciona.
- La publicación está automatizada con `scripts/asc.py` (ficha, envío a revisión, capturas, estado) y
  `subir-testflight.sh`, con las lecciones aprendidas en su `CLAUDE.md`: cupo diario de builds, fallos mudos de
  TestFlight y la cuenta del revisor.
- **Lo que no sirve tal cual:** `Core/` habla con gs (AG-UI, agentes, conversaciones), no con fixter2025.

**`~/ghosty-android`:** es otra base aparte, en Kotlin y Compose, que porta la misma app.

**fixter2025:**
- Ya existen `Community`, `Membership`, el muro (`CommunityPost`, `CommunityComment`, `CommunityReaction`),
  `CommunityEvent` con serie semanal y `remindedFor`, `CommunityRecording` (HLS firmado) y `CommunityInvite`.
- Todo vive en `comunidad.$slug.tsx`, con sesión de cookie y acciones de formulario por `intent`: `join`,
  `billing`, `call`, `like`, `post`, `comment`, `mod` y `rec-*`.
- La llamada pide un ticket a gs (`/api/v2/partner/event-box/ticket`) y redirige a la sala web de la caja.
- **Falta:** una API JSON con token y push.

## 3. Stack (decidido por bliss el 10-nov: nativo, sin Expo)

- **iOS:** un target nuevo, `Comunidades`, en SwiftUI sobre `Core/` de `~/ghosty-app`.
  - Se reutiliza el sistema de diseño, el login con Universal Link, el registro de push (`Avisos.swift`), la
    extensión `NotificationService` y LiveKit para la fase 2.
  - El cliente de fixter2025 va en un módulo propio, sin tocar el de gs.
- **Android:** un flavor nuevo, `comunidades`, en Kotlin y Compose sobre `~/ghosty-android`, con la misma frontera
  `data/`·`ui/`.
- **Se reutiliza también el oficio:** `asc.py`, las reglas de TestFlight, la cuenta del revisor, «sin mencionar
  pagos fuera de Apple» en los textos y el modo demo con capturas automáticas.
- **La app «muta» con datos, no con código.**
  - La marca y las pantallas activas llegan del servidor (`GET communities/:slug/theme`): logo, colores, nombre
    y módulos encendidos. Esto se permite porque son datos.
  - Descargar código que cambie funciones va contra la regla 2.5.2 de Apple.

## 3b. Dos escalones según el plan

1. **Todas las comunidades:** van en una app compartida, «FixterGeek», publicada en NUESTRA cuenta.
   - El miembro entra por la liga de invitación o eligiendo su comunidad, y la app se pinta con la marca de esa
     comunidad.
   - Una sola revisión de Apple, sin D-U-N-S del creador. Es el mismo modelo que la app genérica de Circle.
   - En la tienda dice «FixterGeek»: el ícono y el nombre no cambian por creador.
2. **Plan Escuela:** la comunidad tiene su propia app en App Store y Google Play, con su nombre y su ícono, y abre
   directo en ella.
   - Es el mismo código: otro target o flavor con la comunidad fija y sus imágenes.
   - Se publica en la **cuenta del creador**, con su D-U-N-S y acceso de admin para nosotros. Nosotros la subimos y
     la mantenemos, como Circle.
   - Sale en la cuenta del creador por la regla 4.2.6: si subimos clones en nuestra cuenta, nos arriesgamos a que
     los rechacen.
   - Circle reporta 1 a 2 semanas por aprobación (ver la sección 1).
3. En la landing ya aparece como tarjeta «en camino» y en el plan Escuela (`app/routes/home/club-sections.tsx`).

## 4. MVP (lo que entra)

- **Login** con la cuenta de fixtergeek (Google y magic link), **Sign in with Apple** (Apple lo exige si hay login
  de Google; regla 4.8) y **borrar cuenta** dentro de la app (regla 5.1.1(v)).
- **Muro** de la comunidad:
  - leer, publicar (texto e imagen), comentar y dar 👍;
  - el anfitrión puede fijar y ocultar;
  - **reportar y bloquear** usuario, que Apple exige en apps con contenido de usuarios (regla 1.2).
- **Llamadas:**
  - cuenta regresiva y «Entrar a la llamada», que abre la sala de la caja en un navegador dentro de la app
    (SFSafariViewController / Custom Tabs);
  - agregar la llamada al calendario (`.ics` existente).
- **Grabaciones:** lista y reproductor HLS nativo.
- **Push:**
  - automáticos: recordatorio de llamada (24 h y 1 h, los mismos de `remindedFor`), «la llamada empezó»,
    respuesta a tu publicación;
  - manual del anfitrión desde `/comunidad/:slug/admin` (título de 40 caracteres y cuerpo de 140, como Circle).
- **Sin pagos dentro de la app:**
  - quien no es miembro ve «Tu membresía no está activa» sin botón ni precio;
  - se compra en la web;
  - es el modelo multiplataforma de la regla 3.1.3(b), el mismo que usa ghosty-app.
- **Marca por inquilino:** nombre, ícono, splash, colores y logo.
- **Fuera del MVP:**
  - video nativo con LiveKit;
  - IAP;
  - pantallas personalizadas;
  - DMs;
  - cursos dentro de la app.

## 5. Endpoints nuevos en fixter2025 (`/api/app/v1/*`, JSON, `Authorization: Bearer`)

**Plan:** sacar la lógica que hoy vive en las acciones de `comunidad.$slug.tsx` a `app/.server/services/` (casi
toda ya está en `wall.server.ts`, `club-call.server.ts` y `club-recording.server.ts`) y llamarla desde la web y
desde la app.

| Método y ruta | Qué hace |
|---|---|
| `POST auth/start`, `POST auth/verify` | Magic link o código, más Google y Apple → token de app (modelo nuevo `AppSession`: hash, `userId`, dispositivo, `lastSeenAt`) |
| `POST auth/logout`, `DELETE me` | Cerrar sesión y borrar cuenta |
| `GET me` | Usuario y membresías (comunidad, estado, `currentPeriodEnd`) |
| `GET communities/:slug` | Datos y marca de la comunidad, más `canParticipate` y `canModerate` |
| `GET communities/:slug/posts?cursor=` | Muro paginado, con las fijadas primero |
| `POST posts`, `POST posts/:id/comments`, `POST posts/:id/like` | Publicar, comentar y dar 👍 |
| `POST posts/:id/mod` | Fijar u ocultar (sólo el anfitrión) |
| `POST posts/:id/report`, `POST users/:id/block` | Reportar y bloquear (modelos nuevos `CommunityReport`, `UserBlock`) |
| `POST uploads/image` | Subir imagen (reusa `api/wall-image`) |
| `GET communities/:slug/events` | Próximas sesiones de la serie |
| `POST communities/:slug/call` | Regresa `{url}` del ticket de gs (misma regla de los 15 min y de los invitados) |
| `GET communities/:slug/recordings`, `GET recordings/:id/play` | Lista y `{src}` firmado (reusa `recordingPlayUrl`) |
| `POST devices`, `DELETE devices/:token` | Registrar el token de push (modelo nuevo `PushDevice`: `userId`, `appId`, plataforma, token) |
| `GET app-config?appId=` | `minBuild`, `suggestBuild` y flags por app, como el `AppConfig` de ghosty-app |
| `POST communities/:slug/push` | Push manual del anfitrión (también desde el panel web) |

**Envío de push:**
- Un servicio `push.server.ts` con APNs y FCM directos.
- Lo llaman el cron de recordatorios que ya existe, el arranque de la llamada y los comentarios.
- **Cada app de creador tiene sus propias credenciales de APNs** (su cuenta de Apple), así que `PushDevice` lleva
  `appId`.

## 6. Marca blanca en las tiendas

1. **Escalón 1: la app compartida «FixterGeek» en nuestra cuenta.** Es una sola app para todas las comunidades y
   no choca con la regla 4.2.6, porque no es un clon por cliente. El Club de Agentes es la primera comunidad adentro.
2. **Escalón 2 (plan Escuela): un build por creador bajo SU cuenta de organización**, el mismo modelo de Circle.
   - El creador saca su D-U-N-S y su cuenta de Apple Developer y de Google Play, y le da acceso de admin a
     fixtergeek.
   - Nosotros compilamos el target o flavor del creador y subimos con `asc.py` multi-app.
   - Cada app filtra a la comunidad de su creador.
3. **Inquilinos en un JSON** (`apps/tenants/<slug>.json`): nombre, bundle id, ícono, colores, `communitySlug`,
   `ascAppId`, equipo de Apple y dominio de Universal Links.
   - Una sola base; **nunca un fork por creador**.

## 7. Riesgos

- **Revisión de Apple:**
  - **4.2 (funcionalidad mínima):** una app que sólo envuelve la web se rechaza. Por eso muro, grabaciones y
    push son nativos, y sólo la sala de la llamada abre un navegador.
  - **4.2.6:** cada app va en la cuenta de su dueño.
  - **1.2:** el contenido de usuarios exige reportar, bloquear y EULA.
  - **4.8 y 5.1.1(v):** Sign in with Apple y borrar cuenta.
  - **Cuenta del revisor por app**, con membresía activa y una llamada que el revisor pueda abrir (lección de
    ghosty-app y del «iOS Reviewer» de Circle).
- **Pagos:**
  - en México no hay liga externa de pago (no aparece en los programas citados en la sección 1);
  - el MVP no vende dentro de la app (3.1.3(b)): ni botón ni precio, y no se mencionan los pagos fuera de Apple;
  - si después se quiere cobrar en la app, va IAP (15 % con el programa de pequeños desarrolladores) y hay que
    conciliar con `Membership`/Stripe; RevenueCat es una opción.
- **Llamada en navegador dentro de la app:** falta verificar que la sala web de la caja (`room.html`) funcione en
  Safari y Chrome móviles (cámara, micrófono, pantalla en reposo). Si falla, el SDK nativo de LiveKit pasa al MVP.
- **Cupo de builds:** con N creadores, cada cambio son N builds y N revisiones.
  - Hay que agrupar las versiones y mover a datos del servidor (tema, módulos, textos) todo lo que se pueda, para no recompilar.
- **Credenciales ajenas:** guardar las llaves de APNs y de App Store Connect de cada creador cifradas, nunca en el
  repo.

## 8. Pasos en orden

1. **Decisiones de bliss:**
   - ~~Expo o nativo~~ → nativo (10-nov); dos escalones decididos (sección 3b);
   - qué cobra fixtergeek por la app de marca.
2. **Verificar** la sala de la caja en Safari y Chrome móviles con una llamada de prueba.
3. **API v1 en fixter2025:**
   - sacar los servicios de `comunidad.$slug.tsx`;
   - `AppSession` + auth;
   - endpoints del muro, eventos, llamada y grabaciones;
   - `PushDevice` + `push.server.ts`.
   - Pruebas de cada endpoint.
4. **Reportar y bloquear** también en la web, para que la moderación sea la misma en todos lados.
5. **Target `Comunidades` (iOS) y flavor `comunidades` (Android)** como app compartida, probando con `club-de-agentes`:
   - login y muro;
   - modo demo sin red para las capturas.
6. **Llamadas** (cuenta regresiva, navegador, `.ics`), **grabaciones** (`expo-video`) y **push** (recordatorios,
   «empezó», respuestas, manual).
7. **Panel del anfitrión:** «Mandar aviso» en `/comunidad/:slug/admin`.
8. **Publicar el Club de Agentes** en la cuenta de FixterGeek:
   - TestFlight y prueba interna de Play;
   - cuenta del revisor;
   - fichas;
   - revisión.
9. **Multi-inquilino:**
   - JSON de inquilinos;
   - `asc.py` multi-app;
   - guía de alta para el creador (D-U-N-S, cuentas, acceso de admin);
   - segundo creador piloto.
10. **Fase 2:** LiveKit nativo, IAP, pantallas personalizadas, cursos y DMs.
