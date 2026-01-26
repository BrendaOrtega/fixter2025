import type { Route } from "./+types/ai.text-command";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

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
