import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";
const db = new PrismaClient();
async function main() {
  const t = await db.transcript.findFirst({ where: { videoId: "6aa0e9e72418e7f3a4061099" } });
  if (!t) return console.log("no");
  const segs = t.segments as any[];
  const fmt = (s:number)=>`${String(Math.floor(s/60)).padStart(3,"0")}:${String(Math.floor(s%60)).padStart(2,"0")}`;
  const lines = segs.map(x=>`[${fmt(x.s)}] ${x.quien??""}: ${x.texto}`);
  writeFileSync(process.argv[2], lines.join("\n"));
  console.log("segs", segs.length, "dur", fmt(segs[segs.length-1].e));
  console.log("chapters", JSON.stringify(t.chapters));
}
main().then(()=>process.exit(0));
