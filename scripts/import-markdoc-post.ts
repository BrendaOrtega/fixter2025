import { db } from "../app/.server/db";

const postContent = `[Markdoc](https://markdoc.dev/) es una herramienta de *Stripe* para formatear archivos markdown a HTML, mediante la creación de un AST (_Abstract Syntax Tree_). Y hay que reconocer que la documentación puede ser un poco abrumadora para quienes quieren rápidamente usar esta herramienta y no saber exactamente cómo funciona.

Por eso, aquí te dejo los pasos que yo seguí:

## Instalando

\`\`\`bash
npm i @markdoc/markdoc
\`\`\`

## Configurando del lado del servidor

Primero vamos a crear una función que utilice markdoc en el servidor, y que me devuelva el AST de mi contenido.

![Imagen de Prism](https://i.imgur.com/5npwv5P.png)

El nombre de tu archivo puede terminar en \`.server.ts\` para asegurarte de que el código solo corra del lado del servidor.

\`\`\`typescript
// utils/markdown.server.ts
import Markdoc from "@markdoc/markdoc";
import type { RenderableTreeNode } from "@markdoc/markdoc";

export const markdownParser = (text: string): RenderableTreeNode => {
  const ast = Markdoc.parse(text);
  const content = Markdoc.transform(ast);
  return content;
};
\`\`\`

Esta función recibe un string de markdown y devuelve el AST transformado. Justo lo que necesito.

---

🎬 **¿Te está gustando este contenido?** Tenemos más tutoriales en video en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

## Configurando el componente del cliente

Ahora vamos a crear un componente que reciba el AST y lo renderice como JSX.

\`\`\`tsx
// components/ContentToJSX.tsx
import Markdoc, { type RenderableTreeNode } from "@markdoc/markdoc";
import React from "react";
import Prism from "prismjs";
import { useEffect } from "react";

type Props = {
  content: RenderableTreeNode;
};

export default function ContentToJSX({ content }: Props) {
  useEffect(() => {
    Prism.highlightAll();
  }, []);

  return <>{Markdoc.renderers.react(content, React)}</>;
}
\`\`\`

## Agregando Prism.js

Para el *syntax highlighting* de los bloques de código, estoy usando [Prism.js](https://prismjs.com/). Para usarlo en tu proyecto, solo debes agregar la hoja de estilos que desees en tu \`root.tsx\`:

\`\`\`tsx
// root.tsx
import prismStyles from "prismjs/themes/prism-tomorrow.css";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: prismStyles },
  // ... otros estilos
];
\`\`\`

## Creando el detalle del blog

Ahora, en tu ruta dinámica de Remix, puedes usar ambas funciones:

\`\`\`tsx
// routes/blog.$slug.tsx
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { markdownParser } from "~/utils/markdown.server";
import ContentToJSX from "~/components/ContentToJSX";
import { getPostBySlug } from "~/models/post.server";

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const post = await getPostBySlug(params.slug);
  if (!post) {
    throw new Response("Not Found", { status: 404 });
  }

  const content = markdownParser(post.body);

  return json({ post, content });
};

export default function BlogPost() {
  const { post, content } = useLoaderData<typeof loader>();

  return (
    <article className="prose lg:prose-xl">
      <h1>{post.title}</h1>
      <ContentToJSX content={content} />
    </article>
  );
}
\`\`\`

## Resumen

Con estos pasos ya tienes:

1. ✅ Markdoc instalado
2. ✅ Una función de servidor que parsea markdown a AST
3. ✅ Un componente que renderiza el AST como JSX
4. ✅ Syntax highlighting con Prism.js
5. ✅ Una ruta dinámica para mostrar tus posts

Si quieres profundizar más, te recomiendo revisar la documentación oficial de [Markdoc](https://markdoc.dev/) y [Prism.js](https://prismjs.com/). Y si quieres entender mejor qué es un AST, te dejo este [artículo sobre Abstract Syntax Trees](https://en.wikipedia.org/wiki/Abstract_syntax_tree).

Abrazo. Bliss. 🤓`;

async function main() {
  console.log("Importando post de Markdoc con Remix...");

  const slug = "usando-markdoc-con-remix-la-pareja-perfecta-2023";

  // Verificar si ya existe
  const existing = await db.post.findUnique({
    where: { slug },
  });

  if (existing) {
    console.log("⚠️  El post ya existe con ID:", existing.id);
    return;
  }

  const post = await db.post.create({
    data: {
      slug,
      title: "Usando Markdoc con Remix: la pareja perfecta",
      body: postContent.trim(),
      published: true,

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@hectorbliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://twitter.com/HectorBlisS",

      // Imágenes
      coverImage: "https://fixtergeek.com/cover.png",
      metaImage: "https://fixtergeek.com/cover.png",

      // Video (vacío)
      youtubeLink: "",

      // Clasificación
      tags: ["markdoc", "remix", "react", "prismjs", "markdown"],
      mainTag: "Markdoc",

      // Fechas originales del post (June 18, 2023)
      createdAt: new Date(1687102711956),
      updatedAt: new Date(1687557417297),
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
    console.error("❌ Error importando post:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
