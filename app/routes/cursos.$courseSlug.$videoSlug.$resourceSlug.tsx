import { redirect, data, type LoaderFunctionArgs } from "react-router";
import { findResource, openResource } from "~/.server/resources";

/// Un material de una pieza: /cursos/:curso/:video/slides, /pdf, etc.
/// Registra quién lo abrió y redirige al archivo o al destino externo.
export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const resource = await findResource(
    params.courseSlug as string,
    params.videoSlug as string,
    params.resourceSlug as string,
  );
  if (!resource) throw data("Material no encontrado", { status: 404 });

  const destination = await openResource(resource, request);
  if (!destination) throw data("Material sin archivo", { status: 404 });

  return redirect(destination);
};
