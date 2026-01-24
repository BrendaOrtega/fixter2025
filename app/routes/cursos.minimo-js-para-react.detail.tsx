import { redirect } from "react-router";

// Redirect /detail (typo) to /detalle
export const loader = () => {
  throw redirect("/cursos/minimo-js-para-react/detalle");
};
