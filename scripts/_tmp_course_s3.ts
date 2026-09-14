import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main(){
 const v = await db.video.findUnique({ where:{ id:"6aa0e9e72418e7f3a4061099" }, select:{ courseIds:true, m3u8:true, storageLink:true }});
 console.log(JSON.stringify(v,null,1));
}
main().then(()=>process.exit(0));
