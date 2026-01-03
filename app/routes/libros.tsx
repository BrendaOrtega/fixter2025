import { redirect } from "react-router";

export async function loader() {
  // Redirigir al libro de AI SDK
  return redirect("/libros/ai_sdk");
}