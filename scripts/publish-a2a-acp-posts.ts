// Publica los dos posts de protocolos de agentes (A2A y ACP) en el blog.
//
// A diferencia de los `create-*-post.ts` anteriores, éste NO lleva el cuerpo pegado dentro:
// lo LEE de `app/content/blog/*.md`. Duplicar el texto entre el archivo y el script hace que
// se separen en cuanto alguien corrige una errata en uno de los dos, y el que se publica es
// siempre el del script.
//
// Uso:  npx tsx scripts/publish-a2a-acp-posts.ts
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const POSTS = [
  {
    slug: "a2a-el-estandar-que-casi-nadie-implementa",
    title: "A2A v1.0 — lo que aprendimos implementando un estándar que casi nadie implementa",
    tags: ["ai", "agentes", "protocolos"],
    // Ruins of an Ancient City, John Martin, c. 1810–20 — Cleveland Museum of Art (CC0)
    metaImage: "https://www.fixtergeek.com/covers/a2a-ciudad-en-ruinas.jpg",
  },
  {
    slug: "acp-el-cable-sin-traductor",
    title: "ACP, parte 2 — el día que el relé pasó mensajes que no conocía",
    tags: ["ai", "agentes", "protocolos"],
    // Sculptura in Aes, Stradanus, c. 1591 — Cleveland Museum of Art (CC0)
    metaImage: "https://www.fixtergeek.com/covers/acp-taller-grabador.jpg",
  },
];

async function main() {
  for (const p of POSTS) {
    const file = path.join(process.cwd(), "app/content/blog", `${p.slug}.md`);
    const body = fs.readFileSync(file, "utf-8");

    // Idempotente: correrlo dos veces actualiza en vez de duplicar el slug.
    const post = await db.post.upsert({
      where: { slug: p.slug },
      update: { body, title: p.title, published: true, metaImage: p.metaImage },
      create: {
        title: p.title,
        slug: p.slug,
        body,
        contentFormat: "markdown",
        authorName: "Héctorbliss",
        authorAt: "@hectorbliss",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://www.hectorbliss.com",
        mainTag: "ai",
        tags: p.tags,
        metaImage: p.metaImage,
        published: true,
      },
    });
    console.log(`✓ /blog/${post.slug}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
