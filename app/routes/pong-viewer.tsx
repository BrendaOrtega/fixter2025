import { redirect } from "react-router";

export const loader = () => {
  throw redirect("/cursos/pong-vanilla-js/viewer");
};
