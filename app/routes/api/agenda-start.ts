import type { ActionFunctionArgs } from "react-router";
import { initializeAgenda } from "~/.server/agenda";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // Initialize agenda with all job definitions and processors
    await initializeAgenda();
    
    return Response.json({ 
      success: true, 
      message: "Agenda initialized with all job definitions and processors" 
    });
  } catch (error) {
    console.error("Failed to initialize Agenda:", error);
    return Response.json({ 
      error: "Failed to initialize Agenda", 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
};