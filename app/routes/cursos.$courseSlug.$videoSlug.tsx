import { redirect, type LoaderFunctionArgs } from "react-router";

/// URL canónica de una pieza del programa: /cursos/:curso/:video
///
/// El viewer sigue viviendo en `/cursos/:curso/viewer?videoSlug=...` con toda su
/// lógica de acceso; esta ruta no la duplica, la nombra. Así los materiales
/// pueden colgar de una URL con sentido (`.../slides`, `.../seis-piezas`) sin
/// tocar las 600 líneas del viewer.
export const loader = ({ params, request }: LoaderFunctionArgs) => {
  // `?t=` sobrevive al redirect: si no, compartir un minuto por la URL bonita
  // —que es la que uno pega en un correo— abría el video desde el principio.
  const t = new URL(request.url).searchParams.get("t");
  return redirect(
    `/cursos/${params.courseSlug}/viewer?videoSlug=${params.videoSlug}` +
      (t ? `&t=${encodeURIComponent(t)}` : ""),
  );
};
