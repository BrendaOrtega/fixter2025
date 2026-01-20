import { redirect } from "react-router";

export const loader = () => {
  throw redirect("/cursos/testing-en-react-con-jest-y-testing-library/detalle");
};
