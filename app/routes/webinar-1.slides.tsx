import { redirect } from "react-router";

// Link decible para las slides del primer webinar (13 ago 2026). El deck vive
// como archivo estático autocontenido en `public/webinar-1/slides.html`, que se
// regenera con `node scripts/build-webinar-slides.mjs` + copia a public/.
// Se sirve desde nuestro dominio a propósito: la API de EasyBits no sobrescribe
// archivos, así que cada republicación cambiaría la URL y rompería este link.
export const loader = () => redirect("/webinar-1/slides.html");
