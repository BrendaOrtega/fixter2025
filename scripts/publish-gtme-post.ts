import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
  const post = await db.post.update({
    where: { slug: "que-es-un-gtm-engineer" },
    data: { published: true },
  });
  console.log("publicado →", post.slug, "| published:", post.published);
  await db.$disconnect();
}
main();
