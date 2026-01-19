import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const client = new S3Client({
  region: "auto",
  endpoint: "https://t3.storage.dev",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

async function listAll() {
  let token: string | undefined;
  const allFiles: { Key?: string; Size?: number }[] = [];

  do {
    const cmd = new ListObjectsV2Command({
      Bucket: "wild-bird-2039",
      ContinuationToken: token,
    });
    const res = await client.send(cmd);
    if (res.Contents) allFiles.push(...res.Contents);
    token = res.NextContinuationToken;
  } while (token);

  // Filtrar videos y playlists
  const videos = allFiles.filter(
    (f) =>
      f.Key?.endsWith(".mp4") ||
      f.Key?.endsWith(".mov") ||
      f.Key?.endsWith(".m3u8") ||
      f.Key?.endsWith(".webm")
  );

  // Agrupar por carpeta principal
  const folders = new Map<string, { key: string; size: number }[]>();

  for (const v of videos) {
    const parts = (v.Key || "").split("/");
    let folder: string;

    if (parts[0] === "animaciones" && parts[1] === "chunks") {
      // animaciones/chunks/video-xxx -> agrupar por video ID
      folder = parts.slice(0, 3).join("/");
    } else if (parts[0] === "fixtergeek" && parts[1] === "videos") {
      // fixtergeek/videos/courseId/videoId -> agrupar por course
      folder = parts.slice(0, 3).join("/");
    } else {
      folder = parts[0];
    }

    if (!folders.has(folder)) {
      folders.set(folder, []);
    }
    folders.get(folder)!.push({
      key: v.Key || "",
      size: Math.round((v.Size || 0) / 1024 / 1024),
    });
  }

  console.log("=== VIDEOS EN TIGRIS ===\n");
  console.log(`Total archivos de video: ${videos.length}\n`);

  for (const [folder, files] of [...folders.entries()].sort()) {
    const total = files.reduce((a, f) => a + f.size, 0);
    console.log(`📁 ${folder} (${files.length} archivos, ${total} MB)`);

    // Mostrar solo los MP4/MOV principales, no todos los chunks
    const mainFiles = files.filter(f => f.key.endsWith('.mp4') || f.key.endsWith('.mov'));
    const m3u8Files = files.filter(f => f.key.endsWith('.m3u8'));

    if (mainFiles.length > 0) {
      for (const f of mainFiles.slice(0, 5)) {
        const fileName = f.key.split("/").pop();
        console.log(`   - ${fileName} (${f.size} MB)`);
      }
      if (mainFiles.length > 5) console.log(`   ... +${mainFiles.length - 5} más MP4/MOV`);
    }

    if (m3u8Files.length > 0) {
      console.log(`   + ${m3u8Files.length} playlists HLS`);
    }
    console.log();
  }
}

listAll().catch(console.error);
