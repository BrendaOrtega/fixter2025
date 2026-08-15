import { redirect } from "react-router";

// Captura todas las URLs legacy de tutoriales como:
// /tutoriales/crea-tu-primer-componente-con-reactjs-2022/agregando-mas-props-1670610357505
//
// Antes redirigía a /tutoriales, que es una pantalla de "estamos actualizando
// esta página": todo el SEO histórico de los tutoriales aterrizaba en un hueco.
// El blog es donde vive ese contenido hoy.
export const loader = async () => {
  throw redirect("/blog", 301);
};

export default function TutorialesLegacy() {
  return null;
}
