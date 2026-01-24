import { redirect, type LoaderFunctionArgs } from "react-router";

// Redirect /cursos/:slug/detail → /cursos/:slug/detalle
export const loader = ({ params }: LoaderFunctionArgs) => {
  throw redirect(`/cursos/${params.courseSlug}/detalle`);
};
