# Auditoría: ¿el Mundo es «plug and play como consola»?

16-nov-2026. Sin cambios de código.

**Veredicto:** casi sí. Un cartucho sencillo (sin disparos, sin modo de juego) entra con su carpeta y una línea en `cartridges/index.ts`. Lo que falla está en los tests, en unos cuantos textos y sonidos fijos del motor, y en que el contrato escrito se quedó atrás del código.

Leyenda: **[V]** verificado (lo leí o lo corrí), **[I]** inferido (no lo probé en el navegador).

## Prueba hecha

- [V] Escribí un cartucho mínimo en el scratchpad (`places: []`, `tables: []`, `tableZone: null`, `bots: []`, `combat: null`, una opción por lista y una skin que no pinta nada). Compila contra `cartridge.ts` con `tsc`. Lo empujé a `CARTRIDGES` y el servidor lo aceptó: `setWorldCartridge`, `upsertShip` (acota al mapa, descarta mesa y look ajenos, ignora `down` sin amenaza), `sendBoom → false`, y `snapshot` limpio.
- [V] `grep` de `geeksector|isla-menta|islaMenta|manta|lancer` fuera de `cartridges/` encuentra sólo `WorldView.tsx:33`, un comentario en `cartridge.ts:422`, el comentario de Prisma y un test.
- [V] `npx vitest run club-world.test.ts`: 26/26.
- [I] En el navegador, el motor con el cartucho mínimo debería andar: sin lugares, la lista del teléfono sale vacía; sin `toScreen`, usa la cámara 2D. No lo abrí.

## Acoplamientos

| # | Dónde | Qué pasa | Severidad |
|---|---|---|---|
| 1 | `__tests__/club-world.test.ts:336-337` | El test exige que **ningún** cartucho registrado traiga `mode` ni `shared`. El primer cartucho real con modo de juego tumba el test. [V] | **rompe** (CI) |
| 2 | `club-world.test.ts:10,153-160,263-318` | `HOUSE` = cartucho por defecto, y los tests dan por hecho que es GeekSector: `bot:uno`, `threat`, `table: 2`, `rocket`. Con otro `DEFAULT_CARTRIDGE_ID` fallan. [V] | estorba |
| 3 | `cartridge.ts:398-402` vs `engine.ts:677,718,727` y `WorldView.tsx:278` | El motor pide sonidos que `MOTOR_SOUNDS` no lista: `boomBig`, `life`, `bonk`, `zap`. Un autor que se guíe por el contrato los deja mudos. `zap` no tiene receta en ninguna skin. [V] | estorba |
| 4 | `engine.ts:667` | Los reventones en cadena de la amenaza derribada mandan `shot: "bomb"` con `r: 74`, que son id y número de GeekSector. Otro cartucho con amenaza recibe un `shot` que no existe en su `combat.shots`. [V] | estorba |
| 5 | `cartridge.ts:21` + `WorldView.tsx:72,91,442-460` | `PlaceTarget` es una lista cerrada (`call/wall/recs/courses/table`). Un destino nuevo (tienda, liga externa) obliga a tocar el contrato, el ícono, la regla de ocultar y la franja de abajo. Es así por diseño, pero no es plug and play. [V] | estorba |
| 6 | Contrato y manual vs servidor | `nudge kind: "zap"`, `weak` en el latido, `sendHurt`/`hurt` en el snapshot: el código los usa y el manual no los menciona (`MUNDO-CARTUCHOS.md:36-39`). `MotorHooks` ya trae `nudge`, pero el manual (`:60`) sólo nombra `walkTo/greet/sound`. [V] | estorba |
| 7 | `copy` en `cartridge.ts:449-452` | `basicWeapon`, `uses` y `shootHint` son obligatorios aunque `combat: null`. Isla Menta los llena con `""`. [V] | cosmético |
| 8 | `club-world.test.ts:180-201` | El test de coherencia no revisa: que exista `copy.threat` cuando hay `threat` (la UI se calla sola en `WorldView.tsx:563`), que `weapons` no venga vacío con `pickups.count > 0` (`nextKind` regresaría `undefined`, `engine.ts:433-439` [I]), ni que `spawn` caiga en un punto que `constrain` permita. [V] | estorba |
| 9 | `isla-menta/structure.ts:284,345` | La estructura guarda estado mutable de módulo (`SOLIDS`, `sea`, que escribe el renderizador). El contrato pide «datos y funciones puras». El servidor no llama `constrain`, así que hoy no hace daño. [V/I] | cosmético |
| 10 | `WorldView.tsx:33` | La llave de `localStorage` tiene un caso especial para `"geeksector"` (`club-world-ship`, la de antes). Es legado y no estorba a nadie más. [V] | cosmético |
| 11 | `engine.ts:340,908`, `WorldView.tsx:452-460` | Textos del tema escritos en el motor y la UI: «en la mesa «…»», «¡Hola, X!», «Sentarte», «Mesa llena», «con voz y cámara». No salen de `copy`. [V] | cosmético |
| 12 | `WorldView.tsx` (chrome) y `schema.prisma:253` | La interfaz alrededor del mapa usa la paleta de FixterGeek fija (`#141B20`, `brand-500`). El comentario de Prisma dice «Vacío = GeekSector» en vez de citar `DEFAULT_CARTRIDGE_ID`. [V] | cosmético |
| 13 | `club-world.server.ts:108-124` | Al cambiar de cartucho, las posiciones sólo se acotan con `Math.min` al tamaño nuevo y no pasan por `constrain`. Alguien puede quedar en el agua hasta su siguiente latido. El cliente vuelve a montar en `spawn`, así que dura un sondeo. [I] | cosmético |

Lo que **sí** está limpio [V]: Prisma (`worldCartridge String?` libre, y un id desconocido cae al de la casa con `getCartridge`), el panel admin (lista `CARTRIDGES` sin casos especiales), `ClubShell`, el poster (sale de `cartridge.poster`), `sound.ts` (banco por nombre, lo que falta queda en silencio), `combat: null` (el motor apaga disparos, aparatos y amenaza, y la UI esconde el botón) y el piloto `avatar` (opcional y documentado).

## Cartucho mínimo: lo obligatorio

[V] por tipos y por la prueba del servidor:

- `id`, `name`, `description`, `poster.backgroundColor`, `loadSkin`.
- `structure`: `size`, `spawn`, `places` (puede ir `[]`), `tables` (`[]`), `tableZone` (`null`), `bots` (`[]`), `looks` (una opción por lista + `initial` + `fallback`), `movement` (los 7 números), `camera` y `combat: null`.
- `copy`: los 17 campos, aunque 3 no se usen sin combate (hallazgo 7).
- Skin: `createRenderer → { resize, render, destroy }` y `sounds: {}`. Funciona sin three, en canvas 2D.

Todo lo demás es opcional: `threat`, `shared`, `mode`, `gravity`, `constrain/route/giveWay`, `toScreen/toWorld`, `event`, `drawOption`, `swatch`.

## Qué arreglar, en orden

1. **Tests**: quitar la aserción «ningún cartucho trae modo» (hallazgo 1). Fijar los tests de amenaza, robots y mesas a `getCartridge("geeksector")` y no al default (2). Agregar un cartucho mínimo de prueba (como el de arriba) que recorra todo el servidor.
2. **Contrato de sonidos**: sumar `boomBig`, `life`, `bonk`, `zap` a `MOTOR_SOUNDS` o dejar de emitirlos (3).
3. **Motor sin contenido**: que el reventón en cadena no diga `"bomb"`, sino `combat.basic.shot` o un campo de `Threat` (4).
4. **Test de coherencia**: `threat ⇒ copy.threat`, `pickups.count > 0 ⇒ weapons.length > 0`, `constrain(spawn) ≈ spawn` (8).
5. **Manual**: documentar `zap`/`weak`/`hurt` y `MotorHooks.nudge`, y anotarlo en «Cambios al contrato» (6).
6. **Opcional**: `copy` de combate opcional cuando `combat: null` (7). Textos de mesa y saludo a `copy` (11). Decidir si `PlaceTarget` admite un destino genérico tipo `link` (5).
