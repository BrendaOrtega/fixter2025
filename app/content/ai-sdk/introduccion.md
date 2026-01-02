# Introducción

El AI SDK es la biblioteca open source de Vercel que está transformando cómo los desarrolladores integran inteligencia artificial en aplicaciones web.

## ¿Qué es el AI SDK?

Es un toolkit de TypeScript que simplifica la integración de modelos de lenguaje (LLMs) como GPT, Claude, o Gemini en aplicaciones JavaScript/TypeScript.

```typescript
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

const result = streamText({
  model: openai("gpt-4o"),
  prompt: "Explica qué es TypeScript en una oración",
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

Con pocas líneas de código obtienes streaming en tiempo real, exactamente como ChatGPT.

## ¿Por qué AI SDK?

### 1. TypeScript-first
Tipos completos, autocompletado, y validación en tiempo de compilación. No más `any` o respuestas sin tipar.

### 2. Streaming nativo
El streaming no es un extra, es el default. Cada función tiene su versión stream (`generateText` → `streamText`).

### 3. Agnóstico del proveedor
Cambia de OpenAI a Anthropic a Google con una línea. La API es la misma.

```typescript
// Cambiar de proveedor es trivial
import { anthropic } from "@ai-sdk/anthropic";

const result = streamText({
  model: anthropic("claude-sonnet-4-20250514"), // Solo cambia esta línea
  prompt: "...",
});
```

### 4. React hooks listos
`useChat` maneja el streaming y estado de mensajes por ti.

```tsx
import { useChat } from "@ai-sdk/react";
import { useState } from "react";

export function Chat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat();

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      sendMessage({ text: input });
      setInput("");
    }}>
      {messages.map((m) => (
        <div key={m.id}>
          {m.parts.map((part, i) =>
            part.type === "text" ? <span key={i}>{part.text}</span> : null
          )}
        </div>
      ))}
      <input value={input} onChange={(e) => setInput(e.target.value)} />
    </form>
  );
}
```

> **Nota para principiantes:** En v6, el hook ya no maneja el input internamente. Usamos `useState` de React para controlar el campo de texto, y `sendMessage` para enviar. Los mensajes ahora tienen `parts` en lugar de `content`.

## Estructura del libro

Este libro está organizado en capítulos progresivos:

1. **Tu primera inferencia** - Streaming, tokens, context window y datos estructurados con Zod
2. **React** - El hook `useChat`, internals y patrones de UI
3. **Backend** - Servidores Express y Hono, HTTP streaming
4. **React Router v7** - Integración full-stack
5. **Tools** - Cuando el modelo ejecuta acciones
6. **Agentes** - Sistemas autónomos

Cada capítulo incluye ejemplos que puedes ejecutar inmediatamente.

## Requisitos previos

- Node.js 20+
- Conocimiento básico de TypeScript
- Familiaridad con React
- Una API key de OpenAI, Anthropic, o Google (tienen tiers gratuitos)

> **Versión del AI SDK:** Este libro está escrito para **AI SDK v6** (la versión más reciente de Vercel). Si encuentras código en internet con `toDataStreamResponse()`, es de versiones anteriores (4.x/5.x). Nosotros usamos `toUIMessageStreamResponse()` y el formato `UIMessage` exclusivamente.

> **Fecha de escritura:** Este libro fue escrito en **Enero 2026**. El AI SDK evoluciona rápido—si algo no funciona, revisa el [changelog oficial](https://github.com/vercel/ai/releases).

## Setup inicial

Usaremos el repositorio oficial del taller que ya tiene todo configurado:

```bash
# Clonar el repo
git clone https://github.com/blissito/taller-ai-sdk-para-principiantes.git
cd taller-ai-sdk-para-principiantes

# Instalar dependencias
npm install
```

Crea un archivo `.env` en la raíz del proyecto:

```
OPENAI_API_KEY=sk-...
```

> **Branches del taller:**
> - `ejercicio/00-basic_inference` hasta `ejercicio/06-sending_custom_data` — Flujo principal
> - `ejercicio/bonus-migrate_to_hono` — Usado en el Capítulo 3 para entender streaming
>
> Las branches del libro siguen el patrón `book/capitulo-*` para diferenciarse.

Tu primer script ya está listo en `index.ts`:

```typescript
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

const { text } = await generateText({
  model: openai("gpt-4o-mini"),
  prompt: "Di 'Hola desde TypeScript!'",
});

console.log(text);
```

Ejecuta con:

```bash
npm run dev
```

Si ves "Hola desde TypeScript!" (o algo similar), estás listo para continuar.

---

En el próximo capítulo haremos tu primera inferencia: verás streaming en acción, entenderás qué son los tokens y el context window, y generarás datos estructurados con Zod.
