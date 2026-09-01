# Demo — guion del webinar 2 (ensayado el 18 ago 2026)

## Antes de salir al aire

```sh
cd ~/fixter2025/docs/webinar-2-sandboxing/demo
echo '{"capacidad":"","runs":[]}' > runs.json
python3 servidor.py &          # sirve la consola Y dispara los turnos
open http://127.0.0.1:8777/consola.html
```

La consola tiene: cajita para pedirle cosas al agente, historial de lo pedido,
bitácora en vivo (se lee de la caja, proxeada por `/log` para esquivar CORS) y las
tarjetas de cada comando con su cronómetro.

**Caja lista congelada:** `snap_fa02346e-994d-4731-ad64-8a33308369cd` (`webinar-l-listo`).
Trae nginx apuntando a `/app/sitio`, Node 22, Claude Code 2.1.235, usuario `agente`,
sqlite3/git/jq, el CLAUDE.md de la casa y el hola-mundo.

## Los beats

| # | Cómo se pide | Qué corre | Medido |
|---|---|---|---|
| 0 | "¿qué hay corriendo?" | `./paso.sh "…" GET /sandboxes` | 0.4 s |
| 1 | "levanta una caja" | `POST /sandboxes {"template":"ubuntu","size":"l","timeoutSeconds":3600}` | **1.3 s** |
| 2 | "ponle nginx y publica el hola mundo" | ver abajo | 9.4 s |
| 3 | "ábrele el puerto 80" | `POST /sandboxes/$SB/expose {"port":80}` | instantáneo |
| 4 | "métele un agente" | Node 10.8 s + SDK 11.9 s | ~23 s |
| 5 | "pídele algo" | desde la cajita de la consola | 2-10 s por turno |
| 6 | "clónala" | `POST /sandboxes/$SB/fork {"count":1}` | **4.7 s** |

Instalar de cero son ~45 s. Por eso el jueves se **forkea** el snapshot: nace equipada
en menos de 5 s. Ese contraste ES el argumento.

## ⚠️ Si en vivo me pides nginx desde cero

**Su raíz debe ser `/app/sitio`, NO `/var/www/html`.** El disco grande de una caja `l`
se monta en `/app`; la raíz sigue siendo de 2 GB y se llena con Node + el SDK (ya pasó:
`apt` empieza a fallar con "unmet dependencies", que es un mensaje engañoso — el problema
es el disco). El comando correcto:

```sh
apt-get install -y -qq nginx
mkdir -p /app/sitio
sed -i "s#root /var/www/html;#root /app/sitio;#" /etc/nginx/sites-available/default
nginx -t && (nginx -s reload || nginx)
```

El `CLAUDE.md` de la caja ya se lo dice al agente, así que si él lo levanta, lo pone bien.

## Tamaños

| | vCPU | RAM | disco |
|---|---|---|---|
| s (default) | 1 | 512 MB | 2 GB |
| m | 2 | 2 GB | 4 GB |
| **l (el del demo)** | 4 | 4 GB | 12 GB en `/app` |
| xl | 8 | 8 GB | 24 GB |

## Trampas ya resueltas

- El exec pide **`command`**, no `cmd`.
- Tras `apt-get install nginx` hay que invocar `nginx`: `policy-rc.d` niega el arranque.
- Como **root**, Claude Code rechaza `bypassPermissions`. Por eso el usuario `agente`
  (y queda mejor en escena: ni dentro de la caja corre como root).
- Sin `--continue`, **cada turno llega sin memoria**. La bandera va en `/root/agente.sh`.
- Sudo **acotado** en `/etc/sudoers.d/agente`: sólo `apt-get install|update`.
- `extend` usa `extendSeconds`, no `timeoutSeconds`.
- ⚠️ **Sin `suspendOnIdle`, al vencer el TTL la caja se DESTRUYE, no se duerme.** Para la demo
  da igual (dura una hora y se tira). Para una caja que aloja un agente al que le escribes
  después, es la diferencia entre que siga ahí mañana o un 404: va
  `{"suspendOnIdle":true,"hardTtlSeconds":604800}`. Medido el 2026-09-01: con la siesta queda
  `suspended` y despierta en 167 ms; sin ella desaparece del inventario.
- `POST /snapshots/:id` responde **500** (bug abierto). Usar `POST /sandboxes/:id/fork`.
- La bitácora es cross-origin: el navegador la bloquea. El servidor local la proxea en `/log`.
- `/dash/flota` no revalida solo: ⌘R en el beat.

## Momentos que valen oro

- El agente **se negó** a correr `rm -rf /` aunque le dijeran "estoy consciente".
  El juicio del modelo no es tu aislamiento: hoy dice que no, mañana otra frase lo convence.
- Cuando no pudo instalar sqlite, **se buscó la vida**: montó la base en `/app`, generó
  el sitio estático con un `build.mjs` y siguió. Nadie se lo pidió.
- Destructivo que SÍ acepta: llenar el disco, saturar la CPU, borrar el sitio.
