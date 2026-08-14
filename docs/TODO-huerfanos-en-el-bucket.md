# Huérfanos antiguos en el bucket

Anotado el **2026-08-14**, después de cerrar el agujero que los producía.

## Lo que ya está resuelto

`/admin/programas/<slug>` borra los archivos del vídeo al borrar la pieza
(`app/.server/video-files.ts`). Antes se dejaban a propósito —*"borrarlos sin poder deshacer
es demasiado filo para un click"*— pero nadie los limpiaba después, y un webinar son ~1,400
objetos y 3.6 GB pagándose sin que nada los apunte.

Tres guardas, porque ese código construye un prefijo y borra **todo** lo que cuelgue de él:

1. `courseId` y `videoId` tienen que ser ObjectId de 24 hex.
2. El prefijo **siempre** termina en `/<videoId>/` — no se puede borrar el nivel del curso.
3. La fila del `Video` tiene que estar **ya borrada** antes de tocar sus bytes.

También se limpiaron los 78 objetos que dejaron las pruebas de ese día.

## Lo que queda pendiente

Estos grupos siguen en `wild-bird-2039`, bajo `fixtergeek/videos/`, sin un `Video` que los
apunte. Medidos el 14-ago:

| Prefijo | Objetos |
|---|---|
| `692e5ded…/6933379c…` | 68 |
| `692e5ded…/69333826…` | 47 |
| `692e5ded…/6933388b…` | 86 |
| `692e5ded…/695bda15…` | 92 |
| `68a617e8…/68a62344…` | 1 |
| `sequence/48dcc005-…` | 1 |
| `sequence/5b139149-…` | 1 |

⚠️ **No se barren con un script genérico.** El criterio *"no existe un `Video` con ese id →
es basura"* **es falso**: `sequence/<uuid>` es otro espacio de nombres y no se resuelve
contra la tabla de vídeos. Un barrido sin modo seco se lleva material vivo. Los `692e5ded…`
son de un curso viejo: hay que mirarlos uno por uno antes de tocarlos.

## Lo intocable

`anatomia-de-un-sistema-agentico` — 1,364 objetos, 3.6 GB, el webinar del 13-ago. Está
publicado y la gente lo está viendo.
