import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main(){
const v = await db.video.update({ where:{ id:"6aa0e9e72418e7f3a4061099" },
  data:{ moduleName:"Diseño de sistemas agénticos" },
  select:{ slug:true,title:true,moduleName:true,index:true,isPublic:true,accessLevel:true,kind:true,duration:true,m3u8:true }});
console.log(JSON.stringify(v,null,1));
const mod = await db.video.findMany({ where:{ courseIds:{has:"6a78ff744a8e00e3b2eea500"}, isPublic:true, moduleName:"Diseño de sistemas agénticos" },
  select:{index:true,title:true,duration:true}, orderBy:{index:"asc"}});
console.log("\nMÓDULO AHORA:", mod.length, "lecciones,", mod.reduce((a,b)=>a+Number(b.duration||0),0), "min");
for (const m of mod) console.log(`  idx ${m.index}  ${m.duration}m  ${m.title}`);
}
main().then(()=>process.exit(0));
