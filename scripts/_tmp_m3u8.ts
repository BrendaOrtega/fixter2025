import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main(){
for (const slug of ["sesion-1-de-stdio-a-la-caja","sesion-2-la-ui-y-su-caja","agentes-en-produccion"]) {
  const v = await db.video.findUnique({ where:{slug}, select:{slug:true,m3u8:true,poster:true,duration:true} });
  console.log("\n===", slug, "\n  m3u8:", v?.m3u8, "\n  poster:", v?.poster);
  if (!v?.m3u8) continue;
  try {
    const r = await fetch(v.m3u8);
    const t = await r.text();
    const vars = [...t.matchAll(/RESOLUTION=([0-9x]+)/g)].map(m=>m[1]);
    console.log("  master:", r.status, "| variantes:", vars.length ? vars.join(", ") : "(ninguna)");
  } catch(e){ console.log("  master: ERROR", String(e).slice(0,90)); }
  if (v.poster) { const p = await fetch(v.poster, {method:"HEAD"}).catch(()=>null);
    console.log("  poster HTTP:", p?.status, p?.headers.get("content-length")); }
}
}
main().then(()=>process.exit(0));
