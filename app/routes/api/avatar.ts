import { redirect, type LoaderFunctionArgs } from "react-router";
import { db } from "~/.server/db";
import { getUserOrRedirect } from "~/.server/dbGetters";
import { getReadURL } from "~/.server/tigrs";

const MAX_BYTES = 4 * 1024 * 1024;
/** Nombres que apuntan a la propia red: el servidor no los pide por nadie. */
const isPrivateHost = (host: string) =>
  host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || host.includes(":") ||
  /^(\d{1,3}\.){3}\d{1,3}$/.test(host);

// Avatar de un miembro por su id (12-nov-2026). Los avatares subidos en /perfil viven en el bucket
// con el correo como llave (igual que en la barra del sitio: `/api/file?storageKey=<correo>`); esta
// ruta los sirve sin enseñarle el correo de un miembro a otro. Sólo con sesión.
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  await getUserOrRedirect(request);
  const id = String(params.userId ?? "");
  if (!/^[a-f0-9]{24}$/.test(id)) throw new Response("Not found", { status: 404 });
  const user = await db.user.findUnique({ where: { id }, select: { email: true, photoURL: true } });
  if (!user) throw new Response("Not found", { status: 404 });
  // `?raw=1`: los bytes por el mismo origen. El Mundo 3D pinta la foto en una textura y WebGL no
  // acepta imágenes de otro origen sin CORS. Sólo https, sólo imágenes, con tope de peso y de tiempo.
  if (new URL(request.url).searchParams.get("raw")) {
    const source = user.photoURL || (await getReadURL(user.email));
    let target: URL;
    try { target = new URL(source); } catch { throw new Response("Not found", { status: 404 }); }
    if (target.protocol !== "https:" || isPrivateHost(target.hostname)) throw new Response("Not found", { status: 404 });
    const res = await fetch(target, { signal: AbortSignal.timeout(6000), redirect: "error" }).catch(() => null);
    const type = res?.headers.get("content-type") ?? "";
    if (!res?.ok || !/^image\/(png|jpe?g|webp|gif|avif)/i.test(type)) throw new Response("Not found", { status: 404 });
    const bytes = await res.arrayBuffer();
    if (bytes.byteLength > MAX_BYTES) throw new Response("Not found", { status: 404 });
    return new Response(bytes, {
      headers: { "Content-Type": type, "Cache-Control": "private, max-age=600", "X-Content-Type-Options": "nosniff" },
    });
  }
  // Si no hay archivo, el bucket responde 404 y el componente cae a las iniciales.
  return redirect(user.photoURL || (await getReadURL(user.email)), {
    headers: { "Cache-Control": "private, no-cache" },
  });
};
