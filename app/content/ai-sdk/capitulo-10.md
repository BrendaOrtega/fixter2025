# Capítulo 10: RAG — Retrieval Augmented Generation

En el capítulo anterior construimos un sistema de búsqueda semántica: embeddings, chunks, similitud coseno. Pero buscar no es lo mismo que responder. En este capítulo daremos el salto de "encontrar información relevante" a "generar respuestas inteligentes basadas en esa información".

RAG es el patrón que hace posible que un modelo responda preguntas sobre documentos que nunca vio durante su entrenamiento.

## Código Primero

Construyamos un asistente de Recursos Humanos que responde preguntas sobre políticas de empresa:

```typescript
import { embed, embedMany, generateText, cosineSimilarity } from 'ai';
import { openai } from '@ai-sdk/openai';

// Documentos de políticas de la empresa
const documentos = [
  {
    id: 'vacaciones',
    titulo: 'Política de Vacaciones',
    contenido: `
      Los empleados tienen derecho a días de vacaciones según su antigüedad:
      - Primer año: 12 días
      - Segundo año: 14 días
      - Tercer año en adelante: 16 días + 2 días adicionales por cada año

      Las vacaciones deben solicitarse con mínimo 15 días de anticipación.
      El período vacacional no puede exceder 10 días continuos sin autorización especial.
      Los días no utilizados pueden acumularse hasta un máximo de 24 días.
    `
  },
  {
    id: 'home-office',
    titulo: 'Política de Trabajo Remoto',
    contenido: `
      El trabajo remoto está disponible para posiciones elegibles:
      - Máximo 3 días por semana en home office
      - Requiere aprobación del supervisor directo
      - El empleado debe tener mínimo 6 meses de antigüedad

      Para solicitar home office:
      1. Llenar formato HR-WFH-001 en el portal de empleados
      2. Esperar aprobación (máximo 5 días hábiles)
      3. Firmar addendum al contrato

      El equipo de cómputo es proporcionado por la empresa.
    `
  },
  {
    id: 'incapacidad',
    titulo: 'Proceso de Incapacidad',
    contenido: `
      En caso de enfermedad o accidente:
      1. Notificar a tu supervisor inmediato el mismo día
      2. Acudir al IMSS para obtener incapacidad oficial
      3. Enviar copia de la incapacidad a RH dentro de 48 horas

      El IMSS cubre el 60% del salario a partir del cuarto día.
      La empresa complementa hasta el 100% del salario los primeros 15 días.

      Para incapacidades mayores a 15 días, contactar directamente a RH.
    `
  },
  {
    id: 'aguinaldo',
    titulo: 'Aguinaldo y PTU',
    contenido: `
      Aguinaldo:
      - Se paga antes del 20 de diciembre
      - Mínimo legal: 15 días de salario
      - La empresa otorga 20 días de salario
      - Proporcional para empleados con menos de un año

      PTU (Participación de los Trabajadores en las Utilidades):
      - Se paga en mayo del año siguiente
      - Calculado según días trabajados y salario
      - Solo aplica si la empresa tuvo utilidades
      - Empleados con menos de 60 días trabajados no tienen derecho
    `
  }
];

// Tipos para nuestro sistema
interface Chunk {
  id: string;
  documentoId: string;
  titulo: string;
  contenido: string;
  embedding?: number[];
}

interface ResultadoBusqueda {
  chunk: Chunk;
  score: number;
}

// Paso 1: Crear chunks de los documentos
function crearChunks(docs: typeof documentos): Chunk[] {
  return docs.map(doc => ({
    id: `${doc.id}-main`,
    documentoId: doc.id,
    titulo: doc.titulo,
    contenido: doc.contenido.trim(),
  }));
}

// Paso 2: Generar embeddings para todos los chunks
async function indexarChunks(chunks: Chunk[]): Promise<Chunk[]> {
  const { embeddings } = await embedMany({
    model: openai.embedding('text-embedding-3-small'),
    values: chunks.map(c => `${c.titulo}\n\n${c.contenido}`),
  });

  return chunks.map((chunk, i) => ({
    ...chunk,
    embedding: embeddings[i],
  }));
}

// Paso 3: Buscar chunks relevantes
async function buscar(
  consulta: string,
  chunksIndexados: Chunk[],
  topK: number = 3
): Promise<ResultadoBusqueda[]> {
  const { embedding: consultaEmbedding } = await embed({
    model: openai.embedding('text-embedding-3-small'),
    value: consulta,
  });

  const resultados = chunksIndexados
    .map(chunk => ({
      chunk,
      score: cosineSimilarity(consultaEmbedding, chunk.embedding!),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return resultados;
}

// Paso 4: Generar respuesta con contexto (RAG)
async function responderPregunta(
  pregunta: string,
  chunksIndexados: Chunk[]
): Promise<string> {
  // Buscar información relevante
  const resultados = await buscar(pregunta, chunksIndexados, 3);

  // Construir contexto para el modelo
  const contexto = resultados
    .map((r, i) => `[${i + 1}] ${r.chunk.titulo}:\n${r.chunk.contenido}`)
    .join('\n\n---\n\n');

  // Generar respuesta
  const { text } = await generateText({
    model: openai('gpt-4o-mini'),
    system: `Eres el asistente de Recursos Humanos de la empresa.
Responde ÚNICAMENTE basándote en la información proporcionada.
Si la información no está en el contexto, di "No tengo información sobre eso".
Cuando uses información, cita la fuente entre corchetes [1], [2], etc.
Sé conciso y amable.`,
    prompt: `Contexto disponible:
${contexto}

Pregunta del empleado: ${pregunta}`,
  });

  // Agregar fuentes al final
  const fuentes = resultados
    .map((r, i) => `[${i + 1}] ${r.chunk.titulo}`)
    .join('\n');

  return `${text}\n\n---\nFuentes consultadas:\n${fuentes}`;
}

// Uso completo
async function main() {
  console.log('Indexando documentos de políticas...');
  const chunks = crearChunks(documentos);
  const chunksIndexados = await indexarChunks(chunks);
  console.log(`${chunksIndexados.length} documentos indexados.\n`);

  const preguntas = [
    '¿Cuántos días de vacaciones tengo después de 2 años?',
    '¿Cómo solicito home office?',
    '¿Qué pasa si me enfermo?',
  ];

  for (const pregunta of preguntas) {
    console.log(`Pregunta: ${pregunta}`);
    const respuesta = await responderPregunta(pregunta, chunksIndexados);
    console.log(`Respuesta:\n${respuesta}\n`);
  }
}

main();
```

Ejecuta esto y verás respuestas como:

```
Pregunta: ¿Cuántos días de vacaciones tengo después de 2 años?
Respuesta:
Después de 2 años en la empresa, tienes derecho a 14 días de vacaciones [1].
Recuerda que debes solicitarlas con mínimo 15 días de anticipación.

---
Fuentes consultadas:
[1] Política de Vacaciones
```

## ¿Qué Acaba de Pasar?

El flujo RAG tiene dos fases distintas:

```
INDEXACIÓN (una vez):
┌─────────────┐    ┌──────────┐    ┌────────────┐    ┌─────────────┐
│ Documentos  │ -> │ Chunking │ -> │ embedMany  │ -> │ Almacenar   │
└─────────────┘    └──────────┘    └────────────┘    └─────────────┘

CONSULTA (cada pregunta):
┌──────────┐    ┌─────────┐    ┌───────────┐    ┌─────────────┐    ┌──────────┐
│ Pregunta │ -> │  embed  │ -> │ Similitud │ -> │ Top-K       │ -> │ Contexto │
└──────────┘    └─────────┘    └───────────┘    └─────────────┘    └──────────┘
                                                                         │
                                                                         v
┌──────────┐    ┌──────────────┐    ┌─────────────────────────────────────────┐
│ Respuesta│ <- │ generateText │ <- │ System prompt + Contexto + Pregunta     │
└──────────┘    └──────────────┘    └─────────────────────────────────────────┘
```

La magia está en el paso final: el modelo no "sabe" sobre las políticas de tu empresa, pero **puede razonar sobre información que le proporcionas en el prompt**.

## Chunking Avanzado

El chunking del ejemplo anterior es ingenuo: un documento = un chunk. En producción, necesitas estrategias más sofisticadas.

### Por qué importa el chunking

| Chunks muy pequeños | Chunks muy grandes |
|--------------------|--------------------|
| Pierden contexto | Diluyen la relevancia |
| Búsqueda fragmentada | Desperdician tokens |
| Respuestas incompletas | Incluyen ruido |

El tamaño ideal depende del contenido. Para políticas de HR, chunks de 200-500 tokens funcionan bien.

### Chunking por secciones

```typescript
interface ChunkConMetadata {
  id: string;
  contenido: string;
  metadata: {
    documento: string;
    seccion: string;
    subseccion?: string;
    tipo: 'politica' | 'proceso' | 'beneficio';
  };
  embedding?: number[];
}

function chunkearPorSecciones(markdown: string, documentoId: string): ChunkConMetadata[] {
  const chunks: ChunkConMetadata[] = [];
  const lineas = markdown.split('\n');

  let seccionActual = '';
  let subseccionActual = '';
  let contenidoActual: string[] = [];

  for (const linea of lineas) {
    // Detectar headers
    if (linea.startsWith('## ')) {
      // Guardar chunk anterior si existe
      if (contenidoActual.length > 0) {
        chunks.push({
          id: `${documentoId}-${seccionActual}-${chunks.length}`,
          contenido: contenidoActual.join('\n').trim(),
          metadata: {
            documento: documentoId,
            seccion: seccionActual,
            subseccion: subseccionActual || undefined,
            tipo: detectarTipo(seccionActual),
          },
        });
        contenidoActual = [];
      }
      seccionActual = linea.replace('## ', '');
      subseccionActual = '';
    } else if (linea.startsWith('### ')) {
      // Nueva subsección
      if (contenidoActual.length > 0) {
        chunks.push({
          id: `${documentoId}-${seccionActual}-${subseccionActual}-${chunks.length}`,
          contenido: contenidoActual.join('\n').trim(),
          metadata: {
            documento: documentoId,
            seccion: seccionActual,
            subseccion: subseccionActual || undefined,
            tipo: detectarTipo(seccionActual),
          },
        });
        contenidoActual = [];
      }
      subseccionActual = linea.replace('### ', '');
    } else if (linea.trim()) {
      contenidoActual.push(linea);
    }
  }

  // Último chunk
  if (contenidoActual.length > 0) {
    chunks.push({
      id: `${documentoId}-${seccionActual}-final`,
      contenido: contenidoActual.join('\n').trim(),
      metadata: {
        documento: documentoId,
        seccion: seccionActual,
        subseccion: subseccionActual || undefined,
        tipo: detectarTipo(seccionActual),
      },
    });
  }

  return chunks;
}

function detectarTipo(seccion: string): 'politica' | 'proceso' | 'beneficio' {
  const lower = seccion.toLowerCase();
  if (lower.includes('proceso') || lower.includes('cómo')) return 'proceso';
  if (lower.includes('beneficio') || lower.includes('derecho')) return 'beneficio';
  return 'politica';
}
```

### Chunking con overlap

El overlap previene que pierdas contexto en los límites:

```typescript
function chunkearConOverlap(
  texto: string,
  tamanoChunk: number = 500,
  overlap: number = 50
): string[] {
  const palabras = texto.split(/\s+/);
  const chunks: string[] = [];

  let inicio = 0;
  while (inicio < palabras.length) {
    const fin = Math.min(inicio + tamanoChunk, palabras.length);
    chunks.push(palabras.slice(inicio, fin).join(' '));

    // Avanzar menos que el tamaño del chunk para crear overlap
    inicio += tamanoChunk - overlap;
  }

  return chunks;
}

// Ejemplo
const texto = 'El aguinaldo se paga antes del 20 de diciembre. Mínimo legal es 15 días...';
const chunks = chunkearConOverlap(texto, 100, 20);
// Chunk 1: palabras 0-100
// Chunk 2: palabras 80-180 (overlap de 20 palabras)
// Chunk 3: palabras 160-260
```

### Tabla de estrategias

| Estrategia | Ideal para | Tamaño típico |
|------------|------------|---------------|
| Por secciones | Documentos estructurados (manuales, políticas) | Variable |
| Por párrafos | Prosa general | 100-300 tokens |
| Con overlap | Textos largos sin estructura clara | 500 tokens, 10% overlap |
| Por entidad | Código fuente | Por función/clase |

## Metadata y Filtrado

La metadata convierte búsqueda genérica en búsqueda precisa.

### Enriqueciendo chunks

```typescript
interface ChunkEnriquecido {
  id: string;
  contenido: string;
  embedding: number[];
  metadata: {
    // Origen
    documento: string;
    seccion: string;
    fechaActualizacion: Date;

    // Clasificación
    tipo: 'politica' | 'proceso' | 'beneficio' | 'contacto';
    departamento: 'rh' | 'finanzas' | 'legal' | 'general';
    nivel: 'basico' | 'detallado';

    // Aplicabilidad
    aplica: ('tiempo-completo' | 'medio-tiempo' | 'practicante')[];
    antiguedadMinima?: number; // meses
  };
}
```

### Pre-filtrado antes de búsqueda

Filtrar ANTES de calcular similitud reduce ruido y mejora velocidad:

```typescript
async function buscarConFiltros(
  consulta: string,
  chunks: ChunkEnriquecido[],
  filtros: {
    tipo?: string;
    departamento?: string;
    tipoEmpleado?: string;
  }
): Promise<ResultadoBusqueda[]> {
  // Paso 1: Filtrar por metadata
  let candidatos = chunks;

  if (filtros.tipo) {
    candidatos = candidatos.filter(c => c.metadata.tipo === filtros.tipo);
  }
  if (filtros.departamento) {
    candidatos = candidatos.filter(c => c.metadata.departamento === filtros.departamento);
  }
  if (filtros.tipoEmpleado) {
    candidatos = candidatos.filter(c =>
      c.metadata.aplica.includes(filtros.tipoEmpleado as any)
    );
  }

  // Paso 2: Búsqueda semántica solo en candidatos filtrados
  const { embedding: queryEmb } = await embed({
    model: openai.embedding('text-embedding-3-small'),
    value: consulta,
  });

  return candidatos
    .map(chunk => ({
      chunk,
      score: cosineSimilarity(queryEmb, chunk.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

// Uso
const resultados = await buscarConFiltros(
  '¿Cuántas vacaciones tengo?',
  chunksIndexados,
  { tipo: 'beneficio', departamento: 'rh' }
);
```

### Inferir filtros de la pregunta

```typescript
import { generateText, Output } from 'ai';
import { z } from 'zod';

const filtrosSchema = z.object({
  tipo: z.enum(['politica', 'proceso', 'beneficio', 'contacto']).optional(),
  departamento: z.enum(['rh', 'finanzas', 'legal', 'general']).optional(),
  urgente: z.boolean(),
});

async function inferirFiltros(pregunta: string) {
  const { object } = await generateText({
    model: openai('gpt-4o-mini'),
    output: Output.object({ schema: filtrosSchema }),
    prompt: `Analiza esta pregunta de un empleado y determina los filtros apropiados:

Pregunta: "${pregunta}"

- tipo: ¿Es sobre una política, un proceso a seguir, un beneficio, o busca contacto?
- departamento: ¿A qué departamento corresponde?
- urgente: ¿Parece urgente (enfermedad, accidente, problema grave)?`,
  });

  return object;
}

// Ejemplo
const filtros = await inferirFiltros('Me lastimé en el trabajo, ¿qué hago?');
// { tipo: 'proceso', departamento: 'rh', urgente: true }
```

## Re-Ranking

La similitud coseno es una aproximación. Un chunk puede tener alta similitud pero baja relevancia real.

### El problema

Pregunta: "¿Cuántos días de vacaciones tengo?"

| Chunk | Similitud | Contenido |
|-------|-----------|-----------|
| A | 0.89 | "Los días de descanso obligatorio incluyen: 1 de enero..." |
| B | 0.85 | "Después del primer año, tienes 12 días de vacaciones..." |
| C | 0.82 | "Para solicitar días de vacaciones, llena el formato..." |

El chunk A tiene mayor similitud (ambos hablan de "días") pero el chunk B responde la pregunta.

### Re-ranking con LLM

```typescript
import { generateText, Output } from 'ai';
import { z } from 'zod';

const rankingSchema = z.object({
  ranking: z.array(z.object({
    indice: z.number(),
    relevancia: z.number().min(0).max(10),
    razon: z.string(),
  })),
});

async function reRankear(
  pregunta: string,
  resultados: ResultadoBusqueda[],
  topN: number = 3
): Promise<ResultadoBusqueda[]> {
  // Preparar chunks para evaluación
  const chunksTexto = resultados
    .map((r, i) => `[${i}] ${r.chunk.contenido.slice(0, 500)}`)
    .join('\n\n');

  const { object } = await generateText({
    model: openai('gpt-4o-mini'),
    output: Output.object({ schema: rankingSchema }),
    prompt: `Evalúa qué tan relevante es cada fragmento para responder la pregunta.

Pregunta: "${pregunta}"

Fragmentos:
${chunksTexto}

Para cada fragmento, asigna:
- relevancia: 0-10 (10 = responde directamente la pregunta)
- razon: Por qué es o no relevante`,
  });

  // Reordenar por relevancia del LLM
  const reordenados = object.ranking
    .sort((a, b) => b.relevancia - a.relevancia)
    .slice(0, topN)
    .map(r => resultados[r.indice]);

  return reordenados;
}
```

### Re-ranking híbrido (rápido)

Combina similitud con keywords sin llamar al LLM:

```typescript
function reRankearHibrido(
  pregunta: string,
  resultados: ResultadoBusqueda[],
  pesoKeywords: number = 0.3
): ResultadoBusqueda[] {
  // Extraer palabras clave de la pregunta
  const keywords = pregunta
    .toLowerCase()
    .split(/\s+/)
    .filter(p => p.length > 3)
    .filter(p => !['cuántos', 'cómo', 'cuál', 'qué', 'tengo', 'puedo'].includes(p));

  return resultados
    .map(r => {
      const contenidoLower = r.chunk.contenido.toLowerCase();

      // Contar coincidencias de keywords
      const coincidencias = keywords.filter(k => contenidoLower.includes(k)).length;
      const boostKeywords = coincidencias / keywords.length;

      // Score combinado
      const scoreHibrido = r.score * (1 - pesoKeywords) + boostKeywords * pesoKeywords;

      return { ...r, score: scoreHibrido };
    })
    .sort((a, b) => b.score - a.score);
}
```

### Comparativa de métodos

| Método | Velocidad | Precisión | Costo |
|--------|-----------|-----------|-------|
| Solo similitud | Rápida | Media | Bajo |
| Boost keywords | Rápida | Media-Alta | Bajo |
| Re-rank LLM | Lenta (~500ms) | Alta | ~$0.001/query |
| Híbrido + LLM | Media | Muy alta | ~$0.001/query |

**Recomendación:** Usa híbrido para la mayoría de casos. Agrega LLM solo si la precisión es crítica.

## Contexto Dinámico

No siempre más contexto es mejor. Demasiado contexto:
- Desperdicia tokens (costo)
- Diluye la información relevante
- Confunde al modelo

### Calcular tokens disponibles

```typescript
function calcularPresupuestoContexto(
  modeloLimite: number,      // ej: 128000 para GPT-4o
  systemPromptTokens: number, // ej: 200
  historialTokens: number,    // ej: 1000 (conversación previa)
  margenRespuesta: number     // ej: 1000
): number {
  return modeloLimite - systemPromptTokens - historialTokens - margenRespuesta;
}

// Ejemplo
const disponible = calcularPresupuestoContexto(128000, 200, 1000, 1000);
// 125,800 tokens disponibles para RAG

// Pero no necesitas tanto. 3,000-5,000 tokens suele ser suficiente
```

### Selección adaptativa

```typescript
function seleccionarChunks(
  resultados: ResultadoBusqueda[],
  presupuestoTokens: number,
  umbralMinimo: number = 0.5
): ResultadoBusqueda[] {
  const seleccionados: ResultadoBusqueda[] = [];
  let tokensUsados = 0;

  for (const resultado of resultados) {
    // Saltar chunks con score bajo
    if (resultado.score < umbralMinimo) continue;

    // Estimar tokens (aproximación: 1 token ≈ 4 caracteres en español)
    const tokensChunk = Math.ceil(resultado.chunk.contenido.length / 4);

    // ¿Cabe en el presupuesto?
    if (tokensUsados + tokensChunk > presupuestoTokens) break;

    seleccionados.push(resultado);
    tokensUsados += tokensChunk;
  }

  return seleccionados;
}

// Uso
const chunks = seleccionarChunks(resultadosOrdenados, 3000, 0.6);
```

### Reglas prácticas

| Tipo de pregunta | Chunks recomendados | Tokens aprox |
|------------------|---------------------|--------------|
| Factual simple | 1-2 | 500-1000 |
| Proceso/pasos | 2-3 | 1000-2000 |
| Comparación | 3-5 | 2000-3000 |
| Análisis complejo | 5-10 | 3000-5000 |

## Manejo de Formatos

### Markdown

```typescript
function procesarMarkdown(contenido: string): string {
  return contenido
    // Remover links pero mantener texto
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remover imágenes
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    // Simplificar headers
    .replace(/^#+\s+/gm, '')
    // Limpiar código inline
    .replace(/`([^`]+)`/g, '$1')
    // Normalizar espacios
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
```

### HTML

```typescript
// Usando cheerio para parsing
import * as cheerio from 'cheerio';

function procesarHTML(html: string): string {
  const $ = cheerio.load(html);

  // Remover elementos no deseados
  $('script, style, nav, footer, header').remove();

  // Extraer texto de elementos relevantes
  const secciones: string[] = [];

  $('article, main, .content, section').each((_, el) => {
    const texto = $(el).text().trim();
    if (texto.length > 50) {
      secciones.push(texto);
    }
  });

  // Si no hay secciones específicas, usar body
  if (secciones.length === 0) {
    secciones.push($('body').text().trim());
  }

  return secciones
    .join('\n\n')
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n');
}
```

### Código fuente

```typescript
function procesarCodigo(codigo: string, lenguaje: string): string {
  // Para código, mantener estructura pero agregar contexto
  const lineas = codigo.split('\n');
  const funciones: string[] = [];

  let funcionActual: string[] = [];
  let dentroFuncion = false;

  for (const linea of lineas) {
    // Detectar inicio de función (simplificado para TypeScript)
    if (linea.match(/^(export\s+)?(async\s+)?function\s+\w+/)) {
      if (funcionActual.length > 0) {
        funciones.push(funcionActual.join('\n'));
      }
      funcionActual = [linea];
      dentroFuncion = true;
    } else if (dentroFuncion) {
      funcionActual.push(linea);
      // Detectar fin de función (simplificado)
      if (linea === '}') {
        funciones.push(funcionActual.join('\n'));
        funcionActual = [];
        dentroFuncion = false;
      }
    }
  }

  return funciones.join('\n\n---\n\n');
}
```

### Tabla de procesamiento

| Formato | Biblioteca | Consideraciones |
|---------|------------|-----------------|
| Markdown | Regex / marked | Preservar estructura de headers |
| HTML | cheerio / jsdom | Extraer solo contenido relevante |
| PDF | pdf-parse | OCR puede ser necesario |
| DOCX | mammoth | Convertir a HTML primero |
| Código | ts-morph / babel | Dividir por funciones/clases |

## Citación y Fuentes

Las citas hacen que las respuestas sean verificables.

### Instruir al modelo

```typescript
const systemPromptConCitas = `Eres el asistente de Recursos Humanos.

REGLAS IMPORTANTES:
1. Responde SOLO con información del contexto proporcionado
2. Cita SIEMPRE la fuente entre corchetes: [1], [2], etc.
3. Si no hay información suficiente, di "No tengo información sobre eso"
4. Sé conciso pero completo

FORMATO DE RESPUESTA:
- Respuesta directa con citas inline
- Lista de fuentes al final`;
```

### Construir contexto con índices

```typescript
function construirContextoConIndices(
  resultados: ResultadoBusqueda[]
): { contexto: string; fuentes: string[] } {
  const fuentes: string[] = [];

  const contexto = resultados
    .map((r, i) => {
      const indice = i + 1;
      fuentes.push(`[${indice}] ${r.chunk.metadata.documento} - ${r.chunk.metadata.seccion}`);
      return `[${indice}] ${r.chunk.contenido}`;
    })
    .join('\n\n---\n\n');

  return { contexto, fuentes };
}
```

### Verificar que las citas existen

```typescript
function verificarCitas(respuesta: string, numFuentes: number): string[] {
  const citasUsadas = respuesta.match(/\[(\d+)\]/g) || [];
  const indices = citasUsadas.map(c => parseInt(c.replace(/[\[\]]/g, '')));

  const advertencias: string[] = [];

  // Citas que no existen
  const citasInvalidas = indices.filter(i => i > numFuentes || i < 1);
  if (citasInvalidas.length > 0) {
    advertencias.push(`Citas inválidas: ${citasInvalidas.join(', ')}`);
  }

  return advertencias;
}
```

## Sistema Completo de Producción

Combinemos todo en un módulo reutilizable:

```typescript
// lib/rag-hr.ts
import { embed, embedMany, generateText, cosineSimilarity, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

// Tipos
export interface Documento {
  id: string;
  titulo: string;
  contenido: string;
  tipo: 'politica' | 'proceso' | 'beneficio';
  departamento: string;
  fechaActualizacion: Date;
}

export interface Chunk {
  id: string;
  documentoId: string;
  contenido: string;
  metadata: {
    titulo: string;
    seccion: string;
    tipo: string;
    departamento: string;
  };
  embedding?: number[];
}

export interface RespuestaRAG {
  respuesta: string;
  fuentes: Array<{
    documento: string;
    seccion: string;
    relevancia: number;
  }>;
  tokensUsados: number;
}

// Configuración
interface ConfigRAG {
  modelo?: string;
  modeloEmbeddings?: string;
  topK?: number;
  umbralRelevancia?: number;
  maxTokensContexto?: number;
}

const configDefault: Required<ConfigRAG> = {
  modelo: 'gpt-4o-mini',
  modeloEmbeddings: 'text-embedding-3-small',
  topK: 5,
  umbralRelevancia: 0.5,
  maxTokensContexto: 3000,
};

// Clase principal
export class AsistenteHR {
  private chunks: Chunk[] = [];
  private config: Required<ConfigRAG>;

  constructor(config: ConfigRAG = {}) {
    this.config = { ...configDefault, ...config };
  }

  // Indexar documentos
  async indexar(documentos: Documento[]): Promise<void> {
    // Crear chunks
    this.chunks = documentos.flatMap(doc => this.chunkearDocumento(doc));

    // Generar embeddings
    const { embeddings } = await embedMany({
      model: openai.embedding(this.config.modeloEmbeddings),
      values: this.chunks.map(c => `${c.metadata.titulo}: ${c.contenido}`),
    });

    // Asignar embeddings
    this.chunks = this.chunks.map((chunk, i) => ({
      ...chunk,
      embedding: embeddings[i],
    }));

    console.log(`Indexados ${this.chunks.length} chunks de ${documentos.length} documentos`);
  }

  // Responder pregunta
  async preguntar(pregunta: string): Promise<RespuestaRAG> {
    // 1. Buscar chunks relevantes
    const resultados = await this.buscar(pregunta);

    // 2. Filtrar por relevancia
    const relevantes = resultados.filter(r => r.score >= this.config.umbralRelevancia);

    if (relevantes.length === 0) {
      return {
        respuesta: 'No encontré información relevante sobre tu pregunta. ¿Podrías reformularla o contactar directamente a RH?',
        fuentes: [],
        tokensUsados: 0,
      };
    }

    // 3. Seleccionar chunks dentro del presupuesto
    const seleccionados = this.seleccionarPorPresupuesto(relevantes);

    // 4. Construir contexto
    const { contexto, fuentes } = this.construirContexto(seleccionados);

    // 5. Generar respuesta
    const { text, usage } = await generateText({
      model: openai(this.config.modelo),
      system: this.getSystemPrompt(),
      prompt: `CONTEXTO DISPONIBLE:\n${contexto}\n\nPREGUNTA: ${pregunta}`,
    });

    return {
      respuesta: text,
      fuentes: fuentes.map((f, i) => ({
        documento: f.documento,
        seccion: f.seccion,
        relevancia: seleccionados[i].score,
      })),
      tokensUsados: usage.totalTokens,
    };
  }

  // Métodos privados
  private chunkearDocumento(doc: Documento): Chunk[] {
    const secciones = doc.contenido.split(/\n(?=##?\s)/);

    return secciones
      .filter(s => s.trim().length > 50)
      .map((seccion, i) => {
        const primeraLinea = seccion.split('\n')[0];
        const tituloSeccion = primeraLinea.replace(/^#+\s*/, '') || `Sección ${i + 1}`;

        return {
          id: `${doc.id}-${i}`,
          documentoId: doc.id,
          contenido: seccion.trim(),
          metadata: {
            titulo: doc.titulo,
            seccion: tituloSeccion,
            tipo: doc.tipo,
            departamento: doc.departamento,
          },
        };
      });
  }

  private async buscar(consulta: string): Promise<Array<{ chunk: Chunk; score: number }>> {
    const { embedding } = await embed({
      model: openai.embedding(this.config.modeloEmbeddings),
      value: consulta,
    });

    return this.chunks
      .map(chunk => ({
        chunk,
        score: cosineSimilarity(embedding, chunk.embedding!),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, this.config.topK);
  }

  private seleccionarPorPresupuesto(
    resultados: Array<{ chunk: Chunk; score: number }>
  ): Array<{ chunk: Chunk; score: number }> {
    const seleccionados: typeof resultados = [];
    let tokensUsados = 0;

    for (const r of resultados) {
      const tokensChunk = Math.ceil(r.chunk.contenido.length / 4);
      if (tokensUsados + tokensChunk > this.config.maxTokensContexto) break;

      seleccionados.push(r);
      tokensUsados += tokensChunk;
    }

    return seleccionados;
  }

  private construirContexto(
    resultados: Array<{ chunk: Chunk; score: number }>
  ): { contexto: string; fuentes: Array<{ documento: string; seccion: string }> } {
    const fuentes = resultados.map(r => ({
      documento: r.chunk.metadata.titulo,
      seccion: r.chunk.metadata.seccion,
    }));

    const contexto = resultados
      .map((r, i) => `[${i + 1}] ${r.chunk.metadata.titulo} - ${r.chunk.metadata.seccion}:\n${r.chunk.contenido}`)
      .join('\n\n---\n\n');

    return { contexto, fuentes };
  }

  private getSystemPrompt(): string {
    return `Eres el asistente virtual de Recursos Humanos.

TU TRABAJO:
- Responder preguntas sobre políticas, beneficios y procesos de la empresa
- Usar ÚNICAMENTE la información del contexto proporcionado
- Citar fuentes con [1], [2], etc.

REGLAS:
- Si no hay información en el contexto, di "No tengo información sobre eso"
- Sé amable y profesional
- Responde en español
- Sé conciso pero completo

FORMATO:
1. Respuesta directa con citas
2. Si aplica, pasos a seguir
3. Contacto de RH si es necesario`;
  }
}
```

### Uso del sistema

```typescript
import { AsistenteHR, Documento } from './lib/rag-hr';

// Crear instancia
const asistente = new AsistenteHR({
  topK: 5,
  umbralRelevancia: 0.6,
  maxTokensContexto: 4000,
});

// Cargar documentos
const documentos: Documento[] = [
  {
    id: 'vacaciones-2024',
    titulo: 'Política de Vacaciones 2024',
    contenido: '## Días por antigüedad\n...',
    tipo: 'beneficio',
    departamento: 'rh',
    fechaActualizacion: new Date('2024-01-15'),
  },
  // ... más documentos
];

await asistente.indexar(documentos);

// Consultar
const respuesta = await asistente.preguntar('¿Cuántos días de vacaciones tengo después de 3 años?');

console.log(respuesta.respuesta);
// "Después de 3 años en la empresa, tienes derecho a 18 días de vacaciones [1]..."

console.log('Fuentes:', respuesta.fuentes);
// [{ documento: 'Política de Vacaciones 2024', seccion: 'Días por antigüedad', relevancia: 0.89 }]
```

## Integración con React Router v7

### Endpoint API

```typescript
// app/routes/api.hr-chat.ts
import type { Route } from './+types/api.hr-chat';
import { AsistenteHR } from '~/lib/rag-hr';
import { documentosHR } from '~/data/documentos-hr';

// Inicializar asistente (singleton)
let asistente: AsistenteHR | null = null;

async function getAsistente() {
  if (!asistente) {
    asistente = new AsistenteHR();
    await asistente.indexar(documentosHR);
  }
  return asistente;
}

export async function action({ request }: Route.ActionArgs) {
  const { pregunta } = await request.json();

  if (!pregunta || typeof pregunta !== 'string') {
    return Response.json({ error: 'Pregunta requerida' }, { status: 400 });
  }

  const hr = await getAsistente();
  const respuesta = await hr.preguntar(pregunta);

  return Response.json(respuesta);
}
```

### Componente de chat

```tsx
// app/routes/hr.tsx
import { useState } from 'react';

interface Mensaje {
  rol: 'usuario' | 'asistente';
  contenido: string;
  fuentes?: Array<{ documento: string; seccion: string }>;
}

export default function HRChat() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [input, setInput] = useState('');
  const [cargando, setCargando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || cargando) return;

    const pregunta = input.trim();
    setInput('');
    setMensajes(prev => [...prev, { rol: 'usuario', contenido: pregunta }]);
    setCargando(true);

    try {
      const res = await fetch('/api/hr-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pregunta }),
      });

      const data = await res.json();

      setMensajes(prev => [
        ...prev,
        {
          rol: 'asistente',
          contenido: data.respuesta,
          fuentes: data.fuentes,
        },
      ]);
    } catch (error) {
      setMensajes(prev => [
        ...prev,
        { rol: 'asistente', contenido: 'Hubo un error. Intenta de nuevo.' },
      ]);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Asistente de Recursos Humanos</h1>

      <div className="space-y-4 mb-4 h-96 overflow-y-auto">
        {mensajes.map((m, i) => (
          <div
            key={i}
            className={`p-3 rounded-lg ${
              m.rol === 'usuario' ? 'bg-blue-100 ml-8' : 'bg-gray-100 mr-8'
            }`}
          >
            <p>{m.contenido}</p>
            {m.fuentes && m.fuentes.length > 0 && (
              <div className="mt-2 text-xs text-gray-500">
                <p className="font-semibold">Fuentes:</p>
                {m.fuentes.map((f, j) => (
                  <p key={j}>• {f.documento} - {f.seccion}</p>
                ))}
              </div>
            )}
          </div>
        ))}
        {cargando && (
          <div className="bg-gray-100 mr-8 p-3 rounded-lg animate-pulse">
            Buscando información...
          </div>
        )}
      </div>

      <form onSubmit={enviar} className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Pregunta sobre vacaciones, beneficios, procesos..."
          className="flex-1 p-2 border rounded"
          disabled={cargando}
        />
        <button
          type="submit"
          disabled={cargando}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
```

## Evaluación y Métricas

### Métricas de retrieval

```typescript
interface MetricasRetrieval {
  precision: number;  // De los recuperados, cuántos son relevantes
  recall: number;     // De los relevantes, cuántos recuperamos
  mrr: number;        // Mean Reciprocal Rank
}

function evaluarRetrieval(
  recuperados: string[],     // IDs de chunks recuperados
  relevantes: string[]       // IDs de chunks realmente relevantes
): MetricasRetrieval {
  const recuperadosSet = new Set(recuperados);
  const relevantesSet = new Set(relevantes);

  // Precision
  const verdaderosPositivos = recuperados.filter(id => relevantesSet.has(id)).length;
  const precision = recuperados.length > 0 ? verdaderosPositivos / recuperados.length : 0;

  // Recall
  const recall = relevantes.length > 0 ? verdaderosPositivos / relevantes.length : 0;

  // MRR - posición del primer resultado relevante
  let rr = 0;
  for (let i = 0; i < recuperados.length; i++) {
    if (relevantesSet.has(recuperados[i])) {
      rr = 1 / (i + 1);
      break;
    }
  }

  return { precision, recall, mrr: rr };
}
```

### Evaluación de respuestas con LLM

```typescript
const evaluacionSchema = z.object({
  groundedness: z.number().min(1).max(5).describe('La respuesta está basada en el contexto'),
  relevancia: z.number().min(1).max(5).describe('La respuesta contesta la pregunta'),
  completitud: z.number().min(1).max(5).describe('La respuesta es completa'),
  claridad: z.number().min(1).max(5).describe('La respuesta es clara y fácil de entender'),
});

async function evaluarRespuesta(
  pregunta: string,
  respuesta: string,
  contexto: string
): Promise<z.infer<typeof evaluacionSchema>> {
  const { object } = await generateText({
    model: openai('gpt-4o-mini'),
    output: Output.object({ schema: evaluacionSchema }),
    prompt: `Evalúa esta respuesta de un sistema RAG.

PREGUNTA: ${pregunta}

CONTEXTO DISPONIBLE:
${contexto}

RESPUESTA GENERADA:
${respuesta}

Evalúa del 1 al 5:
- groundedness: ¿La respuesta usa solo información del contexto?
- relevancia: ¿La respuesta contesta la pregunta?
- completitud: ¿La respuesta incluye toda la información relevante?
- claridad: ¿La respuesta es clara y bien estructurada?`,
  });

  return object;
}
```

## Resumen

| Concepto | Qué aprendiste |
|----------|----------------|
| **RAG** | Buscar información relevante + generar respuesta con contexto |
| **Chunking por secciones** | Dividir documentos respetando su estructura |
| **Overlap** | Solapar chunks para no perder contexto |
| **Metadata** | Enriquecer chunks con información adicional |
| **Pre-filtrado** | Filtrar por metadata antes de búsqueda semántica |
| **Re-ranking** | Reordenar resultados por relevancia real |
| **Contexto dinámico** | Ajustar cantidad de contexto según presupuesto |
| **Citación** | Incluir fuentes verificables en respuestas |

### Arquitectura recomendada

```
┌─────────────────────────────────────────────────────────────┐
│                    SISTEMA RAG                               │
├─────────────────────────────────────────────────────────────┤
│  INDEXACIÓN                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │Documentos│->│ Chunking │->│ Metadata │->│embedMany │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                   │          │
│                                                   v          │
│                                           ┌──────────┐      │
│                                           │  Store   │      │
│                                           └──────────┘      │
├─────────────────────────────────────────────────────────────┤
│  CONSULTA                                         │          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐        │          │
│  │ Pregunta │->│Pre-filtro│->│  embed   │        │          │
│  └──────────┘  └──────────┘  └──────────┘        │          │
│                                    │              │          │
│                                    v              v          │
│                              ┌──────────────────────┐       │
│                              │   Similitud + TopK   │       │
│                              └──────────────────────┘       │
│                                         │                    │
│                                         v                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐       │
│  │ Respuesta│<-│generateTx│<-│Re-rank + Seleccionar │       │
│  └──────────┘  └──────────┘  └──────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### ¿Cuándo usar RAG vs otras opciones?

| Usa RAG | Usa Fine-tuning | Usa Prompt Engineering |
|---------|-----------------|------------------------|
| Información cambia frecuentemente | Estilo/tono específico | Pocas reglas fijas |
| Fuentes deben ser verificables | Conocimiento estático | No necesitas fuentes |
| Documentos privados/actualizados | Tarea muy específica | Respuestas simples |
| Costo de training prohibitivo | Presupuesto disponible | Sin documentos externos |

---

En el próximo capítulo exploraremos **Agentic RAG**: cuando el modelo no solo busca una vez, sino que decide autónomamente qué buscar, cuándo buscar de nuevo, y cómo combinar información de múltiples consultas para resolver preguntas complejas.
