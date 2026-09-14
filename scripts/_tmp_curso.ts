import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
const c = await db.course.findFirst({ where: { title: { contains: "gént", mode: "insensitive" } } });
if (!c) { const all = await db.course.findMany({select:{id:true,title:true,slug:true}}); console.log(all.slice(-15)); return; }
console.log("CURSO:", c.id, "|", c.title, "| slug:", c.slug);
const vids = await db.video.findMany({ where: { courseIds: { has: c.id } },
  select: { id:true, slug:true, title:true, index:true, kind:true, isPublic:true, m3u8:true, storageLink:true,
            poster:true, duration:true, processingStatus:true, processingMetadata:true,
            resources:{select:{slug:true,kind:true,title:true}}, transcript:{select:{id:true}} },
  orderBy: { index: "asc" } });
for (const v of vids) console.log(JSON.stringify({
  slug:v.slug, title:v.title, idx:v.index, kind:v.kind, pub:v.isPublic, dur:v.duration,
  m3u8: !!v.m3u8, mp4: !!v.storageLink, poster: !!v.poster,
  proc: v.processingStatus, meta: v.processingMetadata,
  recursos: v.resources.map(r=>`${r.kind}:${r.slug}`), transcript: !!v.transcript }));
}
main().then(()=>process.exit(0));
