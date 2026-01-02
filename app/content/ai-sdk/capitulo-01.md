# Capítulo 1: Tu Primera Inferencia con IA

Vamos a generar texto con IA.

## El código primero

Abre el repo que clonaste y asegúrate de tener tu `.env` con la API key. Luego crea (o edita) `index.ts`:

```typescript
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

const result = streamText({
  model: openai("gpt-4o-mini"),
  prompt: "Explica qué es TypeScript en una oración",
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

Ejecuta con `npm run dev`.

Verás el texto aparecer palabra por palabra, exactamente como en ChatGPT. Con 10 líneas de código tienes streaming de IA funcionando.

> **Nota para principiantes:** Si no has visto `for await...of` antes, no te preocupes. Es un loop especial para iterar sobre datos que llegan de forma asíncrona. Piensa en ello como un `for...of` normal, pero que sabe esperar entre cada elemento que llega del stream.
>
> Usamos `process.stdout.write` en lugar de `console.log` porque este último agrega un salto de línea después de cada llamada. Con el stream, queremos que el texto aparezca continuo, palabra por palabra.

## ¿Qué acaba de pasar?

Desglosemos:

### 1. `streamText` vs `generateText`

El AI SDK tiene dos versiones de cada función:

| Función | Comportamiento |
|---------|----------------|
| `generateText` | Espera a que termine, devuelve todo junto |
| `streamText` | Devuelve un stream, recibes tokens conforme se generan |

¿Por qué importa? **Tiempo percibido**.

Si el modelo tarda 3 segundos en generar una respuesta:
- `generateText`: El usuario ve una pantalla vacía por 3 segundos, luego todo el texto
- `streamText`: El usuario ve texto apareciendo desde el primer 100ms

En UX, esto es la diferencia entre "rápido" y "lento". El streaming hace que tu app se sienta instantánea aunque el tiempo total sea el mismo.

### 2. Tokens: La moneda del LLM

Los modelos de lenguaje no leen palabras, leen **tokens**. Un token es aproximadamente:
- 4 caracteres en inglés
- 2-3 caracteres en español (los acentos cuestan más)

¿Por qué te importa?

**Costo**: Pagas por token. GPT-4o-mini cuesta ~$0.15 por millón de tokens de entrada. Parece barato hasta que tu app tiene 10,000 usuarios enviando prompts largos.

**Límites**: Cada modelo tiene un límite de tokens (context window). GPT-4o tiene 128K tokens. Parece mucho, pero un PDF de 50 páginas puede consumir 30K tokens fácilmente.

**Velocidad**: Más tokens = más tiempo de generación. Un prompt de 1000 tokens se procesa más lento que uno de 100.

### 3. El Context Window

Este es el concepto más importante para construir apps de IA.

El context window es **todo lo que el modelo puede "ver"** en una conversación:
- Tu system prompt
- El historial de mensajes
- El prompt actual
- Los archivos que adjuntes

Cuando excedes el límite, el modelo empieza a "olvidar" el principio de la conversación. Literalmente se trunca.

```
[System prompt: 500 tokens]
[Historial: 50,000 tokens]  <-- esto se trunca primero
[Prompt actual: 200 tokens]
[Respuesta: ~1000 tokens]
```

Por eso verás que apps como ChatGPT "olvidan" lo que dijiste hace 20 mensajes. No es un bug, es el límite del context window.

## Zod: Tu aliado para datos estructurados

Antes de continuar, necesitas conocer **Zod**. Es una biblioteca de validación que se integra perfectamente con TypeScript.

Si aún no lo tienes instalado:

```bash
npm install zod
```

Zod te permite definir "esquemas" que describen la forma de tus datos. El AI SDK usa estos esquemas para obligar al modelo a responder exactamente con la estructura que necesitas.

## Structured Output: El poder real

Generar texto está bien, pero el verdadero poder está en generar **datos estructurados**.

En AI SDK v6, usamos `generateText` con el parámetro `output` para obtener objetos estructurados:

```typescript
import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const recipeSchema = z.object({
  recipe: z.object({
    name: z.string(),
    ingredients: z.array(
      z.object({
        name: z.string(),
        amount: z.string(),
      })
    ),
    steps: z.array(z.string()),
  }),
});

const { output } = await generateText({
  model: openai("gpt-4o-mini"),
  output: Output.object({ schema: recipeSchema }),
  prompt: "Dame la receta de tacos al pastor",
});

console.log(output.recipe.name);
// "Tacos al Pastor"

console.log(output.recipe.ingredients[0]);
// { name: "Carne de cerdo", amount: "500g" }
```

> **Nota sobre versiones:** En versiones anteriores (4.x/5.x) se usaba `generateObject`. En v6, esta función está deprecada. Ahora usamos `generateText` con `Output.object()` que es más flexible y permite combinar texto con structured output.

El modelo devuelve un **objeto TypeScript tipado**, no un string que tengas que parsear.

### ¿Por qué esto es tan valioso?

Piensa en todos los casos donde necesitas extraer información estructurada:

- **Parsear CVs**: Extrae nombre, experiencia, skills en un objeto limpio
- **Analizar sentimiento**: `{ sentiment: "positive", confidence: 0.95 }`
- **Clasificar tickets de soporte**: `{ category: "billing", priority: "high" }`
- **Extraer datos de facturas**: `{ total: 1500, items: [...], date: "2025-01-02" }`

Sin structured output, tendrías que:
1. Pedirle al modelo que responda en JSON
2. Esperar que el JSON sea válido
3. Parsearlo manualmente
4. Validar que tenga los campos correctos

Con `generateObject` + Zod:
1. Defines el schema
2. Recibes el objeto tipado y validado

El modelo está **obligado** a seguir tu schema. Si pides un array de ingredientes, recibes un array de ingredientes.

## Streaming de objetos

Para UX aún mejor, puedes hacer streaming del objeto mientras se genera:

```typescript
import { streamText, Output } from "ai";
import { openai } from "@ai-sdk/openai";

const result = streamText({
  model: openai("gpt-4o-mini"),
  output: Output.object({ schema: recipeSchema }),
  prompt: "Dame una receta de enchiladas",
});

for await (const partialOutput of result.partialOutputStream) {
  console.clear();
  console.log(partialOutput);
}
```

El objeto se va "llenando" en tiempo real:

```javascript
// Iteración 1
{ recipe: { name: "Ench" } }

// Iteración 2
{ recipe: { name: "Enchiladas", ingredients: [] } }

// Iteración 3
{ recipe: { name: "Enchiladas", ingredients: [{ name: "Tortillas" }] } }

// ... hasta completarse
```

En una UI, esto permite mostrar los datos conforme llegan en lugar de esperar a que todo esté listo.

## Una nota sobre costos

Generar structured output usa más tokens que texto plano porque el modelo necesita generar JSON válido con la estructura exacta que pediste.

Para casos simples donde solo necesitas texto, usa `streamText` sin `output`. Reserva el structured output para cuando realmente necesitas datos estructurados.

## Resumen

| Función | Usa cuando... |
|---------|---------------|
| `generateText` | Necesitas texto completo de una vez (scripts, batch) |
| `streamText` | Necesitas texto con buena UX (chat, UI) |
| `generateText` + `Output.object()` | Necesitas datos estructurados de una vez |
| `streamText` + `Output.object()` | Necesitas datos estructurados con buena UX |

> **Tip:** En v6, `Output` tiene varios tipos: `Output.object()`, `Output.array()`, `Output.choice()`, `Output.json()`, y `Output.text()`. Esto te da flexibilidad para combinar texto y structured output en la misma llamada.

---

En el próximo capítulo llevaremos esto a React: conoceremos el hook `useChat`, cómo funciona internamente, y los patrones de UI modernos para construir interfaces de chat.
