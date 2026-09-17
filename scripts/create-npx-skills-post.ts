import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

const db = new PrismaClient();

const raw = readFileSync("docs/blog/skills-npx-vercel-ghosty-studio.md", "utf-8");
// El frontmatter del borrador no va al cuerpo: alimenta los campos del modelo.
const body = raw.replace(/^---[\s\S]*?---\s*/, "").trim();

const data = {
  title:
    "Un comando y tu agente ya sabe hablar con Ghosty Studio: así usamos npx skills de Vercel",
  slug: "npx-skills-vercel-ghosty-studio",
  body,
  contentFormat: "markdown",
  authorName: "Héctorbliss",
  authorAt: "@hectorbliss",
  photoUrl: "https://i.imgur.com/TaDTihr.png",
  authorAtLink: "https://www.hectorbliss.com",
  mainTag: "agentes",
  tags: ["agentes", "ai", "claude", "tutorial"],
  metaDescription:
    "npx skills add https://www.ghosty.studio instala en 73 agentes un SKILL.md que enseña a Claude Code, Cursor o Codex a configurar tu agente de Ghosty por su API. Qué hace el CLI de Vercel y qué servimos nosotros.",
  coverImage: "https://easybits-public.t3.storage.dev/69fb69f5273b3866227a5b84/BvC7_c1Dg0NB",
  metaImage: "https://easybits-public.t3.storage.dev/69fb69f5273b3866227a5b84/BvC7_c1Dg0NB",
  published: true,
};

async function main() {
  const post = await db.post.upsert({ where: { slug: data.slug }, create: data, update: data });
  console.log("listo →", post.slug, "| published:", post.published);
  await db.$disconnect();
}
main();
