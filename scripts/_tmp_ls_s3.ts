import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
const vs = await db.video.findMany({ where: { title: { contains: "esi", mode: "insensitive" } }, select: { id:true, title:true, slug:true, createdAt:true, transcript: { select: { id:true, source:true, text:true } } }, orderBy:{ createdAt:"desc" }, take: 20 });
for (const v of vs) console.log(v.createdAt.toISOString().slice(0,10), v.id, v.slug, "|", v.title, "| transcript:", v.transcript ? v.transcript.text.length + " chars" : "NO");
}
main().then(()=>process.exit(0));
