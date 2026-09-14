import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main(){
const vs = await db.video.findMany({ where:{ courseIds:{ has:"6a78ff744a8e00e3b2eea500" }, kind:{ in:["sesion","leccion","webinar"] } },
  select:{ id:true, slug:true, title:true, duration:true, kind:true, eventDate:true, createdAt:true, index:true },
  orderBy:{ createdAt:"desc" }, take:6 });
for (const v of vs) console.log(`${(v.eventDate?.toISOString().slice(0,10) ?? "     -    ")}  creado ${v.createdAt.toISOString().slice(0,16)}  ${String(v.duration).padStart(5)}m  ${v.slug}`);
}
main().then(()=>process.exit(0));
