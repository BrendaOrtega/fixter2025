import type { ActionFunctionArgs } from "react-router";
import { getUserOrRedirect } from "~/.server/dbGetters";

// Extrae texto de un archivo (md/txt/pdf) EN MEMORIA y lo devuelve.
// NO almacena nada: el file se lee, se extrae el texto y se descarta.
// El texto vuelve al cliente para que el usuario lo vea/edite (y note si la
// extracción salió mal) antes de usarlo como contexto de generación.
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }
  await getUserOrRedirect(request);

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return Response.json({ error: "No se recibió archivo" }, { status: 400 });

  const name = (file.name || "").toLowerCase();
  const isPdf = name.endsWith(".pdf") || file.type === "application/pdf";

  try {
    let text = "";
    if (isPdf) {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const buf = new Uint8Array(await file.arrayBuffer());
      const pdf = await getDocumentProxy(buf);
      const res = await extractText(pdf, { mergePages: true });
      text = Array.isArray(res.text) ? res.text.join("\n") : res.text;
    } else {
      // md, txt y demás texto plano
      text = await file.text();
    }

    text = text.replace(/\n{3,}/g, "\n\n").trim().slice(0, 20000);
    if (!text) {
      return Response.json(
        { error: "No se pudo extraer texto (¿PDF escaneado/imagen?)" },
        { status: 422 }
      );
    }
    return Response.json({ text, fileName: file.name });
  } catch (error) {
    console.error("extract-text failed:", error);
    return Response.json(
      { error: "No se pudo procesar el archivo" },
      { status: 500 }
    );
  }
};
