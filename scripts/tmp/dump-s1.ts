import { db } from "../../app/.server/db";
import fs from "fs";
async function main() {
  const v = await db.video.findFirst({ where: { slug: "sesion-1-de-stdio-a-la-caja" }, include: { transcript: true } });
  if (!v) { console.log("no video"); return; }
  const { transcript, ...rest } = v as any;
  console.log(JSON.stringify(rest, null, 1));
  if (transcript) { console.log("segments", transcript.segments.length, "chapters", JSON.stringify(transcript.chapters)); fs.writeFileSync(process.env.OUT!, JSON.stringify(transcript, null, 1)); }
}
main().then(() => process.exit(0));
