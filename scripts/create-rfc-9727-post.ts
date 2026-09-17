import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

const db = new PrismaClient();

const raw = readFileSync("docs/blog/rfc-9727-api-catalog.md", "utf-8");
// El frontmatter del borrador no va al cuerpo: alimenta los campos del modelo.
const body = raw.replace(/^---[\s\S]*?---\s*/, "").trim();

const cover = "https://easybits-public.t3.storage.dev/69fb69f5273b3866227a5b84/EC6gZR2Wl2Pa";

const data = {
  title: "RFC 9727: la URL fija donde tu agente pregunta qué APIs tienes",
  slug: "rfc-9727-api-catalog",
  body,
  contentFormat: "markdown",
  authorName: "Héctorbliss",
  authorAt: "@hectorbliss",
  photoUrl: "https://i.imgur.com/TaDTihr.png",
  authorAtLink: "https://www.hectorbliss.com",
  mainTag: "agentes",
  tags: ["agentes", "ai", "node", "tutorial"],
  metaDescription:
    "/.well-known/api-catalog: el RFC 9727 define una ruta fija y un formato (Linkset) para que clientes y agentes descubran tus APIs con un GET. Qué devuelve, cómo se enlaza y cómo publicarlo en React Router.",
  youtubeLink: "https://easybits-public.t3.storage.dev/69fb69f5273b3866227a5b84/y5FI0uZm7JHR", // short vertical (mp4 en el CDN)
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
