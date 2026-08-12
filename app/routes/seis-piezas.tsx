import { redirect } from "react-router";

// Link corto para proyectar en el webinar: el de EasyBits es impronunciable y
// nadie lo va a teclear desde una pantalla compartida. Si se republica el PDF,
// aquí se cambia el destino y el link de las slides sigue sirviendo.
const PDF =
  "https://easybits-public.t3.storage.dev/699f35cbc8ad86037eda62b1/XlxD89MrMQSp";

export const loader = () => redirect(PDF);
