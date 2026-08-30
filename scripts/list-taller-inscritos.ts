#!/usr/bin/env npx tsx
import { db } from "../app/.server/db";

async function main() {
  const cursos = await db.course.findMany({
    where: { title: { contains: "gént", mode: "insensitive" } },
    select: { id: true, title: true, slug: true, tipo: true },
  });
  console.log("CURSOS:", cursos);
  for (const c of cursos) {
    const users = await db.user.findMany({
      where: { courses: { has: c.id } },
      select: { email: true, displayName: true, username: true },
    });
    console.log(`\n${c.slug} (${c.title}) → ${users.length}`);
    users.forEach((u) => console.log("  ", u.email, "|", u.displayName ?? u.username ?? "—"));
  }
}
main().finally(() => db.$disconnect());
