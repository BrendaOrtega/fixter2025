import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  const cs = await p.course.findMany({ select: { id: true, slug: true, title: true } });
  const filas: { slug: string; n: number }[] = [];
  for (const c of cs) {
    const n = await p.user.count({ where: { courses: { has: c.id } } });
    if (n) filas.push({ slug: c.slug, n });
  }
  filas.sort((a, b) => b.n - a.n);
  for (const f of filas) console.log(String(f.n).padStart(4), f.slug);
  console.log("\n--- sistemas-agenticos, quiénes ---");
  const sa = cs.find(c => c.slug === "sistemas-agenticos")!;
  const us = await p.user.findMany({ where: { courses: { has: sa.id } },
    select: { email: true, displayName: true, createdAt: true }, orderBy: { createdAt: "asc" } });
  for (const u of us) console.log(` ${u.createdAt.toISOString().slice(0,10)}  ${u.email}  ${u.displayName ?? ""}`);
}
main().finally(() => p.$disconnect());
