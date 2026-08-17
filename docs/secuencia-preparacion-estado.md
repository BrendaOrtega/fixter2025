# Secuencia de preparación del taller — estado operativo

Actualizado: 17 de agosto de 2026.

Secuencia `6a7a496344caa1db8e558fc3` — "Taller Sistemas Agénticos — Preparación".
Privada, `trigger: MANUAL`, activa.
Editor: https://www.fixtergeek.com/secuencias/gestion/6a7a496344caa1db8e558fc3
(la ruta `/secuencias/:id` es el alta pública y devuelve "secuencia no
disponible" para una privada; la gestión vive un nivel adentro).

## Los cinco correos

| # | Asunto | Espera | Video | Cuerpo |
|---|--------|--------|-------|--------|
| 1 | El loop del agente | 0 d | `sesion-01-el-loop` | escrito |
| 2 | El ZIP de 113 MB que tumbó al bot | 1 d | `sesion-02-el-escritorio` | escrito |
| 3 | El día que tiré mi propio arnés | 2 d | `el-sdk-de-vercel` | escrito |
| 4 | La regla que tu agente puede ignorar | 3 d | `sesion-03-los-hooks` | escrito |
| 5 | Lo que vas a construir | 4 d | — | **vacío** |

El **17 de agosto** entró el short del AI SDK como entrega 3 y los hooks pasaron
a la 4 (`scripts/set-correo-3-sdk.ts`, idempotente: el intercambio de `order`
solo corre si todavía no se hizo). El asunto reservado del hueco —"Cuánto cuesta
de verdad un agente"— se disolvió: el costo entra dentro de la entrega del SDK,
con el caché y las 500 líneas.

Un correo sin cuerpo **no se manda**: el motor lo pospone 24 h y reintenta. La
inscripción se queda esperando en lugar de enviar algo roto, pero cada día de
retraso empuja el resto del calendario de esa persona. **El correo 5 sigue
vacío**, así que la secuencia se queda colgada en el último paso.

### Los cuerpos viven en `docs/`

`correo-1-loop.html`, `correo-2-zip.html`, `correo-3-sdk.html` y
`correo-4-hooks.html` son la copia de trabajo; la base es la que manda. El
formato quedó fijo el 17 de agosto: **saludo → gancho de dos líneas → `{{video}}`
→ bullets → una frase de cierre**. El video lleva el contenido y el correo solo
lo enmarca; antes cada entrega repetía en texto lo que el video ya explica, con
bloques de código incluidos, y salía un correo de scroll infinito
(`scripts/simplificar-correos-preparacion.ts`).

Al mover una entrega hay que tocar **tres cosas por correo**, y ninguna es
automática: la barra de progreso ("3 de 5" y los segmentos encendidos), el pie de
"En el siguiente correo" —que anuncia asunto **y** espera— y el `delayDays` de la
base, que se ajusta a mano en el riel. Estaban desalineados desde antes: el
correo 2 anunciaba "Cómo sabes que tu agente sirve", que nunca se escribió.

## Inscritos

- `martin.melo.dev.97@gmail.com` (Martín Melo, única compra del taller).
  **Corregido el 13 de agosto.** Se había inscrito con `nitram-210397@hotmail.com`,
  la dirección que quedó en el `PurchaseEvent`; su compra fue un caso especial
  por forma de pago y él pidió directamente el cambio de correo. El acceso al
  curso vive en el gmail. Los correos 1 y 2 se entregaron al hotmail y **nunca
  se abrieron** (`opened` y `clicked` vacíos), así que la inscripción se
  rebobinó al índice 0 para que reciba la secuencia completa desde el correo 1.

  El subscriber del hotmail no se pudo renombrar (ya existía uno con el gmail y
  el email es único): se reapuntó `subscriberId` en la inscripción y se
  limpiaron las métricas del envío equivocado. Script:
  `scripts/fix-martin-enrollment.ts`.
- `fixtergeek@gmail.com` y `fixtergeek+taller@gmail.com` — residuo del botón
  **"Enviar prueba"**, que crea la inscripción `paused` con el índice al final
  para que no se dispare y solo la borra si la creó ella misma. Como ya existían,
  se quedaron. El cron no las toca.

**Al 17 de agosto las tres inscripciones están en `paused`, incluida la de
Martín** (índice 2, `nextEmailAt` vencido el 16 de agosto): está detenida y no
va a recibir el correo 3, porque `processDueEnrollments` solo mira las activas.
No fue rebote, ni blacklist, ni `scripts/pausar-agentes-para-deploy.ts` —ese
apunta a la secuencia de comunidad—. Fue una pausa manual desde el panel, o una
baja desde `/secuencias/baja` o `/perfil`; **no hay forma de distinguirlo**,
porque no existe un campo `pausedAt` ni registro de quién pausó. Si fue baja del
propio Martín, reanudarlo es mandarle correo que pidió no recibir.

## Los videos

Viven en Tigris, públicos, bucket `wild-bird-2039`:

```
videos/sesion-01-el-loop.mp4
videos/sesion-02-el-escritorio.mp4
videos/posters/sesion-02-el-escritorio.jpg        (vertical, para el feed)
videos/posters/sesion-02-el-escritorio-wide.jpg   (1200x675, para la card del correo)
videos/sesion-03-los-hooks.mp4
videos/posters/sesion-03-los-hooks-v2.jpg         (vertical, para el feed)
videos/posters/sesion-03-los-hooks-wide-v2.jpg    (1200x675, para la card del correo)
videos/el-sdk-de-vercel.mp4
videos/posters/el-sdk-de-vercel.jpg               (vertical, para el feed)
videos/posters/el-sdk-de-vercel-wide.jpg          (1200x675, para la card del correo)
```

El slug del cuarto **no lleva número**: el orden de las entregas ya se movió una
vez, y un `sesion-04-` que acaba viviendo en la posición 3 miente para siempre.
Su proyecto está en `videos/goodies-sdk/` (HyperFrames, 1080x1920, 44 s, puro
motion graphics) y el estilo quedó documentado en
`docs/estilo-short-motion-graphics.md`.

El `-v2` de los pósters de la sesión 3 no es capricho: los primeros se generaron
con un titular que después cambió, y las keys se suben inmutables con caché de
un año. Pisar una key ya publicada deja copias viejas en los proxies, así que se
versiona el nombre y se actualiza el registro `Video`.

El registro `Video` necesita `posterWide`: `renderSequenceEmail` lo prefiere
sobre `poster` porque el vertical se come la pantalla en un correo de 600 px.

El proyecto del video 2 está en `videos/contexto-escritorio/` (HyperFrames,
1080x1920, 4m31s). Ver su `assets/BGM.md` y `SCRIPT.md`.

## El marcador `{{video}}`

El cuerpo de estos correos es un documento HTML completo. Si falta `{{video}}`,
el motor pega la tarjeta **al final**, o sea después de `</html>`, y Gmail la
descarta sin avisar. Todo correo con video debe llevar el marcador dentro del
`<body>`, en el punto donde el video aporta.

## Los nuevos compradores entran solos

**Ya no hace falta ninguna variable de entorno.** El enganche vive en el
producto, como dato:

```
Product { key: "sistemas-agenticos-workshop" }
  sequences: [ 1ª edición, preparación (immediate) ]
```

Al pagar, el webhook resuelve el producto por `metadata.type`, `fulfillPurchase`
entrega el curso, crea el subscriber e inscribe en **las dos** secuencias, manda
la bienvenida y deja el detalle de cada paso en `PurchaseEvent`.

Para cambiar a qué secuencias entra un comprador se edita ese registro
(`scripts/create-sistemas-product.ts`, que es un upsert y se puede volver a
correr) o se agregan desde `/admin/productos`. No se toca código.

Antes esto vivía en una rama escrita a mano del webhook con dos ObjectId
adentro, y la de preparación sólo corría si `PREPARACION_SEQUENCE_ID` estaba
seteada — no lo estaba, y por eso Martín tuvo que inscribirse a mano. Esa rama
y esa variable ya no existen.

`scripts/enroll-preparacion.ts` se queda para inscribir a alguien manualmente
cuando haga falta, pero ya no es el camino normal.

## Cuidado

`POST /api/sequences/process` procesa **todas** las secuencias del sistema,
incluidas las de webinar con fechas fijas. No dispararlo para forzar un envío
puntual; el cron ya corre cada 5 minutos en producción.
