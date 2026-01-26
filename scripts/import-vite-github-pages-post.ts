import { db } from "../app/.server/db";

const postContent = `Subir tu proyecto Vite a Github Pages debería ser fácil, pero por una extraña razón se nos complica bastantito.

Por eso, en esta entrada quiero enseñarte la manera más sencilla de subir tu proyecto **Vite** a **Github Pages** para que dejes de sufrir, en solo **3 pasos facilísimos**. 🤯

No importa si es un proyecto **React**, **Svelte**, **Vue** u otro, este método funciona para cualquier proyecto **Vite**. ⚡️

## Paso 1: Configura tu proyecto

Ve a tu archivo \`vite.config.js\` y agrega la llave \`base\` con el nombre de tu repo. Este link es el de la página, **NO EL DE TU REPO**.

\`\`\`tsx
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "https://hectorbliss.github.io/borrame", // <= agrega la llave base
});
\`\`\`

Este link se arma así \`https://<TU_USUARIO>.gihtub.io/<REPO>\` .

También, asegúrate de que el \`remote origin\` sea el del mismo repo, si no, agrégalo con el comando:

\`\`\`tsx
git remote add origin https://github.com/HectorBlisS/borrame.git
\`\`\`

## Paso 2: Instalando gh-pages

Instala la biblioteca \`gh-pages\` como herramienta de desarrollo con **npm**.

\`\`\`tsx
npm install gh-pages --save-dev
\`\`\`

## Paso 3: Agrega el script (comando)

Añade el comando a tu lista de scripts en tu archivo \`package.json\` para que en el futuro sea aún más fácil.

\`\`\`tsx
// ...
"scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview",
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  },
// ...
\`\`\`

Observa que agregue el comando \`"predeploy"\` para generar la carpeta build antes de subir. 🤓

> 👀 Basta con ejecutar \`deploy\` para que \`predeploy\` se ejecute primero.

Ahora publicamos nuestro proyecto:

\`\`\`tsx
npm run deploy
\`\`\`

### ¡Super! Hosting gratuito sin dolor.

¿Genial no?

![gh-pages deploy](https://i.imgur.com/21J20mv.png)

Ahora ya puedes visitar tu sitio web, en mi caso en:

\`\`\`tsx
https://hectorbliss.github.io/borrame
\`\`\`

No olvides suscribirte para no perderte nada de **Fixtergeek**. También checa nuestros cursos, seguro alguno te ayuda a mejorar tus habilidades.

Abrazo. blissmo. 🤓`;

async function main() {
  const slug = "como-publicar-tu-proyecto-vite-en-github-pages-con-el-metodo-mas-facil-2023";

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

  // Crear el post con la fecha original (25 Julio 2023)
  const post = await db.post.create({
    data: {
      slug,
      title: "Cómo Publicar tu proyecto Vite en Github Pages con el método más fácil",
      body: postContent.trim(),
      published: true,

      // Imágenes (thumbnail de YouTube)
      coverImage: "https://i.ytimg.com/vi/TgfD0pywZAQ/maxresdefault.jpg",
      metaImage: "https://i.ytimg.com/vi/TgfD0pywZAQ/maxresdefault.jpg",

      // Autor
      authorName: "blissmo",
      authorAt: "@hectorbliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://twitter.com/HectorBlisS",

      // Video de YouTube asociado
      youtubeLink: "https://youtu.be/ZI7MXe-6HzA",

      // Clasificación
      mainTag: "Github Pages",
      tags: ["vite", "github", "pages", "deploy"],
      category: ["vite"],

      // Fecha original del post (25 Julio 2023)
      createdAt: new Date(1690289998912),
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
  console.log(`  YouTube: ${post.youtubeLink}`);

  await db.$disconnect();
}

main().catch(console.error);
