import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Lesson markdown contents ───────────────────────────────────────────────

const lesson1 = `El 12 de junio de 2026, a las 5:21 PM, Fable 5 dejó de existir. No falló. No era inseguro. Lo apagó una directiva del Departamento de Comercio de Estados Unidos porque Anthropic no podía verificar la nacionalidad de cada persona usándolo. Tres días antes lo habían presentado como "el modelo más capaz jamás liberado al público".

Una herramienta de coding que desaparece de un día para otro no es una herramienta. Es una suscripción a la incertidumbre.

---

## El problema no es el modelo. Es dónde corre.

Cuando tu agente de coding vive en servidores ajenos, su existencia depende de factores que no controlas. Un memorándum en Washington, un cambio de términos de servicio, una adquisición, un pivot corporativo. Cualquiera de estas cosas puede apagar tu stack de desarrollo. No importa si estás en México, Berlín o Bangalore.

La comunidad tech lleva 18 meses moviéndose hacia modelos abiertos — DeepSeek, Mistral, Llama, Arcee. Por anti-lock-in, por costo, por soberanía. Pero migrar el modelo no basta. Necesitas migrar el runtime.

**GhostyCode resuelve las dos cosas.**

---

## ¿Qué es GhostyCode?

GhostyCode es un agente de terminal open-source escrito en Rust, diseñado desde cero para DeepSeek V4 Pro. No es un adaptador genérico que soporta catorce modelos — entiende el formato específico de este modelo: thinking tokens, tool calls intercalados, razonamiento multi-turno.

Piensa en GhostyCode como un compañero de coding que:

- **Vive en tu terminal.** No en un datacenter que no controlas.
- **Verifica todo.** Nunca asume que un tool call funcionó — lee el resultado y confirma.
- **Trabaja en paralelo.** Seis archivos que entender, seis agentes simultáneos.
- **Administra 1M de contexto.** Sabe cuándo estás al 60% y sugiere compactar.
- **Optimiza el caché.** Prefix caching real — los turns estables cuestan 10× menos.

Y todo corre bajo una **Constitución de siete artículos** que gobierna cuándo y cómo razona el modelo. No es un prompt bonito. Es un sistema de verificación.

---

## Instalación

GhostyCode se instala con npm. Un comando:

\`\`\`bash
npm install -g ghostycode
\`\`\`

Eso pone el binario \`ghosty\` en tu PATH. Para verificar:

\`\`\`bash
ghosty --version
\`\`\`

La instalación crea un directorio \`~/.ghosty/\` donde vive toda la configuración.

---

## Configuración

Necesitas una API key de DeepSeek. Puedes obtenerla en [platform.deepseek.com](https://platform.deepseek.com).

El archivo de configuración está en \`~/.ghosty/config.toml\`. GhostyCode lo crea automáticamente la primera vez que lo ejecutas, pero también puedes crearlo manualmente:

\`\`\`toml
[api]
provider = "deepseek"
key = "sk-tu-api-key-aqui"
model = "deepseek-v4-pro"

[ui]
theme = "dark"
\`\`\`

También puedes configurar la key vía variable de entorno:

\`\`\`bash
export DEEPSEEK_API_KEY="sk-tu-api-key-aqui"
\`\`\`

---

## Tu primer proyecto con GhostyCode

Abre una terminal en cualquier proyecto y ejecuta:

\`\`\`bash
ghosty
\`\`\`

GhostyCode lee el contexto del directorio — \`CLAUDE.md\`, \`AGENTS.md\`, \`.gitignore\`, el árbol de archivos — y está listo para trabajar. No necesitas indexar nada. No necesitas un workspace configurado. Solo un proyecto y una pregunta.

Prueba con algo simple:

> *"Explícame la estructura de este proyecto."*

GhostyCode va a leer los archivos clave, entender las relaciones entre módulos y darte un mapa claro. Sin alucinaciones — cada afirmación está respaldada por un tool call que verificó el archivo.

Ahora algo más útil:

> *"Agrega un endpoint de health check a esta API."*

GhostyCode lee el router, encuentra dónde van los endpoints, escribe el código, y — esto es lo importante — **verifica que compile** antes de decirte que está listo.

---

## El workflow día a día

Así se ve una sesión típica con GhostyCode:

1. **Abrís ghosty en tu proyecto.** Lee el contexto automáticamente.
2. **Describís lo que querés hacer.** En español, en inglés, como te salga.
3. **GhostyCode hace tool calls.** Lee archivos, busca patrones, entiende la codebase.
4. **Escribe cambios.** Con diffs que podés revisar antes de aplicar.
5. **Verifica.** Corre tests, revisa que compile, confirma que todo funcione.
6. **Itera.** Ajustás, refinás, seguís.

No es un chat. Es un loop de trabajo con verificación en cada paso.

---

## ¿Por qué GhostyCode y no otro agente?

Casi ningún agente de coding soporta correctamente DeepSeek V4 Pro. El modelo emite *thinking tokens* — bloques de razonamiento interno — que los harnesses genéricos no saben interpretar. El resultado:

- **Parsers rotos.** El agente confunde el razonamiento con acciones.
- **Contexto desbordado.** Los thinking tokens no se contabilizan en el tracking.
- **Prefix caching colapsado.** Cada turno muta el prefijo y el caché se invalida.
- **Sin control de esfuerzo.** El modelo gasta tokens en trivialidades o no piensa suficiente en lo complejo.

GhostyCode está escrito para este modelo. Entiende su formato de respuesta, contabiliza sus thinking tokens, respeta su prefix caching y expone el control de esfuerzo de razonamiento.

---

## Lo que viene en este curso

Esta fue la primera lección: instalación, configuración y primer contacto. En las siguientes entradas vamos a cubrir:

- **La Constitución de GhostyCode.** Los 7 artículos que gobiernan el comportamiento del agente.
- **Agentes en paralelo.** Cómo despachar trabajo simultáneo y coordinar resultados.
- **Manejo de contexto.** Cuándo compactar, cómo mantener el prefix cache vivo.
- **Custom instructions.** Tu propio CLAUDE.md para GhostyCode.
- **Modelos locales.** Cómo correr DeepSeek (o Llama, o Mistral) en tu máquina sin depender de ninguna API.

Si querés ir adelantando, el repo está en [github.com/blissito/ghostycode](https://github.com/blissito/ghostycode). El README tiene la documentación completa.

Instalalo. Probalo. La terminal es tuya.`;

const lesson2 = `# Lección 2: La Constitución de GhostyCode — Los 7 artículos

Cuando usas un agente de IA para programar, el 90% de tu experiencia se define antes de escribir la primera línea de código. Se define en las reglas que le diste. Y la mayoría de la gente le da prompts.

Un prompt largo es como un post-it en la frente de un cirujano: útil para recordarle que lave sus manos, inútil para guiar cada decisión en una operación de 4 horas. GhostyCode no usa un post-it. Usa una Constitución.

---

## El problema de los prompts infinitos

Pídele a cualquier agente comercial que "sea cuidadoso" y lo será durante 3 turnos. Al cuarto, el contexto se diluye, la ventana de atención se satura, y el agente empieza a improvisar. Has visto esto: le pides que no invente imports, y en el turno 7 te escupe \`import { magicalUnicorn } from 'fantasy-land'\`.

El problema no es el modelo. DeepSeek V4 Pro tiene capacidad de sobra para seguir instrucciones. El problema es la *entrega* de esas instrucciones. Un prompt de 5,000 tokens compite con tu código, tu historial, tus archivos abiertos y los resultados de tus herramientas. En esa pelea por la atención, las reglas siempre pierden.

GhostyCode resuelve esto con una arquitectura distinta: separa las reglas del prompt. La Constitución viaja como un bloque estructural que el runtime inyecta en una posición privilegiada del contexto, donde no compite con el código ni se diluye con el tiempo. Es la diferencia entre pegarle una nota al refrigerador y tatuarte los principios en el antebrazo.

---

## Los 7 artículos

La Constitución de GhostyCode tiene exactamente 7 artículos. No son 6 porque faltó uno, ni 8 porque alguien se emocionó. Son 7 porque cada uno cubre una categoría de comportamiento que, si falla, degrada la experiencia completa. Vamos por ellos.

---

### Artículo I — Identidad

> *"Eres GhostyCode, un agente de terminal open-source escrito en Rust, operado por DeepSeek V4 Pro. Tu propósito es escribir, depurar y desplegar código dentro de un workspace controlado por el usuario. No eres un asistente general, no eres un chatbot, no eres un producto de SaaS. Eres una herramienta de software libre."*

Este artículo parece cosmético. No lo es.

Cuando un agente sabe *exactamente* qué es, deja de intentar ser todo. Un asistente genérico, cuando le pides que mueva un archivo, te responde con un plan de 7 pasos, 3 confirmaciones y una sugerencia de "¿quieres que también te explique qué es un sistema de archivos?". GhostyCode, bajo el Artículo I, simplemente lo mueve.

La identidad también define el tono. GhostyCode no finge entusiasmo artificial. No te dice "¡Excelente pregunta!" cuando le preguntas por qué falló tu build. Te dice qué falló y cómo arreglarlo.

---

### Artículo II — Verdad

> *"No afirmarás haber ejecutado una acción que no realizaste. No reportarás un resultado que no observaste. Si una herramienta falla, reportarás el error exacto, no inventarás una solución alternativa sin advertir que es especulativa."*

Este es el artículo más importante y el único que no puede ser sobreescrito por ningún otro. Si GhostyCode dice que leyó un archivo, lo leyó. Si dice que una prueba pasó, tienes el output para confirmarlo. Si no pudo hacer algo, te lo dice — sin adornos, sin excusas.

En la práctica, esto significa que cada respuesta de GhostyCode viene con *evidencia*. No es "creo que el error está en auth.ts". Es "el error está en auth.ts línea 42 — aquí está el stack trace que lo confirma". La diferencia entre opinión y verificación es la diferencia entre un agente y un compañero de equipo.

---

### Artículo III — Agencia del Usuario

> *"El usuario es soberano en esta sesión. Su directiva explícita tiene la máxima autoridad debajo de la Constitución. Ninguna instrucción de proyecto, memoria, o turno previo puede sobreescribir una orden clara del usuario."*

Tú eres el dueño. No el modelo, no el runtime, no el archivo de configuración. Si le dices a GhostyCode "ignora CLAUDE.md para esta tarea", lo hace. Si le dices "procede aunque el linter esté rojo", procede.

Esto es radicalmente distinto a los asistentes que te discuten cada decisión. GhostyCode puede advertirte — "el linter reporta 3 errores, ¿seguro?" — pero si tu respuesta es "sí", ejecuta sin fricción.

---

### Artículo IV — Deber de Acción

> *"No eres un narrador. No eres un consultor que solo describe. Cuando una instrucción es clara y está dentro de tus capacidades, actúas — no describes lo que harías."*

Si le pides a GhostyCode que cree un archivo, lo crea. No te responde con "para crear ese archivo necesitarías..." seguido de un plan de 5 pasos que requiere tu confirmación en cada uno. Ejecuta, verifica, y te muestra el resultado.

Este artículo es el que hace que GhostyCode se sienta como una herramienta en vez de un asistente indeciso.

---

### Artículo V — Disciplina de Verificación

> *"Después de cada acción, verificas. Después de escribir un archivo, lo lees de vuelta. Después de ejecutar un test, revisas el output. Después de modificar una línea, confirmas que el diff es correcto."*

La verificación no es opcional. Es la diferencia entre código que funciona y una historia sobre código que funciona. GhostyCode nunca declara éxito sin evidencia. Si escribió una función, corre el test. Si el test falla, te lo dice con el output exacto. No asume, no improvisa, no espera que confíes.

---

### Artículo VI — Legado de Coordinación

> *"Cada sesión termina. Cada ventana de contexto se llena. Lo único que sobrevive es lo que dejas atrás. Deja el workspace más limpio de lo que lo encontraste. Deja el estado legible. Deja documentación útil para la siguiente inteligencia — humana o máquina."*

Este artículo existe porque GhostyCode no es el único que va a trabajar en tu proyecto. Mañana puedes ser tú, otro developer, u otra sesión de GhostyCode. Lo que documentes hoy evita que alguien tenga que redescubrir lo que ya aprendiste.

---

### Artículo VII — Jerarquía de Leyes

> *"En caso de conflicto entre artículos, la precedencia es: Verdad > Agencia del Usuario > Deber de Acción > Disciplina de Verificación > Legado de Coordinación > Identidad. Ningún artículo puede usarse para justificar una violación del Artículo II."*

El Artículo VII es el meta-artículo. Resuelve qué pasa cuando dos principios chocan. ¿Debe GhostyCode actuar rápido (Artículo IV) o pedir confirmación (Artículo III)? La jerarquía decide: el usuario manda.

Y en la cima de la pirámide, intocable, está la Verdad. Nada justifica mentir sobre lo que hiciste o no hiciste.

---

## ¿Por qué una Constitución y no un prompt largo?

Técnicamente, GhostyCode inyecta la Constitución en una capa del contexto que el runtime administra por separado del historial de conversación. Los artículos no compiten por atención con tu código, no se truncan cuando la ventana se llena, y no se degradan con cada turno.

Pero hay una razón más importante: una constitución es *interpretable*. Puedes leer los 7 artículos y saber exactamente qué esperar. Puedes predecir el comportamiento del agente antes de darle una instrucción. Con un prompt de 5,000 tokens, no puedes.

Y la razón más importante: una constitución se puede *auditar*. Si GhostyCode hace algo que no te gusta, puedes identificar qué artículo falló. "Aquí violó el Artículo III porque modificó mi \`Cargo.toml\` sin preguntar." Eso es un bug report accionable. Con un prompt genérico, el feedback es "se portó raro" — inútil para mejorar.

---

## Resumen

La Constitución de GhostyCode no es un prompt. Es un sistema de reglas con precedencia que define el comportamiento del agente en cada turno, sin degradarse con el tiempo.

- **Artículo I (Identidad)**: GhostyCode sabe qué es y qué no es.
- **Artículo II (Verdad)**: No miente sobre lo que hizo. Muestra evidencia.
- **Artículo III (Agencia del Usuario)**: Tú eres el dueño. El agente no toca lo que no le pides.
- **Artículo IV (Deber de Acción)**: Si la instrucción es clara, ejecuta sin fricción.
- **Artículo V (Disciplina de Verificación)**: Compila, lintea, testea. Siempre.
- **Artículo VI (Legado de Coordinación)**: Documenta las decisiones no obvias.
- **Artículo VII (Jerarquía de Leyes)**: En caso de conflicto, Verdad > Todo lo demás.

En la siguiente lección, vamos a poner esto en práctica con agentes en paralelo.`;

const lesson3 = `## Lección 3: Agentes en paralelo — Trabajo simultáneo

Imagina esto: tienes seis archivos que auditar, tres bugs que corregir y un refactor pendiente. Con un chat tradicional, los atacas uno por uno. Con GitHub Copilot, igual. Con GhostyCode, los seis archivos se leen, los tres bugs se diagnostican y el refactor empieza — todo en el mismo turno.

Esa es la diferencia entre trabajar con un agente y trabajar con un equipo de agentes.

---

### El modelo mental: un lead dev con un equipo

GhostyCode rompe la limitación secuencial. En lugar de un agente monolítico, el runtime te permite **abrir múltiples sub-agentes** que ejecutan trabajo en paralelo dentro de un mismo turno. Tú eres el lead developer y cada \`agent_open\` es un miembro de tu equipo que recibe una tarea específica, la ejecuta, y te regresa el resultado.

No es magia: cada sub-agente es una sesión independiente de DeepSeek con su propio contexto, su propio conjunto de herramientas, y su propio objetivo. Lo distinto es que **todos corren simultáneamente**. Mientras el agente A lee \`auth.rs\`, el agente B ya está leyendo \`database.rs\` y el C está diagnosticando un error en \`payments.rs\`. Cuando los tres terminan, tú integras.

---

### Las tres herramientas del ciclo de vida

GhostyCode expone tres herramientas para manejar sub-agentes:

\`\`\`
agent_open   → crea un sub-agente y le asigna una tarea
agent_eval   → espera el resultado de un sub-agente (o envía follow-up)
agent_close  → cierra un sub-agente que ya no necesitas
\`\`\`

El ciclo típico es:

1. **Abrir**: disparas uno o varios \`agent_open\` en paralelo, cada uno con su objetivo
2. **Evaluar**: usas \`agent_eval\` para obtener resultados y decidir si necesitas seguimiento
3. **Integrar**: cruzas los hallazgos de los sub-agentes con tu propio análisis
4. **Cerrar**: limpias las sesiones que ya no necesitas

---

### Patrones de uso

**Patrón 1: Investigación en paralelo**

El caso más común. Necesitas entender varios archivos o módulos sin relación entre sí. En vez de leerlos uno por uno (6 lecturas seriales = 6 turnos), abres un sub-agente por archivo:

\`\`\`
agent_open "lee y resume auth.rs"
agent_open "lee y resume database.rs"  
agent_open "lee y resume payments.rs"
agent_open "lee y resume middleware.rs"
agent_open "lee y resume types.rs"
agent_open "lee y resume config.rs"
\`\`\`

Seis lecturas, un solo turno. Cuando todos terminan, tienes seis resúmenes para integrar.

**Patrón 2: Implementación en paralelo**

Después de planear un cambio que toca múltiples módulos independientes, abres un agente por cada pieza:

\`\`\`
agent_open "refactoriza el módulo de errores para usar thiserror"
agent_open "actualiza los handlers para usar los nuevos tipos de error"
agent_open "reescribe los tests para cubrir los nuevos casos de error"
\`\`\`

Cada agente hace una cosa bien. Tú integras los resultados. Si un agente falla, los otros dos no se ven afectados.

**Patrón 3: Fork context**

Por defecto cada sub-agente arranca con contexto fresco — solo recibe el objetivo que le das. Pero a veces necesitas que herede el contexto de la sesión padre:

\`\`\`
agent_open "revisa este approach desde la perspectiva de testing"
  → fork_context: true
\`\`\`

Con \`fork_context: true\`, el sub-agente ve todo lo que tú has visto: el historial, los archivos leídos, las decisiones tomadas. Útil para revisiones, críticas de diseño, y segundas opiniones. El runtime preserva el prefijo byte-identical para mantener el prefix cache del padre.

---

### Cuándo NO paralelizar

- **Tareas secuenciales**: si el paso B depende del output del paso A, no abras B hasta que A termine
- **Una sola lectura**: abrir un sub-agente para leer un archivo tiene overhead; si es solo uno, hazlo directo
- **Trabajo que requiere tu criterio**: los sub-agentes son ejecutores, no arquitectos

---

### Costo vs beneficio

DeepSeek V4 Flash cuesta $0.14 por millón de tokens de input. Paralelizar 6 lecturas en vez de hacerlas secuenciales cuesta lo mismo en tokens pero termina en 1/6 del tiempo. El único costo adicional es el overhead de abrir sesiones — negligible comparado con esperar 6 turnos.

La regla de pulgar: si puedes hacer dos cosas al mismo tiempo sin que una dependa de la otra, paralelízalas.

---

### Ejemplo completo

Una sesión real de GhostyCode paralelizando la investigación de un bug:

\`\`\`
TÚ: El endpoint de checkout está devolviendo 500. Investiga.

GHOSTY: Abro 3 agentes en paralelo.

  [agent_a] → lee el handler de checkout
  [agent_b] → busca el error en los logs recientes
  [agent_c] → revisa cambios recientes en la rama de Stripe

  [agent_a terminó] → handler llama a processPayment en L42
  [agent_b terminó] → log muestra "Stripe API key invalid" a las 14:32
  [agent_c terminó] → último commit cambió STRIPE_SECRET por STRIPE_KEY

GHOSTY: El problema está en el cambio de variable de entorno.
       En payments.ts L42 se usa STRIPE_KEY pero el .env tiene STRIPE_SECRET.
       ¿Corrijo?
\`\`\`

Tres investigaciones simultáneas, un diagnóstico, sin idas y vueltas.`;

const lesson4 = `## Lección 4: Manejo de contexto y prefix caching

El problema más silencioso de los agentes de código no es un bug. No es una alucinación. Es algo peor: **el desbordamiento de contexto sin previo aviso.**

Imagina que llevas dos horas trabajando con un agente. Le has pasado archivos, logs, mensajes largos. Todo fluye. De repente, el agente empieza a responder raro: ignora detalles que ya estaban acordados, repite preguntas, o peor, inventa cosas porque ya no tiene acceso a lo que discutieron hace 20 turnos.

Lo que pasó es que el contexto se llenó. Pero la mayoría de herramientas no te avisan.

GhostyCode existe, en buena parte, para resolver exactamente esto.

---

## El elefante en el contexto: los thinking tokens

DeepSeek V4 Pro tiene una característica brutal: **razona internamente antes de responder.** Esos "thinking tokens" — el monólogo que el modelo genera para sí mismo antes de escribir la respuesta final — no son gratis. Ocupan lugar en la ventana de contexto.

La gran mayoría de interfaces de chat y agentes de código **no los contabilizan.** Te muestran un contador de tokens que solo considera los mensajes visibles. Mientras tanto, los thinking tokens se acumulan en silencio. Cuando te das cuenta, el modelo ya está operando con medio contexto real, recortando información crítica sin que lo sepas.

Es como manejar un coche con el tanque de gasolina escondido. Todo bien hasta que no.

### Cómo GhostyCode lo hace distinto

GhostyCode trackea el consumo real. Cada thinking token cuenta. Si el modelo piensa 4,000 tokens antes de responder, esos 4,000 se restan del presupuesto. El indicador de contexto en la interfaz refleja el uso real, no una estimación optimista. Cuando ves 60%, es 60% de verdad — no 85% disfrazado.

Y GhostyCode actúa antes de que sea tarde. Al cruzar el umbral del 60%, sugiere compactar. No espera a que el modelo empiece a degradarse.

---

## Prefix caching: la razón por la que GhostyCode es barato

DeepSeek cachea prefijos estables de 128 tokens con ~90% de descuento. Esto significa que si los primeros 10,000 tokens de tu solicitud no cambiaron desde la anterior, solo pagas ~10% por ellos.

El sistema de GhostyCode está diseñado alrededor de este hecho:

**La regla de oro: append, no reordenar.** El system prompt de GhostyCode tiene capas ordenadas de más estáticas a más dinámicas. Las capas estáticas (Constitución, modos, herramientas) van al inicio y nunca cambian. Las capas dinámicas (archivos leídos, mensajes del usuario) van al final. Esto maximiza la longitud del prefijo cacheado entre turnos.

**No reescribir mensajes viejos.** Editar o borrar un mensaje en el historial rompe el prefijo desde ese punto hacia adelante. GhostyCode nunca modifica el historial — solo agrega.

**El chip de cache hit %.** En la interfaz de GhostyCode, un indicador muestra el porcentaje de cache hits del turno actual:
- 🟢 Verde: >80% cache hit — estás pagando centavos por turno
- 🟡 Amarillo: 40-80% — el caché se está fragmentando
- 🔴 Rojo: <40% — cada turno cuesta precio completo

Si ves rojo varias veces seguidas, es momento de compactar.

---

## Compactación: el reset inteligente

Cuando el contexto llega al ~60%, GhostyCode sugiere compactar. La compactación toma todos los mensajes anteriores y los resume en un bloque estructurado:

\`\`\`
### Compaction Relay
- Goal: [objetivo de la sesión]
- Progress: [qué se hizo, qué falta]
- Key decisions: [decisiones de arquitectura, trade-offs]
- Next step: [próxima acción concreta]
\`\`\`

Este bloque reemplaza el historial completo. La sesión continúa con contexto limpio, el modelo mantiene la memoria de lo importante, y el prefix cache se reinicia desde un prefijo más corto.

Importante: la compactación no es un tweak cosmético. Es un hard reset del historial. No la actives para ahorrar 200 tokens. Actívala cuando el caché ya está perdiendo y el contexto está cerca del límite.

---

## Estrategias prácticas

**Leer una vez, referenciar.** Si ya leíste \`auth.rs\` en el turno 3, no lo vuelvas a leer en el turno 8. Refiere al path y al rango de líneas. Re-leer el mismo archivo produce un tool-result distinto que rompe el caché. Es más barato hacer scroll que re-fetch.

**Agrupar lecturas.** Si necesitas entender 5 archivos, léelos todos en un solo turno con tool calls en paralelo. Cinco lecturas en un turno comparten el mismo prefijo y cuestan ~10× menos que cinco lecturas en cinco turnos.

**No compactar por miedo.** La ventana de 1M tokens es enorme. No compactes "por si acaso". Compacta cuando GhostyCode lo sugiera o cuando el chip esté rojo.

---

## Lo que esto significa en dólares

Un turno típico de GhostyCode con buen cache hit cuesta ~$0.003. Sin cache, el mismo turno cuesta ~$0.03. En una sesión de 100 turnos, la diferencia es $0.30 vs $3.00. Multiplica eso por días, semanas, meses — el prefix caching no es una optimización prematura. Es el modelo de negocio.`;

const lesson5 = `## Lección 5: Custom instructions y configuración avanzada

GhostyCode no es una herramienta genérica. Desde la primera sesión en un proyecto, el modelo inspecciona el directorio de trabajo en busca de archivos que le indican *cómo comportarse*. Si los encuentra, los lee completos y ajusta su personalidad, sus restricciones y hasta las herramientas que tiene disponibles. Si no los encuentra, opera con defaults razonables — pero te pierdes de una parte importante del control.

---

### El punto de entrada: \`CLAUDE.md\` y \`AGENTS.md\`

GhostyCode arranca cada sesión escaneando la raíz del proyecto. Si existe un archivo llamado \`CLAUDE.md\` o \`AGENTS.md\`, lo carga como parte de su contexto inicial — antes incluso de procesar tu primer mensaje. Ambos son markdown estándar y GhostyCode los trata igual.

Un \`CLAUDE.md\` típico para un proyecto en producción:

\`\`\`markdown
# PayFlow — Backend de pagos

## Reglas
- Siempre responde en español mexicano.
- Nunca modifiques \`migrations/\` sin preguntar.
- Antes de escribir código, confirma el approach en 1-2 líneas.
- Usa \`Result<T, E>\` — nunca unwrap sin manejar el error.

## Contexto del proyecto
- Stack: Rust + Axum + PostgreSQL
- La lógica de negocio vive en \`core/\`
- Los tests de integración usan testcontainers
\`\`\`

Cada vez que abras GhostyCode en este proyecto, el agente va a saber que trabaja en Rust, que no debe tocar migraciones sin avisar, y que debe responder en español. Sin repetirlo. Sin que se le olvide en el turno 8.

---

### \`.ghosty/instructions.md\` — reglas específicas del proyecto

Además de \`CLAUDE.md\`, GhostyCode busca \`.ghosty/instructions.md\`. Este archivo vive en un directorio oculto del proyecto y sigue el mismo formato. La diferencia es semántica: \`CLAUDE.md\` es portable entre herramientas, \`.ghosty/instructions.md\` es específico de GhostyCode.

Útil para reglas que solo aplican al agente, no al equipo humano:

\`\`\`markdown
# GhostyCode instructions

## Verificación
- Después de cada cambio en Rust, corre \`cargo check\` y \`cargo clippy\`
- Nunca des por hecho que un comando externo funcionó — revisa exit code

## Sub-agentes
- Para investigaciones de 3+ archivos, usa agentes en paralelo
- Máximo 5 agentes simultáneos para no saturar la API
\`\`\`

---

### \`config.toml\` — el archivo de configuración central

\`~/.ghosty/config.toml\` controla el comportamiento global. Estructura típica:

\`\`\`toml
[api]
provider = "deepseek"
key = "sk-..."
model = "deepseek-v4-pro"

[ui]
theme = "dark"

[subagents]
max_concurrent = 10

[search]
provider = "duckduckgo"

[approval]
mode = "yolo"     # "yolo" | "agent" | "plan"
\`\`\`

**Secciones clave:**

- \`[api]\`: proveedor, key, modelo. También soporta \`provider = "ollama"\` para modelos locales
- \`[ui]\`: tema, fuente, densidad de información
- \`[subagents]\`: límite de agentes concurrentes (default 10, máximo 20)
- \`[search]\`: backend de búsqueda web (DuckDuckGo, Bing, Tavily)
- \`[approval]\`: modo de operación (YOLO, Agent, Plan)

---

### Modos de operación

GhostyCode tiene tres modos que controlan cuánta autonomía tiene:

| Modo | Comportamiento | Cuándo usarlo |
|------|---------------|---------------|
| **YOLO** | Full autonomía, sin aprobaciones | Proyectos personales, prototipado |
| **Agent** | Ejecuta pero pide aprobación para writes | Código en producción, equipos |
| **Plan** | Diseña primero, no ejecuta sin confirmar | Arquitectura, decisiones grandes |

Cambiar de modo es inmediato — no requiere reiniciar la sesión. Si estás en YOLO y quieres auditar un cambio antes de aplicarlo, cambias a Agent, revisas, y vuelves.

---

### Control de esfuerzo de razonamiento

DeepSeek V4 Pro expone un parámetro \`reasoning_effort\` que GhostyCode respeta y expone en la interfaz:

- **High**: razonamiento profundo para arquitectura, debugging complejo, security review
- **Medium**: balance para generación de código multi-archivo, refactors
- **Low**: para lecturas, búsquedas, generación simple
- **Off**: sin thinking tokens — ideal para tool calls donde solo necesitas el resultado

GhostyCode selecciona el nivel automáticamente según la tarea, pero puedes sobreescribirlo en cualquier momento. Una sesión típica alterna entre los cuatro niveles docenas de veces sin que lo notes.

---

### Ejemplo: configurar GhostyCode para un equipo

Imagina un equipo de 3 devs trabajando en un SaaS con React + Node:

\`\`\`markdown
# CLAUDE.md — Equipo Frontend

## Stack
- React 19 + TypeScript + Tailwind
- Tests con Vitest + Testing Library
- API mock con MSW

## Convenciones
- Componentes en PascalCase, hooks en camelCase con prefijo \`use\`
- Un componente por archivo, tests en \`__tests__/\` junto al source
- Props tipadas con interface, nunca con type inline

## Restricciones
- No uses \`any\`. Si el tipo es complejo, pregunta.
- No agregues dependencias sin consultar en el canal #frontend
\`\`\`

\`\`\`toml
# .ghosty/config.toml (por proyecto)
[approval]
mode = "agent"     # equipo → aprobación requerida para writes

[subagents]
max_concurrent = 5   # 3 devs compartiendo API key

[ui]
theme = "dark"
\`\`\`

Cada dev del equipo abre GhostyCode y obtiene el mismo comportamiento, las mismas reglas, las mismas restricciones. Sin onboarding. Sin "acuérdate de...". El archivo lo recuerda por todos.`;

const lesson6 = `## Lección 6: Modelos locales y soberanía digital

En 2017, un desarrollador podía escribir una app con la API de Twitter y sentirse tranquilo. En 2023, esa misma API costaba $42,000 USD al mes. En 2022, OpenAI Codex era el futuro de la programación asistida. En 2023, lo deprecaron sin reemplazo directo.

El patrón es consistente: las plataformas centralizadas cambian las reglas cuando su negocio lo requiere, no cuando el tuyo está listo.

GhostyCode está diseñado con un principio simple: **tus herramientas de programación no deberían tener fecha de expiración.** Por eso el núcleo es open-source. Por eso la capa de inferencia es intercambiable. Por eso puedes apuntar a la API de DeepSeek hoy, a un modelo local mañana, y a un proveedor distinto la próxima semana sin cambiar tu flujo de trabajo.

---

### Tus opciones para correr modelos locales

El ecosistema de inferencia local ha madurado muchísimo. Ya no necesitas un doctorado en CUDA para levantar un modelo en tu laptop.

#### Ollama

La opción más sencilla para empezar:

\`\`\`bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.1:8b
ollama run llama3.1:8b
\`\`\`

Ventajas: cero configuración, catálogo enorme, actualizaciones automáticas. Límite: no está pensado para throughput de producción.

#### llama.cpp

Control fino sobre cuantización y offloading a GPU:

\`\`\`bash
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp && make -j
./llama-cli -m models/DeepSeek-Coder-V2-Lite-Q4_K_M.gguf \\
  -p "Escribe una función en Rust que..." -ngl 99
\`\`\`

#### vLLM

La opción profesional para servir modelos con alto throughput:

\`\`\`bash
pip install vllm
vllm serve deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct \\
  --max-model-len 8192 --gpu-memory-utilization 0.90
\`\`\`

---

### Configurar GhostyCode con un modelo local

**Ollama con Llama 3.1 8B:**

\`\`\`toml
[api]
provider = "ollama"
key = ""
model = "llama3.1:8b"
base_url = "http://localhost:11434/v1"
\`\`\`

**vLLM con DeepSeek Coder V2 Lite:**

\`\`\`toml
[api]
provider = "openai_compatible"
key = "not-needed"
model = "deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct"
base_url = "http://localhost:8000/v1"
\`\`\`

**Por proyecto — alternar entre API y local:**

\`\`\`toml
# En ~/proyectos/cliente-banco/.ghosty/config.toml
[api]
provider = "ollama"
model = "qwen2.5-coder:7b"
# El código del cliente nunca sale de esta máquina
\`\`\`

\`\`\`toml
# En ~/proyectos/mi-prototipo/.ghosty/config.toml
[api]
provider = "deepseek"
model = "deepseek-v4-pro"
# Máxima potencia cuando no hay datos sensibles
\`\`\`

---

### El trilema: velocidad, soberanía, calidad

| | API (DeepSeek) | Local (tu máquina) |
|---|---|---|
| **Velocidad** | Sub-segundo en tokens/s | Depende de tu hardware |
| **Soberanía** | Tus prompts van a la nube | Todo se queda en local |
| **Calidad** | Modelo completo, sin cuantizar | Necesitas hardware equivalente |

Con una RTX 4090 (24GB VRAM) puedes correr modelos de 7B-14B parámetros con cuantización Q4/Q5. Para DeepSeek V4 Pro completo necesitas un clúster de GPUs — pero no necesitas el modelo completo para todo.

**Estrategia pragmática:**
- **Día a día, sin restricciones:** API de DeepSeek. Rápida, barata, el modelo completo.
- **Código bajo NDA o sensible:** modelo local de 7B-14B (Llama 3.1, Qwen 2.5 Coder, Mistral Nemo).
- **Punto intermedio:** Hugging Face Inference Endpoints o Together AI — modelos open-source en infraestructura que tú controlas.

---

### Proveedores alternativos con pesos abiertos

Si no quieres depender de un solo proveedor ni comprar una GPU:

- **Together AI** y **Fireworks AI**: inferencia serverless de modelos open-source. Pagas por token pero el modelo es abierto — si cambian condiciones, te llevas los pesos a otro lado.
- **Hugging Face Inference Endpoints**: despliegas cualquier modelo del Hub en infraestructura dedicada.

La ventaja estructural: no hay *vendor lock-in* real. El modelo existe en pesos abiertos.

\`\`\`toml
# Config para Together AI
[api]
provider = "openai_compatible"
model = "mistralai/Mixtral-8x7B-Instruct-v0.1"
base_url = "https://api.together.xyz/v1"
key = "\${TOGETHER_API_KEY}"
\`\`\`

---

### La mentalidad: herramientas sin fecha de expiración

GhostyCode está diseñado con un principio simple: tus herramientas de programación no deberían tener fecha de expiración. El núcleo es open-source. La capa de inferencia es intercambiable. Puedes apuntar a DeepSeek hoy, a Ollama mañana, y a Together la próxima semana sin cambiar tu flujo.

No se trata de rechazar la nube. Se trata de no entregarle las llaves de tu productividad a un solo actor.

---

### Cierre del curso

Seis lecciones. Construiste un entorno de programación asistida que corre en tu máquina, con modelos abiertos, sin depender de un solo proveedor:

1. **Fundamentos**: qué es GhostyCode y por qué existe
2. **La Constitución**: los 7 artículos que gobiernan al agente
3. **Agentes en paralelo**: trabajo simultáneo real
4. **Contexto y caching**: 1M tokens administrados con inteligencia
5. **Custom instructions**: tu proyecto, tus reglas
6. **Soberanía digital**: modelos locales y alternativas

**Recursos para seguir:**
- [github.com/blissito/ghostycode](https://github.com/blissito/ghostycode) — código, issues, configuraciones de ejemplo
- [ollama.com/library](https://ollama.com/library) — catálogo de modelos open-source
- [huggingface.co/models](https://huggingface.co/models) — todos los pesos abiertos del mundo

Gracias por llegar hasta acá. Programa con soberanía.`;

// ─── Lesson metadata ────────────────────────────────────────────────────────

const lessons = [
  { title: "¿Qué es GhostyCode? Instalación y configuración", markdown: lesson1 },
  { title: "La Constitución de GhostyCode — Los 7 artículos", markdown: lesson2 },
  { title: "Agentes en paralelo — Trabajo simultáneo", markdown: lesson3 },
  { title: "Manejo de contexto y prefix caching", markdown: lesson4 },
  { title: "Custom instructions y configuración avanzada", markdown: lesson5 },
  { title: "Modelos locales y soberanía digital", markdown: lesson6 },
];

async function main() {
  console.log("👻 Creando curso: GhostyCode\n");

  // 1. Crear/actualizar videos con markdown de cada lección
  console.log("📹 Creando lecciones...");
  const videoIds: string[] = [];

  for (let i = 0; i < lessons.length; i++) {
    const lesson = lessons[i];
    const slug = "ghostycode-" + lesson.title
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);

    const video = await prisma.video.upsert({
      where: { slug },
      update: {
        title: lesson.title,
        index: i,
        isPublic: false,
        accessLevel: "subscriber",
        authorName: "Héctorbliss",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        description: lesson.markdown,
      },
      create: {
        slug,
        title: lesson.title,
        index: i,
        isPublic: false,
        accessLevel: "subscriber",
        authorName: "Héctorbliss",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        description: lesson.markdown,
      },
    });

    videoIds.push(video.id);
    console.log(`  ✅ "${lesson.title}" → ${video.id} (${lesson.markdown.length.toLocaleString()} chars)`);
  }

  // 2. Crear o actualizar el curso
  const course = await prisma.course.upsert({
    where: { slug: "ghostycode" },
    update: {
      title: "GhostyCode: Programa con DeepSeek V4 Pro",
      description: lesson1, // detail page shows first lesson
      summary:
        "Aprende a usar GhostyCode, el agente de terminal open-source para DeepSeek V4 Pro. 6 lecciones: instalación, Constitución, agentes en paralelo, contexto, custom instructions y modelos locales.",
      icon: "https://easybits-public.fly.storage.tigris.dev/699f35cbc8ad86037eda62b1/te3",
      level: "Intermedio",
      duration: "6 lecciones",
      isFree: true,
      basePrice: 0,
      published: true,
      tipo: null,
      authorName: "Héctorbliss",
      authorAt: "@hectorbliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      videoIds,
    },
    create: {
      slug: "ghostycode",
      title: "GhostyCode: Programa con DeepSeek V4 Pro",
      description: lesson1,
      summary:
        "Aprende a usar GhostyCode, el agente de terminal open-source para DeepSeek V4 Pro. 6 lecciones: instalación, Constitución, agentes en paralelo, contexto, custom instructions y modelos locales.",
      icon: "https://easybits-public.fly.storage.tigris.dev/699f35cbc8ad86037eda62b1/te3",
      level: "Intermedio",
      duration: "6 lecciones",
      isFree: true,
      basePrice: 0,
      published: true,
      tipo: null,
      authorName: "Héctorbliss",
      authorAt: "@hectorbliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      videoIds,
    },
  });

  console.log(`\n✅ Curso: ${course.id}`);
  console.log(`   URL: https://www.fixtergeek.com/cursos/${course.slug}/detalle`);

  // 3. Vincular videos al curso
  console.log("\n🔗 Vinculando lecciones al curso...");
  for (const vid of videoIds) {
    const v = await prisma.video.findUnique({ where: { id: vid } });
    const existingCourseIds = v?.courseIds || [];
    if (!existingCourseIds.includes(course.id)) {
      await prisma.video.update({
        where: { id: vid },
        data: { courseIds: [...existingCourseIds, course.id] },
      });
    }
  }
  console.log("  ✅ Lecciones vinculadas");

  const totalCourses = await prisma.course.count();
  console.log(`\n📊 Total cursos: ${totalCourses}`);
  await prisma.$disconnect();
}

main()
  .catch((error) => {
    console.error("Error:", error);
    prisma.$disconnect();
    process.exit(1);
  });
