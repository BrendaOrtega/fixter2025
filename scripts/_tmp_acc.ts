import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main(){
const vs = await db.video.findMany({ where:{ courseIds:{ has:"6a78ff744a8e00e3b2eea500" } },
  select:{ slug:true,title:true,isPublic:true,accessLevel:true,kind:true,index:true }, orderBy:{ index:"asc" }});
for (const v of vs) console.log(`idx ${String(v.index).padStart(2)}  pub=${String(v.isPublic).padEnd(5)} access=${String(v.accessLevel).padEnd(10)} kind=${String(v.kind).padEnd(8)} ${v.slug}`);
const c = await db.course.findUnique({ where:{ id:"6a78ff744a8e00e3b2eea500" }, select:{ isFree:true, basePrice:true, title:true }});
console.log("\nCURSO:", JSON.stringify(c));
}
main().then(()=>process.exit(0));
