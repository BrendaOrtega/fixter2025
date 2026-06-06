# Curso "Code Mode" — Copy de awareness (borradores)

> Curso corto de **infraestructura para agentes**, construido sobre **EasyBits Sandbox**.
> Tema: cómo entrar a la era del **Code Mode**.
> Estructura inspirada en el post de Andrew Ng (hook con pregunta → párrafo de mecanismo → "lo que vas a aprender" en bullets → CTA con link).
> Decisiones: nivel técnico **alto (dev senior)**, **sin cifras** (solo concepto) hasta tener benchmarks reales del sandbox.
> Estado: borradores para reutilizar en la **landing `/code-mode`** y en canales (LinkedIn, X, Email, FB).
> `[link]` queda como placeholder.

## Concepto base (para la landing)

El paradigma actual de agentes tiene un techo estructural: cada tool call es un round-trip
completo. El modelo emite la llamada, se detiene, espera el resultado, lo vuelve a meter al
contexto y razona otra vez. Encadena diez herramientas y pagas ese ciclo diez veces — en
latencia, en tokens y en una ventana de contexto que se infla con cada resultado intermedio.

**Code Mode** invierte el flujo: en lugar de exponer las herramientas como tool calls
individuales, las expones como una **API de TypeScript** y dejas que el modelo escriba el
código que las orquesta (loops, condicionales, composición, manejo de errores) en una sola
pasada. Ese código se ejecuta en un **sandbox aislado y descartable**, nunca contra tu infra
real. La premisa: los LLMs escriben mejor código del que improvisan cadenas de llamadas,
porque programar es justo lo que vieron millones de veces en entrenamiento.

**Lo que se aprende:**
- Levantar un sandbox aislado para ejecutar código generado por agentes sin comprometer tu infra
- Convertir tus herramientas y servidores MCP en una API de TypeScript que el modelo invoca como funciones
- Diseñar el límite de seguridad del sandbox: qué puede tocar el código del agente y qué no
- Llevar el patrón Code Mode a producción con EasyBits Sandbox

---

## 1. LinkedIn (formato Andrew Ng)

> **Nuevo curso: cómo entrar a la era del Code Mode** — ¿cómo le das a un agente la capacidad de orquestar decenas de herramientas sin convertir cada paso en un round-trip de tool call? Este curso corto está construido sobre **EasyBits Sandbox**.
>
> El paradigma actual de agentes tiene un techo estructural: cada tool call es un viaje completo. El modelo emite la llamada, se detiene, espera el resultado, lo vuelve a meter al contexto y razona otra vez. Encadena diez herramientas y pagas diez veces ese ciclo — en latencia, en tokens y en una ventana de contexto que se infla con cada resultado intermedio.
>
> **Code Mode** invierte el flujo. En lugar de exponer las herramientas como tool calls individuales, las expones como una **API de TypeScript** y dejas que el modelo escriba el código que las orquesta: loops, condicionales, composición, manejo de errores — todo en una sola pasada. Después ese código se ejecuta en un sandbox aislado y descartable, no contra tu infra real. La premisa es simple pero poderosa: los LLMs escriben mejor código del que improvisan cadenas de llamadas, porque programar es exactamente lo que vieron millones de veces en entrenamiento.
>
> **Lo que vas a aprender:**
> - Levantar un sandbox aislado para ejecutar código generado por agentes sin comprometer tu infraestructura
> - Convertir tus herramientas y servidores MCP en una API de TypeScript que el modelo invoca como funciones
> - Diseñar el límite de seguridad: qué puede tocar el código del agente y qué no
> - Llevar el patrón Code Mode a producción con EasyBits Sandbox
>
> Entra a la era del Code Mode 👇
> **[link]**

---

## 2. X / Twitter (hilo)

> **1/** El paradigma actual de agentes tiene un techo: cada tool call es un round-trip completo.
> El modelo pide → espera → recibe → vuelve a razonar. Encadena 10 herramientas y pagas ese ciclo 10 veces: latencia, tokens y contexto inflado.
> Hay una forma mejor. Se llama Code Mode. 🧵

> **2/** En vez de exponer tus herramientas como tool calls una por una, las expones como una **API de TypeScript**.
> Y dejas que el modelo escriba el código que las orquesta: loops, condicionales, composición. Todo en una sola pasada.

> **3/** ¿Por qué funciona? Porque los LLMs programan mejor de lo que improvisan cadenas de llamadas.
> Escribir código es lo que vieron millones de veces en entrenamiento. Encadenar tool calls a mano, no.

> **4/** ¿Y la seguridad? Ese código no corre contra tu infra real.
> Corre en un **sandbox aislado y descartable**. Tú defines el límite: qué puede tocar y qué no.

> **5/** Estoy preparando un curso corto sobre exactamente esto, construido sobre **EasyBits Sandbox**:
> → montar el sandbox
> → tus MCPs como API de TypeScript
> → el límite de seguridad
> → llevarlo a prod
> Entra a la era del Code Mode 👇 [link]

---

## 3. Email / Newsletter

> **Asunto:** Tus agentes están perdiendo el tiempo (y por qué Code Mode lo arregla)
>
> Hay un detalle del que casi nadie habla cuando construyes agentes en serio: **cada tool call es un viaje de ida y vuelta.**
>
> El modelo emite la llamada, se detiene, espera el resultado, lo mete de vuelta al contexto y razona otra vez. Una herramienta no se nota. Pero cuando un agente real encadena diez, doce, veinte pasos, ese ciclo se vuelve el cuello de botella: latencia acumulada, tokens quemados en resultados intermedios y una ventana de contexto que se infla sola.
>
> El **Code Mode** ataca el problema de raíz. En lugar de darle al modelo herramientas que llama una por una, le das una **API de TypeScript** y lo dejas escribir el código que orquesta todo: loops, condicionales, composición, manejo de errores — en una sola pasada. Ese código después se ejecuta en un sandbox aislado y descartable, nunca contra tu infra real.
>
> La intuición detrás es lo que más me gusta: los LLMs escriben mejor código del que improvisan cadenas de llamadas, porque programar es justo lo que vieron un millón de veces durante el entrenamiento. Estás jugando a su favor, no en contra.
>
> Por eso estoy preparando un **curso corto de infraestructura para agentes**, construido sobre **EasyBits Sandbox**. Vas a aprender a:
> - Levantar un sandbox aislado para correr código de agentes sin comprometer tu infra
> - Convertir tus herramientas y servidores MCP en una API de TypeScript que el modelo invoca como funciones
> - Diseñar el límite de seguridad del sandbox
> - Llevar el patrón Code Mode a producción
>
> Pronto abro cupos. Si quieres entrar primero, responde este correo con un **"Code Mode"** y te aviso antes que a nadie.
>
> Nos vemos adentro,
> bliss.

---

## 4. Facebook

> **Cómo entrar a la era del Code Mode** ⚡
>
> El paradigma actual de agentes tiene un techo: cada vez que el agente usa una herramienta, hace un viaje completo de ida y vuelta. Pide, espera, recibe, vuelve a pensar. Encadena diez herramientas y pagas ese ciclo diez veces — en latencia, en tokens y en contexto.
>
> El **Code Mode** lo rompe: en lugar de exponer tus herramientas como llamadas individuales, las expones como una **API de TypeScript** y dejas que el modelo escriba el código que las orquesta en una sola pasada. Ese código corre en un **sandbox aislado**, nunca contra tu infra real.
>
> ¿Por qué funciona? Porque los modelos programan mejor de lo que improvisan cadenas de llamadas.
>
> Estoy preparando un curso corto sobre esto, construido sobre **EasyBits Sandbox**. Aprenderás a montar el sandbox, convertir tus MCPs en una API de TypeScript, diseñar el límite de seguridad y llevarlo a producción.
>
> Entra a la era del Code Mode 👇
> [link]

---

## Pendientes / TODO
- Insertar URL real en `[link]` (o crear landing `/code-mode`).
- Cuando haya benchmarks reales del sandbox (tokens/latencia/costo), inyectar un número en el punto del tradeoff de LinkedIn y X — el hook gana mucho con una cifra.
- Versión hilo de X **simplificada** quedó pendiente de escribir.
- Posibles variantes A/B de hook para X.
