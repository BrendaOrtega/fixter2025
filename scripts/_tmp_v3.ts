import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main(){
const v = await db.video.findUnique({ where:{ id:"6aa0e9e72418e7f3a4061099" },
  select:{ id:true,slug:true,title:true,isPublic:true,accessLevel:true,kind:true,index:true,
           duration:true,m3u8:true,poster:true,eventDate:true,courseIds:true,processingStatus:true }});
console.log(JSON.stringify(v,null,1));
}
main().then(()=>process.exit(0));
