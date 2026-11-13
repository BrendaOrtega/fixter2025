#!/usr/bin/env npx tsx
/**
 * Propone los momentos de una grabación del club y los guarda como BORRADOR (los miembros no los
 * ven hasta que el anfitrión los aprueba en Administrar club).
 *
 *   npx tsx --env-file=.env scripts/club-moments.ts <recordingId>
 */
import { db } from "../app/.server/db";
import { generateRecordingMoments } from "../app/.server/club-moments";

const id = process.argv[2];
if (!id) throw new Error("uso: club-moments.ts <recordingId>");
const row = await db.communityRecording.findUniqueOrThrow({ where: { id }, select: { communityId: true, title: true } });
const hms = (t: number) => new Date(t * 1000).toISOString().slice(11, 19);
const moments = await generateRecordingMoments(row.communityId, id);
console.log(`«${row.title}»: ${moments.length} momentos (borrador)\n`);
for (const m of moments) console.log(`${hms(m.s)}–${hms(m.e)}  ${m.title}\n          ${m.summary}`);
await db.$disconnect();
