import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main(){
const vs = await db.video.findMany({ where:{ courseIds:{ has:"6a78ff744a8e00e3b2eea500" }, isPublic:true },
  select:{ slug:true,moduleName:true,module:true,index:true,duration:true }, orderBy:{ index:"asc" }});
for (const v of vs) console.log(`idx ${String(v.index).padStart(2)}  mod=${JSON.stringify(v.moduleName)}  ${v.duration}m  ${v.slug}`);
}
main().then(()=>process.exit(0));
