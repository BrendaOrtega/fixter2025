import { db } from "../.server/db";

async function updateAiSdkSummary() {
  const newSummary = `El AI SDK es la biblioteca open source de Vercel que está revolucionando cómo los desarrolladores integran inteligencia artificial en aplicaciones web. Con soporte nativo para TypeScript, streaming en tiempo real y una API elegante, es la herramienta que equipos de todo el mundo eligen para construir experiencias de IA en producción.`;

  const result = await db.course.update({
    where: { slug: "ai-sdk" },
    data: { summary: newSummary },
  });

  console.log("✅ Curso actualizado:", result.title);
  console.log("📝 Nuevo summary:", result.summary);
}

updateAiSdkSummary()
  .catch(console.error)
  .finally(() => process.exit(0));
