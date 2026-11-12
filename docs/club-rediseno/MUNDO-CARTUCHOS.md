# Mundo: motor y cartuchos

Los mundos del club son intercambiables, como cartuchos: el mismo motor, distinto mundo. El de
FixterGeek se llama **GeekSector**. Quien administra el club cambia de mundo en
`/comunidad/:slug/admin?tab=mundo` y el cambio llega en vivo a quien tenga el Mundo abierto.

## Vocabulario

| Palabra | Qué es | Dónde vive |
|---|---|---|
| **motor** | Las reglas: movimiento, cámara lógica, presencia, disparos, cercanía. Sin contenido propio. | `app/components/community/v2/world/engine.ts`, `sound.ts`; servidor en `app/.server/services/club-world.server.ts` |
| **cartucho** | Un mundo completo: su estructura + su skin. | `world/cartridges/<id>/` |
| **estructura** | Datos: tamaño, lugares y a qué llevan, mesas, robots y rutas, armas, aparición, restricciones de movimiento. La lee también el servidor. | `cartridges/<id>/structure.ts` |
| **skin** | Cómo se ve y suena: renderizador (canvas 2D, three.js…), efectos, sonidos, dibujos del selector. Sólo navegador, se carga con `import()`. | `cartridges/<id>/skin.ts` |

El contrato completo (tipos comentados) es `world/cartridge.ts`. Ejemplo a copiar: `world/cartridges/geeksector/`.

## Cómo se reparte el trabajo

- El **motor** guarda el estado (tú, las demás personas, robots, proyectiles, aparatos, burbujas) y
  aplica las reglas. Cada cuadro llama `renderer.render(frame)` con un `WorldFrame` y, cuando pasa
  algo que merece efecto, `renderer.event(ev)` (`pulse`, `blast`, `bot-down`, `bot-back`, `tickle`,
  `pickup`, `greet`, `calm`). No sabe de canvas, colores ni naves.
- La **skin** pinta todo: fondo, lugares, gente, juego, efectos y etiquetas (nombres, «Tú», burbujas
  de `frame.bubbles`). Sus partículas son suyas: las crea en `event()` y las avanza con `frame.dt`.
- El mapa es un **plano 2D** en unidades del mapa (`structure.size`). Un renderizador 3D pone ese
  plano donde quiera (p. ej. `x → X`, `y → Z`) y la altura la decide él.
- **Cámara**: el motor trae una cámara lógica 2D (`frame.view`) que sigue a tu personaje. Si pintas
  con otra proyección (3D), ignórala e implementa `toScreen` y `toWorld` en el renderizador: el
  motor las usa para los toques, el clic derecho y para saber si algo está a la vista.
- **Movimiento**: `structure.movement` trae velocidades y dos ganchos opcionales. `constrain(next, prev, hidden?)`
  regresa la posición permitida (caminar sólo sobre la isla o los caminos); `route(from, to, hidden?)` regresa
  los puntos intermedios para llegar con un toque. `hidden` son los ids de los lugares que hoy no existen
  (su edificio no debe estorbar). Sin ganchos el movimiento es libre (GeekSector).
- **Servidor**: valida posiciones, mesas, asientos, aspecto y robots contra `structure` del cartucho
  activo de esa comunidad. El protocolo de `/comunidad/:slug/mundo` no cambia entre cartuchos
  (`x, y, tx, ty, ship, color, pilot, table`); el snapshot trae además `cartridge` (id activo). Campos
  opcionales que un cliente viejo ignora: `down` en el latido y en cada nave (destruida por la amenaza) y
  `shared` en el snapshot (estado del modo de juego).
- **Mundo activo**: se guarda en `Community.worldCartridge` (campo opcional; sin valor = GeekSector) y se
  recuerda en memoria para no leer la base en cada sondeo. Lo cambia sólo quien modera el club.

## Hacer un cartucho nuevo

1. **Carpeta** `world/cartridges/<id>/` con `structure.ts`, `skin.ts` e `index.ts`.
2. **`structure.ts`** exporta un `WorldStructure`. Sólo datos y funciones puras (lo importa el servidor: nada de DOM ni three).
   - `size`, `spawn`, `camera`.
   - `places`: cada uno con `target` (`call`, `wall`, `recs`, `courses` o `table`), centro, radio `r` y
     nombres. `kind` es una pista libre para tu skin. Los de `recs`/`courses` se ocultan solos si el club no tiene grabaciones/cursos.
   - `tables` (con sus `seats` en coordenadas del mapa) y un `place` de `target: "table"` por mesa
     (`table: índice`). Sin mesas: `tables: []`, `tableZone: null`.
   - `bots`: ruta `at(t)` en función del reloj (segundos Unix), así todos los ven igual sin servidor. Puede ir vacío.
   - `looks`: opciones de `models`, `colors`, `pilots` (ids que tu skin sabe pintar), `initial` y `fallback`.
     El piloto `avatar` (foto del miembro) se elige solo si existe y la persona tiene foto. Una lista con una sola opción no se muestra en el selector.
   - `movement`: velocidades y, si hace falta, `constrain` / `route`.
   - `combat`: el juego de disparos, o `null` para un mundo sin disparos (se ocultan botón y pistas).
   - Opcionales: `threat` (enemigos), `Place.gravity` + `movement.gravity`, `shared` (ver «Piezas opcionales»).
3. **`skin.ts`** exporta por default un `WorldSkin`:
   - `createRenderer({ canvas, stage, structure })` → `{ resize, render, event?, toScreen?, toWorld?, destroy }`.
     `opts.motor` (`walkTo(p)`, `greet(entityId)`, `sound(name)`) es para skins con menús propios: caminar a un punto,
     saludar y sonar pasan por el motor.
     Tú pides el contexto del `<canvas>` (`2d`, o `new THREE.WebGLRenderer({ canvas })`). En `resize(view)`
     ajusta el lienzo a `view.vw × view.vh`. En `destroy` suelta todo (geometrías, texturas, nodos que hayas agregado a `stage`).
   - `sounds`: recetas por nombre (`MOTOR_SOUNDS` + el `sound` de cada aparato). Nombre sin receta = silencio.
   - `drawOption` y `swatch`: dibujos 2D del selector de aspecto (opcionales).
4. **`index.ts`** exporta el `Cartridge`: `id`, `name`, `description`, `structure`, `copy` (textos
   del tema), `poster` (fondo CSS del primer pintado) y `loadSkin: () => import("./skin").then((m) => m.default)`.
   El `import()` es obligatorio: así three.js no le pesa a GeekSector ni al servidor.
5. **Registrarlo**: agregarlo a `CARTRIDGES` en `world/cartridges/index.ts`. Con eso aparece en el
   panel del anfitrión y el servidor lo acepta.
6. **Probar**: `npx vitest run app/.server/services/__tests__/club-world.test.ts`, `npx tsc --noEmit -p .`,
   y en el navegador cambiar de mundo desde el panel con dos sesiones abiertas.

## Piezas opcionales

Un cartucho que no las declara se porta igual que antes. Hoy sólo GeekSector usa las dos primeras.

### Amenaza (`structure.threat`)

Un enemigo con calendario de reloj (`every`, `warn`, `stay`): avisa, llega, ronda por `at(ciclo, t)` y se va;
todos lo ven igual sin servidor. Dispara sólo a quien anda libre (sentado o dentro de un lugar nadie te
daña; no existe en «Tranquilo» ni en el mapa reducido). `variants[]` son los personajes que se alternan por
ciclo (`variants[ciclo % n]`), cada uno con `name`, `look` y, si quiere, su `at` y su `shot` (`burst`/`gap`
para ráfagas). `player` trae tus golpes, recuperación, segundos fuera y escudo al reaparecer.
- La skin pinta `frame.threat` (`entity` + `phase`), `frame.hostile` (sus disparos) y en las entidades
  `hp`, `downT`, `warpT`, `shieldT`, `leaveT`. Sonidos: `alarm`, `enemyShot`, `hit` (ya están en `MOTOR_SOUNDS`).
- `needsWeapon: true`: defenderse pide un aparato (un disparo con `dmg: 0`, como el básico, sólo le hace
  cosquillas). `supply: { count, back, near: [min, max] }` evita la mala suerte: en el aviso aparece un aparato
  a esa distancia de quien no trae uno, y durante la visita flotan `count` aparatos que reaparecen en `back` s.
  **Interruptor en GeekSector: `needsWeapon: false` en `threat` de `cartridges/geeksector/structure.ts`** regresa
  a «cualquier disparo le quita un golpe».
- Textos en `copy.threat`: `warning(name)`, `near(name)`, `advice`, `destroyed`, `back(n)` y, con `needsWeapon`,
  `arm` (qué hacer sin aparato, va tras el aviso) y `unarmed` (pista de escritorio).
- Al servidor sólo viajan `down: true` en tu latido y `boom: "<threat.id>:<ciclo>"` cuando alguien lo derriba.
- Disparos que también le pegan a su dueño (piden `threat`, porque la vida del jugador vive ahí):
  `ShotDef.selfHit` (tras el primer rebote) y `ShotDef.blast.self` (golpes del estallido si te quedas dentro del radio).

En GeekSector: el Alien (nave `manta`, zigzag, ráfagas de 2 cada 4.4 s) y el Astronauta (nave `lancer`, línea
recta, un tiro más rápido cada 3.8 s); 10 golpes del jugador, 6 del enemigo. El rosa `pink` es sólo de ellos.
Daño total de cada aparato contra sus 6 golpes: Triple 18, Rayo 15, Onda 8, Buscador 10, Rebote 12, Bomba 9.

### Gravedad (`Place.gravity` + `movement.gravity`)

`Place.gravity: { pull, radius }` curva tu trayectoria al pasar cerca de ese lugar; `movement.gravity` es el
interruptor (multiplica la fuerza; `0` o sin el campo = apagada). **Para quitarla en GeekSector: `gravity: 0`
en `movement` de `cartridges/geeksector/structure.ts`.** El motor la limita así:
- Tope del 25 % de `movement.accel`. Cero dentro de `r`, cero en la orilla de `radius` (campana entre los dos)
  y cero por debajo del 20 % de la velocidad máxima (completa desde el 60 %): una nave quieta o que llega
  frenando no se mueve sola, así que no te mete a un lugar ni te atrapa.
- Con destino por clic cuenta al 35 %. Sentado no aplica. Apagada en «Tranquilo», con `prefers-reduced-motion`,
  con puntero táctil, en pantalla angosta (< 640 px) y en el mapa reducido.
- Sólo mueve tu nave: ni disparos ni las naves de otras personas.

### Modo de juego (`cartridge.mode` + `structure.shared`)

Reglas propias de un cartucho sin tocar el motor. Hoy ningún cartucho trae modo; sólo existe la pieza.
- `mode: () => GameMode` en el manifiesto. El motor llama `update(ctx, dt)` cada cuadro (no en el mapa reducido).
  `ctx` da lectura (`now`, `meId`, `player`, `others`, `places`, `nearPlace`, `shared`) y cuatro acciones:
  `sound(name)`, `bubble(entity, text)`, `hud({ title, lines } | null)` y `propose(key, value | null)`.
  Sin DOM ni red. Si `update` lanza un error, el modo se apaga y el mundo sigue.
- `structure.shared` declara las llaves del estado compartido (a lo más 16): `{ type: "number", min, max }`
  (enteros), `{ type: "text", max }` (hasta 80 caracteres) o `{ type: "member" }` (id de alguien presente).
  El servidor guarda el diccionario en memoria por comunidad, rechaza llaves no declaradas y valores fuera de
  tipo o rango, acepta un cambio cada 300 ms por persona, suelta una llave `member` cuando esa persona se va y
  borra todo al cambiar de cartucho. Viaja como `{ share: { key, value } }` y vuelve en `snapshot.shared`
  (con el sondeo: tarda hasta ~2.5 s en llegar a los demás). No es transaccional: gana el último que escribe.
- El letrero (`hud`) lo pinta el club arriba a la izquierda, con `aria-live`; hasta 4 líneas.

Ejemplo: gana quien toque primero los 4 lugares.

```ts
// structure.ts
shared: { best: { type: "number", min: 0, max: 4 }, leader: { type: "member" } },

// index.ts
mode: () => {
  const seen = new Set<string>(); // estado local: vive en el cierre, uno por montaje
  return {
    update(ctx) {
      const p = ctx.nearPlace;
      if (p && p.target !== "table" && !seen.has(p.id)) {
        seen.add(p.id);
        ctx.sound("pickup");
        ctx.bubble(ctx.player, `${seen.size} de 4`);
        if (seen.size > Number(ctx.shared.best ?? 0)) { ctx.propose("best", seen.size); ctx.propose("leader", ctx.meId); }
      }
      const leader = ctx.shared.leader === ctx.meId ? "tú" : ctx.others.find((e) => e.id === ctx.shared.leader)?.first ?? "nadie";
      ctx.hud({ title: "Carrera de lugares", lines: [`Tú: ${seen.size} de 4`, `Va ganando: ${leader} (${ctx.shared.best ?? 0})`] });
    },
  };
},
```

Ojo: dos `propose` seguidos de la misma persona chocan con el freno de 300 ms (el segundo se rechaza); en un
modo real, junta lo que cambia en una sola llave o propón la segunda en otro cuadro, cuando la primera ya volvió en `shared`.

## Reglas

- Estilo de la casa en GeekSector: ilustración plana, sin gradientes ni brillos. Nunca fondo negro plano.
- Ghosty no se repinta (`/ghosty-oficial.png`).
- Los ids (`cartridge.id`, lugares, robots, opciones de aspecto) son estables: se guardan en la base, en `localStorage` y viajan en el sondeo.
- Un cambio a las firmas de `cartridge.ts` se anota abajo.

## Cambios al contrato

- 12-nov-2026: primera versión.
- 12-nov-2026 (todo opcional; un cartucho que no lo usa no cambia):
  - `constrain` y `route` reciben un tercer argumento `hidden`.
  - Amenaza: `structure.threat`, `Entity.shieldT/leaveT`, `WorldFrame.threat/hostile`, `copy.threat`, sonidos `alarm`, `enemyShot`, `hit`.
  - `Threat.variants`, `ThreatShot.burst/gap`; `copy.threat.warning` y `near` pasan a ser funciones `(name) => string`.
  - `ShotDef.selfHit`, `ShotDef.blast.self`.
  - `createRenderer` recibe `motor?: MotorHooks` (`walkTo`, `greet`, `sound`).
  - `Threat.needsWeapon`, `Threat.supply`, `copy.threat.arm/unarmed`.
  - `Place.gravity`, `Movement.gravity`.
  - Modo de juego: `Cartridge.mode`, `WorldStructure.shared`, tipos `GameMode`, `ModeContext`, `ModeHud`, `SharedKey`.
