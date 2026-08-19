# A2A v1.0: implementamos el estándar y luego fuimos a ver quién estaba del otro lado

Hay una forma particular de descubrir que llevas semanas equivocado: tu código
funciona, nadie se queja, y un día corres una validación que no habías corrido.

Nuestro AgentCard —el documento con el que un agente se presenta ante otros bajo el
protocolo A2A— se servía con 200, tenía JSON válido, traía los campos que pide la
documentación y cualquier cliente que escribimos nosotros lo leía perfecto. Lo
pasamos por el SDK oficial de Python, versión 1.1.2, cuyos tipos son el protobuf
generado de la especificación. Lo rechazó por dos motivos distintos.

De ahí salió esta investigación, que empezó siendo técnica y terminó siendo sobre
algo más incómodo: cuánta gente está realmente hablando este protocolo.

## El material que vas a encontrar enseña una versión muerta

A2A —Agent2Agent, para que agentes de distintos proveedores se comuniquen— llegó a
v1.0 en abril de 2026 bajo la Linux Foundation. Y v1.0 rompió con v0.3 en
prácticamente todo lo que tocas al escribir un cliente:

| Qué | v0.3 | v1.0 |
|---|---|---|
| Métodos | `message/send` | `SendMessage` (PascalCase) |
| Endpoint | `url` en la raíz del card | `supportedInterfaces[]` |
| Discriminador | `kind` | eliminado |
| Partes de mensaje | objetos tipados | oneof plano `{text\|raw\|url\|data}` |
| Estados | `submitted`, `working` | `TASK_STATE_SUBMITTED`, … |
| Eventos de stream | con `final` | sin `final` |
| Ruta del card | `/.well-known/agent.json` | `/.well-known/agent-card.json` |

Ahora fíjate en las fechas. El curso de A2A de DeepLearning.AI, hecho con Google
Cloud e IBM, es de **enero de 2026**: tres meses antes del release. Los codelabs de
Google, casi todos, son de antes. Todo lo que hay en Udemy, también.

O sea que el material que sale primero cuando buscas "A2A tutorial" te enseña a
escribir un cliente que no se conecta con nada. Y no falla de forma amable: un
`SendMessage` contra un servidor que espera `message/send` no negocia ni degrada,
simplemente no existe.

## El `.proto` manda, y la propia documentación lo desobedece

La spec dice en su §1.4 que `specification/a2a.proto` es *"the single authoritative
normative definition"*. Uno lee eso como boilerplate legal. Es literal, y los ejemplos
de la misma spec lo contradicen.

Los dos rechazos que nos comió el validador estaban los dos en la parte de seguridad:

```jsonc
// El ejemplo de la §8.5 — forma estilo OpenAPI, la que escribirías de memoria:
{
  "security": [ { "oauth2": ["agent:read"] } ]
}

// Lo que dice el proto: SecurityRequirement no es un mapa esquema→scopes,
// es un mensaje con un campo `schemes` que mapea string → StringList.
{
  "securityRequirements": [
    { "schemes": { "oauth2": { "list": ["agent:read"] } } }
  ]
}
```

El primer problema es que la forma del ejemplo está mal. El segundo es peor: **el
alias `security` no existe en el proto**. No es un campo de más que se ignora — un
parser estricto rechaza el card **completo** por campo desconocido. Un campo copiado
de la documentación oficial invalidaba todo el documento.

Si te vas a meter con A2A, guárdate esta regla: tu prueba de humo no es "mi card
carga en el navegador", es "el SDK oficial parsea mi card". Y usa el de Python,
porque sus tipos vienen del protobuf y no de la prosa.

## ¿Y quién está del otro lado?

Aquí la cosa dejó de ser sobre código. Un audit de API Evangelist del 29 de julio de
2026 sondeó **20,185 hosts** buscando agent cards:

```
20,185 hosts sondeados
      └── 65 sirven un agent card                    0.32 %
            ├── 10 pasan validación estructural v1.0 0.05 %
            └── 15 siguen en /.well-known/agent.json (path viejo)
```

Diez. Diez agentes válidos en todo el sondeo.

Y hay un dato que retrata el ecosistema completo: **`a2a-registry.org` publica un card
que declara `protocolVersion: 1.0` y tiene `url` en la raíz.** Un card 0.3 diciendo
que es 1.0. El registro central del protocolo no pasa su propia validación.

Comparado con el otro estándar de la casa, medido con la API de GitHub y la de npm
en agosto de 2026:

| | Estrellas del repo de spec | Descargas/mes del SDK |
|---|---|---|
| A2A | 25,402 | 6.8 M (`@a2a-js/sdk`) |
| MCP | 8,991 | **196 M** |

Casi tres veces más estrellas y veintiocho veces menos uso. Eso no mide adopción.
Mide curiosidad.

## El hilo más honesto que hay sobre A2A

No es un post de ingeniería, es un
[*Ask HN: Is anyone using the A2A protocol?*](https://news.ycombinator.com/item?id=48582679).
Hay gente que lo corre en producción y lo explica bien —"es como microservicios para
agentes"—, pero las dos respuestas que se repiten son estas:

> "Lo probamos y nos quedamos con patrones agent-behind-MCP."

> "Nos dimos cuenta de que no necesitábamos un agente del otro lado."

Nadie ahí está enojado con A2A. Lo que hay es indiferencia, que para un estándar cuyo
valor entero depende de que exista alguien a quien llamar es bastante peor que el
enojo.

Se confirma por otro lado: **ningún agente de código publica AgentCard**. Ni Codex, ni
opencode, ni Roo Code —estos dos con issues abiertas pidiéndolo—, ni Goose, que vive
en la **misma fundación** que A2A e implementó ACP en su lugar. Ese mundo eligió MCP
para herramientas y ACP para editores.

## Entonces llenamos el hueco

Un hueco documentado es una invitación, así que publicamos
[**noob-a2a**](https://github.com/blissito/noob-a2a) con licencia MIT: el agente de
código en Rust [`noob`](https://github.com/hec-ovi/noob-cli) —binario estático de
4.29 MiB— hablando A2A v1.0 con su propio AgentCard.

No lo forkeamos, y la razón me gusta: `noob` tiene en su CI un tope duro de 8 MiB de
binario y 45 crates, y renuncia al runtime async a propósito. Meterle un servidor
HTTP con streaming rompía las tres cosas de golpe. Así que el agente expone un modo
`serve` que emite frames JSON por línea sobre un contrato versionado, y un sidecar
traduce ese dialecto al cable A2A.

```
  cliente A2A            sidecar (Node)              noob serve (Rust)
  ───────────            ──────────────              ─────────────────
  SendMessage    ──────►  stdin           ──────►    {"t":"text.delta"}
                          traducción      ◄──────    {"t":"tool.start"}
  TaskArtifact   ◄──────                             {"t":"ask"}
  UpdateEvent                                        {"t":"turn.end"}
```

El mapeo salió casi identidad, que suele ser buena señal sobre el diseño de un
protocolo:

| Frame de `noob` | Evento A2A |
|---|---|
| `text.delta` | `artifactUpdate` con `append` |
| `tool.start` / `tool.end` | `statusUpdate` con `DataPart` |
| `prompt.queue` | **es** el `STEER` de A2A |
| `ask` | `TASK_STATE_INPUT_REQUIRED` |

Los dos de abajo son mis favoritos. `STEER` —inyectar contexto en un turno que ya está
corriendo— es de esas primitivas de la spec que lees y piensas "¿quién pidió esto?",
hasta que descubres que ya la tenías con otro nombre. Y `ask` es el **único** caso de
`INPUT_REQUIRED` genuino que hemos visto: el agente bloquea el turno esperando un sí o
un no. Casi todo lo demás que se documenta como input-required es, en realidad, una
tarea nueva.

## La trampa que costó dos bugs

Al reabrir una sesión, `noob serve` reproduce **todos** los frames previos. Hay que
tragarse ese replay sin mandárselo al cliente, y el primer intento fue cortar en el
primer `turn.start`. No sirve: ese `turn.start` es el del turno **viejo**, así que el
cliente recibía la conversación completa repetida en cada mensaje.

El segundo intento fue un reloj de silencio —si dejan de llegar frames por un rato, el
replay terminó— arrancado en el spawn. Tampoco: el proceso tarda unos 100 ms en
levantar y para cuando el reloj empieza a contar, el replay ya se coló.

La versión que funciona es obvia una vez que la ves: **el reloj lo arranca el primer
frame**, no el spawn.

## Y cinco bugs que sólo existen cuando despliegas de verdad

Nuestros agentes viven en microVMs Firecracker aisladas. Ahí el protocolo dejó de ser
el problema:

1. **Alpine no arrancaba**: el horneado de la imagen declara units de systemd, y en
   Alpine `/sbin/init` es busybox, que no sabe qué es un unit.
2. **El unit no se declaraba con `CMD`** sino con un `runtime.yaml`. Ese tipo de cosa
   no produce un error, produce silencio.
3. **`spawn('noob')` daba `ENOENT`**: el `PATH` de systemd no incluye
   `/usr/local/bin`.
4. **systemd no hereda los `ENV` del Dockerfile**, así que el sidecar caía a un
   workspace inexistente. Y ojo con esta: en Node, `spawn` con un `cwd` que no existe
   reporta `ENOENT` **señalando al binario**, no al directorio. Te vas media hora a
   revisar la pieza equivocada.
5. **Un fallo de spawn sin manejar el evento `'error'`** es excepción no capturada en
   Node, y tumbaba **todas** las sesiones del proceso, no sólo la que falló.

Ninguno de esos cinco es culpa de A2A. Todos son el costo real de la frase
"implementamos el protocolo", y ninguno aparece en la spec.

Si te gusta este tipo de bitácora —el despliegue de verdad, con los tropiezos
incluidos y no la versión pulida—, buena parte de esto lo desarmo en video en
[el canal de YouTube](https://www.youtube.com/@fixtergeek), donde suelo mostrar el
código corriendo en vez de sólo contarlo.

## El veredicto, sin adorno

A2A no fue un error. Es un estándar de la Linux Foundation con AWS, Microsoft,
Google, Salesforce y SAP en el comité técnico. Es una casilla que abre conversaciones
empresariales que sin ella no se abren. Nos costó días, no meses. Y no excluye nada:
MCP sigue, nuestros formatos propios siguen.

Tampoco es un motor de crecimiento, y me parece más útil decirlo que venderlo. El
riesgo verdadero no es que A2A falle: es que se quede en ese grupo de estándares que
todos "soportan" en la nota de prensa mientras la integración real sigue siendo a la
medida, cliente por cliente.

Hay un antecedente que se parece demasiado. UDDI proponía directorios centrales de
servicios descritos en un formato común, para que los sistemas se descubrieran solos.
Agent cards firmadas más registros centrales es, estructuralmente, lo mismo. UDDI
murió por falta de servicios que registrar, y eso es exactamente lo que describe el
sondeo de los 20,185 hosts.

Nuestra apuesta es que ese hueco se llena por abajo, con implementaciones que
funcionen, no con anuncios. Por eso `noob-a2a` es MIT.

---

**En la parte 2** le toca a ACP, el Agent Client Protocol: el otro estándar, el que
sí eligieron los agentes de código. Lo implementamos también, y la comparación de
primera mano da un resultado bastante distinto al de este post.

Abrazo. Blissmo. 🤓
