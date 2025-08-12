import { redirect } from "react-router";

export async function loader() {
  // Redirigir al único libro disponible por ahora
  return redirect("/libros/domina_claude_code");
}