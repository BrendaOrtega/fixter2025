import { redirect } from "react-router";

// Era una pantalla de "¡Nos descubriste! Estamos actualizando esta página" con
// un mailto que ni siquiera coincidía con el correo que mostraba. Llevaba años
// indexada y sin contenido: mejor mandar a donde sí hay algo que leer.
export const loader = async () => {
  throw redirect("/blog", 301);
};

export default function Placeholder() {
  return null;
}
