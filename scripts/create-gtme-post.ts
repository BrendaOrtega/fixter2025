import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

const db = new PrismaClient();

const raw = readFileSync(
  "docs/gtm-engineer/fx-01-que-es-un-gtm-engineer.md",
  "utf-8"
);
// El frontmatter del borrador no va al cuerpo: alimenta los campos del modelo.
const body = raw.trim();

const data = {
  title:
    "3,000 vacantes abiertas para un puesto que nadie estudió",
  slug: "que-es-un-gtm-engineer",
  body,
  contentFormat: "markdown",
  authorName: "Héctorbliss",
  authorAt: "@hectorbliss",
  photoUrl: "https://i.imgur.com/TaDTihr.png",
  authorAtLink: "https://www.hectorbliss.com",
  mainTag: "carrera",
  tags: ["carrera", "ai", "agentes", "opinion"],
  category: ["gtm"],
  serie: "gtm-engineer",
  orden: 1,
  metaDescription:
    "Hay más de 3,000 vacantes de GTM Engineer en el mundo y casi nadie se formó para el puesto. Qué construye, qué perfil pide y cuánto paga en pesos.",
  coverImage:
    "https://images.pexels.com/photos/14326109/pexels-photo-14326109.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  metaImage:
    "https://images.pexels.com/photos/14326109/pexels-photo-14326109.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop",
  published: true,
};

async function main() {
  const post = await db.post.upsert({
    where: { slug: data.slug },
    create: data,
    update: data,
  });
  console.log("listo →", post.slug, "| published:", post.published);
  await db.$disconnect();
}
main();
