import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const loader = async () => {
  const path = join(process.cwd(), "app/data/excalidraw-scene.json");
  const raw = await readFile(path, "utf8");
  return new Response(raw, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
};
