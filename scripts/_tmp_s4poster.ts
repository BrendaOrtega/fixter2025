import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const v = await db.video.findMany({ where: { slug: { in: ["sesion-4-permisos-y-extensiones", "los-4-tipos-de-memoria-2026-09-09-0220"] } }, select: { slug: true, poster: true, posterWide: true } });
console.log(v); process.exit(0);
