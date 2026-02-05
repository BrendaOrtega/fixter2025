import { redirect } from "react-router";

// Captura todas las URLs legacy de tutoriales como:
// /tutoriales/crea-tu-primer-componente-con-reactjs-2022/agregando-mas-props-1670610357505
export const loader = async () => {
  throw redirect("/tutoriales", 301);
};

export default function TutorialesLegacy() {
  return null;
}
