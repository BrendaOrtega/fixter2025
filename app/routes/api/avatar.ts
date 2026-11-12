import { redirect, type LoaderFunctionArgs } from "react-router";
import { db } from "~/.server/db";
import { getUserOrRedirect } from "~/.server/dbGetters";
import { getReadURL } from "~/.server/tigrs";

// Avatar de un miembro por su id (12-nov-2026). Los avatares subidos en /perfil viven en el bucket
// con el correo como llave (igual que en la barra del sitio: `/api/file?storageKey=<correo>`); esta
// ruta los sirve sin enseñarle el correo de un miembro a otro. Sólo con sesión.
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  await getUserOrRedirect(request);
  const id = String(params.userId ?? "");
  if (!/^[a-f0-9]{24}$/.test(id)) throw new Response("Not found", { status: 404 });
  const user = await db.user.findUnique({ where: { id }, select: { email: true, photoURL: true } });
  if (!user) throw new Response("Not found", { status: 404 });
  // Si no hay archivo, el bucket responde 404 y el componente cae a las iniciales.
  return redirect(user.photoURL || (await getReadURL(user.email)), {
    headers: { "Cache-Control": "private, max-age=600" },
  });
};
