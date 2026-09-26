// Limpieza de la ola de list-bombing (ago–sep 2026).
// Paso 1 (default): dry-run → escribe los candidatos a un JSON para revisarlos.
// Paso 2: --apply <candidates.json> → respalda y borra SÓLO esos ids, uno por uno.
//   npx tsx --env-file=.env scripts/cleanup-bot-signups.ts
//   npx tsx --env-file=.env scripts/cleanup-bot-signups.ts --apply <candidates.json> <backup.json>
import { PrismaClient } from "@prisma/client";
import { readFileSync, writeFileSync } from "node:fs";

const db = new PrismaClient();
const SINCE = new Date("2026-08-01");
// Tags que ponen los formularios que usó la ola; cualquier otro tag = llegó por otra puerta
const BOT_TAGS = new Set(["pong-course", "newsletter", "blog", "subscriber", "pong-vanilla-js-free-access", "community:agentes"]);
const PROTECTED = new Set([
  "fixtergeek@gmail.com",
  "jcarloshe3004@gmail.com",
  "mefitdev@gmail.com",
  "mcarrascocomonfort@gmail.com",
  "ozober@gmail.com",
  "serchcode@gmail.com",
  "lmuro44@gmail.com",
  "mrcb.422@gmail.com",
  "martinbalarezo92@hotmail.com",
  "cosmoduende@hotmail.com",
]);

type Candidate = { kind: "subscriber" | "user"; id: string; email: string; createdAt: string; tags: string[]; signals: string[] };

async function dryRun(out: string) {
  const [subs, users] = await Promise.all([
    db.subscriber.findMany({ where: { createdAt: { gte: SINCE } }, select: { id: true, email: true, createdAt: true, tags: true, confirmed: true } }),
    db.user.findMany({ where: { createdAt: { gte: SINCE } }, select: { id: true, email: true, createdAt: true, tags: true, courses: true, books: true } }),
  ]);
  const emails = [...new Set([...subs, ...users].map((r) => r.email.toLowerCase()))];
  const [purchases, views] = await Promise.all([
    db.purchaseEvent.findMany({ where: { email: { in: emails } }, select: { email: true } }),
    db.videoView.findMany({ where: { email: { in: emails } }, select: { email: true } }),
  ]);
  const bought = new Set(purchases.map((p) => p.email.toLowerCase()));
  const watched = new Set(views.map((v) => v.email!.toLowerCase()));

  const candidates: Candidate[] = [];
  const skip = (email: string, tags: string[]) =>
    PROTECTED.has(email.toLowerCase()) || bought.has(email.toLowerCase()) || watched.has(email.toLowerCase()) || tags.some((t) => !BOT_TAGS.has(t));

  for (const s of subs) {
    if (skip(s.email, s.tags)) continue;
    candidates.push({ kind: "subscriber", id: s.id, email: s.email, createdAt: s.createdAt.toISOString(), tags: [...new Set(s.tags)], signals: s.confirmed ? ["confirmed"] : [] });
  }
  for (const u of users) {
    if (skip(u.email, u.tags) || u.courses.length || u.books.length) continue;
    candidates.push({ kind: "user", id: u.id, email: u.email, createdAt: u.createdAt.toISOString(), tags: [...new Set(u.tags)], signals: [] });
  }
  candidates.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const c of candidates) console.log(c.createdAt.slice(0, 10), c.kind.padEnd(10), c.email.padEnd(45), c.tags.join(","), c.signals.join(","));
  console.log(`\n${candidates.filter((c) => c.kind === "subscriber").length} subscribers, ${candidates.filter((c) => c.kind === "user").length} users → ${out}`);
  writeFileSync(out, JSON.stringify(candidates, null, 2));
}

async function apply(file: string, backupFile: string) {
  const candidates: Candidate[] = JSON.parse(readFileSync(file, "utf8"));
  const subIds = candidates.filter((c) => c.kind === "subscriber").map((c) => c.id);
  const userIds = candidates.filter((c) => c.kind === "user").map((c) => c.id);
  // Respaldo completo antes de tocar nada
  const backup = {
    subscribers: await db.subscriber.findMany({ where: { id: { in: subIds } } }),
    enrollments: await db.sequenceEnrollment.findMany({ where: { subscriberId: { in: subIds } } }),
    users: await db.user.findMany({ where: { id: { in: userIds } } }),
  };
  writeFileSync(backupFile, JSON.stringify(backup, null, 2));
  console.log(`respaldo → ${backupFile}`);

  let deleted = 0;
  for (const c of candidates) {
    if (PROTECTED.has(c.email.toLowerCase())) continue;
    if (c.kind === "subscriber") await db.subscriber.delete({ where: { id: c.id } });
    else await db.user.delete({ where: { id: c.id } });
    deleted++;
  }
  console.log(`borrados: ${deleted}`);
}

const [, , flag, file, backupFile] = process.argv;
if (flag === "--apply") {
  if (!file || !backupFile) throw new Error("uso: --apply <candidates.json> <backup.json>");
  await apply(file, backupFile);
} else {
  await dryRun(flag ?? "cleanup-bot-signups.candidates.json");
}
await db.$disconnect();
