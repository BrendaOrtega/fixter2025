import { db } from "../app/.server/db";

const mongodbVectorSearchContent = `
¡Hola, geek! ¿Estás listo para llevar tus aplicaciones al siguiente nivel con capacidades de búsqueda semántica y programación funcional reactiva? 🫠

En esta guía, exploraremos cómo integrar la potente búsqueda vectorial de MongoDB Atlas con el robusto sistema de efectos de Effect-TS en TypeScript. ✨🤩

Si eres nuevo en alguno de estos conceptos, ¡no te preocupes! Desglosaremos todo paso a paso, pero, también podrías empezar con [una de nuestras entradas introductorias](https://www.fixtergeek.com/blog/Dominando-Effect.tap:-El-Arte-de-los-Efectos-Secundarios-en-TypeScript_gS7).

![vector search](https://i.imgur.com/BYTC18M.jpg)

## ¿Qué es la Búsqueda Vectorial y por qué la necesitas?

En el mundo actual impulsado por la IA, la búsqueda tradicional basada en palabras clave a menudo se queda corta. Imagina que buscas "recetas de postres saludables" pero tu sistema solo encuentra "recetas de tartas de manzana" porque no entiende la similitud conceptual. 🤷🏻

Aquí es donde entra la **búsqueda vectorial**. 🛸

> La búsqueda vectorial, también conocida como \`búsqueda de similitud o búsqueda semántica\`, funciona representando datos (texto, imágenes, audio, etc.) como **embeddings**: vectores numéricos de alta dimensión. ✅

Los elementos con significados o características similares tienen vectores que están "cerca" entre sí en este espacio multidimensional. Al buscar, convertimos nuestra consulta en un vector y encontramos los documentos cuyos vectores son más cercanos al de la consulta.

**¿Por qué la necesitas?**

- **Relevancia Mejorada:** Encuentra resultados basados en el significado, no solo en las palabras clave exactas.
- **Experiencias Personalizadas:** Ofrece recomendaciones de productos, contenido o usuarios más precisas.
- **Aplicaciones de IA:** Es la base para sistemas de recomendación, chatbots, recuperación de información y más.

## MongoDB Atlas Vector Search: Tu Base de Datos Vectorial

MongoDB, la popular base de datos NoSQL orientada a documentos, ha integrado capacidades de búsqueda vectorial directamente en su plataforma Atlas. Esto significa que puedes almacenar tus datos y sus embeddings en el mismo lugar, simplificando tu arquitectura. La clave de esta funcionalidad es el stage de agregación \`$vectorSearch\`.

### El Stage \`$vectorSearch\`

El stage \`$vectorSearch\` de MongoDB Atlas te permite realizar búsquedas de vecinos más cercanos (Nearest Neighbor) en tus datos. Soporta dos tipos principales de búsqueda [1]:

- **ANN (Approximate Nearest Neighbor):** Es el método más común y eficiente para grandes volúmenes de datos. Utiliza algoritmos como HNSW (Hierarchical Navigable Small Worlds) para encontrar los vectores más similares de forma aproximada, sin necesidad de escanear cada documento. Es rápido y escalable.
- **ENN (Exact Nearest Neighbor):** Realiza una búsqueda exhaustiva, calculando la distancia entre cada vector para encontrar el vecino más cercano exacto. Es más preciso pero computacionalmente más intensivo, por lo que se recomienda para conjuntos de datos más pequeños o para evaluar la precisión de las búsquedas ANN.

Aquí está la sintaxis básica del stage \`$vectorSearch\`:

\`\`\`jsx
{
  "$vectorSearch": {
    "index": "<nombre-del-indice>",       // Requerido: El nombre de tu índice vectorial en Atlas.
    "path": "<campo-embedding>",        // Requerido: El campo en tu documento que contiene el vector.
 // Requerido: El vector de tu consulta.
    "queryVector": [<array-de-numeros>],
 // Opcional: Cuántos vectores considerar (para ANN).
    "numCandidates": <numero-candidatos>,
 // Requerido: Cuántos resultados devolver.
    "limit": <numero-resultados>,
 // Opcional: Un filtro MQL para pre-filtrar documentos.
    "filter": {<filtro-mql>}
  }
}

\`\`\`

Para usar \`$vectorSearch\`, primero debes crear un índice vectorial en tu clúster de MongoDB Atlas. Este índice especifica \`qué campo de tu colección contendrá los embeddings\` y qué algoritmo de similitud se utilizará.

## Effect-TS: Programación Funcional Robusta en TypeScript

Effect-TS es un framework de TypeScript que proporciona un sistema de efectos funcionales completo. Esto significa que \`te ayuda a escribir código asíncrono y propenso a errores de una manera declarativa, segura y componible\`. Con Effect-TS, puedes manejar operaciones complejas como las interacciones con bases de datos de forma limpia y predecible. ✅

### ¿Por qué Effect-TS para la base de datos?

- **Manejo de Errores:** Effect-TS te obliga a manejar explícitamente los errores, lo que lleva a aplicaciones más robustas.
- **Composición:** Puedes combinar pequeñas operaciones Effect en flujos de trabajo complejos de manera sencilla.
- **Inyección de Dependencias:** Facilita la gestión de dependencias (como tu cliente de MongoDB) y hace que tu código sea más testeable.
- **Recursos Seguros:** Garantiza que los recursos (como las conexiones a la base de datos) se adquieran y liberen correctamente, incluso en caso de errores.

## 👷🏽‍♀️ Manos a la Obra: Integrando MongoDB Vector Search con Effect-TS

Ahora, veamos cómo unir estos dos mundos. Crearemos un pequeño proyecto TypeScript que:

1. Define servicios para MongoDB y la generación de embeddings.
2. Inserta documentos con embeddings en MongoDB.
3. Realiza una búsqueda vectorial utilizando \`$vectorSearch\` y Effect-TS.

### Estructura del Proyecto

\`\`\`
mongodb-effect-vector-search/
├── src/
│   ├── mongodbService.ts
│   ├── embeddingService.ts
│   ├── vectorSearchService.ts
│   └── example.ts
├── package.json
├── tsconfig.json
└── README.md

\`\`\`

### Paso 1: Configuración del Proyecto

Primero, crea un nuevo proyecto y instala las dependencias necesarias:

\`\`\`bash
mkdir mongodb-effect-vector-search
cd mongodb-effect-vector-search
npm init -y
npm install typescript @types/node mongodb effect effect-mongodb openai
npx tsc --init
mkdir src

\`\`\`

### Paso 2: El Servicio de MongoDB (\`src/mongodbService.ts\`)

Este servicio gestionará la conexión a tu base de datos MongoDB. Usaremos \`Effect.acquireRelease\` para asegurar que la conexión se cierre limpiamente.

\`\`\`tsx
import { Effect, Layer, Context } from "effect";
import { MongoClient, Db } from "mongodb";

export interface MongoDbService {
  readonly client: MongoClient;
  readonly db: (name: string) => Db;
}

export const MongoDbService = Context.Tag<MongoDbService>("MongoDbService");

export const MongoDbLive = Layer.scoped(
  MongoDbService,
  Effect.acquireRelease(
    Effect.tryPromise({
      try: () => MongoClient.connect("mongodb://localhost:27017"), // ¡Asegúrate de que tu instancia de MongoDB esté corriendo aquí o en la nube de Atlas!
      catch: (error) => new Error(\`MongoDB connection error: \${error}\`),
    }),
    (client) => Effect.sync(() => client.close())
  ).pipe(
    Effect.map((client) => ({
      client,
      db: (name: string) => client.db(name),
    }))
  )
);

\`\`\`

### Paso 3: El Servicio de Embeddings (\`src/embeddingService.ts\`)

Este servicio se encargará de convertir texto en vectores numéricos. Para este ejemplo, usaremos un servicio de mock para evitar la necesidad de una clave API real, pero en un entorno de producción, integrarías un servicio como OpenAI o Cohere.

\`\`\`tsx
import { Effect, Context, Layer } from "effect";
import OpenAI from "openai";

export interface EmbeddingService {
  readonly generateEmbedding: (text: string) => Effect.Effect<number[], Error>;
}

export const EmbeddingService = Context.Tag<EmbeddingService>("EmbeddingService");

// Implementación del servicio de embeddings usando OpenAI (requiere API Key)
export const EmbeddingLive = Layer.succeed(EmbeddingService, {
  generateEmbedding: (text: string) =>
    Effect.gen(function* () {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY, // ¡Configura tu OPENAI_API_KEY!
      });

      const response = yield* Effect.tryPromise({
        try: () =>
          openai.embeddings.create({
            model: "text-embedding-ada-002", // Modelo de embeddings de OpenAI
            input: text,
          }),
        catch: (error) => new Error(\`Error generating embedding: \${error}\`),
      });

      return response.data[0].embedding;
    }),
});

// Servicio alternativo usando embeddings simulados (para desarrollo/testing)
export const MockEmbeddingLive = Layer.succeed(EmbeddingService, {
  generateEmbedding: (text: string) =>
    Effect.gen(function* () {
      // Genera un vector de embeddings simulado basado en el hash del texto
      const hash = text
        .split("")
        .reduce((a, b) => {
          a = (a << 5) - a + b.charCodeAt(0);
          return a & a;
        }, 0);

      // Crea un vector de 1536 dimensiones (como el de OpenAI) con valores normalizados
      const embedding = Array.from({ length: 1536 }, (_, i) => {
        const value = Math.sin(hash + i) * 0.5;
        return value;
      });

      return embedding;
    }),
});

\`\`\`

### Paso 4: El Servicio de Búsqueda Vectorial (\`src/vectorSearchService.ts\`)

Este servicio contendrá la lógica para insertar documentos con embeddings y realizar la búsqueda vectorial en MongoDB.

\`\`\`tsx
import { Effect, Context, Schema, Layer } from "effect";
import { MongoDbService } from "./mongodbService";

// Define el esquema de un documento con embeddings
export const DocumentWithEmbedding = Schema.Struct({
  _id: Schema.optional(Schema.String), // MongoDB añade _id automáticamente
  title: Schema.String,
  content: Schema.String,
  embedding: Schema.Array(Schema.Number), // El vector de embeddings
});

export type DocumentWithEmbedding = Schema.Schema.Type<typeof DocumentWithEmbedding>;

export interface VectorSearchService {
  readonly insertDocument: (doc: DocumentWithEmbedding) => Effect.Effect<void, Error>;
  readonly vectorSearch: (
    queryVector: number[],
    limit?: number,
    numCandidates?: number
  ) => Effect.Effect<DocumentWithEmbedding[], Error>;
}

export const VectorSearchService = Context.Tag<VectorSearchService>("VectorSearchService");

export const VectorSearchLive = Layer.succeed(VectorSearchService, {
  insertDocument: (doc: DocumentWithEmbedding) =>
    Effect.gen(function* () {
      const mongoService = yield* MongoDbService;
      const db = mongoService.db("vector_search_db");
      const collection = db.collection("documents");

      yield* Effect.tryPromise({
        try: () => collection.insertOne(doc),
        catch: (error) => new Error(\`Error inserting document: \${error}\`),
      });
    }),

  vectorSearch: (queryVector: number[], limit = 10, numCandidates = 100) =>
    Effect.gen(function* () {
      const mongoService = yield* MongoDbService;
      const db = mongoService.db("vector_search_db");
      const collection = db.collection("documents");

      // Un clásico mongo-pipeline para que te sientas como en casa 🏠
      const pipeline = [
        {
          $vectorSearch: {
            index: "vector_index", // ¡IMPORTANTE! Debes crear este índice en MongoDB Atlas
            path: "embedding", // Campo que contiene los embeddings
            queryVector: queryVector,
            numCandidates: numCandidates,
            limit: limit,
          },
        },
        {
          $project: {
            _id: 1,
            title: 1,
            content: 1,
            embedding: 1,
            score: { $meta: "vectorSearchScore" }, // Incluye el score de similitud en los resultados
          },
        },
      ];

      const results = yield* Effect.tryPromise({
        try: () => collection.aggregate(pipeline).toArray(),
        catch: (error) => new Error(\`Vector search error: \${error}\`),
      });

      return results as DocumentWithEmbedding[];
    }),
});

\`\`\`

### Paso 5: El Ejemplo Principal (\`src/example.ts\`)

Este archivo orquestará todo, insertará algunos documentos de ejemplo y realizará una búsqueda.

\`\`\`tsx
import { Effect, Layer } from "effect";
import { MongoDbLive } from "./mongodbService";
import { VectorSearchService, VectorSearchLive, DocumentWithEmbedding } from "./vectorSearchService";
import { EmbeddingService, MockEmbeddingLive } from "./embeddingService";

// Programa principal que demuestra el uso de la búsqueda vectorial
const program = Effect.gen(function* () {
  console.log("🚀 Iniciando ejemplo de búsqueda vectorial con MongoDB y Effect...");

  // Obtener los servicios
  const vectorSearchService = yield* VectorSearchService;
  const embeddingService = yield* EmbeddingService;

  // Documentos de ejemplo para insertar
  const sampleDocuments = [
    {
      title: "Introducción a TypeScript",
      content: "TypeScript es un lenguaje de programación desarrollado por Microsoft que añade tipos estáticos a JavaScript.",
    },
    {
      title: "Guía de Effect-TS",
      content: "Effect es un framework de TypeScript que proporciona un sistema de efectos funcionales completo.",
    },
    {
      title: "MongoDB y Bases de Datos NoSQL",
      content: "MongoDB es una base de datos NoSQL orientada a documentos que almacena datos en formato BSON.",
    },
    {
      title: "Búsqueda Vectorial en Aplicaciones AI",
      content: "La búsqueda vectorial permite encontrar documentos similares basándose en la similitud semántica de sus embeddings.",
    },
  ];

  console.log("📝 Insertando documentos con embeddings...");

  // Insertar documentos con sus embeddings
  for (const doc of sampleDocuments) {
    const embedding = yield* embeddingService.generateEmbedding(doc.content);
    const documentWithEmbedding: DocumentWithEmbedding = {
      ...doc,
      embedding,
    };

    yield* vectorSearchService.insertDocument(documentWithEmbedding);
    console.log(\`✅ Insertado: "\${doc.title}"\`);
  }

  console.log("🔍 Realizando búsqueda vectorial...");

  // Realizar una búsqueda vectorial
  const queryText = "¿Qué es un framework de TypeScript para programación funcional?";
  const queryEmbedding = yield* embeddingService.generateEmbedding(queryText);

  const searchResults = yield* vectorSearchService.vectorSearch(queryEmbedding, 3, 50);

  console.log(\`\\n📊 Resultados de búsqueda para: "\${queryText}"\`);
  console.log("=" .repeat(60));

  searchResults.forEach((result, index) => {
    console.log(\`\\n\${index + 1}. \${result.title}\`);
    console.log(\`   Contenido: \${result.content}\`);
    console.log(\`   Score: \${(result as any).score?.toFixed(4) || "N/A"}\`);
  });

  console.log("\\n✨ Ejemplo completado exitosamente!");
});

// Configurar las capas de servicios
const MainLayer = Layer.mergeAll(
  MongoDbLive,
  VectorSearchLive,
  MockEmbeddingLive // Usando embeddings simulados para el ejemplo
);

// Ejecutar el programa
const runProgram = program.pipe(
  Effect.provide(MainLayer),
  Effect.scoped,
  Effect.runPromise
);

// Manejar errores y ejecutar
runProgram.catch((error) => {
  console.error("❌ Error ejecutando el programa:", error);
  process.exit(1);
});

export { runProgram };

\`\`\`

### Paso 6: Ejecutar el Ejemplo

Para ejecutar este ejemplo, primero asegúrate de tener una instancia de MongoDB corriendo localmente o en Atlas. Si usas Atlas, recuerda configurar tu índice vectorial con el nombre \`vector_index\` en la colección \`documents\` de la base de datos \`vector_search_db\`, y el campo \`embedding\` como tipo \`vector\`.

Luego, compila y ejecuta:

\`\`\`bash
npx tsc
node dist/example.js

\`\`\`

Verás cómo los documentos se insertan y luego se realiza una búsqueda, mostrando los resultados más relevantes. 🤓

> 👀 ¡Claro! Montarlo y verlo funcionar tú mismo(a)  es la parte donde aprendes de verdad, invierte un par de horas, domina este tema. 💵 Este es el momento correcto: estudia y practica. 🧪

## Consideraciones Finales y Próximos Pasos

Esta guía te ha proporcionado una base sólida para integrar MongoDB Vector Search con Effect-TS. Aquí hay algunas consideraciones adicionales:

- **Generación de Embeddings en Producción:** Para un caso de uso real, reemplazarías \`MockEmbeddingLive\` con \`EmbeddingLive\` y configurarías tu \`OPENAI_API_KEY\` (o la de tu proveedor de embeddings preferido).
- **Manejo de Errores Avanzado:** Effect-TS ofrece muchas más herramientas para un manejo de errores sofisticado, como \`Effect.retry\` o \`Effect.catchTag\`.
- **Optimización de Consultas:** Experimenta con \`numCandidates\` y \`limit\` para encontrar el equilibrio perfecto entre rendimiento y precisión para tus necesidades.
- **Filtrado Híbrido:** Combina \`$vectorSearch\` con filtros MQL tradicionales para búsquedas híbridas que consideren tanto la similitud semántica como los criterios de filtrado exactos.

¡Espero que esta guía te sea útil para empezar a construir aplicaciones más inteligentes y robustas con \`MongoDB\` y \`Effect-TS\`! No dudes en revisar las otras publicaciones. 😌

---

### Enlaces relacionados

[1] MongoDB Docs. Run Vector Search Queries. Disponible en: https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/

---

Abrazo. Bliss. 🤓
`;

async function main() {
  console.log("Creando post de MongoDB Vector Search con Effect-TS...");

  const slug = "integrando-mongodb-vector-search-con-effect-ts";

  // Verificar si ya existe
  const existing = await db.post.findUnique({
    where: { slug },
  });

  if (existing) {
    console.log("⚠️  El post ya existe. Actualizando...");
    const post = await db.post.update({
      where: { slug },
      data: {
        title: "Integrando MongoDB Vector Search con Effect-TS: Una Guía para Principiantes",
        body: mongodbVectorSearchContent.trim(),
        published: true,
        coverImage: "https://i.ytimg.com/vi/H8EC002zS-0/maxresdefault.jpg",
        metaImage: "https://i.ytimg.com/vi/H8EC002zS-0/maxresdefault.jpg",
        youtubeLink: "https://youtu.be/H8EC002zS-0",
        authorName: "Héctorbliss",
        authorAt: "@blissito",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://www.hectorbliss.com",
        tags: ["mongodb", "vector-search", "effect-ts", "typescript", "embeddings"],
        mainTag: "mongodb",
      },
    });
    console.log("✅ Post actualizado exitosamente!");
    console.log(`   ID: ${post.id}`);
    console.log(`   URL: /blog/${post.slug}`);
    return;
  }

  const post = await db.post.create({
    data: {
      slug,
      title: "Integrando MongoDB Vector Search con Effect-TS: Una Guía para Principiantes",
      body: mongodbVectorSearchContent.trim(),
      published: true,

      // Imágenes
      coverImage: "https://i.ytimg.com/vi/H8EC002zS-0/maxresdefault.jpg",
      metaImage: "https://i.ytimg.com/vi/H8EC002zS-0/maxresdefault.jpg",

      // YouTube
      youtubeLink: "https://youtu.be/H8EC002zS-0",

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@blissito",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://www.hectorbliss.com",

      // Clasificación
      tags: ["mongodb", "vector-search", "effect-ts", "typescript", "embeddings"],
      mainTag: "mongodb",
    },
  });

  console.log("✅ Post creado exitosamente!");
  console.log(`   ID: ${post.id}`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   URL: /blog/${post.slug}`);
}

main()
  .catch((e) => {
    console.error("❌ Error creando post:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
