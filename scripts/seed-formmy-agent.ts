/**
 * One-time seed script to configure the Formmy agent as MentorIA.
 * Run with: npx tsx scripts/seed-formmy-agent.ts
 *
 * Requires FORMMY_SECRET_KEY in environment.
 */

async function seedFormmyAgent() {
  const secretKey = process.env.FORMMY_SECRET_KEY;
  if (!secretKey) {
    console.error("Missing FORMMY_SECRET_KEY env var");
    process.exit(1);
  }

  // Using @formmy.app/chat SDK if available, otherwise direct API
  try {
    const { Formmy } = await import("@formmy.app/chat");
    const formmy = new Formmy({ secretKey });

    const result = await formmy.agents.update("6962b02ec232df8a06a9b7d6", {
      name: "MentorIA",
      instructions:
        "Eres MentorIA, un coach de programación adaptativo de FixterGeek. Hablas español mexicano. Tu rol es evaluar nivel, hacer preguntas, proponer ejercicios y dar feedback directo. Adaptas tu tono según el nivel del estudiante. Siempre cierras con una sugerencia concreta o siguiente paso.",
    });

    console.log("Agent updated:", result);
  } catch (err) {
    console.error("Failed to update Formmy agent:", err);
    process.exit(1);
  }
}

seedFormmyAgent();
