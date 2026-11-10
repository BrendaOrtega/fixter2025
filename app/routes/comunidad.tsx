import { redirect } from "react-router";

// Por ahora hay una sola comunidad de pago: /comunidad lleva directo al club.
export const loader = () => redirect("/comunidad/club-de-agentes");
