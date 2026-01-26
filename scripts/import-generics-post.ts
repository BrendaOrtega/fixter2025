import { db } from "../app/.server/db";

const genericsPostContent = `
No necesitas generics realmente, si no estás reusando código.

## TL;DR

Pero, si no volver a escribir lo ya escrito es lo tuyo, las generics te van a permitir definir funciones y clases que trabajan con una multitud de tipos.

![Puzzle de madera ilustrando generics](https://www.ubergames.co.uk/wp-content/uploads/uber-games-wooden-puzzle-ug674.jpg)

Las «generics» han estado aquí en lenguajes como C# y Java. Con la capacidad de crear componentes que no sólo trabajan con un tipo de dato, sino con muchos.

Ahora que tenemos esta habilidad en TypeScript, lo mejor sería echarle un ojo, ¿no crees?

## Ejemplo 1: Una función que agrega una llave a un objeto

Supongamos que tenemos una función que agrega una llave a un objeto.

\`\`\`typescript
const addNewKey = (key, value, obj) => {
  return { ...obj, [key]: value }
}
\`\`\`

Sin «generics» tendríamos que agregar sus tipos, tal vez así:

\`\`\`typescript
export const addNewKey = (
  key: number | string,
  value: number | string,
  obj: object
) => {
  return { ...obj, [key]: value }
}
\`\`\`

Pero esto no es muy útil, porque no sabemos qué tipo de objeto nos van a pasar, ni qué tipo de llave o valor.

Podríamos usar \`any\`:

\`\`\`typescript
export const addNewKey = (key: any, value: any, obj: any) => {
  return { ...obj, [key]: value }
}
\`\`\`

Pero usar \`any\` es como no usar TypeScript. Perdemos toda la información de tipos. 😅

---

🎬 **¿Te está gustando este contenido?** Tenemos más tutoriales de TypeScript en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

## Mejor usemos «generics»

\`\`\`typescript
export const addNewKey = <Key, Value, Obj>(
  key: Key,
  value: Value,
  obj: Obj
) => {
  return { ...obj, [key]: value }
}

// Tipo de usuario de ejemplo
type UserType = {
  name: string
  email: string
}

// Invocación pasando tipos
addNewKey<string, string, UserType>("age", "30", { name: "Bliss", email: "bliss@fixter.org" })
\`\`\`

Al invocar la función \`addNewKey\` estamos pasando los argumentos necesarios, pero también incluimos el tipo de estos argumentos: \`<string, string, UserType>\`. 🤯

A una función definida de esa forma, le llamamos **generic function**, ya que puede trabajar con una multitud de tipos.

A diferencia de trabajar con \`any\`, ahora no perdemos información en ningún punto de las invocaciones y retornos. ✅

### Inferencia de tipos

Existe una segunda forma de invocar esta función: sin especificar los tipos.

\`\`\`typescript
addNewKey("age", "30", { name: "Bliss", email: "bliss@fixter.org" })
\`\`\`

Así es, el compilador de TS puede inferir los tipos a partir de los argumentos y colocar cada uno en las definiciones genéricas.

Esto puede ser útil con tipos sencillos, pero también puede fallar para tipos más complejos. Es mejor definirlos explícitamente.

## Ejemplo 2: Una función real con \`extends\`

Veamos un ejemplo real de una función que obtiene un access token de Google:

\`\`\`typescript
/**
 * Este es el tipo de respuesta que esperamos de Google
 */
type Result = {
  ok: boolean
  data?: Data
  error?: string
}

/**
 * El tipo de datos que contiene el access_token
 */
type Data = {
  access_token: string
}

/**
 * Este tipo es la forma de nuestro objeto de llaves de entorno
 */
type EnvObject = {
  GOOGLE_SECRET: string
  GOOGLE_CLIENT_ID: string
  ENV: "production" | "development"
}

/**
 * Definimos como genericos a Code que extiende o se espera sea de
 * tipo string, esta extensión me es necesaria porque
 * code se usará dentro de new URLSearchParams({code})
 * el tipo que esta función espera es string.
 */
export const getAccessToken = <Code extends string, Env extends EnvObject>(
  code: Code,
  env: Env
): Promise<Result> => {
  if (!env || !env.GOOGLE_SECRET || !env.GOOGLE_CLIENT_ID)
    throw new Error("Missing env variables")

  // ... resto de la implementación
}
\`\`\`

![Ejemplo de código con generics](https://i.imgur.com/cNrF5Fm.png)

## BONUS: Extender tus generics

Puedes extender tus generics al definirlos, desde tipos presentes en el scope:

- \`<Code extends string>\` - Code debe ser un string
- \`<Env extends EnvObject>\` - Env debe tener la forma de EnvObject

Esto te da más control sobre qué tipos son válidos para tu función.

Seguro encontrarás mejores usos que yo, pero ¡oye! Ahora sabes usar generics. 🎉

Abrazo. bliss.

## Enlaces relacionados

- [Gist con el código](https://gist.github.com/HectorBlisS/e995c69e55d452201c3dc00babc87f59)
- [¿Qué es inferencia en TypeScript?](https://www.hectorbliss.com/posts/que_es_inferencia_en_typescript)
- [Docs oficiales de TypeScript sobre Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
`;

async function main() {
  console.log("Importando post de TypeScript Generics...");

  const slug = "que-son-generics-en-typescript-2023";
  const title = "¿Qué son «Generics» en Typescript?";

  // Verificar si ya existe por slug o título
  const existingBySlug = await db.post.findUnique({
    where: { slug },
  });

  const existingByTitle = await db.post.findUnique({
    where: { title },
  });

  const existing = existingBySlug || existingByTitle;

  if (existing) {
    console.log("⚠️  El post ya existe (ID: " + existing.id + "). Actualizando...");
    const post = await db.post.update({
      where: { id: existing.id },
      data: {
        slug,
        title,
        body: genericsPostContent.trim(),
        published: true,
        coverImage: "https://i.imgur.com/4cX6sGq.png",
        metaImage: "https://i.imgur.com/4cX6sGq.png",
        youtubeLink: "",
        authorName: "Héctorbliss",
        authorAt: "@hectorbliss",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://twitter.com/HectorBlisS",
        tags: ["typescript", "javascript", "webdev", "tipos", "types"],
        mainTag: "TypeScript",
        createdAt: new Date(1685652776121), // June 1, 2023
        updatedAt: new Date(1685653266632), // June 1, 2023
      },
    });
    console.log("✅ Post actualizado exitosamente!");
    console.log(`   ID: ${post.id}`);
    console.log(`   Slug: ${post.slug}`);
    console.log(`   Fecha original: ${post.createdAt.toLocaleDateString("es-MX")}`);
    console.log(`   URL: /blog/${post.slug}`);
    return;
  }

  const post = await db.post.create({
    data: {
      slug,
      title,
      body: genericsPostContent.trim(),
      published: true,

      // Imágenes
      coverImage: "https://i.imgur.com/4cX6sGq.png",
      metaImage: "https://i.imgur.com/4cX6sGq.png",

      // YouTube (vacío para este post)
      youtubeLink: "",

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@hectorbliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://twitter.com/HectorBlisS",

      // Clasificación
      tags: ["typescript", "javascript", "webdev", "tipos", "types"],
      mainTag: "TypeScript",

      // Fechas originales: June 1, 2023
      createdAt: new Date(1685652776121),
      updatedAt: new Date(1685653266632),
    },
  });

  console.log("✅ Post importado exitosamente!");
  console.log(`   ID: ${post.id}`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   Fecha original: ${post.createdAt.toLocaleDateString("es-MX")}`);
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
