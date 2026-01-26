import { db } from "../app/.server/db";

const postContent = `En esta entrada vamos a publicar un nuevo sitio web Astro en Github pages, para que veas cómo lo hago. ¿Lista? Vamos pues.

### Requisitos previos

- **Node.js** - \`v18.17.1\` o \`v20.3.0\` o mayor. (Astro no soporta: \`v19\` )
- [VS Code](https://code.visualstudio.com/) con su plugin [oficial](https://marketplace.visualstudio.com/items?itemName=astro-build.astro-vscode) para Astro
- La terminal. Astro posee una herramienta CLI

## 🚀 Necesitamos un proyecto astro

Puedes usar tu proyecto actual y brincarte este paso, si no, pues vamos a crear un proyecto nuevo.

\`\`\`jsx
npm create astro@latest
npm install
\`\`\`

Para ver que has completado la instalación con éxito. Puedes lanzar el servidor de desarrollo para comprobarlo.

\`\`\`jsx
npm run dev
\`\`\`

Super, es momento de concentrarnos en lo bueno y ¡subir a Github Pages!

## 🐙 Necesitamos un *repo* en Github

Puedes usar el *repo* con el que ya estás trabajando y saltar este paso. Pero si estás siguiendo este ejemplo de cero, puedes crear un *repo* nuevo aquí, y agregarlo.

\`\`\`jsx
git remote add origin git@github.com:blissito/astro_github_pages_ejemplo.git
git push -u origin main
\`\`\`

Listo. Tu *repo* debería publicarse.

> 👀 No te olvides de relacionar tus credenciales de Github, yo lo uso con un [keypar ssh](https://docs.github.com/es/authentication/connecting-to-github-with-ssh).

## 👩🏻‍💻 Ahora la configuración para Github Pages

Vamos a tocar el archivo \`astro.config.mjs\`.

\`\`\`jsx
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://blissito.github.io',
  base: 'astro_github_pages_ejemplo',
})
\`\`\`

Toma en cuenta mi nombre de usuario y mi *repo* en *site* y *base*, **respectivamente. Cambia todo por lo tuyo. 😉

## 🚨 Importante

Todos los links de tu sitio Astro deben usar el prefijo que usas en base para que los links funcionen.

\`\`\`html
<a href="/astro_github_pages_ejemplo/contact">Contacto</a>
\`\`\`

Esto es muy importante, recuerda que esto es estático. ☎️

## 🤖 Ahora vamos a usar Github *actions*

Aquí no hay que pensar mucho, solo copiar y pegar. No por eso no podemos saber cómo lo escribiríamos a mano he! Ojo. 👁️

\`.github/workflows\`

\`\`\`yaml
name: Deploy to GitHub Pages

on:
  # Trigger the workflow every time you push to the \`main\` branch
  # Using a different branch name? Replace \`main\` with your branch's name
  push:
    branches: [ main ]
  # Allows you to run this workflow manually from the Actions tab on GitHub.
  workflow_dispatch:

# Allow this job to clone the repo and create a page deployment
permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout your repository using git
        uses: actions/checkout@v4
      - name: Install, build, and upload your site
        uses: withastro/action@v2
        # with:
          # path: . # The root location of your Astro project inside the repository. (optional)
          # node-version: 20 # The specific version of Node that should be used to build your site. Defaults to 20. (optional)
          # package-manager: pnpm@latest # The Node package manager that should be used to install dependencies and build your site. Automatically detected based on your lockfile. (optional)

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
\`\`\`

No olvides hacer push. 🤓

\`\`\`yaml
git add -A
git commit -m "workflow"
git push
\`\`\`

Si has visto mis otros videos, encontrarás familiaridad con esta configuración. Aquí nomás hay que notar la *branch* y la acción del *build*, que automatiza la generación de los estáticos. ✅

Estamos pues, listos(as) para probar. 🥳

> 👀 Astro busca tu archivo .lock, asegúrate de tener alguno: \`package-lock.json\`, \`yarn.lock\`, \`pnpm-lock.yaml\`, o \`bun.lockb\`.

Abrazo. Bliss. 🤓`;

async function main() {
  console.log("Importando post de Astro + Github Pages...");

  // Verificar si ya existe
  const existing = await db.post.findUnique({
    where: { slug: "astro_github_pages_lcerp" },
  });

  if (existing) {
    console.log("⚠️  El post ya existe con ID:", existing.id);
    return;
  }

  const post = await db.post.create({
    data: {
      slug: "astro_github_pages_lcerp",
      title: "Astro + Github Pages",
      body: postContent.trim(),
      published: true,

      // Autor
      authorName: "Héctorbliss",
      authorAt: "https://hectorbliss.com",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://www.hectorbliss.com",

      // Imágenes
      coverImage:
        "https://miro.medium.com/v2/resize:fit:1400/1*hr9dl2_mgQBJpq7TX9e4jw.jpeg",
      metaImage:
        "https://miro.medium.com/v2/resize:fit:1400/1*hr9dl2_mgQBJpq7TX9e4jw.jpeg",

      // Video de YouTube
      youtubeLink: "https://youtu.be/DNiqBXCnz78",

      // Clasificación
      tags: ["github", "pages", "hosting"],
      mainTag: "astro",

      // Fechas originales (6 Septiembre 2024)
      createdAt: new Date(1725572760188),
      updatedAt: new Date(1725572890982),
    },
  });

  console.log("✅ Post importado exitosamente!");
  console.log(`   ID: ${post.id}`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   Título: ${post.title}`);
  console.log(`   Autor: ${post.authorName}`);
  console.log(
    `   Fecha original: ${post.createdAt.toLocaleDateString("es-MX")}`
  );
  console.log(`   YouTube: ${post.youtubeLink}`);
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
