import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const r = await db.video.updateMany({ where: { courseIds: { has: "6a78ff744a8e00e3b2eea500" }, moduleName: "Las sesiones" }, data: { moduleName: "Diseño de sistemas agénticos" } });
console.log("actualizados", r.count);
const v = await db.video.findMany({ where: { courseIds: { has: "6a78ff744a8e00e3b2eea500" } }, select: { title: true, moduleName: true, index: true }, orderBy: { index: "asc" } });
for (const x of v) console.log(x.index, x.moduleName, "|", x.title);
process.exit(0);
