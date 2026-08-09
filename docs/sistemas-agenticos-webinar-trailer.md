# Sistemas agénticos — Webinar y trailer

Basado en el flujo de la charla de LangChain "Building Deep Agents and Deploying in Production" (youtu.be/IZabCqyBJLg), adaptado a la marca FixterGeek y a nuestras herramientas. El webinar funciona como sesión 0 gratuita que vende el taller de `/sistemas-agenticos`.

## Webinar (45–60 min): "Por qué tu agente se rompe en producción"

**Promesa**: al salir entiendes las 5 piezas que separan un demo de un sistema — y viste 2 corriendo en vivo.

### Flujo

1. **Hook (5 min) — El demo que murió.**
   Demo en vivo: un agente con tool calling que funciona perfecto… y luego la misma tarea con 80,000 filas / 40 minutos de ejecución. Se desborda el contexto, alucina, truena. "Esto le pasa al 88% de los pilotos. Hoy vemos por qué."

2. **Agente = modelo + harness (8 min).**
   La idea central de la charla, con nuestra bandera: "si no eres el modelo, eres el harness". Claude Code = ~500,000 líneas y ninguna es el modelo. Desglosar primitivas: system prompts, tools, skills, MCP, subagentes, middleware.
   *Herramienta nuestra*: mostrar el harness de Claude Code por dentro (ya lo enseñamos en `/claude`) — puente natural para la audiencia que viene de ese curso.

3. **Context engineering (8 min).**
   El contexto como recurso finito: filesystem como scratchpad, summarization, planning, subagentes que aíslan contexto.
   *Demo*: el agente escribe su plan a disco y lo retoma. Mencionar Code Mode/EasyBits sandbox: "el agente escribe un programa y lo ejecuta en una caja segura — las 80,000 filas nunca tocan el chat".

4. **Lo que rompe a los agentes en producción (12 min).**
   Las 4 consideraciones de la charla, cada una con anécdota propia:
   - **Ejecución durable** — fallar en el paso 67 de 123 sin repetir los 67 (checkpoints).
   - **Memoria** — corto plazo (checkpointer) vs. largo plazo (store). Caso real: MentorIA recuerda tu perfil de práctica entre sesiones.
   - **Auth en 3 capas** — inbound, outbound, RBAC. El problema de los 1,000 emails "a tu nombre".
   - **Human-in-the-loop + streaming** — interrupt → review → resume. Caso real: Ghosty pide aprobación antes de responder por el negocio.

5. **La pieza que nadie enseña: la interfaz (7 min).**
   Un agente que corre minutos necesita UI de progreso, estados y aprobaciones. Aquí la audiencia (ex-frontend, diseñadores) tiene ventaja.
   *Referencia*: [BuilderIO/agent-native](https://github.com/BuilderIO/agent-native) (MIT) y cómo aplicamos sus patrones en **Ghosty Teams y Tasks**:
   - Ninguna tool desconocida se esconde — se humaniza (`mcp__easybits__generate_image` → "generate image"); un MCP sin etiqueta sale como "Proveedor: acción".
   - Panel "Trabajando ahora": turnos de agente en vuelo estilo Background Agents — quién trabaja, en qué va, cronómetro, Detener y qué entregó al terminar.
   - La lección cara: ocultar `Bash`/`Write` por considerarlos "plumbing" dejaba un "Trabajando…" genérico — cuando el trabajo ES eso, mostrarlo es la interfaz.
   Demo: streaming de progreso en React + el panel de Teams en vivo.

6. **Cierre y pitch (5 min).**
   "Todo esto es diseñable y se aprende. 4 martes de septiembre, construyes el sistema completo." CTA a `/sistemas-agenticos` + código de descuento exclusivo del webinar. Q&A.

### Notas de producción
- Registro del webinar: reusar el patrón `webinar_registration` de `claude.tsx` (tags + `sendWebinarCongrats`).
- Grabar el webinar: los primeros 15 min sirven como lead magnet / clase muestra.

## Trailer (60–90 s)

Beats con voz en off (para HyperFrames o video editado):

| t | Visual | VO |
|---|---|---|
| 0–8s | Terminal: agente responde perfecto, confetti | "Tu agente funciona. En tu laptop, con tu prompt, un martes en la tarde." |
| 8–18s | La misma terminal: task de 40 min, error en paso 67, stack trace | "Luego llega un usuario real. Cuarenta minutos de tarea. Paso 67. Y todo truena." |
| 18–30s | Diagrama animado: modelo al centro, harness creciendo alrededor (tools, memoria, checkpoints, guardrails) | "Un agente es un modelo más todo lo que construyes alrededor. Claude Code: medio millón de líneas de código, y ninguna es el modelo." |
| 30–45s | Cortes rápidos: checkpoint resume, aprobación humana en UI, memoria entre sesiones | "Ejecución que sobrevive fallos. Memoria que persiste. Un humano que aprueba antes de que algo salga a producción." |
| 45–60s | UI en React con streaming del razonamiento del agente | "Y la pieza que casi nadie enseña: la interfaz. Si vienes de frontend o diseño, esa es tu ventaja." |
| 60–75s | Lockup: "Diseño de sistemas agénticos · 4 sesiones en vivo · Septiembre" + URL | "Cuatro martes. Un sistema completo. fixtergeek.com/sistemas-agenticos" |

**Assets disponibles**: los slides de la charla original quedaron extraídos como referencia visual (diagramas de harness, capas de abstracción, durable execution, memoria, auth de 3 capas, interfaz con usuarios) — rehacerlos con la paleta del taller (`#7B93FF` sobre `#0A0F1E`, acento `#FFC46B`) y estilo Excalidraw propio.
