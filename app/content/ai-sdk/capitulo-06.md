# Capítulo 6: Tools — Dándole Manos al Modelo

En el capítulo anterior aprendiste a obtener datos estructurados del modelo. Pero hay un límite: solo puede generar información que ya "conoce".

¿Qué pasa cuando necesitas que consulte tu base de datos? ¿Que busque productos en tu inventario? ¿Que procese una devolución?

Necesitas **tools** — herramientas que el modelo puede ejecutar.

## Código Primero

```typescript
import { tool } from 'ai';
import { z } from 'zod';

const consultarInventario = tool({
  description: 'Consulta la disponibilidad de un producto en el inventario',
  inputSchema: z.object({
    producto: z.string().describe('Nombre o código del producto')
  }),
  execute: async ({ producto }) => {
    const inventario = {
      'taladro-dewalt': { nombre: 'Taladro DeWalt 20V', stock: 8, precio: 2899 },
      'pintura-comex': { nombre: 'Pintura Comex Vinimex 19L', stock: 23, precio: 1250 },
    };

    const item = inventario[producto.toLowerCase()];
    if (!item) return { encontrado: false, mensaje: 'Producto no encontrado' };

    return {
      encontrado: true,
      nombre: item.nombre,
      stock: item.stock,
      precio: `$${item.precio} MXN`
    };
  }
});
```

Un tool tiene tres partes:
- `description`: Le dice al modelo cuándo usarlo
- `inputSchema`: Parámetros tipados con Zod
- `execute`: La función que corre cuando el modelo lo llama

## Cambios en AI SDK v6

| v4/v5 | v6 |
|-------|-----|
| `parameters: z.object({...})` | `inputSchema: z.object({...})` |
| `maxSteps: 5` | `stopWhen: stepCountIs(5)` |
| Aprobación manual | `needsApproval: true` built-in |
| Sin control de output | `toModelOutput` para reducir tokens |

```bash
npx @ai-sdk/codemod v6
```

## El Comportamiento por Defecto

Por defecto, `streamText` hace **UNA sola generación**. Si el modelo llama un tool, el flujo termina ahí:

```
Usuario: "¿Tienen taladros DeWalt?"
     ↓
Modelo: "Necesito usar consultarInventario"
     ↓
SDK ejecuta: execute({ producto: 'taladro-dewalt' })
     ↓
Tool retorna: { stock: 8, precio: '$2,899 MXN' }
     ↓
FIN. El modelo NO genera texto de respuesta.
```

El cliente recibe el tool output, pero **no hay respuesta textual**.

## stopWhen: Habilitando Multi-Step

Para que el modelo use el resultado y genere respuesta, necesitas `stopWhen`:

```typescript
// app/routes/api.ferreteria.ts
import { streamText, stepCountIs, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const consultarInventario = tool({
  description: 'Consulta stock y precio de un producto',
  inputSchema: z.object({
    producto: z.string()
  }),
  execute: async ({ producto }) => {
    return { nombre: producto, stock: 15, precio: '$299 MXN' };
  }
});

const buscarProductos = tool({
  description: 'Busca productos por término',
  inputSchema: z.object({
    termino: z.string(),
    categoria: z.enum(['herramientas', 'plomeria', 'electricidad']).optional()
  }),
  execute: async ({ termino }) => {
    return [
      { nombre: 'Taladro DeWalt', precio: '$2,899 MXN' },
      { nombre: 'Taladro Makita', precio: '$2,450 MXN' },
    ];
  }
});

export async function action({ request }) {
  const { messages } = await request.json();

  const result = streamText({
    model: openai('gpt-4o-mini'),
    system: `Eres el asistente de Ferretería San José.
             Ayudas a clientes a encontrar productos.
             Precios en pesos mexicanos.`,
    messages,
    tools: { consultarInventario, buscarProductos },
    stopWhen: stepCountIs(3),  // CRÍTICO: sin esto no hay respuesta
  });

  return result.toUIMessageStreamResponse();
}
```

`stepCountIs(3)` significa: "continúa hasta 3 pasos máximo". Ahora el flujo es:

```
Usuario: "¿Tienen taladros DeWalt?"
     ↓
SDK ejecuta el tool
     ↓
stopWhen evalúa: ¿seguimos? Sí
     ↓
Modelo genera: "Sí, tenemos el Taladro DeWalt 20V a $2,899 MXN"
```

## Renderizando Tools en el Cliente

Los tool calls aparecen en `message.parts`:

```typescript
import { useChat } from '@ai-sdk/react';
import { useState } from 'react';

export default function FerreteriaChat() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status } = useChat();

  return (
    <div className="max-w-2xl mx-auto p-4">
      {messages.map((m) => (
        <div key={m.id} className={m.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'}>
          {m.parts.map((part, i) => {
            if (part.type === 'text') {
              return <span key={i}>{part.text}</span>;
            }

            if (part.type === 'tool-consultarInventario') {
              if (part.state === 'input-streaming') {
                return <div key={i}>⚙️ Consultando inventario...</div>;
              }
              if (part.state === 'output-available') {
                return (
                  <div key={i} className="bg-white border rounded p-3">
                    {part.output.nombre} - Stock: {part.output.stock}
                  </div>
                );
              }
            }

            return null;
          })}
        </div>
      ))}

      <form onSubmit={(e) => {
        e.preventDefault();
        sendMessage({ text: input });
        setInput('');
      }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} />
        <button disabled={status === 'streaming'}>Enviar</button>
      </form>
    </div>
  );
}
```

Estados de un tool call:
- `input-streaming`: Recibiendo parámetros
- `output-available`: Tool terminó, resultado listo
- `approval-requested`: Esperando aprobación humana

## Human-in-the-Loop: needsApproval

`needsApproval` sirve para confirmar antes de ejecutar acciones sensibles:

```typescript
const procesarDevolucion = tool({
  description: 'Procesa la devolución de un producto',
  inputSchema: z.object({
    codigoVenta: z.string(),
    montoReembolso: z.number()
  }),
  // Devoluciones mayores a $500 requieren confirmación
  needsApproval: async ({ montoReembolso }) => montoReembolso > 500,
  execute: async ({ codigoVenta, montoReembolso }) => {
    return {
      exito: true,
      mensaje: `Reembolso de $${montoReembolso} MXN procesado`,
      referencia: `DEV-${Date.now()}`
    };
  }
});
```

En el cliente, manejas la aprobación:

```typescript
const { addToolApprovalResponse } = useChat();

// En el render cuando part.state === 'approval-requested':
<div className="border-2 border-yellow-400 bg-yellow-50 p-4">
  <p>¿Confirmar devolución de ${part.input.montoReembolso} MXN?</p>
  <button onClick={() => addToolApprovalResponse({
    id: part.approval.id,
    approved: true
  })}>
    Aprobar
  </button>
  <button onClick={() => addToolApprovalResponse({
    id: part.approval.id,
    approved: false
  })}>
    Cancelar
  </button>
</div>
```

## Optimización: toModelOutput

Cuando un tool retorna mucha data, el modelo consume tokens innecesarios:

```typescript
const buscarProductos = tool({
  description: 'Busca productos en el catálogo',
  inputSchema: z.object({ termino: z.string() }),
  execute: async ({ termino }) => {
    const productos = await db.producto.findMany({
      where: { nombre: { contains: termino }},
      include: { imagenes: true, variantes: true }  // Mucha data
    });
    return productos;  // Objeto completo para el cliente
  },

  // Lo que recibe el modelo (reducido)
  toModelOutput: async (productos) => {
    return productos.map(p =>
      `- ${p.nombre}: $${p.precio} MXN`
    ).join('\n');
  }
});
```

- `execute` retorna data completa → El cliente muestra cards con imágenes
- `toModelOutput` retorna resumen → El modelo genera respuesta sin gastar tokens extra

## Preview: ToolLoopAgent

En el próximo capítulo veremos agentes en detalle. La diferencia clave:

| `streamText` + tools | `ToolLoopAgent` |
|---------------------|-----------------|
| 1 paso por defecto | 20 pasos por defecto |
| Necesitas `stopWhen` siempre | Continúa automático |
| Chat interactivo | Tareas autónomas |

```typescript
import { ToolLoopAgent, stepCountIs } from 'ai';

const asistente = new ToolLoopAgent({
  model: openai('gpt-4o-mini'),
  instructions: 'Eres el asistente de Ferretería San José.',
  tools: { consultarInventario, buscarProductos },
  stopWhen: stepCountIs(8),  // Opcional, default es 20
});

const { text, steps } = await asistente.generate({
  prompt: 'Compré un taladro (venta #FER-2025-001) y no funciona. Quiero devolverlo.'
});

console.log(`Resuelto en ${steps.length} pasos`);
```

El agente se detiene cuando:
1. La tarea está completada
2. Un tool requiere aprobación
3. Se alcanza el límite de pasos

## Callbacks y Monitoreo

```typescript
const result = streamText({
  model: openai('gpt-4o-mini'),
  messages,
  tools: { consultarInventario, buscarProductos },
  stopWhen: stepCountIs(5),

  onStepFinish({ stepType, usage }) {
    console.log(`Paso: ${stepType}, Tokens: ${usage.totalTokens}`);
  },

  onFinish({ text, usage, steps }) {
    console.log(`Completado en ${steps.length} pasos`);
    console.log(`Tokens totales: ${usage.totalTokens}`);
  }
});
```

## Resumen

| Concepto | Qué aprendiste |
|----------|----------------|
| `tool()` | Función que define una herramienta ejecutable |
| `inputSchema` | Parámetros tipados con Zod (antes `parameters`) |
| `execute` | La función que corre cuando el modelo llama el tool |
| `stopWhen` | **CRÍTICO** — sin esto, no hay respuesta después del tool |
| `stepCountIs(n)` | Helper para limitar pasos (reemplaza `maxSteps`) |
| `needsApproval` | Requiere confirmación humana antes de ejecutar |
| `toModelOutput` | Reduce tokens enviados al modelo |
| `part.state` | Estados: `input-streaming`, `output-available`, `approval-requested` |

### Tools vs Structured Output

| Usar Tools cuando... | Usar Structured Output cuando... |
|---------------------|----------------------------------|
| Necesitas ejecutar acciones | Solo necesitas datos tipados |
| Consultas externas (DB, API) | Parsear o clasificar texto |
| El modelo decide qué hacer | Tú sabes qué estructura quieres |
| Flujo conversacional | Respuesta única estructurada |

---

En el próximo capítulo veremos **Agentes**: cuando el modelo toma el control completo del loop, decide autónomamente qué herramientas usar, y resuelve tareas complejas sin intervención.
