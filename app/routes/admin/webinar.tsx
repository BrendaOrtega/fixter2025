import { redirect } from "react-router";

// `/admin/webinar` nunca fue de webinars: era el visor general de suscriptores
// por tag, que ahora vive en `/admin/suscriptores`. La ruta se queda como
// redirect en vez de 404 porque está en marcadores y en enlaces internos.
export const loader = () => redirect("/admin/suscriptores");
