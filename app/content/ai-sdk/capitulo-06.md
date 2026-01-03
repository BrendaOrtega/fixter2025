# Capítulo 6: Tools — Dándole Manos al Modelo

En el capítulo anterior aprendiste a obtener datos estructurados del modelo. Pero hay un límite: solo puede generar información que ya "conoce".

¿Qué pasa cuando necesitas que consulte tu base de datos? ¿Que busque productos en tu inventario? ¿Que procese una devolución?

Necesitas **tools** — herramientas que el modelo puede ejecutar.

## Código Primero

Abre tu proyecto y crea este tool:

```typescript
import { tool } from 'ai';
import { z } from 'zod';

const consultarInventario = tool({
  description: 'Consulta la disponibilidad de un producto en el inventario',
  inputSchema: z.object({
    producto: z.string().describe('Nombre o código del producto')
  }),
  execute: async ({ producto }) => {
    // Simula consulta a base de datos
    const inventario = {
      'tornillo-3/8': { nombre: 'Tornillo 3/8"', stock: 450, precio: 2.50 },
      'taladro-dewalt': { nombre: 'Taladro DeWalt 20V', stock: 8, precio: 2899 },
      'pintura-comex': { nombre: 'Pintura Comex Vinimex 19L', stock: 23, precio: 1250 },
    };

    const item = inventario[producto.toLowerCase()];
    if (!item) return { encontrado: false, mensaje: 'Producto no encontrado' };

    return {
      encontrado: true,
      nombre: item.nombre,
      stock: item.stock,
      precio: `$${item.precio} MXN`,
      disponible: item.stock > 0
    };
  }
});
```

Eso es un tool. Tiene tres partes:
- `description`: Le dice al modelo cuándo usarlo
- `inputSchema`: Los parámetros que acepta (tipados con Zod)
- `execute`: La función que corre cuando el modelo lo llama

## Cambios en AI SDK v6

Antes de continuar, esto es importante. En AI SDK v6 cambiaron varias cosas:

| v4/v5 | v6 |
|-------|-----|
| `parameters: z.object({...})` | `inputSchema: z.object({...})` |
| `maxSteps: 5` | `stopWhen: stepCountIs(5)` |
| Aprobación manual | `needsApproval: true` built-in |
| Sin control de output | `toModelOutput` para reducir tokens |

Si vienes de versiones anteriores, el codemod te ayuda:

```bash
npx @ai-sdk/codemod v6
```

## El Comportamiento por Defecto: Una Sola Generación

Esto es **crítico** y muchos tutoriales lo explican mal.

Por defecto, `streamText` hace **UNA sola generación**. Si el modelo decide llamar un tool, el flujo termina ahí:

```
1. Usuario: "¿Tienen taladros DeWalt?"
          ↓
2. Modelo decide: "Necesito usar consultarInventario"
          ↓
3. SDK ejecuta: execute({ producto: 'taladro-dewalt' })
          ↓
4. Tool retorna: { stock: 8, precio: '$2,899 MXN' }
          ↓
5. FIN. El modelo NO genera texto de respuesta.
```

El cliente recibe el tool output, pero **no hay respuesta textual**. El modelo no "continúa" automáticamente.

## stopWhen: Habilitando Multi-Step

Para que el modelo use el resultado del tool y genere una respuesta, necesitas `stopWhen`:

```typescript
// app/routes/api.ferreteria.ts
import { streamText, stepCountIs } from 'ai';
import { openai } from '@ai-sdk/openai';
import { tool } from 'ai';
import { z } from 'zod';
import type { Route } from './+types/api.ferreteria';

const consultarInventario = tool({
  description: 'Consulta la disponibilidad de un producto en el inventario',
  inputSchema: z.object({
    producto: z.string().describe('Nombre o código del producto')
  }),
  execute: async ({ producto }) => {
    return { nombre: producto, stock: 15, precio: '$299 MXN' };
  }
});

const buscarProductos = tool({
  description: 'Busca productos por categoría o término',
  inputSchema: z.object({
    termino: z.string(),
    categoria: z.enum(['herramientas', 'plomeria', 'electricidad', 'pintura']).optional()
  }),
  execute: async ({ termino, categoria }) => {
    return [
      { nombre: 'Taladro DeWalt', precio: '$2,899 MXN' },
      { nombre: 'Taladro Makita', precio: '$2,450 MXN' },
    ];
  }
});

export async function action({ request }: Route.ActionArgs) {
  const { messages } = await request.json();

  const result = streamText({
    model: openai('gpt-4o-mini'),
    system: `Eres el asistente de Ferretería San José.
             Ayudas a clientes a encontrar productos y verificar disponibilidad.
             Precios siempre en pesos mexicanos.
             Sé amable y directo.`,
    messages,
    tools: {
      consultarInventario,
      buscarProductos,
    },
    // SIN ESTO, el modelo NO responde después del tool
    stopWhen: stepCountIs(3),
  });

  return result.toUIMessageStreamResponse();
}
```

`stepCountIs(3)` significa: "continúa hasta 3 pasos máximo". Un paso típico es:
1. Modelo llama tool
2. Modelo recibe resultado y genera respuesta (o llama otro tool)
3. Etc.

## El Flujo Real con stopWhen

Ahora sí, cuando el usuario pregunta "¿Tienen taladros DeWalt?":

```
1. Usuario: "¿Tienen taladros DeWalt?"
          ↓
2. Modelo decide: "Necesito usar consultarInventario"
          ↓
3. SDK ejecuta: execute({ producto: 'taladro-dewalt' })
          ↓
4. Tool retorna: { nombre: 'Taladro DeWalt 20V', stock: 8, precio: '$2,899 MXN' }
          ↓
5. stopWhen evalúa: ¿seguimos? Sí, no hemos llegado a 3 pasos
          ↓
6. Modelo recibe resultado y genera respuesta:
   "Sí, tenemos el Taladro DeWalt 20V. Hay 8 unidades disponibles a $2,899 MXN."
```

En DevTools → Network → Response, verás el protocolo:

```
data: {"type":"tool-input-start","toolName":"consultarInventario"}
data: {"type":"tool-input-delta","delta":"{\"producto\":\"taladro-dewalt\"}"}
data: {"type":"tool-output-available","output":{...}}
data: {"type":"text-delta","delta":"Sí, tenemos el Taladro DeWalt 20V..."}
```

**Sin `stopWhen`**, solo verías hasta `tool-output-available`. Sin `text-delta`.

## Multi-Step: Cuando el Modelo Necesita Más

A veces una pregunta requiere múltiples consultas.

Usuario: "Necesito pintura blanca para exterior y brochas. ¿Qué tienen y cuánto me sale?"

El modelo necesita:
1. Buscar pinturas para exterior
2. Buscar brochas
3. Posiblemente verificar stock
4. Calcular total

Con `stopWhen` controlas cuántos pasos permite:

```typescript
import { streamText, stepCountIs } from 'ai';

const result = streamText({
  model: openai('gpt-4o-mini'),
  messages,
  tools: { consultarInventario, buscarProductos },
  stopWhen: stepCountIs(5),  // Máximo 5 pasos

  onStepFinish({ stepType, usage }) {
    console.log(`Paso completado: ${stepType}`);
    console.log(`Tokens usados: ${usage.totalTokens}`);
  },
});
```

El modelo ejecutará tools en secuencia hasta completar la tarea o alcanzar el límite.

## Renderizando Tools en el Cliente

En el frontend, los tool calls aparecen en `message.parts`:

```typescript
// app/routes/ferreteria.tsx
import { useChat, DefaultChatTransport } from '@ai-sdk/react';
import { useState } from 'react';

export default function FerreteriaChat() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/ferreteria' }),
  });

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Ferretería San José</h1>

      <div className="space-y-4 mb-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`p-3 rounded-lg ${
              m.role === 'user' ? 'bg-blue-100 ml-8' : 'bg-gray-100 mr-8'
            }`}
          >
            {m.parts.map((part, i) => {
              // Texto normal
              if (part.type === 'text') {
                return <span key={i}>{part.text}</span>;
              }

              // Tool: consultarInventario
              if (part.type === 'tool-consultarInventario') {
                if (part.state === 'input-streaming') {
                  return (
                    <div key={i} className="flex items-center gap-2 text-gray-500">
                      <span className="animate-spin">⚙️</span>
                      Consultando inventario...
                    </div>
                  );
                }
                if (part.state === 'output-available' && part.output.encontrado) {
                  return (
                    <div key={i} className="bg-white border rounded p-3 my-2">
                      <div className="font-semibold">{part.output.nombre}</div>
                      <div className="text-sm text-gray-600">
                        Stock: {part.output.stock} | {part.output.precio}
                      </div>
                    </div>
                  );
                }
              }

              // Tool: buscarProductos
              if (part.type === 'tool-buscarProductos') {
                if (part.state === 'output-available') {
                  return (
                    <div key={i} className="grid gap-2 my-2">
                      {part.output.map((prod, j) => (
                        <div key={j} className="bg-white border rounded p-2">
                          {prod.nombre} - {prod.precio}
                        </div>
                      ))}
                    </div>
                  );
                }
              }

              return null;
            })}
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) {
            sendMessage({ text: input });
            setInput('');
          }
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pregunta por productos..."
          className="flex-1 p-2 border rounded"
        />
        <button
          type="submit"
          disabled={status === 'streaming'}
          className="px-4 py-2 bg-orange-500 text-white rounded disabled:opacity-50"
        >
          {status === 'streaming' ? '...' : 'Enviar'}
        </button>
      </form>
    </div>
  );
}
```

Los estados de un tool call son:
- `input-streaming`: Recibiendo los parámetros
- `output-available`: El tool terminó, resultado listo
- `approval-requested`: Esperando aprobación (lo veremos a continuación)

## Human-in-the-Loop: needsApproval

`needsApproval` sirve para confirmar que el modelo **interpretó correctamente** antes de ejecutar.

Ejemplo real: el cliente dice "quiero los materiales para el baño". El modelo infiere productos y cantidades. Antes de generar la cotización formal (que compromete precios), el vendedor confirma los detalles:

```typescript
const generarCotizacion = tool({
  description: 'Genera cotización formal para el cliente',
  inputSchema: z.object({
    cliente: z.string(),
    productos: z.array(z.object({
      nombre: z.string(),
      cantidad: z.number(),
      precioUnitario: z.number()
    })),
    total: z.number(),
    vigenciaDias: z.number()
  }),
  // Cotizaciones grandes requieren confirmación
  needsApproval: async ({ total }) => total > 5000,
  execute: async ({ cliente, productos, total, vigenciaDias }) => {
    const cotizacion = await db.cotizacion.create({
      data: { cliente, productos, total, vigenciaDias }
    });
    return { folio: cotizacion.folio, pdf: `/cotizaciones/${cotizacion.id}.pdf` };
  }
});
```

La UI muestra: "¿Generar cotización por $12,450 MXN (15 productos)?" — el vendedor confirma que los productos inferidos son correctos antes de comprometer precios.

### Manejando Aprobaciones en el Cliente

Cuando un tool requiere aprobación, el estado es `approval-requested`:

```typescript
const { messages, addToolApprovalResponse } = useChat({
  transport: new DefaultChatTransport({ api: '/api/ferreteria' }),
});

// En el render:
{m.parts.map((part, i) => {
  if (part.type === 'tool-generarCotizacion') {
    if (part.state === 'approval-requested') {
      return (
        <div key={i} className="border-2 border-yellow-400 bg-yellow-50 rounded p-4 my-2">
          <div className="font-semibold text-yellow-800 mb-2">
            Confirmar cotización
          </div>
          <div className="text-sm mb-3">
            <p>Cliente: {part.input.cliente}</p>
            <p>Productos: {part.input.productos.length}</p>
            <p className="font-bold">Total: ${part.input.total.toLocaleString()} MXN</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => addToolApprovalResponse({
                id: part.approval.id,
                approved: true
              })}
              className="px-4 py-2 bg-green-500 text-white rounded"
            >
              Generar cotización
            </button>
            <button
              onClick={() => addToolApprovalResponse({
                id: part.approval.id,
                approved: false
              })}
              className="px-4 py-2 bg-gray-500 text-white rounded"
            >
              Cancelar
            </button>
          </div>
        </div>
      );
    }
  }

  return null;
})}
```

## Optimización: toModelOutput

Cuando un tool retorna mucha data, el modelo consume tokens innecesarios.

Ejemplo: búsqueda de productos retorna objetos con imágenes, variantes, descripciones largas. El modelo no necesita todo eso para responder.

```typescript
const buscarProductos = tool({
  description: 'Busca productos en el catálogo',
  inputSchema: z.object({
    termino: z.string(),
    limite: z.number().default(10)
  }),
  execute: async ({ termino, limite }) => {
    const productos = await db.producto.findMany({
      where: { nombre: { contains: termino }},
      take: limite,
      include: {
        imagenes: true,      // URLs de imágenes
        variantes: true,     // Colores, tamaños
        descripcion: true,   // Texto largo
      }
    });
    return productos;  // Objeto completo para el cliente
  },

  // NUEVO en v6: Lo que recibe el modelo
  toModelOutput: async (productos) => {
    // Solo nombre y precio, lo mínimo para responder
    return productos.map(p =>
      `- ${p.nombre}: $${p.precio} MXN (${p.stock} disponibles)`
    ).join('\n');
  }
});
```

**El truco:**
- `execute` retorna data completa → El cliente puede mostrar cards con imágenes
- `toModelOutput` retorna resumen → El modelo genera respuesta sin gastar tokens en data que no usa

## Preview: Tools con Agentes

En el próximo capítulo veremos agentes en detalle. Pero aquí está el concepto:

Un agente es un modelo que controla el loop. Decide qué tools llamar, en qué orden, y cuándo parar.

### El Default es Diferente

Esto es importante:

| Contexto | Default |
|----------|---------|
| `streamText` + tools | **1 paso** - termina en tool output, necesitas `stopWhen` |
| `ToolLoopAgent` | **20 pasos** - tiene `stepCountIs(20)` implícito |

Con `ToolLoopAgent`, **no necesitas especificar `stopWhen`** para que funcione. El agente continúa automáticamente hasta resolver la tarea (máximo 20 pasos por defecto).

```typescript
import { ToolLoopAgent, stepCountIs, tool } from 'ai';
import { openai } from '@ai-sdk/openai';

const asistenteFerreteria = new ToolLoopAgent({
  model: openai('gpt-4o-mini'),

  // v6 usa 'instructions', no 'system'
  instructions: `Eres el asistente de Ferretería San José.
    Ayudas a clientes con productos, disponibilidad y devoluciones.
    Precios en pesos mexicanos.
    Si el cliente pide una devolución, siempre verifica primero el código de venta.`,

  tools: {
    consultarInventario,
    buscarProductos,
    verificarVenta,
    procesarDevolucion,
  },

  // Opcional: por defecto es stepCountIs(20)
  stopWhen: stepCountIs(8),
});

// El agente resuelve la tarea completa
const { text, steps } = await asistenteFerreteria.generate({
  prompt: 'Compré un taladro la semana pasada (venta #FER-2025-001) y no funciona. Quiero devolverlo.'
});

console.log(`Resuelto en ${steps.length} pasos`);
// Paso 1: verificarVenta({ codigo: 'FER-2025-001' })
// Paso 2: consultarInventario({ producto: 'taladro' })
// Paso 3: procesarDevolucion({ ... }) - requiere aprobación
// Paso 4: Genera respuesta final
```

### El agente se detiene automáticamente cuando:

1. La tarea está completada (modelo no llama más tools)
2. Un tool requiere aprobación (`needsApproval`)
3. Se alcanza el límite de pasos
4. Un tool no tiene función `execute`

### La diferencia clave

| `streamText` + tools | `ToolLoopAgent` |
|---------------------|-----------------|
| Tú controlas el flujo | El modelo controla el loop |
| Necesitas `stopWhen` siempre | Default de 20 pasos |
| Ideal para chat interactivo | Ideal para tareas autónomas |
| Un mensaje → una respuesta | Un prompt → tarea completa |

## Caso Práctico Completo

Aquí está el servidor con los 4 tools funcionando:

```typescript
// app/routes/api.ferreteria.ts
import { streamText, stepCountIs, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import type { Route } from './+types/api.ferreteria';

// Tool 1: Consultar inventario
const consultarInventario = tool({
  description: 'Consulta stock y precio de un producto específico',
  inputSchema: z.object({
    producto: z.string().describe('Nombre o código del producto')
  }),
  execute: async ({ producto }) => {
    // Aquí conectarías a tu DB real
    return {
      nombre: producto,
      stock: Math.floor(Math.random() * 50),
      precio: Math.floor(Math.random() * 3000) + 100,
      disponible: true
    };
  }
});

// Tool 2: Buscar productos
const buscarProductos = tool({
  description: 'Busca productos por término o categoría',
  inputSchema: z.object({
    termino: z.string(),
    categoria: z.enum(['herramientas', 'plomeria', 'electricidad', 'pintura', 'general']).optional()
  }),
  execute: async ({ termino, categoria }) => {
    // Simulación de búsqueda
    return [
      { nombre: `${termino} Profesional`, precio: 1299, stock: 5 },
      { nombre: `${termino} Básico`, precio: 599, stock: 12 },
    ];
  },
  toModelOutput: async (productos) => {
    return productos.map(p => `${p.nombre}: $${p.precio} MXN`).join(', ');
  }
});

// Tool 3: Verificar venta
const verificarVenta = tool({
  description: 'Verifica los detalles de una venta por su código',
  inputSchema: z.object({
    codigoVenta: z.string().describe('Código de venta (ej: FER-2025-001)')
  }),
  execute: async ({ codigoVenta }) => {
    // Consulta a tu sistema de ventas
    return {
      codigo: codigoVenta,
      fecha: '2025-01-02',
      productos: ['Taladro DeWalt 20V'],
      total: 2899,
      cliente: 'Cliente registrado'
    };
  }
});

// Tool 4: Procesar devolución (requiere aprobación)
const procesarDevolucion = tool({
  description: 'Procesa la devolución de un producto vendido',
  inputSchema: z.object({
    codigoVenta: z.string(),
    producto: z.string(),
    motivo: z.enum(['defectuoso', 'equivocado', 'cambio_opinion']),
    montoReembolso: z.number()
  }),
  needsApproval: async ({ montoReembolso }) => montoReembolso > 500,
  execute: async ({ codigoVenta, producto, montoReembolso }) => {
    // Procesa en tu sistema
    console.log(`Devolución procesada: ${codigoVenta} - $${montoReembolso} MXN`);
    return {
      exito: true,
      mensaje: `Devolución procesada. Reembolso de $${montoReembolso} MXN aprobado.`,
      referencia: `DEV-${Date.now()}`
    };
  }
});

export async function action({ request }: Route.ActionArgs) {
  const { messages } = await request.json();

  const result = streamText({
    model: openai('gpt-4o-mini'),
    system: `Eres el asistente virtual de Ferretería San José.

Ayudas a clientes con:
- Consultar disponibilidad y precios de productos
- Buscar productos por nombre o categoría
- Verificar ventas anteriores
- Procesar devoluciones

Siempre muestra precios en pesos mexicanos.
Sé amable, profesional y directo.
Si el cliente pide una devolución, primero verifica la venta.`,
    messages,
    tools: {
      consultarInventario,
      buscarProductos,
      verificarVenta,
      procesarDevolucion,
    },
    // IMPORTANTE: sin esto, el modelo no responde después del tool
    stopWhen: stepCountIs(5),

    onStepFinish({ stepType, usage }) {
      console.log(`[Ferretería] Paso: ${stepType}, Tokens: ${usage.totalTokens}`);
    },

    onFinish({ text, usage, steps }) {
      console.log(`[Ferretería] Completado en ${steps.length} pasos`);
      console.log(`[Ferretería] Tokens totales: ${usage.totalTokens}`);
      // Aquí guardarías métricas en tu DB
    }
  });

  return result.toUIMessageStreamResponse();
}
```

## Resumen

| Concepto | Qué aprendiste |
|----------|----------------|
| `tool()` | Función que define una herramienta ejecutable |
| `inputSchema` | Parámetros tipados con Zod (v6 renombró de `parameters`) |
| `execute` | La función que corre cuando el modelo llama el tool |
| `stopWhen` | **CRÍTICO** - sin esto, el modelo no responde después del tool |
| `stepCountIs(n)` | Helper para limitar pasos (reemplaza `maxSteps`) |
| `needsApproval` | NUEVO v6 - requiere confirmación humana |
| `toModelOutput` | NUEVO v6 - reduce tokens enviados al modelo |
| `part.type` | En el cliente, `'tool-nombreDelTool'` |
| `part.state` | Estados: `input-streaming`, `output-available`, `approval-requested` |

### Cuándo usar Tools vs Structured Output

| Usar Tools cuando... | Usar Structured Output cuando... |
|---------------------|----------------------------------|
| Necesitas ejecutar acciones | Solo necesitas datos tipados |
| Consultas externas (DB, API) | Parsear o clasificar texto |
| El modelo decide qué hacer | Tú sabes qué estructura quieres |
| Flujo conversacional multi-turno | Respuesta única estructurada |

---

En el próximo capítulo veremos **Agentes**: cuando el modelo toma el control completo del loop, decide autónomamente qué herramientas usar, y resuelve tareas complejas sin intervención.
