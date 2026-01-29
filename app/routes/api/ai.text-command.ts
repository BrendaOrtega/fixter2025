import type { Route } from "./+types/ai.text-command";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

const SYSTEM_PROMPT = `Eres un asistente de escritura para un blog técnico en español.

REGLAS IMPORTANTES DE FORMATO:
1. SIEMPRE usa formato Markdown en tus respuestas
2. Usa ## para títulos de sección y ### para subtítulos
3. Usa **negritas** para conceptos importantes
4. Usa *cursivas* para énfasis
5. Usa listas con viñetas (-) para enumerar puntos
6. Usa listas numeradas (1. 2. 3.) para pasos secuenciales
7. Usa \`código\` para términos técnicos, comandos o código inline
8. Usa bloques de código con triple backtick para ejemplos de código
9. Usa > para citas o información destacada
10. Mantén párrafos cortos (2-4 oraciones máximo)

NUNCA respondas con texto plano sin formato. SIEMPRE aplica markdown apropiado.`;

export const action = async ({ request }: Route.ActionArgs) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return Response.json(
        { error: "prompt is required" },
        { status: 400 }
      );
    }

    const { text: result } = await generateText({
      model: openai("gpt-4o-mini"),
      system: SYSTEM_PROMPT,
      prompt,
      temperature: 0.7,
      maxTokens: 1000,
    });

    return Response.json({ result });
  } catch (error: any) {
    console.error("AI API error:", error);
    return Response.json(
      { error: error.message || "Failed to process AI command" },
      { status: 500 }
    );
  }
};
