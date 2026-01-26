import { db } from "../app/.server/db";

const anyVsUnknownContent = `
Una de las confusiones más comunes en TypeScript es cuándo usar \`any\` y cuándo usar \`unknown\`. Ambos parecen hacer lo mismo: aceptar cualquier tipo de valor. Pero hay una diferencia crucial que puede salvarte de muchos bugs.

## La diferencia en una oración

- \`any\`: "No me importa el tipo, déjame hacer lo que quiera"
- \`unknown\`: "No sé el tipo, pero voy a verificarlo antes de usarlo"

## El problema con \`any\`

\`any\` es como desactivar TypeScript para esa variable:

\`\`\`typescript
function processData(data: any) {
  // TypeScript no se queja de nada de esto:
  console.log(data.name);
  console.log(data.toUpperCase());
  console.log(data.foo.bar.baz);
  data.someMethod();
}

processData(42); // ¡Boom! Runtime error
\`\`\`

---

🎬 **¿Te está gustando este contenido?** Tenemos más tutoriales en video en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

## La solución: \`unknown\`

\`unknown\` te obliga a verificar el tipo antes de usarlo:

\`\`\`typescript
function processData(data: unknown) {
  // ❌ Error: Object is of type 'unknown'
  console.log(data.name);

  // ✅ Correcto: primero verificamos
  if (typeof data === 'string') {
    console.log(data.toUpperCase()); // Ahora TypeScript sabe que es string
  }

  if (typeof data === 'object' && data !== null && 'name' in data) {
    console.log(data.name); // Ahora TypeScript sabe que tiene .name
  }
}
\`\`\`

## Casos de uso reales

### Parsing de JSON

\`\`\`typescript
// ❌ Peligroso
function parseJSON_bad(jsonString: string): any {
  return JSON.parse(jsonString);
}

const data = parseJSON_bad('{"name": "Juan"}');
console.log(data.age.toString()); // Runtime error!

// ✅ Seguro
function parseJSON_good(jsonString: string): unknown {
  return JSON.parse(jsonString);
}

const safeData = parseJSON_good('{"name": "Juan"}');
// Ahora tienes que verificar antes de usar
if (typeof safeData === 'object' && safeData !== null) {
  if ('name' in safeData) {
    console.log(safeData.name);
  }
}
\`\`\`

### API responses

\`\`\`typescript
// Con Zod para validación (recomendado)
import { z } from 'zod';

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
});

async function fetchUser(id: number) {
  const response = await fetch(\`/api/users/\${id}\`);
  const data: unknown = await response.json();

  // Validación en runtime + tipado en compile time
  const user = UserSchema.parse(data);
  return user; // Tipo: { id: number; name: string; email: string }
}
\`\`\`

## Type Guards personalizados

Para hacer el código más limpio, puedes crear type guards:

\`\`\`typescript
interface User {
  id: number;
  name: string;
  email: string;
}

// Type guard function
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'email' in value &&
    typeof (value as User).id === 'number' &&
    typeof (value as User).name === 'string' &&
    typeof (value as User).email === 'string'
  );
}

// Uso
function processUser(data: unknown) {
  if (isUser(data)) {
    // Aquí TypeScript sabe que data es User
    console.log(data.name);
    console.log(data.email);
  }
}
\`\`\`

## Cuándo usar cada uno

| Situación | Usa |
|-----------|-----|
| Migrando código JS a TS rápidamente | \`any\` (temporalmente) |
| Datos de fuentes externas (APIs, JSON) | \`unknown\` |
| Event handlers genéricos | \`unknown\` |
| Tests o prototipos rápidos | \`any\` (con cuidado) |
| Librerías que no tienen tipos | \`any\` (o crea los tipos) |
| Funciones de utilidad genéricas | \`unknown\` con type guards |

## Regla de oro

> Usa \`unknown\` por defecto. Solo usa \`any\` cuando realmente necesites escapar del sistema de tipos temporalmente.

## Bonus: \`never\`

Ya que estamos, \`never\` es el opuesto de \`any\`:

\`\`\`typescript
// any: acepta todo
// unknown: acepta todo, pero debes verificar
// never: no acepta nada

function throwError(message: string): never {
  throw new Error(message);
  // Esta función nunca retorna
}

// Útil para exhaustive checks
type Color = 'red' | 'green' | 'blue';

function getColorCode(color: Color): string {
  switch (color) {
    case 'red': return '#FF0000';
    case 'green': return '#00FF00';
    case 'blue': return '#0000FF';
    default:
      // Si añades un nuevo color y olvidas el case,
      // TypeScript te avisará aquí
      const _exhaustive: never = color;
      return _exhaustive;
  }
}
\`\`\`

## Conclusión

- \`any\` es una salida de emergencia, úsala con moderación
- \`unknown\` es seguro y te obliga a validar
- Combina \`unknown\` con Zod o type guards para máxima seguridad

TypeScript está para ayudarte, no para estorbarte. Usa \`unknown\` y deja que el compilador trabaje a tu favor.

Abrazo. bliss.
`;

async function main() {
  console.log("Importando post de any vs unknown...");

  const slug = "aclarando-las-confusiones-any-vs-unknown-en-typescript-2023";

  const existing = await db.post.findUnique({
    where: { slug },
  });

  if (existing) {
    console.log("⚠️  El post ya existe. Actualizando...");
    const post = await db.post.update({
      where: { slug },
      data: {
        title: "Aclarando las confusiones: any vs unknown en TypeScript",
        body: anyVsUnknownContent.trim(),
        published: true,
        authorName: "Héctorbliss",
        authorAt: "@blissmo",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://twitter.com/HectorBlisS",
        tags: ["typescript", "any", "unknown", "tipos", "seguridad"],
        mainTag: "TypeScript",
        coverImage: "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=1200&h=630&fit=crop",
        metaImage: "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=1200&h=630&fit=crop",
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
      title: "Aclarando las confusiones: any vs unknown en TypeScript",
      body: anyVsUnknownContent.trim(),
      published: true,
      authorName: "Héctorbliss",
      authorAt: "@blissmo",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://twitter.com/HectorBlisS",
      tags: ["typescript", "any", "unknown", "tipos", "seguridad"],
      mainTag: "TypeScript",
      coverImage: "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=1200&h=630&fit=crop",
      metaImage: "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=1200&h=630&fit=crop",
      createdAt: new Date("2023-06-15"),
      updatedAt: new Date(),
    },
  });

  console.log("✅ Post importado exitosamente!");
  console.log(`   ID: ${post.id}`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   URL: /blog/${post.slug}`);
}

main()
  .catch((e) => {
    console.error("❌ Error importando post:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
