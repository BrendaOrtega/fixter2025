import { initializeApp, cert } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

const app = initializeApp({
  credential: cert("/tmp/firebase-creds.json"),
  storageBucket: "fixter-67253.appspot.com",
});

const bucket = getStorage().bucket();

async function listAll() {
  const [files] = await bucket.getFiles();

  // Filtrar solo videos
  const videos = files.filter(
    (f) =>
      f.name.endsWith(".mp4") ||
      f.name.endsWith(".mov") ||
      f.name.endsWith(".webm")
  );

  // Agrupar por carpeta
  const folders = new Map<string, { name: string; size: number }[]>();

  for (const v of videos) {
    const parts = v.name.split("/");
    let folder: string;

    if (parts[0] === "fixtergeek.com" && parts.length > 2) {
      // fixtergeek.com/cursos_HD/reactDesdeCero -> fixtergeek.com/cursos_HD/reactDesdeCero
      if (parts[1] === "cursos_HD" || parts[1] === "micro-cursos") {
        folder = parts.slice(0, 3).join("/");
      } else {
        folder = parts.slice(0, 2).join("/");
      }
    } else {
      folder = parts[0];
    }

    if (!folders.has(folder)) {
      folders.set(folder, []);
    }
    folders.get(folder)!.push({
      name: v.name,
      size: Math.round(parseInt((v.metadata.size as string) || "0") / 1024 / 1024),
    });
  }

  console.log("=== TODOS LOS VIDEOS EN FIREBASE ===\n");

  for (const [folder, vids] of [...folders.entries()].sort()) {
    const total = vids.reduce((a, v) => a + v.size, 0);
    console.log(`📁 ${folder} (${vids.length} videos, ${total} MB)`);
    for (const v of vids.slice(0, 5)) {
      const fileName = v.name.split("/").pop();
      console.log(`   - ${fileName} (${v.size} MB)`);
    }
    if (vids.length > 5) console.log(`   ... +${vids.length - 5} más`);
    console.log();
  }
}

listAll().catch(console.error);
