/**
 * URL canónica de una pieza del programa: `/cursos/:curso/:video`.
 *
 * Esta ES la ruta del reproductor, no un atajo que redirige a otra. Antes vivía
 * en `/cursos/:curso/viewer?videoSlug=`, y cada visita a la URL bonita —la que
 * se pega en YouTube y en los correos— costaba un redirect: un viaje de más,
 * los `utm_*` en el aire y dos URLs distintas para el mismo contenido, que a
 * los buscadores les parece duplicado.
 *
 * El módulo del viewer se reusa tal cual: sabe leer el slug del segmento y, si
 * alguien llega por la ruta vieja, es él quien manda el 301 hacia acá.
 */
export {
  loader,
  action,
  meta,
  default,
} from "./courseViewer";
