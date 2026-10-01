import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

const db = new PrismaClient();

const raw = readFileSync("docs/blog/busqueda-exacta-sin-vectores.md", "utf-8");
// El frontmatter del borrador no va al cuerpo: alimenta los campos del modelo.
const body = raw.replace(/^---[\s\S]*?---\s*/, "").trim();

const cover = "https://easybits-public.t3.storage.dev/69fb69f5273b3866227a5b84/WWedTEPhhHyq";

const data = {
  title: "Búsqueda exacta, sin vectores: por qué Claude Code busca con grep",
  slug: "busqueda-exacta-sin-vectores",
  body,
  contentFormat: "markdown",
  authorName: "Héctorbliss",
  authorAt: "@hectorbliss",
  photoUrl: "https://i.imgur.com/TaDTihr.png",
  authorAtLink: "https://www.hectorbliss.com",
  mainTag: "ai",
  tags: ["ai", "claude", "agentes"],
  metaDescription:
    "Claude Code dejó los embeddings y busca con grep. Qué dijo Anthropic, qué midió el paper Is Grep All You Need? (93.1 % contra 75.9 %) y por qué aplica a leyes, donde la cita es literal.",
  coverImage: cover,
  metaImage: cover,
  published: true,
};

async function main() {
  const post = await db.post.upsert({ where: { slug: data.slug }, create: data, update: data });
  console.log("listo →", post.slug, "| published:", post.published);
  await db.$disconnect();
}
main();
