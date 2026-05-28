import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { getUserOrRedirect } from "~/.server/dbGetters";
import { getPutFileUrl, getReadURL } from "~/.server/tigrs";

const PREFIX_KEY = "email-content/";

// GET público: sirve la imagen redirigiendo a una presigned fresca.
// Restringido al prefijo email-content/ para evitar lectura arbitraria.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const key = new URL(request.url).searchParams.get("key");
  if (!key || !key.startsWith(PREFIX_KEY) || key.includes("..")) {
    throw new Response("Not found", { status: 404 });
  }
  return redirect(await getReadURL(key));
};

// POST account-guarded: devuelve presigned PUT + URL pública permanente para insertar en el email.
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  await getUserOrRedirect(request);

  const formData = await request.formData();
  const fileName = (formData.get("fileName") as string) || "image";
  const sequenceId = (formData.get("sequenceId") as string) || "misc";

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const key = `${PREFIX_KEY}${sequenceId}/${Date.now()}-${safeName}`;

  const putURL = await getPutFileUrl(key);
  const origin = new URL(request.url).origin;
  const publicURL = `${origin}/api/email-image?key=${encodeURIComponent(key)}`;

  return Response.json({ putURL, key, publicURL });
};
