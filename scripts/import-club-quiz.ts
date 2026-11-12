// Importa un quiz en formato Razzia (JSON por stdin) a una comunidad. Uso:
//   cat quiz.json | npx tsx scripts/import-club-quiz.ts <slug-de-la-comunidad>
// Sirvió el 12-nov-2026 para pasar «agentes-calentamiento» de la caja del quiz a Mongo.
// No duplica: si la comunidad ya tiene un quiz con ese nombre, no hace nada.
import { PrismaClient } from "@prisma/client";

type RazziaQuestion = { question: string; answers: string[]; solutions?: number[]; time: number; media?: { url?: string } };

const db = new PrismaClient();
const slug = process.argv[2];
let raw = "";
for await (const chunk of process.stdin) raw += chunk;
const source = JSON.parse(raw) as { subject: string; questions: RazziaQuestion[] };

const community = await db.community.findFirst({ where: { slug }, select: { id: true, ownerId: true, name: true } });
if (!community) throw new Error(`No existe la comunidad ${slug}`);
const existing = await db.communityQuiz.findFirst({ where: { communityId: community.id, subject: source.subject, OR: [{ archivedAt: null }, { archivedAt: { isSet: false } }] } });
if (existing) {
  console.log(`«${source.subject}» ya está en ${community.name}: no se duplica.`);
} else {
  const questions = source.questions.map((q) => ({
    question: q.question,
    answers: q.answers,
    solution: q.solutions?.[0] ?? 0,
    time: Math.min(120, Math.max(5, q.time)),
    ...(q.media?.url?.startsWith("https://") ? { image: q.media.url } : {}),
  }));
  const row = await db.communityQuiz.create({
    data: { communityId: community.id, createdById: community.ownerId, subject: source.subject, questions },
    select: { id: true },
  });
  console.log(`«${source.subject}» importado a ${community.name} con ${questions.length} preguntas (${row.id}).`);
}
await db.$disconnect();
