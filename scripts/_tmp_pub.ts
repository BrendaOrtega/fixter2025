import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main(){
const v = await db.video.update({ where:{ id:"6aa0e9e72418e7f3a4061099" },
  data:{ isPublic:true, accessLevel:"paid", kind:"sesion", title:"Sesión 3 · Los 4 tipos de memoria" },
  select:{ slug:true,title:true,isPublic:true,accessLevel:true,kind:true,index:true,m3u8:true,duration:true }});
console.log(JSON.stringify(v,null,1));
}
main().then(()=>process.exit(0));
