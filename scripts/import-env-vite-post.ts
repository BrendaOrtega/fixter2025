import { db } from "../app/.server/db";

const postContent = `Podemos configurar **Vite** para que cargue todas las variables de entorno como usualmente. ✅

Vite no carga el archivo \`.env\` en automático, **Vite** evalúa primero la configuración, pues hay opciones que pueden afectar el comportamiento de la carga como \`root\` y \`envDir\`. ⚙️

Pero tenemos a la mano una herramienta (*helper*) que nos permite cargar  archivos \`.env\` específicos:
\`\`\`js
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ command, mode }) => {
  // Se carga el archivo env usando \`mode\` en el directorio actual.
  // Al colocar el tercer parámetro como '' se cargarán todos los archivos env aunque no tengan el prefijo \`VITE_\`
  const env = loadEnv(mode, process.cwd(), '') // '' es el hack 😉
  return {
    // vite config
    define: {
      __DATABASE_URL__: JSON.stringify(env.DATABASE_URL),
    },
  }
})
\`\`\`
De esta forma cargamos variables de entorno en el más alto nivel.

Espero sea útil. Abrazo. Bliss. 🤓

## Enlaces relacionados

[process.cwd()](https://www.geeksforgeeks.org/node-js-process-cwd-method/)`;

async function main() {
  const slug = "como-cargar-variables-de-entorno-env-en-vite-2023";

  // Verificar si ya existe
  const existing = await db.post.findUnique({
    where: { slug },
  });

  if (existing) {
    console.log(`Post ya existe con slug: ${slug}`);
    console.log(`ID: ${existing.id}`);
    console.log(`Título: ${existing.title}`);
    await db.$disconnect();
    return;
  }

  // Crear el post con la fecha original (8 Diciembre 2023)
  const post = await db.post.create({
    data: {
      slug,
      title: "¿Cómo cargar variables de entorno .env en Vite?",
      body: postContent.trim(),
      published: true,

      // Imágenes
      coverImage: "https://vitejs.dev/og-image.png",
      metaImage: "https://vitejs.dev/og-image.png",

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@hectorbliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://www.facebook.com/blissito",

      // Clasificación
      mainTag: "Vite",
      tags: ["vite", "env", "configuration"],
      category: ["vite"],

      // Fecha original del post (8 Diciembre 2023)
      createdAt: new Date(1702070558477),
      updatedAt: new Date(),

      isFeatured: false,
    },
  });

  console.log("Post creado exitosamente:");
  console.log(`  ID: ${post.id}`);
  console.log(`  Slug: ${post.slug}`);
  console.log(`  Título: ${post.title}`);
  console.log(`  URL: /blog/${post.slug}`);
  console.log(`  Fecha original: ${post.createdAt}`);
  console.log(`  Cover: ${post.coverImage}`);

  await db.$disconnect();
}

main().catch(console.error);
