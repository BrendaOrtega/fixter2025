## Tres siglas que se parecen

Si buscas "ACP" hoy vas a encontrar tres cosas distintas, y dos de ellas no son este libro.

La primera es el **Agent Communication Protocol**, nacido en IBM Research dentro del proyecto BeeAI
y donado después a la Linux Foundation. Servía para que agentes autónomos se invocaran entre sí por
HTTP. En agosto de 2025 se fusionó con A2A y dejó de desarrollarse por separado. Quien estudie hoy
por esos materiales aprende un dialecto muerto.

La segunda es **A2A**, el protocolo agente-a-agente que absorbió al anterior y que hoy gobierna la
Linux Foundation junto con MCP, bajo la Agentic AI Foundation que fundaron OpenAI, Anthropic,
Google, Microsoft, AWS y Block. Ese sí está vivo, va en la versión 1.0 y resuelve un problema
distinto: cómo dos agentes de organizaciones diferentes se descubren y se contratan trabajo.

La tercera —la de este libro— es el **Agent Client Protocol**. Lo publicó Zed en 2025 y responde
una pregunta mucho más terrenal: cuando escribes un agente de código, ¿cómo hace la gente para
usarlo desde donde ya trabaja?

## El problema que resuelve

Antes de que existiera, cada agente de código traía su propia integración para cada editor. Claude
Code tenía su extensión de VS Code, su plugin de Neovim, su modo dentro de la terminal. Gemini CLI
tenía los suyos. Cada combinación de agente y editor era un proyecto aparte que alguien tenía que
escribir y mantener. Con diez agentes y diez editores son cien integraciones, y cada versión nueva
las rompe todas.

El Agent Client Protocol corta eso en dos mitades que se hablan por JSON-RPC. De un lado está el
**Cliente**: quien tiene la pantalla, el sistema de archivos y al humano enfrente. Del otro está el
**Agente**: quien tiene el modelo y hace el trabajo. El Cliente abre el proceso, negocia
capacidades, manda una instrucción y recibe un chorro de actualizaciones mientras el Agente
trabaja. Cuando el Agente necesita leer un archivo, correr un comando o pedir permiso, se lo pide
al Cliente. Cada Agente implementa el protocolo una vez y cada Cliente lo implementa una vez: con
diez de cada lado son veinte implementaciones que se combinan como quieran, en lugar de las cien
parejas hechas a mano.

Zed lo estrenó y hoy también lo hablan de fábrica los IDEs de JetBrains —IntelliJ, PyCharm, GoLand,
WebStorm— desde diciembre de 2025. Neovim y Emacs lo tienen por plugins de la comunidad. Del lado
de los Agentes están Claude Code, Codex CLI, GitHub Copilot CLI, Gemini CLI y opencode, entre
varias decenas más.

## Cliente no quiere decir editor

El protocolo llama **Cliente** a ese rol. Casi toda la documentación lo trata como sinónimo de
editor, y este libro lo toma al pie de la letra.

Un Cliente es cualquier cosa que tenga contexto y un humano cerca. Un editor, sí. También una
aplicación web. Un bot dentro del chat del equipo. Un servidor que orquesta trabajos de noche y le
manda al ingeniero de guardia una notificación cuando el Agente necesita autorización para tocar
producción. Las tres cumplen el contrato del protocolo y las tres aparecen en este libro.

Leído así, el protocolo conecta un modelo que trabaja con la gente y los archivos por los que
trabaja, viva donde viva cada uno.

## Qué vas a construir

Un Cliente y un Agente, los dos completos y hablándose entre sí.

Del lado del Cliente empiezas con un `initialize` mandado a mano, con el mensaje crudo a la vista,
para que el protocolo no sea nunca una caja negra. De ahí crecen las sesiones, el turno, el acceso
a archivos y terminales, los permisos y la interfaz web que lo muestra todo en vivo.

Del lado del Agente aparece **Ghosty**, que habla WebSocket de nacimiento y vive dentro de su
propia caja, en una máquina que no es la tuya. Ahí es donde el protocolo se pone interesante y
donde la documentación oficial se acaba: qué pasa cuando el Agente está a un océano de distancia,
cuando la caja estaba dormida, cuando el proceso muere a media respuesta, cuando el turno queda
huérfano y nadie contestó el permiso.

Los ejemplos corren. Las trampas que aparecen en estas páginas costaron una depuración cada una y
están contadas con el síntoma que verías tú: el `failed` sin explicación, el 502 sin causa, la
página en blanco que sólo le pasa a algunos usuarios.

## A quién le sirve

A quien escribe TypeScript o JavaScript con soltura y quiere entender la plomería de los agentes de
código en lugar de consumirla. No necesitas saber de modelos de lenguaje por dentro ni haber
implementado un protocolo antes. JSON-RPC se explica desde cero en el primer capítulo, y son unas
veinte líneas de idea.

Si sólo quieres usar un agente de código desde tu editor, la documentación de tu editor te alcanza
y te sobra. Si quieres escribir el Cliente que tu equipo va a usar todos los días, sigue leyendo.

Abrazo. Blissmo. 🤓
