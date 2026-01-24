import { redirect } from "react-router";

// Redirect /detail (typo) to /detalle
export const loader = () => {
  throw redirect("/cursos/testing-en-react-con-jest-y-testing-library/detalle");
};
