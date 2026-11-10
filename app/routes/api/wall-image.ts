import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { getUserOrRedirect } from "~/.server/dbGetters";
import { getPutFileUrl, getReadURL } from "~/.server/tigrs";

// Imágenes del muro de las comunidades (10-nov-2026). Mismo patrón que
// `api/email-image`: GET público restringido al prefijo, POST con sesión.
const PREFIX = "wall/";
const MAX_NAME = 80;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const key = new URL(request.url).searchParams.get("key");
  if (!key || !key.startsWith(PREFIX) || key.includes("..")) {
    throw new Response("Not found", { status: 404 });
  }
  return redirect(await getReadURL(key));
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const user = await getUserOrRedirect(request);
  const form = await request.formData();
  const type = String(form.get("type") ?? "");
  if (!/^image\/(png|jpe?g|gif|webp)$/.test(type)) {
    return Response.json({ error: "Sólo imágenes PNG, JPG, GIF o WebP" }, { status: 400 });
  }
  const name = String(form.get("fileName") ?? "imagen")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(-MAX_NAME);
  // La llave lleva el id del autor: al publicar sólo se acepta una llave propia.
  const key = `${PREFIX}${user.id}/${Date.now()}-${name}`;
  return Response.json({ putURL: await getPutFileUrl(key), key });
};
