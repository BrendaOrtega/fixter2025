# Capítulo 5: Structured Output — Respuestas que Tu Código Puede Consumir

Hasta ahora el modelo genera texto. Útil para chat, pero ¿qué pasa cuando necesitas datos estructurados?

Imagina: quieres que el modelo extraiga información de una descripción y la guarde en tu base de datos. O clasificar tickets de soporte. O generar un catálogo de productos.

Texto plano no sirve. Necesitas objetos tipados.

## Código Primero

```typescript
import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const { output } = await generateText({
  model: openai('gpt-4o-mini'),
  output: Output.object({
    schema: z.object({
      titulo: z.string(),
      director: z.string(),
      año: z.number(),
      generos: z.array(z.string()),
    }),
  }),
  prompt: 'Dame información de la película "Coco" de Pixar',
});

console.log(output);
// {
//   titulo: "Coco",
//   director: "Lee Unkrich",
//   año: 2017,
//   generos: ["Animación", "Aventura", "Familia", "Fantasía", "Musical"]
// }
```

Eso es todo. El modelo retorna un objeto tipado, no texto.

## ¿Qué Acaba de Pasar?

1. **Output.object()** le dice al SDK: "quiero un objeto, no texto"
2. **schema** define la estructura con Zod
3. El SDK internamente construye el prompt correcto para el modelo
4. El modelo genera JSON válido
5. El SDK lo valida contra el schema
6. TypeScript infiere los tipos automáticamente

`output.año` es `number`, no `string`. `output.generos` es `string[]`. Sin parsing manual.

## Introducción a Zod

Si no has usado Zod, es una librería de validación:

```bash
npm install zod
```

Combina dos cosas:
- **Validación en runtime** — verifica que los datos son correctos
- **Tipos en compilación** — TypeScript infiere tipos del schema

```typescript
import { z } from 'zod';

// Define el schema
const peliculaSchema = z.object({
  titulo: z.string(),
  año: z.number(),
  generos: z.array(z.string()),
  calificacion: z.number().min(0).max(10).optional(),
});

// TypeScript infiere el tipo automáticamente
type Pelicula = z.infer<typeof peliculaSchema>;
// { titulo: string; año: number; generos: string[]; calificacion?: number }
```

Patrones útiles para AI SDK:

| Método | Uso |
|--------|-----|
| `z.string()` | Texto |
| `z.number()` | Números |
| `z.boolean()` | true/false |
| `z.array(z.string())` | Lista de strings |
| `z.object({...})` | Objetos anidados |
| `z.enum(['a', 'b'])` | Opciones fijas |
| `.optional()` | Campo opcional |
| `.describe('...')` | Ayuda al modelo a entender |

## Los 5 Tipos de Output

AI SDK v6 ofrece 5 formas de estructurar la salida:

| Tipo | Uso | Cuándo usarlo |
|------|-----|---------------|
| `Output.text()` | Texto plano | Default, conversaciones |
| `Output.object()` | Objeto estructurado | Datos con schema fijo |
| `Output.array()` | Lista de objetos | Catálogos, resultados múltiples |
| `Output.choice()` | Selección entre opciones | Clasificación, categorías |
| `Output.json()` | JSON sin validación | Datos flexibles |

## Output.object() en Profundidad

El más usado. Puedes añadir metadatos para mejorar la precisión:

```typescript
output: Output.object({
  name: 'Producto',                        // Nombre (ayuda al modelo)
  description: 'Un producto del catálogo', // Descripción
  schema: z.object({
    nombre: z.string().describe('Nombre comercial del producto'),
    precio: z.number().describe('Precio en pesos mexicanos'),
    categorias: z.array(z.string()).describe('Categorías aplicables'),
    disponible: z.boolean(),
  }),
})
```

El `.describe()` en Zod es clave. Le dice al modelo qué esperas:

```typescript
// Sin describe
precio: z.number()
// El modelo podría generar: 29.99 (dólares)

// Con describe
precio: z.number().describe('Precio en pesos mexicanos, sin centavos')
// El modelo genera: 299 (pesos)
```

## Output.choice() para Clasificación

Cuando necesitas clasificar en categorías fijas:

```typescript
const { output } = await generateText({
  model: openai('gpt-4o-mini'),
  output: Output.choice({
    options: ['urgente', 'normal', 'bajo'],
  }),
  prompt: `Clasifica la prioridad de este ticket de soporte:

  "El sistema no me deja iniciar sesión desde hace 3 días
   y tengo una presentación importante mañana."`,
});

console.log(output);
// "urgente"
```

El tipo de `output` es `"urgente" | "normal" | "bajo"`. TypeScript lo sabe.

### Casos de uso

- Análisis de sentimiento: `['positivo', 'negativo', 'neutral']`
- Categorización de productos: `['electrónica', 'ropa', 'hogar']`
- Priorización: `['crítico', 'alto', 'medio', 'bajo']`
- Routing: `['ventas', 'soporte', 'facturación']`

## Output.array() para Listas

Cuando necesitas múltiples resultados:

```typescript
const { output } = await generateText({
  model: openai('gpt-4o-mini'),
  output: Output.array({
    schema: z.object({
      nombre: z.string(),
      descripcion: z.string(),
      precioEstimado: z.number(),
    }),
  }),
  prompt: 'Genera 5 ideas de productos para una tienda de tecnología sustentable',
});

console.log(output);
// [
//   { nombre: "Cargador Solar Portátil", descripcion: "...", precioEstimado: 899 },
//   { nombre: "Funda Biodegradable", descripcion: "...", precioEstimado: 299 },
//   ...
// ]
```

## Streaming de Objetos Parciales

Con `streamText`, puedes ver el objeto construyéndose:

```typescript
import { streamText, Output } from 'ai';

const recetaSchema = z.object({
  nombre: z.string(),
  ingredientes: z.array(z.object({
    nombre: z.string(),
    cantidad: z.string(),
  })),
  pasos: z.array(z.string()),
});

const { partialOutputStream } = streamText({
  model: openai('gpt-4o-mini'),
  output: Output.object({ schema: recetaSchema }),
  prompt: 'Genera una receta de chilaquiles verdes',
});

for await (const partial of partialOutputStream) {
  console.clear();
  console.log(JSON.stringify(partial, null, 2));
}
```

Verás algo como:

```javascript
// Iteración 1
{ nombre: "Chila" }

// Iteración 2
{ nombre: "Chilaquiles Verdes", ingredientes: [] }

// Iteración 3
{ nombre: "Chilaquiles Verdes", ingredientes: [{ nombre: "Totopos" }] }

// Iteración 4
{ nombre: "Chilaquiles Verdes", ingredientes: [{ nombre: "Totopos", cantidad: "500g" }] }
```

> **Nota importante:** Los objetos parciales NO se pueden validar contra el schema durante streaming. El schema solo se valida cuando el objeto está completo.

## Caso Práctico: Catálogo de Productos

Una tienda online necesita generar fichas de productos desde descripciones:

```typescript
// lib/product-generator.ts
import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const productoSchema = z.object({
  nombre: z.string().describe('Nombre comercial atractivo'),
  descripcionCorta: z.string().describe('Máximo 100 caracteres'),
  descripcionLarga: z.string().describe('Párrafo descriptivo para SEO'),
  precio: z.number().describe('Precio sugerido en pesos mexicanos'),
  categorias: z.array(z.string()).describe('Categorías de la tienda'),
  especificaciones: z.array(z.object({
    nombre: z.string(),
    valor: z.string(),
  })),
  palabrasClave: z.array(z.string()).describe('Para búsqueda interna'),
});

export async function generarFichaProducto(descripcion: string) {
  const { output } = await generateText({
    model: openai('gpt-4o-mini'),
    output: Output.object({
      name: 'FichaProducto',
      schema: productoSchema,
    }),
    system: `Eres un experto en e-commerce.
             Genera fichas de productos optimizadas para conversión.
             Precios siempre en pesos mexicanos.
             Categorías disponibles: Tecnología, Hogar, Oficina, Accesorios.`,
    prompt: `Genera la ficha de producto para: ${descripcion}`,
  });

  return output;
}

// Uso
const ficha = await generarFichaProducto(
  'Bocina bluetooth resistente al agua, 20 horas de batería, color negro'
);

console.log(ficha);
// {
//   nombre: "SoundMax Pro Waterproof",
//   descripcionCorta: "Bocina Bluetooth resistente al agua con 20h de batería",
//   descripcionLarga: "Lleva tu música a cualquier lugar con la SoundMax Pro...",
//   precio: 1299,
//   categorias: ["Tecnología", "Accesorios"],
//   especificaciones: [
//     { nombre: "Batería", valor: "20 horas" },
//     { nombre: "Resistencia", valor: "IPX7" },
//     { nombre: "Conectividad", valor: "Bluetooth 5.0" }
//   ],
//   palabrasClave: ["bocina", "bluetooth", "waterproof", "portátil"]
// }
```

## Cambio de v5 a v6: generateObject → generateText

En versiones anteriores existía `generateObject`. Ahora está unificado:

| v5 | v6 |
|----|-----|
| `generateObject({ schema })` | `generateText({ output: Output.object({ schema }) })` |
| `streamObject({ schema })` | `streamText({ output: Output.object({ schema }) })` |

¿Por qué el cambio? Flexibilidad. Ahora puedes combinar structured output con tools, callbacks, y otras opciones de `generateText`.

```typescript
// v6: Todo en una llamada
const { output, usage } = await generateText({
  model: openai('gpt-4o-mini'),
  output: Output.object({ schema: productoSchema }),
  prompt: 'Genera un producto...',

  // Puedes agregar callbacks
  onFinish({ usage }) {
    console.log(`Tokens usados: ${usage.totalTokens}`);
  }
});
```

## Errores Comunes

| Problema | Causa | Solución |
|----------|-------|----------|
| Output vacío o incompleto | Schema muy complejo | Simplificar, añadir `.describe()` |
| Tipos incorrectos | Modelo "inventa" | Usar `z.coerce.number()` para parsing |
| Campos faltantes | Ambigüedad | Marcar explícitamente con `.optional()` |
| JSON inválido | Modelo confundido | Mejorar el prompt, ser más específico |

### Manejo de errores

```typescript
import { generateText, Output } from 'ai';

try {
  const { output } = await generateText({
    model: openai('gpt-4o-mini'),
    output: Output.object({ schema: productoSchema }),
    prompt: '...',
  });

  // output está validado y tipado
  console.log(output.nombre);

} catch (error) {
  if (error.name === 'AI_JSONParseError') {
    console.error('El modelo no generó JSON válido');
  }
  if (error.name === 'AI_TypeValidationError') {
    console.error('El JSON no cumple el schema:', error.value);
  }
}
```

## Resumen

| Concepto | Qué aprendiste |
|----------|----------------|
| `Output.object()` | Genera objetos tipados con schema Zod |
| `Output.choice()` | Clasificación entre opciones fijas |
| `Output.array()` | Listas de objetos estructurados |
| `partialOutputStream` | Streaming de objetos parciales |
| `.describe()` | Mejora precisión del modelo |
| Zod schemas | Validación + tipos en una sola definición |

### En una frase

**Structured Output**: Convierte respuestas del modelo en objetos TypeScript que tu código puede consumir directamente.

---

Ahora sabemos cómo obtener datos estructurados del modelo. Pero hay un límite: solo puede generar información que ya "conoce". ¿Qué pasa si necesita consultar tu base de datos, llamar una API, o ejecutar código? Eso es exactamente lo que veremos en el siguiente capítulo: **Tools**.
