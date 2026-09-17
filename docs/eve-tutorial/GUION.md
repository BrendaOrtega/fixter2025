# eve desde dos trincheras — guion del tutorial (YouTube, ~30 min)

Proyecto demo: `~/eve-demo` (eve 0.58.1, Node 24, Anthropic directo). Plan aprobado en
`~/.claude/plans/no-quiero-cliches-m-s-partitioned-platypus.md`. Logs de la prueba real del
17 sep: `eve-run1.log` (pasos 1–3, pid 96343, `kill -9`) y `eve-run2.log` (pasos 4–6, pid 97510).

Reglas: tutorial, sin "no es X es Y", sin "y aquí viene", sin anáforas de negación, sin remates
deícticos. Cada bloque es un capítulo de YouTube. Tarjetas HyperFrames sólo en intro, capítulos y
outro (ilustración SVG de objeto concreto, paleta FixterGeek).

---

## 0 · Apertura (0:00–1:30) — pantalla: terminal

**Se ve**: `npx eve dev --no-ui`, `curl -X POST /eve/v1/session -d '{"message":"Procesa el lote con 6 pasos."}'`,
el log imprime `paso 1`, `paso 2`, `paso 3`, `pkill -9`, se vuelve a arrancar, el log sigue con
`paso 4`, `paso 5`, `paso 6` con otro pid.

**Voz**: "Este agente tiene una tarea de seis pasos. Voy a matar el proceso en el tercero. Lo arranco
otra vez y sigue en el cuarto, con otro pid, sin que yo le dé ningún contexto. Ese comportamiento
se llama agente durable, y hoy vamos a ver quién lo ofrece, cómo lo construyeron por dentro y cómo
correrlo en tu propia infraestructura. El framework es eve, de Vercel."

Tarjeta de título: "eve: agentes durables desde dos trincheras".

## 1 · Trinchera 1: lo que vende Vercel (1:30–6:00) — pantalla: eve.dev

**Se ve**: la landing, el toggle Managed, el "Build an agent" con el prompt "What should this agent
do?" y el aviso "You'll create or log in to your Vercel account before building".

**Voz**: "En la versión managed el agente se pide con una frase. Vercel genera la carpeta y la
despliega. Detrás hay cinco piezas, y las cinco son de Vercel: Vercel Workflows guarda el estado
y los checkpoints; AI Gateway hace las llamadas al modelo; Vercel Sandbox ejecuta el código del
agente aislado; Vercel Connect maneja las conexiones MCP y HTTP; y el Chat SDK conecta el agente
a Slack, Discord, WhatsApp, Telegram, Teams, cron o una API. Para empezar necesitas cuenta de
Vercel. El repositorio es Apache 2, así que el código lo puedes leer y correr donde quieras; lo
que cobra Vercel es operar esas cinco piezas."

**Se ve**: el árbol de carpetas del README.

**Voz**: "La idea central del framework es que el agente es un directorio. `instructions.md` es el
system prompt. `tools/` son funciones tipadas con Zod. `skills/` son procedimientos que se cargan
cuando hacen falta. `channels/` es por dónde entra el mensaje. `schedules/` son crons. `memory/`
declara qué recuerda y con qué proveedor. Cada archivo se convierte en una capacidad por su ruta:
`tools/get_weather.ts` es la tool `get_weather`."

## 2 · Cómo funciona por dentro (6:00–12:00) — pizarra 4:3 + código

**Pizarra**: tres cajas anidadas: sesión ⊃ turno ⊃ step.

**Voz**: "Una sesión es la conversación completa; puede durar días. Un turno es un mensaje del
usuario y todo lo que dispara hasta la respuesta. Un step es una llamada al modelo más las tools
que ejecuta en línea. El step es el checkpoint. Cada sesión corre como un workflow del Workflow SDK,
que también es de Vercel y también es abierto. Cuando el proceso muere, el workflow se vuelve a
ejecutar desde el principio, pero cada step que ya terminó devuelve su resultado guardado en vez de
volver a correr. Por eso el modelo no se vuelve a llamar: se replaya la respuesta que ya dio."

**Código**: `agent/tools/process_batch.ts`.

**Voz**: "`defineWorkflowTool` con `"use workflow"` como primera línea. El cuerpo se replaya, así
que tiene que ser determinista: nada de `Date`, `Math.random` ni `process.env` ahí. Todo eso vive
en funciones marcadas con `"use step"`. `runStep` imprime la hora y el pid; por eso en el log vimos
que los pasos 4, 5 y 6 salieron con otro pid: el cuerpo se replayó, los tres primeros steps
devolvieron su resultado guardado, y el cuarto sí se ejecutó. `sleep("5s")` también es durable:
el proceso puede morir durante la espera."

**Voz (idempotencia)**: "Un step interrumpido a la mitad se vuelve a ejecutar. Si ese step cobra una
tarjeta o manda un correo, se cobra dos veces. Para eso hay dos herramientas: hacer el step
idempotente con una llave, o ponerle `approval: always()` a la tool para que una persona apruebe
antes. La aprobación estaciona la sesión en `session.waiting` sin gastar cómputo, minutos o días,
y al llegar la respuesta sigue en el mismo punto. `ctx.ask()` hace lo mismo cuando es el agente el
que pregunta."

## 3 · Las piezas en crudo (12:00–16:00) — código del Workflow SDK

**Se ve**: `.eve/.workflow-data/` con sus carpetas: `runs`, `steps`, `events`, `hooks`, `streams`,
`waits`. Luego `packages/world/src/interfaces.ts` de vercel/workflow.

**Voz**: "Sin el branding, el estado durable es esto: una carpeta con seis subcarpetas. Runs,
steps, eventos, hooks, streams y esperas. En el código esa carpeta se llama World, y un World es la
unión de tres interfaces: Storage, que guarda runs, steps, eventos y hooks; Queue, que encola el
siguiente paso a ejecutar; y Streamer, que transmite los eventos al cliente. Quien implemente esas
tres interfaces puede correr eve. Vercel tiene su world; hay uno local que escribe en disco; hay
uno de Postgres; y la comunidad tiene MongoDB, MySQL, Cloudflare Durable Objects, NATS, SurrealDB
y Upstash."

**Se ve**: `SandboxBackend` en `eve/sandbox`.

**Voz**: "La segunda pieza es el sandbox. También es un adaptador: `name`, `create`, `prewarm`, y
el handle que devuelve tiene `run`, `writeTextFile`, `readTextFile`, `stop`, `delete` y
`captureState`. eve trae cuatro: Vercel Sandbox, Docker, microsandbox y just-bash, y los prueba en
ese orden. Lo demás del runtime es Nitro para las rutas HTTP y el AI SDK para el modelo. Dos
contratos: un World y un SandboxBackend. Con eso en mente vamos a la segunda trinchera."

## 4 · Trinchera 2: Postgres, por qué y cómo (16:00–21:00) — terminal

**Se ve**: `docker compose up postgres`, `npm i @workflow/world-postgres@5.0.0-beta.x`, `agent.ts`
con `experimental.workflow.world`, `WORKFLOW_POSTGRES_URL`, migración, `psql` con
`\dt` y `select * from steps`.

**Voz**: "El world local escribe en disco y corre en un solo proceso. Sirve para desarrollar y para
un agente en una máquina. Para dos procesos, o para sobrevivir un redeploy donde el disco se va,
se necesita un world compartido. El de referencia es Postgres, y la razón es que una sola base
resuelve las tres interfaces: las tablas son el Storage, la cola se hace con `SELECT … FOR UPDATE
SKIP LOCKED` sobre graphile-worker, y `LISTEN/NOTIFY` despierta al worker sin polling. Una
advertencia práctica: el paquete `@workflow/world-postgres` en `latest` es la línea 4 y eve usa la
5.0.0-beta; hay que pinnear la versión que trae eve o el runtime rechaza el protocolo."

**Se ve**: repetir el `kill -9` con Postgres; `select id, status from steps order by created_at`
antes y después.

**Voz**: "Misma prueba. Mato el proceso en el paso tres, en la tabla `steps` quedan tres filas
completadas, arranco de nuevo y aparecen las tres que faltan. El agente ya no depende del disco de
la máquina."

## 5 · Docker como sandbox (21:00–24:00) — código + terminal

**Se ve**: `agent/sandbox.ts` con `defineSandbox({ backend: docker({ networkPolicy: "deny-all" }) })`,
`docker ps` con un contenedor por sesión, `/workspace` que persiste entre turnos.

**Voz**: "El backend de Docker levanta un contenedor por sesión con la imagen `ghcr.io/vercel/eve`
y lo deja vivo entre turnos, así que `/workspace` conserva los archivos. La política de red en
Docker sólo sabe todo o nada: `allow-all` o `deny-all`. El filtro por dominio y el brokering de
credenciales sólo existen en Vercel Sandbox y en microsandbox. Para un agente que ejecuta Python
sobre un CSV, `deny-all` alcanza y es lo que hace el ejemplo oficial, steve."

## 6 · EasyBits (24:00–28:30) — terminal + SDK

**Se ve**: `sandbox_create` template `dev-box`, `apt install postgresql`, `nvm install 24`,
`git clone` del demo, `eve build && eve start --host 0.0.0.0`, `exposePort(3000)` → URL
`https://sb-<id>-3000.sandboxes.easybits.cloud`, `curl /eve/v1/health`, `eve dev https://…`.

**Voz**: "Ahora lo mismo en una caja de EasyBits, que es una microVM de Firecracker. Postgres se
instala dentro de la misma caja y se registra en el bootstrap para que reviva al despertar. Node 24,
build, start. Con `exposePort` la caja recibe una URL pública que pasa todo el path al puerto, así
que las dos rutas que eve necesita, `/eve/` y `/.well-known/workflow/`, llegan sin proxy. En el
ejemplo de Vercel eso lo hacía Caddy con dos reglas."

**Se ve**: tabla de mapeo `@easybits.cloud/sdk` ↔ `SandboxBackend`.

**Voz**: "Y la segunda pieza, el sandbox, también se puede sustituir. El SDK de EasyBits ya tiene
lo que pide el contrato: `snapshot` para prewarm, `forkFromSnapshot` para create, `exec` devuelve
exitCode, stdout y stderr, `files.read` y `files.write`, `suspend` para stop, `destroy` para
delete, y `metadata` para captureState. El adaptador se llamaría `@easybits/eve-sandbox`, son unas
quinientas líneas sobre el SDK y hoy es diseño; lo que sí corre es el runtime completo dentro de la
caja, con Docker o just-bash como sandbox interno."

## 7 · Simplificar (28:30–30:00) — pizarra

**Pizarra**: dos columnas. Imprescindible: World (Postgres) + SandboxBackend + proceso Node.
Del ejemplo oficial, opcional para un agente: Caddy, Next.js, OTLP/Jaeger.

**Voz**: "Para un solo agente en una máquina el mínimo es un proceso Node, Postgres y un sandbox.
Lo demás del ejemplo oficial, el proxy, el frontend en Next y el colector de trazas, se agrega
cuando hace falta. La pregunta que queda abierta es si el World puede ser más chico que Postgres,
por ejemplo SQLite: la parte de Storage sí, la cola con SKIP LOCKED y el NOTIFY son lo que cuesta
reescribir, y por eso los worlds de la comunidad usan bases con cola integrada."

**CTA (tarjeta outro con logo)**: "En el programa Sistemas Agénticos construimos esta durabilidad a
mano, sobre el agente que ya corre en la caja: checkpoints por step en SQLite y la sesión
estacionada esperando una respuesta por WhatsApp. Es la sesión 6 y está en fixtergeek.com/sistemas-agenticos.
Suscríbete al canal para la siguiente."

---

## Comandos de la demo (bloque 0, ya probados)

```sh
source ~/.nvm/nvm.sh && nvm use 24
cd ~/eve-demo && export ANTHROPIC_API_KEY=…   # leer de ~/fixter2025/.env
npx eve dev --no-ui                            # http://127.0.0.1:2000
curl -X POST http://127.0.0.1:2000/eve/v1/session -H 'content-type: application/json' \
  -d '{"message":"Procesa el lote con 6 pasos."}'
# esperar ~14 s (3 pasos) y:
pkill -9 -f "eve dev --no-ui"
npx eve dev --no-ui                            # retoma en el paso 4
```

## Pendiente antes de grabar

- [x] Bloque 4 probado 17 sep: Postgres 14 local (brew), `@workflow/world-postgres@5.0.0-beta.44` (eve 0.58 vendoriza world-local beta.44 / world beta.35), bootstrap con `node node_modules/@workflow/world-postgres/bin/setup.js`. Esquemas: `workflow.{workflow_runs,workflow_steps,workflow_events,workflow_hooks,workflow_waits,workflow_stream_chunks}` + `graphile_worker.*` (la cola). Tres runs por sesión: la sesión, el turno y el workflow tool; los steps se ven en `workflow.workflow_steps` (`status`, `attempt`, `started_at`). Logs `eve-pg1.log`/`eve-pg2.log`: 1–3 pid 1664, kill, 4–6 pid 2327.
- [ ] Bloque 5: `agent/sandbox.ts` con Docker (Docker Desktop apagado hoy).
- [ ] Bloque 6: caja `dev-box` con Node 24 + Postgres + bootstrap; probar `exposePort`.
- [ ] Tarjetas HyperFrames (intro, 7 capítulos, outro) con SFX y música nueva de Openverse.
- [ ] Pizarras 4:3 de los bloques 2, 3 y 7.

---

## Ghosty protagonista (aprobado 17 sep: style frame `style-frames/01-congelado.png`)

bliss narra; Ghosty (asset oficial, sin boca, sin repintar) vive el video y reacciona con ojos,
rebote, libreta y escarcha. Ghosty habla sólo en apertura y cierre, con `em_santa` y karaoke.
Prueba aprobada con el primer style frame; si un frame no convence, ese bloque va a stock (Artgrid/Pexels).

### Las cuatro casas (viaje del personaje = estructura del video)

| Bloque | Casa de Ghosty | Qué le pasa | Objeto concreto |
|---|---|---|---|
| 0, 2 | Caja local (menta) | Apagón con la ficha 4 en la mano; reenciende y la suelta | Mesa con 6 fichas |
| 3 | Misma caja, pared abierta | Se ve el archivero de 3 cajones (runs, steps, eventos) y la charola de pendientes (cola) | Archivero |
| 4 | Caja + pasillo | El archivero sale de la caja al pasillo (Postgres); otra caja lo alcanza | Archivero con ruedas |
| 5 | Contenedor Docker (ballena de cartón, sin logo) | Misma mesa, misma escena, la puerta es de contenedor | Contenedor |
| 6 | Caja EasyBits con escarcha | Hibernación: toda la caja se congela con Ghosty a media ficha; se derrite y sigue | Caja escarchada |
| 7 | Las tres casas juntas | Tabla: journal a mano / motor (eve, Restate) / imagen (hibernar) | Tres cajas en fila |

### Gestos de Ghosty por concepto
- Journal: anota "paso 3 ✓" en la libreta antes de seguir; al despertar la lee y salta a la 4.
- Idempotencia: anota "cobrar" dos veces → ojos enormes; aparece la mano de "aprobación".
- Parked/`ctx.ask`: se sienta a esperar con un reloj; la caja se apaga sola sin perder nada.
- Reintento de step: la ficha se le cae y la vuelve a levantar (misma ficha, otro pid).

### Style frames pendientes
- [x] 01 congelado en el paso 4 (caja local)
- [x] 02a por qué le llaman World · 02 archivero + charola (Storage/Queue)
- [x] 03 el estado sale del proceso (instancia 1 → Postgres → instancia 2)
- [x] 04a el agente vive en dos lugares (app runtime / sandbox) · 04b qué cruza la frontera
- [x] 05 en EasyBits las dos son cajas (madre eve-nitro + hijas por sesión, una suspendida)
- [x] 06 tres formas de no perder el trabajo (journal a mano / motor / imagen de la caja)
- [ ] Trailer short 9:16: Ghosty con el cable (guion aprobado en chat 17 sep, 6 beats, ~25 s)

### EasyBits ya existe (mensaje de easybits-0c, 17 sep ~09:10)
- `@easybits.cloud/eve-sandbox@0.0.1` en npm: `defineSandbox({ backend: easybits() })`, lee `EASYBITS_API_KEY` (scope WRITE, y DELETE si eve borra snapshots). prewarm → snapshot CoW `eve:<templateKey>`; create → fork (~7 s); stop → suspend (resume ~3 s). Sólo `allow-all`.
- Template `eve-nitro`: Node 24.21, eve 0.58.1, `/data` (4 GB) persiste suspend/resume → proyecto y `.eve/.workflow-data` ahí; puerto 3000; `exposePort(3000)` sirve `/eve/` y `/.well-known/workflow/`.
- Postgres sigue sin hornear: `apt install postgresql` + `sandbox_set_bootstrap`.
- El bloque 6 cambia: el adaptador SÍ corre en cámara (`backend: easybits()`), no sólo diseño.
