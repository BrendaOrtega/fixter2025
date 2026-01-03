# Capítulo 8: generateImage — Creando Imágenes con Código

Hasta ahora todo ha sido texto: prompts, respuestas, structured output, herramientas. Pero el AI SDK también puede generar imágenes. En este capítulo construiremos un generador de thumbnails para YouTube que demuestra el poder de combinar generación de texto con generación de imágenes.

## Código Primero

```typescript
import { generateImage } from 'ai';
import { openai } from '@ai-sdk/openai';

const { image } = await generateImage({
  model: openai.image('dall-e-3'),
  prompt: 'Un programador mexicano celebrando frente a su computadora, estilo ilustración moderna, colores vibrantes, fondo de código',
});

// La imagen está en base64
console.log(image.base64.slice(0, 50) + '...');
// "iVBORw0KGgoAAAANSUhEUgAABAAAAAQACAIAAA..."

// O como Uint8Array para guardar en archivo
import { writeFileSync } from 'fs';
writeFileSync('thumbnail.png', image.uint8Array);
```

Ejecuta esto y tendrás una imagen PNG en tu directorio.

## ¿Qué Acaba de Pasar?

1. **`generateImage`** — Función del AI SDK para generar imágenes
2. **`openai.image('dall-e-3')`** — Especifica el modelo de imagen (no de texto)
3. **`prompt`** — Descripción textual de la imagen deseada
4. **`image.base64`** — La imagen codificada en base64
5. **`image.uint8Array`** — Bytes raw para guardar como archivo

A diferencia de `generateText` que retorna strings, `generateImage` retorna objetos con la imagen en múltiples formatos.

## Anatomía de la Respuesta

```typescript
const resultado = await generateImage({
  model: openai.image('dall-e-3'),
  prompt: 'Logo minimalista de una taquería',
});

// Una sola imagen
console.log(resultado.image);
// {
//   base64: "iVBORw0KGgo...",
//   uint8Array: Uint8Array [...],
//   mediaType: "image/png"
// }

// Array de imágenes (cuando generas múltiples)
console.log(resultado.images);
// [{ base64, uint8Array, mediaType }, ...]
```

El objeto `image` siempre es la primera imagen generada. El array `images` contiene todas.

## Parámetros de generateImage

```typescript
const { images } = await generateImage({
  // === REQUERIDOS ===
  model: openai.image('dall-e-3'),
  prompt: 'Descripción de la imagen',

  // === OPCIONALES ===
  n: 3,                    // Cantidad de imágenes (default: 1)
  size: '1024x1024',       // Dimensiones: '256x256', '512x512', '1024x1024', '1792x1024', '1024x1792'
  aspectRatio: '16:9',     // Alternativa a size (algunos providers)
  seed: 42,                // Para resultados reproducibles

  // === CONTROL ===
  maxRetries: 2,           // Reintentos si falla (default: 2)
  abortSignal: controller.signal,  // Para cancelar
});
```

### Tamaños y Aspect Ratios

| Size | Uso típico |
|------|------------|
| `1024x1024` | Cuadrado, Instagram |
| `1792x1024` | Horizontal, YouTube thumbnail |
| `1024x1792` | Vertical, Stories, Pinterest |

> **Nota**: Los tamaños disponibles dependen del modelo. DALL-E 3 tiene opciones específicas. Otros modelos pueden soportar dimensiones arbitrarias.

## Modelos de Imagen Disponibles

```typescript
import { openai } from '@ai-sdk/openai';

// DALL-E 3 - Mayor calidad, más caro
const modeloPremium = openai.image('dall-e-3');

// DALL-E 2 - Más rápido, más económico
const modeloEconomico = openai.image('dall-e-2');

// GPT Image (nuevo) - Balance calidad/costo
const modeloBalanceado = openai.image('gpt-image-1');
```

### Comparativa de Modelos OpenAI

| Modelo | Calidad | Velocidad | Costo aprox. |
|--------|---------|-----------|--------------|
| dall-e-3 | Excelente | ~20s | $0.04-0.08 USD |
| dall-e-2 | Buena | ~10s | $0.02 USD |
| gpt-image-1 | Muy buena | ~15s | $0.03 USD |

Los precios son aproximados por imagen 1024x1024.

## Pipeline Inteligente: Texto + Imagen

Un prompt directo como "thumbnail de React" genera resultados genéricos. La magia está en optimizar el prompt antes de generar:

```typescript
import { generateText, generateImage } from 'ai';
import { openai } from '@ai-sdk/openai';

async function generarThumbnail(titulo: string) {
  // Paso 1: Optimizar el prompt con LLM
  const { text: promptOptimizado } = await generateText({
    model: openai('gpt-4o-mini'),
    prompt: `Genera un prompt de máximo 100 palabras para crear un thumbnail de YouTube.

El video se titula: "${titulo}"

El prompt debe describir:
- Un sujeto visual central llamativo
- Colores vibrantes y contrastantes
- Texto grande y legible (el título simplificado)
- Estilo moderno de ilustración digital
- Composición que funcione en miniatura

Solo responde con el prompt, sin explicaciones.`
  });

  // Paso 2: Generar imagen con prompt optimizado
  const { image } = await generateImage({
    model: openai.image('dall-e-3'),
    prompt: promptOptimizado,
    size: '1792x1024', // Formato YouTube
  });

  return {
    promptUsado: promptOptimizado,
    imagen: image.base64
  };
}

// Uso
const resultado = await generarThumbnail('Aprende React Router v7 en 30 minutos');
console.log('Prompt:', resultado.promptUsado);
// "Ilustración vibrante de un desarrollador con expresión emocionada,
//  rodeado de íconos de React flotantes en tonos azul y cyan,
//  texto grande 'REACT ROUTER' en blanco con sombra, fondo degradado
//  púrpura a azul oscuro, estilo cartoon moderno, alta saturación"
```

Este patrón de **pipeline** es fundamental: el LLM entiende el contexto y genera prompts visuales mucho mejores que los que escribiríamos manualmente.

## Sistema de Estilos

En lugar de un solo thumbnail, genera variantes con diferentes estilos:

```typescript
const ESTILOS = {
  vibrant: 'Colores audaces y saturados, alto contraste, energético y llamativo',
  minimal: 'Diseño limpio y elegante, pocos elementos, mucho espacio blanco, sofisticado',
  dramatic: 'Iluminación cinematográfica, sombras profundas, atmósfera intensa',
  tech: 'Estética futurista, acentos neón, elementos de código y circuitos'
} as const;

type Estilo = keyof typeof ESTILOS;

async function generarConEstilo(titulo: string, estilo: Estilo) {
  const descripcionEstilo = ESTILOS[estilo];

  const { text: prompt } = await generateText({
    model: openai('gpt-4o-mini'),
    prompt: `Crea un prompt para thumbnail de YouTube (máx 100 palabras).

Video: "${titulo}"
Estilo requerido: ${descripcionEstilo}

Describe elementos visuales específicos que capturen la atención en miniatura.
Solo el prompt, sin explicaciones.`
  });

  const { image } = await generateImage({
    model: openai.image('dall-e-3'),
    prompt,
    size: '1792x1024',
  });

  return { estilo, prompt, imagen: image.base64 };
}
```

## Generación en Paralelo

Para generar los 4 estilos simultáneamente:

```typescript
async function generarPreviews(titulo: string) {
  const estilos: Estilo[] = ['vibrant', 'minimal', 'dramatic', 'tech'];

  // Generar todos en paralelo
  const resultados = await Promise.allSettled(
    estilos.map(estilo => generarConEstilo(titulo, estilo))
  );

  // Filtrar exitosos y manejar errores
  return resultados
    .map((resultado, i) => {
      if (resultado.status === 'fulfilled') {
        return resultado.value;
      }
      console.error(`Error en estilo ${estilos[i]}:`, resultado.reason);
      return null;
    })
    .filter(Boolean);
}

// Uso
const previews = await generarPreviews('Domina TypeScript en 2025');
console.log(`Generadas ${previews.length} variantes`);
```

Usamos `Promise.allSettled` en lugar de `Promise.all` para que un error en una imagen no cancele las demás.

## Múltiples Formatos: YouTube, Instagram, Stories

Cada plataforma tiene dimensiones óptimas diferentes:

```typescript
const FORMATOS = {
  youtube: { size: '1792x1024', nombre: 'YouTube Thumbnail' },
  instagram: { size: '1024x1024', nombre: 'Instagram Post' },
  stories: { size: '1024x1792', nombre: 'Instagram Stories' },
} as const;

type Formato = keyof typeof FORMATOS;

async function generarFormatos(
  promptBase: string,
  formatos: Formato[] = ['youtube', 'instagram', 'stories']
) {
  const resultados = await Promise.all(
    formatos.map(async (formato) => {
      const config = FORMATOS[formato];

      const { image } = await generateImage({
        model: openai.image('dall-e-3'),
        prompt: `${promptBase}. Optimizado para formato ${config.nombre}, composición ${
          formato === 'stories' ? 'vertical' : formato === 'youtube' ? 'horizontal' : 'cuadrada'
        }.`,
        size: config.size,
      });

      return {
        formato,
        nombre: config.nombre,
        imagen: image.base64,
      };
    })
  );

  return resultados;
}
```

## Proyecto Completo: Generador de Thumbnails

Combinemos todo en una función robusta:

```typescript
// thumbnail-generator.ts
import { generateText, generateImage } from 'ai';
import { openai } from '@ai-sdk/openai';
import { writeFileSync, mkdirSync } from 'fs';

const ESTILOS = {
  vibrant: 'Colores audaces, alto contraste, energético',
  minimal: 'Limpio, elegante, espacio en blanco',
  dramatic: 'Cinematográfico, sombras profundas',
  tech: 'Futurista, neón, elementos de código'
} as const;

type Estilo = keyof typeof ESTILOS;

interface ThumbnailConfig {
  titulo: string;
  estilo?: Estilo;
  formato?: 'youtube' | 'instagram' | 'stories';
  guardarArchivo?: boolean;
}

export async function generarThumbnail(config: ThumbnailConfig) {
  const {
    titulo,
    estilo = 'vibrant',
    formato = 'youtube',
    guardarArchivo = false
  } = config;

  // Dimensiones según formato
  const sizes = {
    youtube: '1792x1024',
    instagram: '1024x1024',
    stories: '1024x1792'
  };

  // Paso 1: Crear prompt optimizado
  const { text: promptVisual } = await generateText({
    model: openai('gpt-4o-mini'),
    prompt: `Genera un prompt de imagen (máx 80 palabras) para thumbnail de ${formato}.

Título del video: "${titulo}"
Estilo visual: ${ESTILOS[estilo]}

Requisitos:
- Sujeto central que capture atención
- Composición clara para verse en miniatura
- Texto integrado: versión corta del título
- Sin personas reales, usar ilustraciones

Solo el prompt, directo.`
  });

  console.log('Prompt generado:', promptVisual);

  // Paso 2: Generar imagen
  const { image } = await generateImage({
    model: openai.image('dall-e-3'),
    prompt: promptVisual,
    size: sizes[formato],
  });

  // Paso 3: Guardar si se solicita
  if (guardarArchivo) {
    const nombreArchivo = `thumbnail-${estilo}-${formato}-${Date.now()}.png`;
    mkdirSync('thumbnails', { recursive: true });
    writeFileSync(`thumbnails/${nombreArchivo}`, image.uint8Array);
    console.log('Guardado:', nombreArchivo);
  }

  return {
    titulo,
    estilo,
    formato,
    prompt: promptVisual,
    base64: image.base64,
    mediaType: image.mediaType
  };
}

// Generar todas las variantes
export async function generarTodosLosEstilos(titulo: string) {
  const estilos: Estilo[] = ['vibrant', 'minimal', 'dramatic', 'tech'];

  const resultados = await Promise.allSettled(
    estilos.map(estilo =>
      generarThumbnail({ titulo, estilo, guardarArchivo: true })
    )
  );

  const exitosos = resultados
    .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof generarThumbnail>>> =>
      r.status === 'fulfilled'
    )
    .map(r => r.value);

  console.log(`\nGenerados ${exitosos.length}/${estilos.length} thumbnails`);
  return exitosos;
}
```

### Uso del Generador

```typescript
// Generar un thumbnail específico
const thumbnail = await generarThumbnail({
  titulo: 'Cómo hacer $50,000 MXN con IA en tu tiempo libre',
  estilo: 'dramatic',
  formato: 'youtube',
  guardarArchivo: true
});

// O generar los 4 estilos de una vez
const variantes = await generarTodosLosEstilos(
  'React Router v7: La Guía Definitiva'
);
```

## Integrando con React Router v7

```typescript
// app/routes/api.thumbnails.ts
import type { Route } from "./+types/api.thumbnails";
import { generarThumbnail, generarTodosLosEstilos } from '~/lib/thumbnail-generator';

export async function action({ request }: Route.ActionArgs) {
  const { titulo, estilo, formato, modo } = await request.json();

  try {
    if (modo === 'previews') {
      // Generar los 4 estilos
      const resultados = await generarTodosLosEstilos(titulo);
      return Response.json({ previews: resultados });
    }

    // Generar un thumbnail específico
    const resultado = await generarThumbnail({
      titulo,
      estilo: estilo || 'vibrant',
      formato: formato || 'youtube'
    });

    return Response.json(resultado);
  } catch (error) {
    console.error('Error generando thumbnail:', error);
    return Response.json({ error: 'Error al generar imagen' }, { status: 500 });
  }
}
```

Desde el cliente:

```typescript
// Llamar desde un componente
const response = await fetch('/api/thumbnails', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    titulo: 'Mi video de React',
    estilo: 'vibrant',
    formato: 'youtube'
  })
});

const { base64, prompt } = await response.json();
```

## Mostrando Imágenes Base64 en React

```tsx
// components/ThumbnailPreview.tsx
interface Props {
  base64: string;
  mediaType: string;
  estilo: string;
}

export function ThumbnailPreview({ base64, mediaType, estilo }: Props) {
  return (
    <div className="relative group">
      <img
        src={`data:${mediaType};base64,${base64}`}
        alt={`Thumbnail estilo ${estilo}`}
        className="rounded-lg shadow-lg w-full"
      />
      <span className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
        {estilo}
      </span>
    </div>
  );
}

// Uso con múltiples previews
function ThumbnailGrid({ previews }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {previews.map((preview) => (
        <ThumbnailPreview
          key={preview.estilo}
          base64={preview.base64}
          mediaType={preview.mediaType}
          estilo={preview.estilo}
        />
      ))}
    </div>
  );
}
```

## Descarga de Imágenes desde el Navegador

```typescript
function descargarImagen(base64: string, nombreArchivo: string) {
  // Convertir base64 a blob
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'image/png' });

  // Crear link y descargar
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nombreArchivo;
  link.click();

  URL.revokeObjectURL(url);
}

// Uso
<button onClick={() => descargarImagen(preview.base64, `thumbnail-${preview.estilo}.png`)}>
  Descargar
</button>
```

## Costos y Consideraciones

### Precio por Imagen (OpenAI, enero 2025)

| Modelo | 1024x1024 | 1792x1024 / 1024x1792 |
|--------|-----------|------------------------|
| DALL-E 3 Standard | $0.040 USD | $0.080 USD |
| DALL-E 3 HD | $0.080 USD | $0.120 USD |
| DALL-E 2 | $0.020 USD | - |

**Ejemplo de costo**: Generar 4 variantes de thumbnail en formato YouTube:
- 4 imágenes × $0.08 = **$0.32 USD** (~$6 MXN)
- Más el costo de optimización de prompts: ~$0.01 USD

### Derechos de Uso

Las imágenes generadas con DALL-E son tuyas para uso comercial según los términos de OpenAI. Sin embargo:

- No puedes generar imágenes de personas reales identificables
- No puedes generar contenido que viole políticas de uso
- OpenAI puede revisar imágenes generadas

### Límites de Rate

| Plan | Imágenes por minuto |
|------|---------------------|
| Tier 1 | 7 |
| Tier 2 | 7 |
| Tier 3 | 7 |
| Tier 4 | 15 |
| Tier 5 | 50 |

Para aplicaciones de producción con alto volumen, considera implementar una cola de procesamiento.

## Manejo de Errores

```typescript
import { generateImage } from 'ai';

async function generarConReintentos(prompt: string, intentos = 3) {
  for (let i = 0; i < intentos; i++) {
    try {
      const { image } = await generateImage({
        model: openai.image('dall-e-3'),
        prompt,
        maxRetries: 1, // Manejamos reintentos manualmente
      });
      return image;
    } catch (error) {
      console.error(`Intento ${i + 1} fallido:`, error.message);

      // Errores específicos de OpenAI
      if (error.message.includes('content_policy_violation')) {
        throw new Error('El prompt viola las políticas de contenido');
      }

      if (error.message.includes('rate_limit')) {
        // Esperar antes de reintentar
        await new Promise(r => setTimeout(r, 60000));
        continue;
      }

      if (i === intentos - 1) throw error;
    }
  }
}
```

## Resumen

| Concepto | Qué aprendiste |
|----------|----------------|
| `generateImage()` | Genera imágenes desde texto |
| `openai.image()` | Especifica modelo de imagen |
| `image.base64` | Imagen codificada para web |
| `image.uint8Array` | Bytes para guardar archivo |
| Pipeline texto→imagen | Optimizar prompts con LLM antes de generar |
| Estilos predefinidos | Variantes visuales consistentes |
| Formatos múltiples | YouTube, Instagram, Stories |
| `Promise.allSettled` | Generación paralela tolerante a fallos |

### ¿Cuándo usar generateImage?

| Usa generateImage | NO uses generateImage |
|-------------------|----------------------|
| Thumbnails, banners, ilustraciones | Fotos de personas reales |
| Contenido de marketing | Logos con texto preciso |
| Variantes de producto | Edición de fotos existentes* |
| Visualizaciones de conceptos | Alto volumen (>50/min) sin cola |

*Para edición de imágenes existentes, algunos providers ofrecen funciones específicas como `openai.images.edit()`.

---

En el próximo capítulo exploraremos **Embeddings**: cómo convertir texto en vectores numéricos para búsqueda semántica, la base de los sistemas RAG que permiten a tu aplicación "entender" documentos.
