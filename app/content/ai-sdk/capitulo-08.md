# Capítulo 8: generateImage — Creando Imágenes con Código

Hasta ahora todo ha sido texto: prompts, respuestas, structured output, herramientas. Pero el AI SDK también puede generar imágenes. En este capítulo construiremos un generador de thumbnails para YouTube que demuestra el poder de combinar generación de texto con generación de imágenes.

## Código Primero

```typescript
import { generateImage } from 'ai';
import { openai } from '@ai-sdk/openai';

const { image } = await generateImage({
  model: openai.image('gpt-image-1'),
  prompt: 'Un programador mexicano celebrando frente a su computadora, estilo ilustración moderna, colores vibrantes',
  size: '1024x1024',
});

// La imagen está en base64
console.log(image.base64.slice(0, 50) + '...');
// "iVBORw0KGgoAAAANSUhEUgAABAAAAAQACAIAAA..."

// O como Uint8Array para guardar en archivo
import { writeFileSync } from 'fs';
writeFileSync('thumbnail.png', Buffer.from(image.base64, 'base64'));
```

Ejecuta esto y tendrás una imagen PNG en tu directorio.

## ¿Qué Acaba de Pasar?

1. **`generateImage`** — Función del AI SDK para generar imágenes
2. **`openai.image('gpt-image-1')`** — Especifica el modelo de imagen (no de texto)
3. **`prompt`** — Descripción textual de la imagen deseada
4. **`size`** — Dimensiones de la imagen
5. **`image.base64`** — La imagen codificada en base64

A diferencia de `generateText` que retorna strings, `generateImage` retorna objetos con la imagen en múltiples formatos.

## Modelos de Imagen Disponibles

```typescript
import { openai } from '@ai-sdk/openai';

// GPT Image 1 - El más reciente de OpenAI
const modelo = openai.image('gpt-image-1');

// Versión mini - más rápida y económica
const modeloMini = openai.image('gpt-image-1-mini');

// DALL-E 3 - Modelo anterior, aún disponible
const dalleModel = openai.image('dall-e-3');
```

### Comparativa de Modelos OpenAI

| Modelo | Velocidad | Costo | Uso recomendado |
|--------|-----------|-------|-----------------|
| `gpt-image-1` | Media | Mayor | Producción, calidad máxima |
| `gpt-image-1-mini` | Rápida | Menor | Previews, iteración rápida |
| `dall-e-3` | Media | Medio | Compatibilidad con código existente |

## Parámetros de generateImage

```typescript
const { image, images } = await generateImage({
  // === REQUERIDOS ===
  model: openai.image('gpt-image-1'),
  prompt: 'Descripción de la imagen',

  // === OPCIONALES ===
  n: 1,                    // Cantidad de imágenes (default: 1)
  size: '1024x1024',       // Dimensiones (no usar aspectRatio con OpenAI)
  seed: 12345,             // Para resultados reproducibles

  // === OPCIONES DEL PROVEEDOR ===
  providerOptions: {
    openai: {
      quality: 'high',              // 'low' | 'medium' | 'high'
      background: 'transparent',    // 'transparent' | 'opaque' (solo gpt-image-1)
    }
  },

  // === CONTROL ===
  maxRetries: 2,                    // Reintentos si falla (default: 2)
  abortSignal: controller.signal,   // Para cancelar
});
```

> **Nota**: Los modelos DALL-E no soportan `aspectRatio`. Usa `size` en su lugar.

### Tamaños Disponibles

| Size | Aspecto | Uso típico |
|------|---------|------------|
| `1024x1024` | Cuadrado | Instagram, perfil |
| `1536x1024` | Horizontal | YouTube thumbnail |
| `1024x1536` | Vertical | Stories, Pinterest |

## Anatomía de la Respuesta

```typescript
const resultado = await generateImage({
  model: openai.image('gpt-image-1'),
  prompt: 'Logo minimalista de una taquería',
  size: '1024x1024',
});

// Una sola imagen
console.log(resultado.image);
// {
//   base64: "iVBORw0KGgo...",
//   uint8Array: Uint8Array [...],
// }

// Si pediste múltiples (n > 1)
console.log(resultado.images);
// [{ base64, uint8Array }, ...]
```

El objeto `image` siempre es la primera imagen generada. El array `images` contiene todas.

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
    model: openai.image('gpt-image-1'),
    prompt: promptOptimizado,
    size: '1536x1024', // Formato YouTube
  });

  return {
    promptUsado: promptOptimizado,
    imagen: image.base64
  };
}

// Uso
const resultado = await generarThumbnail('Aprende React Router v7 en 30 minutos');
console.log('Prompt:', resultado.promptUsado);
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
    model: openai.image('gpt-image-1-mini'), // Mini para previews rápidos
    prompt,
    size: '1024x1024',
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
    .filter((r): r is NonNullable<typeof r> => r !== null);
}

// Uso
const previews = await generarPreviews('Domina TypeScript en 2026');
console.log(`Generadas ${previews.length} variantes`);
```

Usamos `Promise.allSettled` en lugar de `Promise.all` para que un error en una imagen no cancele las demás.

## Redimensionando con el Cliente OpenAI

Para generar la misma imagen en diferentes formatos (YouTube, Instagram, Stories), usamos el cliente OpenAI directamente con `images.edit()`:

```typescript
import { generateImage } from 'ai';
import { openai } from '@ai-sdk/openai';
import OpenAI, { toFile } from 'openai';

// Cliente OpenAI para edición de imágenes
const openaiClient = new OpenAI();

const FORMATOS = {
  youtube: { size: '1536x1024' as const, nombre: 'YouTube' },
  instagram: { size: '1024x1024' as const, nombre: 'Instagram' },
  stories: { size: '1024x1536' as const, nombre: 'Stories' },
};

type Formato = keyof typeof FORMATOS;

async function generarFormatos(imagenBase64: string, promptOriginal: string) {
  // Convertir base64 a File para la API de OpenAI
  const buffer = Buffer.from(imagenBase64, 'base64');
  const file = await toFile(buffer, 'imagen.png', { type: 'image/png' });

  const formatos: Formato[] = ['youtube', 'instagram', 'stories'];

  const resultados = await Promise.all(
    formatos.map(async (formato) => {
      const config = FORMATOS[formato];

      // Usar images.edit para redimensionar manteniendo el estilo
      const response = await openaiClient.images.edit({
        model: 'gpt-image-1',
        image: file,
        prompt: `${promptOriginal}. Mantén el mismo estilo y composición, adaptado a formato ${config.nombre}.`,
        size: config.size,
      });

      return {
        formato,
        nombre: config.nombre,
        imagen: response.data[0].b64_json,
      };
    })
  );

  return resultados;
}
```

> **Nota**: `images.edit()` requiere el cliente OpenAI nativo (`openai` package), no el AI SDK. Esto es porque el AI SDK aún no expone esta funcionalidad directamente.

## Proyecto Completo: Generador de Thumbnails

Combinemos todo en un módulo reutilizable:

```typescript
// lib/thumbnail-generator.ts
import { generateText, generateImage } from 'ai';
import { openai } from '@ai-sdk/openai';

const ESTILOS = {
  vibrant: 'Colores audaces, alto contraste, energético',
  minimal: 'Limpio, elegante, espacio en blanco',
  dramatic: 'Cinematográfico, sombras profundas',
  tech: 'Futurista, neón, elementos de código'
} as const;

type Estilo = keyof typeof ESTILOS;

interface ThumbnailResult {
  estilo: Estilo;
  prompt: string;
  imagen: string; // base64
}

async function crearPromptVisual(titulo: string, estilo: Estilo): Promise<string> {
  const { text } = await generateText({
    model: openai('gpt-4o-mini'),
    prompt: `Genera un prompt de imagen (máx 80 palabras) para thumbnail de YouTube.

Título: "${titulo}"
Estilo: ${ESTILOS[estilo]}

Requisitos:
- Sujeto central que capture atención
- Composición clara para verse en miniatura
- Sin personas reales, usar ilustraciones

Solo el prompt, directo.`
  });

  return text;
}

export async function generarThumbnail(
  titulo: string,
  estilo: Estilo = 'vibrant'
): Promise<ThumbnailResult> {
  const prompt = await crearPromptVisual(titulo, estilo);

  const { image } = await generateImage({
    model: openai.image('gpt-image-1-mini'),
    prompt,
    size: '1024x1024',
  });

  return {
    estilo,
    prompt,
    imagen: image.base64,
  };
}

export async function generarTodosLosEstilos(titulo: string): Promise<ThumbnailResult[]> {
  const estilos: Estilo[] = ['vibrant', 'minimal', 'dramatic', 'tech'];

  const resultados = await Promise.allSettled(
    estilos.map(estilo => generarThumbnail(titulo, estilo))
  );

  return resultados
    .filter((r): r is PromiseFulfilledResult<ThumbnailResult> => r.status === 'fulfilled')
    .map(r => r.value);
}
```

## Integrando con React Router v7

```typescript
// app/routes/api.thumbnails.ts
import type { Route } from "./+types/api.thumbnails";
import { generarThumbnail, generarTodosLosEstilos } from '~/lib/thumbnail-generator';

export async function action({ request }: Route.ActionArgs) {
  const { titulo, estilo, modo } = await request.json();

  try {
    if (modo === 'previews') {
      const resultados = await generarTodosLosEstilos(titulo);
      return Response.json({ previews: resultados });
    }

    const resultado = await generarThumbnail(titulo, estilo || 'vibrant');
    return Response.json(resultado);
  } catch (error) {
    console.error('Error generando thumbnail:', error);
    return Response.json({ error: 'Error al generar imagen' }, { status: 500 });
  }
}
```

## Mostrando Imágenes Base64 en React

```tsx
interface ThumbnailPreviewProps {
  base64: string;
  estilo: string;
}

export function ThumbnailPreview({ base64, estilo }: ThumbnailPreviewProps) {
  return (
    <div className="relative group">
      <img
        src={`data:image/png;base64,${base64}`}
        alt={`Thumbnail estilo ${estilo}`}
        className="rounded-lg shadow-lg w-full"
      />
      <span className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
        {estilo}
      </span>
    </div>
  );
}

// Grid de previews
function ThumbnailGrid({ previews }: { previews: ThumbnailResult[] }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {previews.map((preview) => (
        <ThumbnailPreview
          key={preview.estilo}
          base64={preview.imagen}
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
  const link = document.createElement('a');
  link.href = `data:image/png;base64,${base64}`;
  link.download = nombreArchivo;
  link.click();
}

// Uso en un botón
<button onClick={() => descargarImagen(preview.imagen, `thumbnail-${preview.estilo}.png`)}>
  Descargar
</button>
```

## Costos y Consideraciones

### Precio por Imagen (OpenAI, enero 2026)

| Modelo | 1024x1024 | 1536x1024 / 1024x1536 |
|--------|-----------|------------------------|
| gpt-image-1 | ~$0.04 USD | ~$0.08 USD |
| gpt-image-1-mini | ~$0.02 USD | ~$0.04 USD |

**Ejemplo de costo**: Generar 4 variantes de thumbnail:
- 4 imágenes con mini × $0.02 = **$0.08 USD** (~$1.50 MXN)
- Más optimización de prompts: ~$0.01 USD

### Límites de Rate

OpenAI tiene límites por minuto según tu tier. Para aplicaciones con alto volumen, implementa una cola de procesamiento.

## Manejo de Errores

```typescript
async function generarConReintentos(prompt: string, intentos = 3) {
  for (let i = 0; i < intentos; i++) {
    try {
      const { image } = await generateImage({
        model: openai.image('gpt-image-1-mini'),
        prompt,
        size: '1024x1024',
      });
      return image;
    } catch (error: any) {
      console.error(`Intento ${i + 1} fallido:`, error.message);

      if (error.message?.includes('content_policy')) {
        throw new Error('El prompt viola las políticas de contenido');
      }

      if (error.message?.includes('rate_limit')) {
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
| `openai.image('gpt-image-1')` | Modelo de imagen de OpenAI |
| `openai.image('gpt-image-1-mini')` | Versión rápida y económica |
| `image.base64` | Imagen codificada para web |
| Pipeline texto→imagen | Optimizar prompts con LLM antes de generar |
| `Promise.allSettled` | Generación paralela tolerante a fallos |
| Cliente OpenAI nativo | Para `images.edit()` y redimensionado |

### ¿Cuándo usar generateImage?

| Usa generateImage | NO uses generateImage |
|-------------------|----------------------|
| Thumbnails, banners, ilustraciones | Fotos de personas reales |
| Contenido de marketing | Logos con texto preciso |
| Variantes de producto | Alto volumen sin cola |
| Visualizaciones de conceptos | Edición compleja de fotos |

---

En el próximo capítulo exploraremos **Embeddings**: cómo convertir texto en vectores numéricos para búsqueda semántica, la base de los sistemas RAG que permiten a tu aplicación "entender" documentos.
