# Secuencia de preparación del taller — estado operativo

Actualizado: 11 de agosto de 2026.

Secuencia `6a7a496344caa1db8e558fc3` — "Taller Sistemas Agénticos — Preparación".
Privada, `trigger: MANUAL`, activa.
Editor: https://www.fixtergeek.com/secuencias/6a7a496344caa1db8e558fc3

## Los cinco correos

| # | Asunto | Espera | Video | Cuerpo |
|---|--------|--------|-------|--------|
| 1 | El loop del agente | 0 d | `sesion-01-el-loop` | escrito |
| 2 | El ZIP de 113 MB que tumbó al bot | 1 d | `sesion-02-el-escritorio` | escrito |
| 3 | La regla que tu agente puede ignorar | 2 d | `sesion-03-los-hooks` | escrito |
| 4 | Cuánto cuesta de verdad un agente | 1 d | — | **vacío** |
| 5 | Lo que vas a construir | 2 d | — | **vacío** |

Un correo sin cuerpo **no se manda**: el motor lo pospone 24 h y reintenta. La
inscripción se queda esperando en lugar de enviar algo roto, pero cada día de
retraso empuja el resto del calendario de esa persona.

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
- `fixtergeek@gmail.com` — inscripción de prueba, `paused` y con el índice al
  final. El cron no la toca.

## Los videos

Ambos viven en Tigris, públicos, bucket `wild-bird-2039`:

```
videos/sesion-01-el-loop.mp4
videos/sesion-02-el-escritorio.mp4
videos/posters/sesion-02-el-escritorio.jpg        (vertical, para el feed)
videos/posters/sesion-02-el-escritorio-wide.jpg   (1200x675, para la card del correo)
videos/sesion-03-los-hooks.mp4
videos/posters/sesion-03-los-hooks-v2.jpg         (vertical, para el feed)
videos/posters/sesion-03-los-hooks-wide-v2.jpg    (1200x675, para la card del correo)
```

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
