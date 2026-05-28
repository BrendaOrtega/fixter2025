import type { ActionFunctionArgs } from "react-router";
import { startSequenceProcessor } from "~/.server/agenda";
import { getAdminOrRedirect } from "~/.server/dbGetters";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  await getAdminOrRedirect(request);

  try {
    await startSequenceProcessor();
    return Response.json({ success: true, message: "Sequence processor started" });
  } catch (error) {
    console.error("Failed to start sequence processor:", error);
    return Response.json({ error: "Failed to start processor" }, { status: 500 });
  }
};