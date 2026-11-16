# Mundo: qué copiarle a Godot (y a Phaser/Bevy)

16-nov-2026. **Puntos 1 a 5 hechos el mismo día** (ver «Señales, áreas, estado por montaje y validación» en `MUNDO-CARTUCHOS.md`). Contexto: `MUNDO-CARTUCHOS.md`, `AUDITORIA-CARTUCHOS.md`.

El motor ya trae varias piezas al estilo Godot: mapa de acciones (`input.ts`), controladores intercambiables
(`controllers.ts`), cartucho como escena intercambiable, estructura como recurso de datos y autoridad del
cliente sobre su propia nave. Esta lista cubre lo que falta, ordenado por valor entre costo. Costo: **S** (una
tarde), **M** (uno o dos días), **L** (una semana o más).

Medida de «sobreingeniería»: un mundo social de decenas de personas, sondeo cada 2.5 s, sin física de
contacto entre jugadores y sin competencia por milisegundos.

---

## 1. Estado compartido con reglas de mezcla y cambios atómicos

- **Godot hace:** la autoridad del servidor decide (`set_multiplayer_authority`, RPC `@rpc("authority")`); el
  cliente pide y el servidor aplica la regla.
- **Aquí hoy:** `propose` manda cada llave por separado (`engine.ts:406`, `WorldView.tsx:201`) y el servidor
  frena a 300 ms por persona (`club-world.server.ts:319`). El modo Estrellas hace `propose("best")` y
  `propose("leader")` en el mismo cuadro (`cartridges/archipielago/index.ts:25`): el segundo choca con el freno,
  y como `best` tarda hasta 2.5 s en volver, el modo repite las dos llamadas **cada cuadro**: unas 60 peticiones
  por segundo por persona hasta que llega el sondeo, y `leader` puede no escribirse nunca. El manual ya avisa
  del choque (`MUNDO-CARTUCHOS.md`, «Ojo: dos `propose` seguidos…»), pero el único modo real cae en él.
- **Propuesta:** `propose({ best: 7, leader: meId })` atómico (varias llaves en un solo cambio) y regla de mezcla
  por llave en `SharedKey`: `merge: "max" | "min" | "set"`, con `group` para que `leader` sólo se escriba si
  `best` ganó. En el motor, no reenviar el mismo valor mientras haya uno en vuelo.
- **Costo:** S. Arregla un error real y quita la carrera de «gana el último que escribe» en los récords.

## 2. Señales: eventos tipados para el modo y la skin

- **Godot hace:** `signal body_entered(body)`; cualquiera se conecta con `connect` y nadie sondea.
- **Aquí hoy:** el motor habla hacia afuera con 20 callbacks sueltos (`engine.ts:44-80`), hacia la skin con
  `renderer.event` (`engine.ts:146`, unión `WorldEvent` en `cartridge.ts:351-366`) y al modo **no le avisa
  nada**: el modo tiene que comparar `nearPlace` cuadro a cuadro para saber si llegaste (ejemplo del manual) o
  recorrer todas las estrellas cada cuadro (`archipielago/index.ts:16`).
- **Propuesta:** un emisor tipado chico `on<K extends keyof WorldSignals>(k, fn) → off` dentro del motor, con
  las señales que ya existen sueltas: `place-entered/exited`, `pickup`, `bot-down`, `hit`, `down`, `revive`,
  `wave`, `shared-changed`. `GameMode` gana `on?(signal)` y la skin recibe las mismas por `event`. Los
  `Callbacks` de React se quedan como están (son la frontera con la interfaz) y se alimentan del mismo emisor.
- **Costo:** S–M. Los modos nuevos se escriben con reglas de «cuando pasa X» y dejan de hacer polling.

## 3. Áreas (Area2D) para lugares, zonas y objetivos del modo

- **Godot hace:** `Area2D` + `CollisionShape2D` (círculo, rectángulo, polígono) con `body_entered/exited`,
  capas y máscaras para decidir quién detecta a quién.
- **Aquí hoy:** sólo los lugares detectan, y sólo como círculo (`placeOf`, `engine.ts:321-325`). La cercanía a
  personas tiene números fijos 112/150 (`engine.ts:344`). «Zona segura» = estar dentro de cualquier lugar
  (`exposed`, `engine.ts:559`). Las estrellas de Archipiélago y la gravedad (`engine.ts:206-218`) son áreas
  hechas a mano. `tableZone` es un rectángulo que sólo sirve para la lista.
- **Propuesta:** `structure.areas?: Area[]` con `shape` (`circle | rect | poly`), `tags` (`safe`, `gravity`,
  `noShoot`…) y un `id`; el motor emite `area-entered/exited` (punto 2). Los `places` se vuelven áreas con
  `target`. El modo puede registrar áreas efímeras con `ctx.area(id, shape | null)` (las estrellas de la tanda).
  Sin capas ni máscaras: sólo tu nave dispara señales.
- **Costo:** M. Abre modos nuevos (carreras, zonas de captura, «quédate en el círculo») sin tocar el motor.

## 4. Estado del cartucho por montaje (autoload con alcance)

- **Godot hace:** un *autoload* es un nodo singleton que vive mientras corre la escena y se resetea con ella.
- **Aquí hoy:** dos singletons de módulo hechos a mano. `starState` (`archipielago/stars.ts:45`) lo comparten
  el modo y el renderizador; sobrevive a desmontar y volver a montar el cartucho (cambio de mundo y regreso, o
  remontaje de React), así que las estrellas tomadas quedan marcadas. `SOLIDS`/`sea` de Isla Menta
  (`isla-menta/structure.ts:284-313`) son estado mutable en un archivo que importa el servidor (auditoría #9).
- **Propuesta:** `Cartridge.createState?: () => S`; el motor lo llama una vez por montaje y lo pasa a
  `mode(state)` y a `createRenderer({ …, state })`. La estructura vuelve a ser datos puros.
- **Costo:** S. Quita la única vía por la que dos montajes o el servidor se contaminan.

## 5. Recursos validados (los `.tres` con propiedades exportadas)

- **Godot hace:** un `Resource` declara sus campos con tipo y rango (`@export_range`) y el editor no deja
  guardar uno inválido.
- **Aquí hoy:** la estructura ya es un recurso de datos (`cartridge.ts:193-217`) y los tipos de TS cubren la
  forma, pero nada revisa la coherencia: `threat` sin `copy.threat`, `pickups.count > 0` con `weapons: []`,
  `spawn` fuera de `constrain`, `gravity.radius <= r`, asientos fuera del mapa (auditoría #8).
- **Propuesta:** `validateStructure(cartridge): string[]` puro en `world/validate.ts`; corre en el test de
  todos los cartuchos registrados y, en desarrollo, al montar (mensaje en consola). Sustituye a la aserción
  frágil de `club-world.test.ts:336-337`.
- **Costo:** S. Es lo que convierte «compila» en «enchufa y funciona».

## 6. InputMap completo: acciones con nombre, del cartucho, reasignables

- **Godot hace:** `InputMap` con acciones (`ui_accept`, `jump`) que el proyecto declara y el jugador reasigna;
  `Input.is_action_pressed("jump")` sirve igual con teclado, control o táctil.
- **Aquí hoy:** `input.ts:9-20` ya traduce movimiento y turbo, pero `Space`, `Enter` y `Escape` siguen fijos en
  `onKeyDown` (`engine.ts:739-746`), y Archipiélago escucha `KeyC` por su cuenta en `window`
  (`archipielago/renderer.ts:324-328`), con su propio filtro de inputs duplicado. Un segundo cartucho con tecla
  propia repite el código y puede chocar.
- **Propuesta:** tabla `BINDINGS: Record<Action, string[]>` (`move_*`, `boost`, `shoot`, `interact`, `cancel`)
  y `skin.actions?: Record<string, string[]>` para las del cartucho (`camera: ["KeyC"]`), que llegan como
  señal `action` (punto 2). Reasignación guardada en `localStorage`. Control físico con la Gamepad API leído en
  `readActions` (unas 30 líneas).
- **Costo:** S. Accesibilidad y control de consola casi gratis; un solo filtro de «estoy escribiendo en el chat».

## 7. Guardado: récords que sobreviven a un despliegue y ajustes en un solo lugar

- **Godot hace:** `user://` + `ConfigFile` para ajustes, y archivos de guardado para el progreso.
- **Aquí hoy:** el estado compartido vive sólo en memoria (`club-world.server.ts:71-73`) y se borra con cada
  despliegue (la caja jala imagen nueva cada 60 s) y al cambiar de cartucho (`:121`): el «récord del club» de
  Estrellas dura hasta el siguiente `git push`. Del lado del cliente, aspecto, «Tranquilo» y sonido van en
  llaves sueltas de `localStorage` (`WorldView.tsx:50-64`).
- **Propuesta:** `SharedKey.persist: true`; el servidor escribe esas llaves en un campo `Json?` opcional de la
  comunidad (por cartucho), con un retraso de unos segundos para no escribir en cada cambio, y las hidrata como
  ya hace con `worldCartridge` (`hydrateCartridge`, `:95`). Campo nuevo opcional, sin migración destructiva.
  En el cliente, un `settings.ts` con una sola llave versionada (aspecto por cartucho, ajustes, teclas del punto 6).
- **Costo:** S–M. Un récord que no se borra solo es lo que hace que valga la pena romperlo.

## 8. Paso fijo para la simulación (`_physics_process`, `FixedUpdate` de Bevy)

- **Godot hace:** `_process(delta)` para pintar y `_physics_process` a 60 Hz fijos para la física.
- **Aquí hoy:** un solo `tick` con `dt` variable topado a 0.05 (`engine.ts:777`). Los controladores usan frenado
  exponencial (bien), pero la aceleración es Euler explícito (`controllers.ts:30`), los suavizados son
  `Math.min(1, k*dt)` (`engine.ts:179,190`) y los disparos ya necesitaron barrido para no atravesar a nadie
  (`engine.ts:526`). Con 30 cuadros contra 144 la nave se siente distinta, y los modos reciben `dt` irregular.
- **Propuesta:** acumulador a 60 Hz para `updatePlayer`, `updateHuman`, `updateGame`, `updateThreat` y
  `updateMode`; `render` sigue con rAF e interpola posición entre el paso anterior y el actual (`prevX/prevY`
  por entidad). Los tests de controladores ya son puros y pasan sin cambio.
- **Costo:** M. Vale cuando haya un modo de habilidad (carreras, esquivar). Para pasear, hoy alcanza.

## 9. Componer el motor por partes (escenas/nodos de Godot, *plugins* de Bevy)

- **Godot hace:** cada mecánica es un nodo o escena que se agrega como hijo; Bevy agrupa sistemas en un
  `Plugin` que se instala si hace falta.
- **Aquí hoy:** `engine.ts` (949 líneas) entreteje combate, aparatos, amenaza, gravedad, mesas y modo en un solo
  cierre; el `tick` llama todo en orden fijo (`engine.ts:778-794`). Por eso se cuela contenido de GeekSector
  (`shot: "bomb"`, `r: 74` en `engine.ts:660`, auditoría #4).
- **Propuesta:** interfaz interna `System = { update(dt), frame?(f), signal?(s), api?, destroy() }` y sacar
  primero la amenaza (~200 líneas) y luego combate/aparatos a `world/systems/`. El motor instala un sistema sólo
  si la estructura lo declara (`combat`, `threat`). Sin árbol de nodos ni ECS: una lista plana.
- **Costo:** M–L, por partes. No cambia el contrato de cartuchos; baja el costo de cada mecánica nueva.

## 10. Señales de un solo uso por la red (RPC sin estado)

- **Godot hace:** `rpc("celebrate", id)` manda un evento a todos sin guardarlo como estado.
- **Aquí hoy:** sólo hay canales fijos de un solo uso (`wave`, `nudge`, `boom`, `say`, con TTL en
  `club-world.server.ts:14-21`). Un modo sólo puede escribir estado compartido (punto 1); para anunciar
  «Ana rompió el récord» tendría que inventar una llave de texto.
- **Propuesta:** `ctx.broadcast(name, payload)` con nombres declarados en `structure.signals` (como `shared`),
  mismo mecanismo de TTL y `id` que los saludos, y llegada como señal `remote` al modo de los demás.
- **Costo:** S–M. Útil en cuanto haya un segundo modo de juego; antes, no.

---

## Ya lo tenemos (no tocar)

- **Cámara 2D con suavizado y límites** (`Camera2D.limit_*`, `position_smoothing`): `updateCamera` sigue con
  `k = 5·dt` y se acota al mapa (`engine.ts:365-370`). Si un cartucho pide más: `lookAhead` y temblor de pantalla
  como campos opcionales de `structure.camera`, costo S. Hoy nadie lo pide.
- **Interpolación de otras personas**: no se teletransportan; vuelan hacia su destino entre lecturas
  (`updateHuman`, `engine.ts:248-256`), el latido ya manda la posición futura `x + v·1.1 s` al volar con teclas
  (`engine.ts:934`) y se corrige de golpe sólo pasando 320 unidades. Con sondeo es lo correcto; un búfer de
  instantáneas a la Valve pide red en tiempo real.
- **Autoridad**: cada cliente manda en su nave y simula los disparos contra sí mismo; el servidor valida contra la
  estructura. Es el modelo `set_multiplayer_authority(peer_id)` de Godot.
- **Cambio de escena**: cambiar de cartucho desmonta uno y monta otro sin recargar (`WorldView.tsx:256-261`), como
  `change_scene_to_packed`.
- **Relojes deterministas**: robots, amenaza y estrellas salen de la hora (`BotDef.at`, `Threat.at`, `starsOf`); todos
  ven lo mismo sin servidor. Godot no trae nada mejor para esto.

## Descartado

- **Árbol de nodos completo o ECS** (Godot, Bevy): para tres cartuchos y decenas de personas, la lista plana del
  punto 9 da lo mismo con una fracción del código.
- **AnimationPlayer / tweens en el motor**: las animaciones son de la skin y ya salen de los contadores de la
  entidad (`waveT`, `shakeT`, `warpT`, `leaveT`, `shieldT`). Si dos skins repiten curvas, un `ease.ts` compartido,
  sin línea de tiempo.
- **Motor de física** (Arcade de Phaser, Rapier): no hay choques entre personas y `constrain` cubre caminos e islas.
- **Red en tiempo real** (WebSocket/WebRTC, `MultiplayerSynchronizer` a 20 Hz, *rollback*): con el sondeo de 2.5 s y
  0.9 s al volar la presencia se siente viva. Reconsiderar sólo si un modo necesita reacción menor a un segundo; antes,
  probar el punto 10.
- **Capas y máscaras de colisión**: con una sola nave que detecta (la tuya), los `tags` del punto 3 alcanzan.
- **Grupos de Godot** (`add_to_group`): `humans`, `bots` y `threat` ya están separados en el motor.
