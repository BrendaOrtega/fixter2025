import type { ActionFunctionArgs } from "react-router";
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { getUserOrRedirect } from "~/.server/dbGetters";

const SYSTEM_PROMPT = `Eres un copywriter experto en email marketing para FixterGeek, en español mexicano profesional e internacional (nunca voseo argentino).

REGLAS:
- Escribe el CUERPO de UN email de una secuencia. Conversacional, directo, cercano.
- UNA sola idea principal + UN call-to-action claro al final.
- Breve: 2-4 párrafos cortos. Nada de relleno ni lenguaje de venta agresivo.
- Markdown: **negritas** para lo clave, listas con - cuando ayuden, > para una cita o dato si aplica.
- NO incluyas el asunto, ni "Asunto:", ni firma con logo (eso lo pone la plantilla).
- Cierra con una línea de CTA en negritas (ej. **Empieza aquí** o similar) — sin inventar URLs.

REGLA CRÍTICA — NO INVENTES:
- NUNCA inventes testimonios, citas, cifras, estadísticas, fechas, precios ni claims de producto.
- Si se te da CONTEXTO, úsalo como ÚNICA fuente de hechos. Si no hay contexto o falta un dato, NO lo inventes: deja un placeholder claro entre corchetes (ej. [enlace], [fecha], [beneficio concreto]) para que la persona lo complete.`;

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }
  await getUserOrRedirect(request);

  const { prompt, subject, context } = await request.json();
  if (!prompt || typeof prompt !== "string") {
    return Response.json({ error: "prompt is required" }, { status: 400 });
  }

  const ctx =
    typeof context === "string" && context.trim()
      ? `CONTEXTO (úsalo como ÚNICA fuente de hechos; no inventes nada fuera de esto):\n"""\n${context.trim().slice(0, 20000)}\n"""\n\n`
      : "";
  const fullPrompt =
    ctx +
    (subject ? `Asunto del email: "${subject}".\n` : "") +
    `Genera el cuerpo del email sobre: ${prompt}`;

  const result = streamText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system: SYSTEM_PROMPT,
    prompt: fullPrompt,
    temperature: 0.7,
  });

  // Stream del markdown como texto plano; el cliente lo convierte a HTML y lo
  // envuelve en el shell en vivo para que aparezca en el preview del drawer.
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of result.textStream) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      } catch (e) {
        console.error("ai.email stream failed:", e);
        controller.error(e);
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
