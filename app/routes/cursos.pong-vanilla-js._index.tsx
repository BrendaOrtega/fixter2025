import { redirect } from "react-router";

// Redirect /cursos/pong-vanilla-js/ to the viewer
export const loader = () => {
  throw redirect("/cursos/pong-vanilla-js/viewer");
};
