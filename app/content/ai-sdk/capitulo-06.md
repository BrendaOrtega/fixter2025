# Capítulo 6: Agentes — Encapsulando la Inteligencia

En el capítulo anterior construiste un chat con tools. El modelo llama herramientas, el SDK las ejecuta automáticamente, el modelo genera respuesta. Todo funciona.

Pero hay un problema práctico: cada vez que quieres usar esa configuración, tienes que repetir todo:

```typescript
// Cada llamada requiere toda la configuración
const result = streamText({
  model: openai('gpt-4o-mini'),
  system: `Eres el asistente de Distribuidora Industrial del Bajío...`,
  messages,
  tools: {
    consultarInventario,
    buscarProductos,
    verificarPedido,
    generarCotizacion,
  },
  stopWhen: stepCountIs(5),
});
```

Si tienes múltiples endpoints que usan el mismo "asistente", estás duplicando código. Si cambias el system prompt, tienes que actualizarlo en varios lugares.

**ToolLoopAgent** resuelve esto: encapsula modelo, instrucciones y herramientas en un objeto reutilizable.

## Código Primero

```typescript
import { ToolLoopAgent, stepCountIs, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

// Tools
const consultarInventario = tool({
  description: 'Consulta stock y precio de un producto',
  inputSchema: z.object({
    codigo: z.string().describe('Código SKU del producto')
  }),
  execute: async ({ codigo }) => {
    return { codigo, nombre: 'Válvula Industrial 2"', stock: 45, precio: 1850 };
  }
});

const buscarProductos = tool({
  description: 'Busca productos por término',
  inputSchema: z.object({
    termino: z.string()
  }),
  execute: async ({ termino }) => {
    return [
      { codigo: 'VAL-001', nombre: 'Válvula Industrial 2"', precio: 1850 },
      { codigo: 'VAL-002', nombre: 'Válvula de Control 3"', precio: 3200 },
    ];
  }
});

// El agente encapsula todo
const asistenteDistribuidora = new ToolLoopAgent({
  model: openai('gpt-4o-mini'),
  instructions: `Eres el asistente de Distribuidora Industrial del Bajío.
    Ayudas a clientes a encontrar productos y verificar disponibilidad.
    Precios siempre en pesos mexicanos.
    Sé profesional y directo.`,
  tools: {
    consultarInventario,
    buscarProductos,
  },
});

// Ahora usar es simple
const { text, steps } = await asistenteDistribuidora.generate({
  prompt: '¿Tienen válvulas industriales de 2 pulgadas?'
});

console.log(text);
// "Sí, contamos con la Válvula Industrial 2" (SKU: VAL-001) a $1,850 MXN. Hay 45 unidades en stock."
console.log(`Completado en ${steps.length} pasos`);
```

Define una vez, usa en cualquier parte.

## ¿Qué es un Agente?

Un agente tiene tres componentes:

1. **LLM** — Procesa entrada y decide qué hacer
2. **Herramientas** — Extienden capacidades más allá del texto
3. **Loop** — Ejecuta herramientas hasta completar la tarea

`ToolLoopAgent` maneja los tres automáticamente. El loop continúa hasta que:
- El modelo genera texto sin llamar tools (tarea completa)
- Un tool requiere aprobación (`needsApproval`)
- Se alcanza el límite de pasos (default: 20)
- Un tool no tiene función `execute`

## Parámetros del Constructor

```typescript
const agente = new ToolLoopAgent({
  // === REQUERIDOS ===
  model: openai('gpt-4o-mini'),      // Provider object, no string

  // === CONFIGURACIÓN ===
  instructions: 'Tu prompt de sistema',  // Antes era 'system'
  tools: { tool1, tool2 },

  // === CONTROL DE LOOP ===
  stopWhen: stepCountIs(10),         // Default: stepCountIs(20)

  // === SELECCIÓN DE TOOLS ===
  toolChoice: 'auto',                // 'auto' | 'required' | 'none' | { type: 'tool', toolName: 'x' }
  activeTools: ['tool1'],            // Limita cuáles están disponibles

  // === CALLBACKS ===
  onStepFinish: ({ stepType, usage }) => {
    console.log(`Paso: ${stepType}, Tokens: ${usage.totalTokens}`);
  },
  onFinish: ({ steps, result }) => {
    console.log(`Completado en ${steps.length} pasos`);
  },

  // === PARÁMETROS DEL MODELO ===
  temperature: 0.7,
  maxOutputTokens: 1000,
});
```

### El cambio de system a instructions

En AI SDK v6, el parámetro se renombró:

| v5 | v6 |
|----|-----|
| `system: '...'` | `instructions: '...'` |

Esto refleja mejor el propósito: son instrucciones para el agente, no configuración del sistema.

## Métodos: generate y stream

### generate() — Ejecución Completa

```typescript
const { text, steps, finishReason } = await agente.generate({
  prompt: '¿Cuál es el precio del motor trifásico de 5HP?'
});

// O con historial de mensajes
const result = await agente.generate({
  messages: [
    { role: 'user', content: 'Buenos días' },
    { role: 'assistant', content: 'Buenos días, ¿en qué puedo ayudarle?' },
    { role: 'user', content: 'Necesito cotización de bombas sumergibles' }
  ]
});
```

El objeto de retorno incluye:
- `text` — Respuesta final del agente
- `steps` — Array con cada paso ejecutado
- `finishReason` — Por qué terminó ('stop', 'tool-calls', etc.)

### stream() — Respuesta en Tiempo Real

```typescript
const result = agente.stream({
  prompt: 'Dame un resumen de los productos más vendidos'
});

// Stream de texto
for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

Para APIs web:

```typescript
// app/routes/api.chat.ts
import { asistenteDistribuidora } from '~/agents/distribuidora';

export async function action({ request }: Route.ActionArgs) {
  const { messages } = await request.json();

  const result = asistenteDistribuidora.stream({ messages });

  return result.toUIMessageStreamResponse();
}
```

## Control de Loop: stopWhen

Por defecto, el agente ejecuta hasta 20 pasos. Personaliza con `stopWhen`:

### Límite de pasos

```typescript
import { stepCountIs } from 'ai';

const agente = new ToolLoopAgent({
  model: openai('gpt-4o-mini'),
  tools: { ... },
  stopWhen: stepCountIs(5),  // Máximo 5 pasos
});
```

### Parar en tool específico

```typescript
import { hasToolCall } from 'ai';

const agente = new ToolLoopAgent({
  model: openai('gpt-4o-mini'),
  tools: { buscar, confirmarCompra },
  stopWhen: hasToolCall('confirmarCompra'),  // Para cuando llama confirmarCompra
});
```

### Múltiples condiciones

```typescript
stopWhen: [
  stepCountIs(10),
  hasToolCall('escalarAHumano')
]
// Para cuando CUALQUIERA se cumple
```

### Condición personalizada

```typescript
// Parar si encuentra la respuesta
const encontroRespuesta = ({ steps }) => {
  return steps.some(step =>
    step.text?.includes('PRECIO FINAL:')
  ) ?? false;
};

const agente = new ToolLoopAgent({
  model: openai('gpt-4o-mini'),
  tools: { ... },
  stopWhen: encontroRespuesta
});
```

### Control de presupuesto

```typescript
// Parar si excede presupuesto de tokens
const presupuestoExcedido = ({ steps }) => {
  const totalTokens = steps.reduce(
    (acc, step) => acc + (step.usage?.totalTokens ?? 0),
    0
  );
  // Límite: 10,000 tokens
  return totalTokens > 10000;
};
```

## prepareStep: Modificación Dinámica

`prepareStep` se ejecuta **antes de cada paso**. Permite modificar configuración sobre la marcha.

### Cambiar modelo según complejidad

```typescript
const agente = new ToolLoopAgent({
  model: openai('gpt-4o-mini'),
  tools: { ... },

  prepareStep: async ({ stepNumber, messages }) => {
    // Si llevamos muchos pasos, usar modelo más potente
    if (stepNumber > 3) {
      return { model: openai('gpt-4o') };
    }
    return {};
  }
});
```

### Limitar herramientas por fase

```typescript
prepareStep: async ({ stepNumber }) => {
  if (stepNumber <= 2) {
    // Fase 1: Solo buscar
    return { activeTools: ['buscar'], toolChoice: 'required' };
  }
  if (stepNumber <= 4) {
    // Fase 2: Analizar
    return { activeTools: ['analizar'] };
  }
  // Fase 3: Concluir
  return { activeTools: ['resumir'], toolChoice: 'required' };
}
```

### Gestión de contexto largo

```typescript
prepareStep: async ({ messages }) => {
  if (messages.length > 20) {
    // Mantener solo el primer mensaje (sistema) y los últimos 10
    return {
      messages: [messages[0], ...messages.slice(-10)]
    };
  }
  return {};
}
```

## Inspeccionando los Pasos

Después de `generate()`, puedes ver exactamente qué hizo el agente:

```typescript
const { text, steps } = await agente.generate({
  prompt: 'Busca motores trifásicos y dame el más económico'
});

for (const step of steps) {
  console.log('---');
  console.log('Número:', step.stepNumber);
  console.log('Tipo:', step.stepType);

  if (step.toolCalls) {
    for (const call of step.toolCalls) {
      console.log('Tool:', call.toolName);
      console.log('Input:', JSON.stringify(call.args));
      console.log('Output:', JSON.stringify(call.result));
    }
  }

  if (step.text) {
    console.log('Texto:', step.text);
  }

  console.log('Tokens:', step.usage?.totalTokens);
}
```

Output típico:

```
---
Número: 1
Tipo: tool_call
Tool: buscarProductos
Input: {"termino":"motores trifásicos"}
Output: [{"codigo":"MOT-001","nombre":"Motor 3HP","precio":8500},{"codigo":"MOT-002","nombre":"Motor 5HP","precio":12800}]
Tokens: 156

---
Número: 2
Tipo: text_generation
Texto: El motor más económico es el Motor 3HP (MOT-001) a $8,500 MXN.
Tokens: 89
```

## Tipado con InferAgentUIMessage

Para type-safety completo en el frontend:

```typescript
// agents/distribuidora.ts
import { ToolLoopAgent, InferAgentUIMessage } from 'ai';

export const asistenteDistribuidora = new ToolLoopAgent({
  model: openai('gpt-4o-mini'),
  instructions: '...',
  tools: { consultarInventario, buscarProductos },
});

// Exportar el tipo inferido
export type DistribuidoraMessage = InferAgentUIMessage<typeof asistenteDistribuidora>;
```

```typescript
// components/Chat.tsx
'use client';

import { useChat } from '@ai-sdk/react';
import type { DistribuidoraMessage } from '~/agents/distribuidora';

export function Chat() {
  const { messages } = useChat<DistribuidoraMessage>();

  // TypeScript sabe exactamente qué tools existen y sus tipos
  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>
          {m.parts.map((part, i) => {
            if (part.type === 'text') {
              return <span key={i}>{part.text}</span>;
            }
            // TypeScript conoce los tools disponibles
            if (part.type === 'tool-consultarInventario') {
              return <ProductoCard key={i} data={part.output} />;
            }
            return null;
          })}
        </div>
      ))}
    </div>
  );
}
```

## Caso Práctico: Agente de Cobranza

```typescript
// agents/cobranza.ts
import { ToolLoopAgent, stepCountIs, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { db } from '~/lib/db';

const buscarCliente = tool({
  description: 'Busca cliente por nombre o RFC',
  inputSchema: z.object({
    termino: z.string()
  }),
  execute: async ({ termino }) => {
    const cliente = await db.cliente.findFirst({
      where: {
        OR: [
          { nombre: { contains: termino, mode: 'insensitive' } },
          { rfc: { contains: termino, mode: 'insensitive' } }
        ]
      }
    });
    if (!cliente) return { encontrado: false };
    return {
      encontrado: true,
      id: cliente.id,
      nombre: cliente.nombre,
      rfc: cliente.rfc,
      saldoPendiente: cliente.saldoPendiente
    };
  }
});

const obtenerFacturas = tool({
  description: 'Obtiene facturas pendientes de un cliente',
  inputSchema: z.object({
    clienteId: z.string()
  }),
  execute: async ({ clienteId }) => {
    const facturas = await db.factura.findMany({
      where: { clienteId, estatus: 'PENDIENTE' },
      select: { folio: true, monto: true, vencimiento: true }
    });
    return facturas.map(f => ({
      folio: f.folio,
      monto: `$${f.monto.toLocaleString()} MXN`,
      vencimiento: f.vencimiento.toLocaleDateString('es-MX'),
      diasVencido: Math.floor((Date.now() - f.vencimiento.getTime()) / 86400000)
    }));
  }
});

const enviarRecordatorio = tool({
  description: 'Envía recordatorio de pago por correo',
  inputSchema: z.object({
    clienteId: z.string(),
    facturas: z.array(z.string()).describe('Folios de facturas'),
    tono: z.enum(['amable', 'formal', 'urgente'])
  }),
  execute: async ({ clienteId, facturas, tono }) => {
    // Aquí enviarías el correo real
    console.log(`Enviando recordatorio ${tono} a ${clienteId}`);
    return { enviado: true, timestamp: new Date().toISOString() };
  }
});

export const agenteCobranza = new ToolLoopAgent({
  model: openai('gpt-4o-mini'),

  instructions: `Eres el asistente de cobranza de una distribuidora.

Tu trabajo:
- Buscar información de clientes
- Identificar facturas vencidas
- Enviar recordatorios de pago

Reglas:
- Siempre busca el cliente primero
- Usa tono amable para facturas recién vencidas (< 15 días)
- Usa tono formal para 15-30 días vencidas
- Usa tono urgente para > 30 días vencidas
- Reporta montos en pesos mexicanos`,

  tools: {
    buscarCliente,
    obtenerFacturas,
    enviarRecordatorio,
  },

  stopWhen: stepCountIs(8),

  onStepFinish({ stepType, toolCalls }) {
    if (toolCalls?.length) {
      console.log(`[Cobranza] ${toolCalls[0].toolName}`);
    }
  },

  onFinish({ steps }) {
    console.log(`[Cobranza] Completado en ${steps.length} pasos`);
  }
});
```

Uso:

```typescript
// Una sola línea para ejecutar tarea compleja
const { text } = await agenteCobranza.generate({
  prompt: 'Manda recordatorio a Constructora Hernández por sus facturas vencidas'
});

// El agente automáticamente:
// 1. Busca al cliente
// 2. Obtiene sus facturas pendientes
// 3. Determina el tono según días vencidos
// 4. Envía el recordatorio
// 5. Genera respuesta confirmando
```

## Resumen

| Concepto | Qué aprendiste |
|----------|----------------|
| `ToolLoopAgent` | Encapsula modelo, instrucciones y tools en objeto reutilizable |
| `instructions` | Prompt de sistema (antes `system`) |
| `generate()` | Ejecuta y retorna resultado completo |
| `stream()` | Ejecuta con respuesta en tiempo real |
| `stopWhen` | Condiciones de parada (default: 20 pasos) |
| `stepCountIs(n)` | Para después de n pasos |
| `hasToolCall(name)` | Para cuando se llama un tool específico |
| `prepareStep` | Modifica configuración antes de cada paso |
| `onStepFinish` | Callback después de cada paso |
| `onFinish` | Callback al completar |
| `InferAgentUIMessage` | Infiere tipos para frontend |

### ¿Cuándo usar ToolLoopAgent?

| Usa funciones core (streamText) | Usa ToolLoopAgent |
|--------------------------------|-------------------|
| Configuración única | Configuración reutilizada |
| Control muy específico | Comportamiento estándar |
| Integración con código existente | Nuevo desarrollo |

El agente es una abstracción de conveniencia. Por debajo usa las mismas funciones core. Si necesitas control total, siempre puedes usar `generateText` o `streamText` directamente.

---

En el próximo capítulo exploraremos **Embeddings y RAG**: cómo darle a tu agente acceso a documentos y bases de conocimiento para respuestas más precisas y contextuales.
