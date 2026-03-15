import { db } from "../app/.server/db";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const body = fs
  .readFileSync(
    path.join(
      __dirname,
      "../app/content/blog/mcp-figma-productos-disenador.md"
    ),
    "utf-8"
  )
  .replace(/^# .+\n/, "")
  .trim();

async function main() {
  console.log("Importando post: MCP Figma productos...");

  const slug = "mcp-figma-productos-disenador";

  const existing = await db.post.findUnique({ where: { slug } });

  if (existing) {
    console.log("⚠️  El post ya existe. Actualizando...");
    const post = await db.post.update({
      where: { slug },
      data: {
        title:
          "De entregar archivos a entregar productos: lo que MCP cambia para un diseñador",
        body,
        published: true,
        authorName: "Héctorbliss",
        authorAt: "@blissmo",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://twitter.com/HectorBlisS",
        tags: ["MCP", "Figma", "diseño", "productividad", "easybits"],
        mainTag: "diseño",
        coverImage:
          "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1200&h=630&fit=crop",
        metaImage:
          "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1200&h=630&fit=crop",
      },
    });
    console.log("✅ Post actualizado!");
    console.log(`   URL: /blog/${post.slug}`);
    return;
  }

  const post = await db.post.create({
    data: {
      slug,
      title:
        "De entregar archivos a entregar productos: lo que MCP cambia para un diseñador",
      body,
      published: true,
      authorName: "Héctorbliss",
      authorAt: "@blissmo",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://twitter.com/HectorBlisS",
      tags: ["MCP", "Figma", "diseño", "productividad", "easybits"],
      mainTag: "diseño",
      coverImage:
        "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1200&h=630&fit=crop",
      metaImage:
        "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1200&h=630&fit=crop",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log("✅ Post importado!");
  console.log(`   ID: ${post.id}`);
  console.log(`   URL: /blog/${post.slug}`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
