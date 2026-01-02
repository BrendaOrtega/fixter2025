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
`useChat` y `useCompletion` manejan todo el estado y streaming por ti.

```tsx
import { useChat } from "ai/react";

export function Chat() {
  const { messages, input, handleSubmit, handleInputChange } = useChat();

  return (
    <form onSubmit={handleSubmit}>
      {messages.map((m) => (
        <div key={m.id}>{m.content}</div>
      ))}
      <input value={input} onChange={handleInputChange} />
    </form>
  );
}
```

## Estructura del libro

Este libro está organizado en capítulos progresivos:

1. **Fundamentos** - Entender prompts, tokens, y contexto
2. **Streaming básico** - Tu primera inferencia con `streamText`
3. **Structured output** - Datos tipados con `generateObject` y Zod
4. **Backend** - Servidores Express y Hono
5. **React** - El hook `useChat` y patrones de UI
6. **React Router v7** - Integración full-stack
7. **Tools** - Cuando el modelo ejecuta acciones
8. **Agentes** - Sistemas autónomos

Cada capítulo incluye ejemplos que puedes ejecutar inmediatamente.

## Requisitos previos

- Node.js 18+
- Conocimiento básico de TypeScript
- Familiaridad con React
- Una API key de OpenAI, Anthropic, o Google (tienen tiers gratuitos)

## Setup inicial

```bash
# Crear proyecto
mkdir ai-sdk-demo && cd ai-sdk-demo
npm init -y

# Instalar dependencias
npm install ai @ai-sdk/openai zod

# Para ejecutar TypeScript directamente
npm install -D tsx typescript
```

Crea un archivo `.env`:

```
OPENAI_API_KEY=sk-...
```

Y tu primer script `index.ts`:

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
npx tsx index.ts
```

Si ves "Hola desde TypeScript!" (o algo similar), estás listo para continuar.

---

En el próximo capítulo exploraremos los fundamentos: cómo funcionan los LLMs, qué son los tokens, y cómo manejar el contexto efectivamente.
