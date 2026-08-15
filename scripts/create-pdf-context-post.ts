import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const body = `# Cómo evitar que tu agente reviente el contexto al leer un PDF

*11 de junio de 2026*

---

Todos los agentes LLM que tocan archivos reales terminan haciendo lo mismo en algún momento:

\`\`\`bash
Read("reporte-anual-103-paginas.pdf")
\`\`\`

La herramienta \`Read\` del Agent SDK agarra el archivo entero y lo mete al prompt. Ocho megabytes de PDF binario se convierten en cientos de miles de tokens. El turno muere. A veces la API escupe *"Prompt is too long"*. Otras, peor aún, el runtime detecta que el contexto no deja de reventar y suelta esto:

> Autocompact is thrashing: the context refilled to the limit within 3 turns of the previous compact, 3 times in a row. A file being read or a tool output is likely too large for the context window. Try reading in smaller chunks, or use /clear to start fresh.

Es el grito de auxilio de un sistema que ya intentó compactar tres veces seguidas y el contexto volvió a llenarse de inmediato. La única salida es \`/clear\`: borrar todo, perder el hilo de la conversación, empezar de cero. El usuario no entiende qué pasó. Solo sabe que el agente dejó de funcionar.

![Código en pantalla con error de contexto](https://images.pexels.com/photos/270557/pexels-photo-270557.jpeg?auto=compress&cs=tinysrgb&w=1200)
*Foto de [Pixabay](https://www.pexels.com/@pixabay) en Pexels*

Esto nos pasó en producción. Tres veces. Con tres clientes distintos. La primera era un ZIP de 113 MB con 47 archivos de catálogo. La segunda, un PDF de 103 páginas con estados financieros. La tercera, un Excel con 15 hojas de precios.

Lo que construimos es un patrón de tres capas que intercepta la \`Read\` *antes* de que toque el archivo y redirige al agente hacia herramientas de extracción acotada. Es un patrón que funciona con cualquier SDK de agentes, no solo Anthropic.

---

## El problema: Read mete binarios al contexto

El SDK de Anthropic expone \`Read\` como herramienta built-in. Lee cualquier archivo del filesystem y lo devuelve como contenido al modelo.

Para archivos de texto funciona perfecto. Para binarios es una bomba de tiempo:

- **Un PDF de 8 MB** → cientos de miles de tokens → *"Prompt is too long"*
- **Un ZIP de 100 MB con 47 archivos adentro** → si lo descomprimes a ciegas, el agente intenta leer todo
- **Una imagen JPG de WhatsApp** que el agente YA vio como adjunto multimodal → la re-lee desde \`attachments/\` como base64 gigante (~40K tokens) y satura el contexto después de un compact

El síntoma es silencioso — hasta que truena. El turno aborta, el usuario ve un error crudo de la API o el mensaje de autocompact thrashing, y no hay recovery automático. El agente perdió todo el contexto de esa interacción. Compactar tres veces en tres turnos y seguir igual significa que algo grande está entrando al prompt sin control.

---

## El intento naïve: solo prompt guidance

Nuestra primera reacción fue instruir al agente en su \`CLAUDE.md\`:

> NUNCA uses Read en PDFs. Usa pdf-reader extract --layout > archivo.txt y procesa con grep/sed.

Funcionó… a veces.

El agente ignora instrucciones en lenguaje natural cuando está bajo presión de contexto o cuando la herramienta \`Read\` está simplemente *ahí*, disponible, y el camino de menor resistencia es llamarla. Los incidentes se repitieron.

Misma historia con el skill \`big-files\` que documenta el protocolo de inspección-y-pregunta para archivos >5 MB. El agente lo leía, lo entendía, y aún así a veces disparaba \`Read\` contra un PDF de 100 páginas. Porque un skill no es una restricción — es una sugerencia.

> "El prompt guidance es necesario pero insuficiente. En producción, bajo presión de contexto, el agente toma el camino más corto — y el camino más corto casi siempre es la herramienta que ya tiene enfrente."

---

## La solución: defensa en tres capas

![Shield de seguridad digital](https://images.pexels.com/photos/60504/security-protection-anti-virus-software-60504.jpeg?auto=compress&cs=tinysrgb&w=1200)
*Foto de [Pixabay](https://www.pexels.com/@pixabay) en Pexels*

### Capa 1 — Skill prompting (guía blanda)

Los skills \`pdf-reader\`, \`office-reader\` y \`big-files\` documentan el protocolo correcto. El agente *sabe* que no debe leer binarios crudos.

Esta capa existe para que cuando la capa 2 lo bloquea, el agente entienda *por qué* y sepa *qué hacer*. Sin ella, el agente recibe un "deny" seco y se queda trabado. Con ella, el mensaje de denegación tiene sentido y el agente pivotea naturalmente.

### Capa 2 — PreToolUse hook (bloqueo determinista)

Aquí está el núcleo. El SDK de Anthropic expone un hook \`PreToolUse\` que se ejecuta *antes* de cada llamada a herramienta. Lo usamos como circuit breaker:

\`\`\`typescript
const readAttachmentGuardHook: HookCallback = async (input) => {
  const pre = input as PreToolUseHookInput;
  if (pre.tool_name !== 'Read') return {};

  const filePath = pre.tool_input?.file_path;
  if (typeof filePath !== 'string') return {};

  let reason = null;
  if (/\.(jpe?g|png|gif|webp)$/i.test(filePath)) {
    reason = 'No leas imágenes con Read — ya las viste como adjunto multimodal. '
           + 'Releerlas mete ~40K tokens de base64 al contexto.';
  } else if (/\.pdf$/i.test(filePath)) {
    reason = 'No leas PDFs con Read. Usa pdf-reader extract --layout > archivo.txt '
           + 'y procesa por partes con grep/sed.';
  } else if (/\.(xlsx?|docx?|zip|tar|rar|7z)$/i.test(filePath)) {
    reason = 'Usa office-reader o el protocolo big-files: inspecciona metadata primero.';
  }

  if (!reason) return {}; // dejar pasar

  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  };
};
\`\`\`

Esto es **código, no prompt**. El hook no negocia. Si el archivo es PDF, imagen, Office o comprimido, la \`Read\` se deniega con un mensaje que redirige a la herramienta correcta.

El modelo no tiene forma de saltarse esta restricción. El hook corre en el runtime del contenedor, no en el loop de razonamiento del LLM. Es un guardia en la puerta, no un letrero en la pared.

La propiedad \`permissionDecisionReason\` es la clave del diseño: no solo bloquea, **instruye**. El agente recibe el mensaje en su siguiente turno, entiende el motivo, y pivotea a la CLI correcta. El usuario nunca ve el error.

### Capa 3 — CLIs de extracción acotada

En lugar de meter el archivo al contexto, el agente usa scripts pequeños que extraen texto delimitado:

**\`pdf-reader\`** — wrapper de ~200 líneas en bash sobre \`pdftotext\` / \`pdfinfo\` (poppler-utils):

\`\`\`bash
# Solo metadata, cero tokens
pdf-reader info balances-2025.pdf

# Extraer a archivo, no al contexto
pdf-reader extract balances-2025.pdf --layout --pages 1-20 > balance.txt

# Procesar con herramientas de texto
grep "EBITDA" balance.txt
head -50 balance.txt
\`\`\`

**\`office-reader\`** — wrapper sobre \`xlsx\` y \`mammoth\` (npm):

\`\`\`bash
# Metadata sin leer celdas
office-reader info precios.xlsx

# Extraer una sola hoja como CSV
office-reader extract precios.xlsx --sheet "Mayo" > precios-mayo.csv
\`\`\`

El patrón universal: **extraer a archivo → inspeccionar con herramientas de texto → procesar por partes**. El binario nunca entra al prompt. El contexto crece de forma controlada según lo que el agente decide leer, no según el tamaño del archivo.

---

## ¿Por qué tres capas y no solo el hook?

![Pantalla con código de programación](https://images.pexels.com/photos/256502/pexels-photo-256502.jpeg?auto=compress&cs=tinysrgb&w=1200)
*Foto de [Pixabay](https://www.pexels.com/@pixabay) en Pexels*

Podrías pensar que con la capa 2 basta. Pero necesitas las tres:

- **Sin capa 1**: el agente recibe un "deny" seco y no sabe qué hacer. Pivotea a leer el archivo de otra forma absurda o se queda trabado.
- **Sin capa 2**: el prompt guidance se ignora bajo presión. Confirmado en producción, tres incidentes.
- **Sin capa 3**: no hay alternativa real. Bloquear \`Read\` sin dar herramientas de extracción solo cambia el problema de lugar.

Las tres capas forman un sistema: la capa 1 le da *contexto* al agente, la capa 2 le pone un *límite duro*, y la capa 3 le da una *salida viable*. Si falla cualquiera, el sistema completo falla.

---

## Generalizable a cualquier SDK

Esto no es específico de Anthropic. Cualquier agente que tenga acceso al filesystem va a intentar leer un binario grande eventualmente. El patrón se traduce así:

| SDK | Equivalente de la capa 2 |
|-----|--------------------------|
| Anthropic Agent SDK | \`PreToolUse\` hook |
| OpenAI Agents SDK | \`before_tool\` hook en \`FunctionTool\` |
| LangChain / LangGraph | Middleware en el \`ToolNode\` o guard en \`@tool\` |
| CrewAI | Decorator wrapper en \`@tool\` con chequeo de extensión |
| Raw API calls | Middleware en tu orchestrator que intercepte \`tool_call\` |

La capa 3 (CLIs de extracción) es universal: \`pdftotext\` existe en cualquier distro Linux. \`xlsx\` y \`mammoth\` son paquetes npm ubicuos. Si tu agente corre en un contenedor, ya tienes todo lo necesario.

---

## Incidentes que este patrón evitó

Después de implementar las tres capas:

- **Caribe Ventures (junio 2026)**: llegó un PDF de 103 páginas con estados financieros. El hook bloqueó \`Read\`, el agente usó \`pdf-reader info\` → 103 páginas, preguntó al usuario qué sección necesitaba → extrajo solo páginas 1-5. El turno duró 40 segundos en lugar de morir.
- **Jarcería (mayo 2026, pre-patrón)**: ZIP de 113 MB, el agente intentó procesarlo de un golpe, "Prompt is too long", el cliente vio el error crudo. *Este incidente fue el que disparó la construcción del patrón.*

---

## Lo que NO resuelve

- **Archivos de texto genuinamente enormes** (logs de 500K líneas). Ahí el problema no es binario sino volumen. Necesitas \`grep\` o \`head\`/\`tail\` con conciencia de contexto — otro patrón distinto.
- **Agentes que genuinamente necesitan el archivo completo** ("búscame todas las menciones de X en este PDF"). Ahí toca chunking + map-reduce, que es más caro pero inevitable.

Pero para el 90% de los casos — "mira este PDF que me mandaron", "cotiza los productos de este Excel", "¿qué trae este ZIP?" — este patrón convierte una falla catastrófica en una interacción normal.

---

## El código

![Visualización de datos y tecnología](https://images.pexels.com/photos/17483871/pexels-photo-17483871.png?auto=compress&cs=tinysrgb&w=1200)
*Foto de [Google DeepMind](https://www.pexels.com/@googledeepmind) en Pexels*

Todo está en el repo de [NanoClaw](https://github.com/qwibitai/nanoclaw):

- El hook: [\`readAttachmentGuardHook\` en \`agent-runner/src/index.ts\`](https://github.com/qwibitai/nanoclaw/blob/main/container/agent-runner/src/index.ts#L236)
- Las CLIs: [\`container/skills/pdf-reader/\`](https://github.com/qwibitai/nanoclaw/tree/main/container/skills/pdf-reader) y [\`container/skills/office-reader/\`](https://github.com/qwibitai/nanoclaw/tree/main/container/skills/office-reader)
- Los skills: [\`big-files/SKILL.md\`](https://github.com/qwibitai/nanoclaw/blob/main/container/skills/big-files/SKILL.md), [\`pdf-reader/SKILL.md\`](https://github.com/qwibitai/nanoclaw/blob/main/container/skills/pdf-reader/SKILL.md)

---

Si estás armando agentes que tocan archivos reales en producción, este patrón te va a ahorrar por lo menos un incidente con cliente. Y si ya tuviste ese incidente, sabes exactamente de qué estoy hablando.

En el [canal de YouTube](https://www.youtube.com/@fixtergeek) compartimos más patterns de agentes en producción — desde circuit breakers hasta cursor recovery. Si te late el tema, suscríbete.

Abrazo. Blissmo. 🤓
`;

async function main() {
  const post = await db.post.create({
    data: {
      title: "Cómo evitar que tu agente reviente el contexto al leer un PDF",
      slug: "evitar-agente-reviente-contexto-leer-pdf",
      body,
      contentFormat: "markdown",
      authorName: "Héctorbliss",
      authorAt: "@hectorbliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://www.hectorbliss.com",
      mainTag: "ai",
      tags: ["ai", "agentes", "claude", "tutorial"],
      metaImage: "https://images.pexels.com/photos/270557/pexels-photo-270557.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200",
      published: true,
    },
  });
  console.log(`Post created: /blog/${post.slug}`);
  console.log(`ID: ${post.id}`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
