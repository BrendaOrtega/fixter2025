# ACP en la práctica (parte 2): cuando el relé pasa mensajes que no conoce

En el post anterior conté cómo implementamos A2A completo contra la spec normativa. Lo más caro de ese trabajo no fue el transporte ni la autenticación: fue el **traductor**. Nuestro agente habla su propio dialecto de eventos, y para escupir A2A legítimo del otro lado hubo que mapear campo por campo — unas 250 líneas y 28 tests cuyo único trabajo es garantizar que la traducción no pierda nada.

Esta semana implementamos ACP. No hay traductor. Y esa ausencia terminó siendo la conclusión entera del post.

## Antes que nada: hay dos ACP y uno está muerto

Si buscas "ACP vs A2A" vas a encontrar artículos que hablan de un protocolo distinto. Hubo un **Agent Communication Protocol** de IBM y Cisco que sí competía de frente con A2A; se descontinuó en agosto de 2025 y su equipo se sumó a A2A.

El vivo es el **Agent Client Protocol**, nacido en Zed. Y no compite con nadie, porque las tres siglas que importan hoy resuelven ejes distintos:

```
        MCP                    ACP                      A2A
   ─────────────         ─────────────            ─────────────
   agente ↔ sus          persona ↔ agente         agente ↔ agente
   herramientas          (desde su editor)        (de otra organización)
```

Un sistema serio los usa los tres, en capas. Preguntar cuál gana es como preguntar si gana HTTP o SQL.

## Los números que medí antes de escribir código

API de GitHub y registro de npm, agosto de 2026:

| Protocolo | Estrellas de la spec | Descargas npm / mes |
|-----------|---------------------:|--------------------:|
| MCP       | 8,991                | 195,971,908         |
| A2A       | 25,402               | 6,853,239           |
| ACP       | 4,008                | 61,142              |

A2A tiene más estrellas que MCP y 28 veces menos uso. Interés que aún no se convierte en implementación.

Los de ACP miden mal y hay que decirlo: ACP se implementa en Rust, compilado dentro del binario del editor o del agente. Casi nadie lo instala como dependencia de npm, así que ese contador ve una fracción del mundo real.

La señal buena está en otro lado. El repo **ya no vive en `zed-industries`**: migró a la organización neutral `agentclientprotocol`. Tiene 100+ contribuidores y 243 commits en los últimos 30 días, y entre los que más commitean hay gente de **JetBrains** y de **Microsoft** (un dev advocate de VS Code), aunque la línea oficial de Microsoft siga siendo sólo MCP.

Clientes que ya lo hablan: Zed nativo, JetBrains AI Assistant, cuatro plugins de neovim, emacs, extensiones de VS Code de terceros, Qt Creator, Obsidian, Jupyter. Y hay un registro oficial con **38 agentes** nativos: Goose, opencode, Claude Code (wrapper), Codex, Gemini CLI con `--acp`, Qwen, Cline, Kimi, Copilot CLI.

Compara con el audit de A2A de julio de 2026: 20,185 hosts rastreados, **alrededor de 10 agent cards válidos** en todo internet.

## Lo que construimos

Un template de microVM Firecracker con **Goose** dentro —el agente de Block, Apache-2.0, hoy en la Agentic AI Foundation— y un relé de Node que hace WebSocket ↔ stdio.

El relé existe por un solo motivo: ACP asume que el **cliente lanza al agente como proceso hijo** y le habla por stdin/stdout. Cruzando la red no hay relación padre-hijo. Eso es lo único que falta — el stdio no estorba.

```
navegador ──WebSocket──▶ Caddy ──▶ router ──▶ proxy ──▶ [ microVM ]
                                                          relé (es el padre)
                                                            │ stdin/stdout
                                                            ▼
                                                          goose --acp
```

Funcionó a la primera: `initialize` → `session/new` → `session/prompt` → PONG, atravesando Caddy, el router y el proxy público, con DeepSeek detrás (Goose lo trae de primera clase: su definición declara `deepseek-v4-flash` y `deepseek-v4-pro`). Cero cambios en Go: el WebSocket ya pasaba.

## La prueba que decidió todo

En la primera sesión real, por el cable llegaron mensajes así:

```json
{"jsonrpc":"2.0","method":"session/update","params":{
  "sessionUpdate":"agent_thought_chunk",
  "content":{"type":"text","text":"El usuario pide un PONG..."}}}
{"jsonrpc":"2.0","method":"session/update","params":{
  "sessionUpdate":"usage_update","tokens":{"input":1841,"output":96}}}
{"jsonrpc":"2.0","method":"session/update","params":{
  "sessionUpdate":"available_commands_update","availableCommands":[...]}}
```

El razonamiento del modelo en vivo, el consumo de tokens, los comandos disponibles, la info de sesión. El relé los pasó **sin conocer ninguno de esos tipos**.

Con un traductor de por medio, cada evento nuevo hay que mapearlo a mano, y lo que no está mapeado no llega: se pierde en silencio, sin error y sin log. Una tubería de líneas JSON-RPC no tiene esa clase de fugas.

## Tres decisiones del relé que no eran obvias

**`/busy` se mide por sockets, no por turnos.** El supervisor consulta ese endpoint antes de congelar la microVM. Una sesión ACP abierta es trabajo aunque esté callada — el agente piensa, el humano lee. Con el criterio de turnos, la VM se congelaría con la sesión viva.

**Auth por ticket firmado, no por Bearer.** Un `new WebSocket()` de navegador no puede poner el header `Authorization`; la API simplemente no lo permite. El ticket va en el query string con HMAC y ventana de tiempo.

**Heartbeat propio.** No es precaución teórica: el sidecar de colaboración (Hocuspocus) de esa misma flota ya nos enseñó que sin ping/pong algo en el camino corta las conexiones ociosas. En ACP la conexión ociosa es el caso normal, no el raro.

## El detalle que valida la arquitectura de cajas

En ACP, `fs/read_text_file`, `fs/write_text_file` y `terminal/*` son cosas que **el agente le pide al cliente**. Tiene todo el sentido en el caso de origen: el editor es quien tiene los archivos, incluidos los buffers sin guardar.

Son opcionales y se negocian en `initialize`. Si el cliente no las declara, el agente usa su propio filesystem y su propia terminal — que es justo lo que pasa cuando el agente vive en una microVM aislada.

Y hay un RFD para **ACP v2 que las elimina**, con este argumento literal:

> "many Agents are moving toward their own sandboxing and execution configuration instead"

El protocolo va caminando hacia donde ya estábamos parados.

## Lo que hoy es stdio, mañana puede no serlo

Lo estandarizado hoy es stdio, pero la spec dice explícitamente que es *transport-agnostic* y permite transportes propios. Hay un Transports Working Group con un RFD en borrador de **Streamable HTTP + WebSocket**: endpoint único `/acp`, con el upgrade a WebSocket como perfil de primera clase.

El día que eso aterrice, nuestro relé sobra. Y está bien: escribimos ese código para tapar un hueco temporal del protocolo, no para casarnos con él.

Si te gusta este tipo de exploración —implementar la spec y contar qué se rompe— en el [canal de YouTube](https://www.youtube.com/@fixtergeek) subo las sesiones donde esto se construye en vivo, con los errores incluidos.

## La crítica honesta

Circula la analogía "ACP es el LSP de los agentes". La propia comunidad la ha puesto en duda en Hacker News y tienen razón: un language server **reporta** sobre el código, un agente lo **modifica**. Eso arrastra diffs, aprobaciones y flujos con estado que LSP nunca tuvo que modelar. La analogía ayuda a entender la forma y estorba en cuanto entras al detalle.

## El veredicto

No son alternativas. A2A y ACP resuelven ejes distintos y ninguno sustituye al otro. Pero si tu pregunta es "¿con cuántas contrapartes puedo hablar mañana?", ACP tiene 38 agentes y varios editores reales; A2A tiene diez agent cards en todo internet.

En corto:

- Un agente que debe vivir dentro del editor de alguien → **ACP**.
- Conectar agentes entre organizaciones → **A2A**.
- Sólo darle herramientas a tu agente → **ninguno de los dos: MCP y ya**.

## Lo que sigue

Si el "cliente" de ACP puede ser cualquier cosa que hable el protocolo, no tiene por qué ser un editor. Puede ser un **chat de equipo**.

Ahí `session/request_permission` deja de ser un modal y se convierte en un mensaje con botones. Y un hilo resulta mejor superficie de aprobación que un modal en un IDE: es asíncrono, es de todo el equipo, y el hilo mismo queda como bitácora de auditoría.

Eso es lo próximo.

Abrazo. Blissmo. 🤓
