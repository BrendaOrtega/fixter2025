import { redirect, type LoaderFunctionArgs } from "react-router";

/// URL canónica de una pieza del programa: /cursos/:curso/:video
///
/// El viewer sigue viviendo en `/cursos/:curso/viewer?videoSlug=...` con toda su
/// lógica de acceso; esta ruta no la duplica, la nombra. Así los materiales
/// pueden colgar de una URL con sentido (`.../slides`, `.../seis-piezas`) sin
/// tocar las 600 líneas del viewer.
export const loader = ({ params, request }: LoaderFunctionArgs) => {
  // TODA la query sobrevive al redirect, no solo `?t=`.
  //
  // Antes se rescataba únicamente el minuto y se tiraba el resto: los `utm_*`
  // que pone el generador de ligas del admin morían aquí, así que el visor
  // nunca los veía y el tráfico de YouTube se registraba como directo. Esta es
  // la URL que se pega en las descripciones de los videos, o sea justo la que
  // más UTM carga.
  const entrada = new URL(request.url).searchParams;
  entrada.set("videoSlug", params.videoSlug as string);

  return redirect(`/cursos/${params.courseSlug}/viewer?${entrada.toString()}`);
};
