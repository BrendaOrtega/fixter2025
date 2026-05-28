import type { ActionFunctionArgs } from "react-router";
import { getAdminOrRedirect } from "~/.server/dbGetters";
import { processDueEnrollments } from "~/.server/sequences";

// Motor global: procesa TODAS las inscripciones vencidas. Solo admin.
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  await getAdminOrRedirect(request);

  try {
    console.info("Manual sequence processing triggered");
    const { processed, results } = await processDueEnrollments();
    return Response.json({
      success: true,
      message: `Processed ${processed} enrollments`,
      results,
    });
  } catch (error) {
    console.error("Failed to process sequences:", error);
    return Response.json({ error: "Failed to process sequences" }, { status: 500 });
  }
};
