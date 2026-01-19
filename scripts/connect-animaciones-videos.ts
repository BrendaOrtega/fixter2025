import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";

const client = new S3Client({
  region: "auto",
  endpoint: "https://t3.storage.dev",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const db = new PrismaClient();
const COURSE_ID = "645d3dbd668b73b34443789c";

async function connectVideos() {
  console.log("🎬 Conectando videos de Animaciones con archivos de Tigris\n");

  // 1. Obtener archivos de Tigris con prefijo animaciones/video- (archivos originales MP4)
  let allFiles: { Key?: string; LastModified?: Date; Size?: number }[] = [];
  let token: string | undefined;

  do {
    const cmd = new ListObjectsV2Command({
      Bucket: "wild-bird-2039",
      Prefix: "animaciones/video-",
      ContinuationToken: token,
    });
    const res = await client.send(cmd);
    if (res.Contents) allFiles.push(...res.Contents);
    token = res.NextContinuationToken;
  } while (token);

  // Filtrar solo los archivos principales (no chunks)
  const files = allFiles
    .filter((f) => {
      const key = f.Key || "";
      // Excluir archivos dentro de chunks/
      return !key.includes("/chunks/") && f.Key?.startsWith("animaciones/video-");
    })
    .map((f) => ({
      key: f.Key || "",
      videoId: f.Key?.replace("animaciones/", "") || "",
      date: f.LastModified,
      size: Math.round((f.Size || 0) / 1024 / 1024),
    }))
    .sort((a, b) => {
      if (!a.date || !b.date) return 0;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

  console.log(`📂 Encontrados ${files.length} archivos de video en Tigris:\n`);
  files.forEach((f, i) => {
    console.log(`  ${i.toString().padStart(2)}. ${f.videoId} (${f.size} MB)`);
  });

  // 2. Obtener videos de la DB ordenados por index
  const videos = await db.video.findMany({
    where: { courseIds: { has: COURSE_ID } },
    orderBy: { index: "asc" },
    select: {
      id: true,
      title: true,
      index: true,
      storageLink: true,
      m3u8: true,
    },
  });

  console.log(`\n📹 Encontrados ${videos.length} videos en la base de datos:\n`);
  videos.forEach((v, i) => {
    console.log(
      `  ${i.toString().padStart(2)}. [${v.index}] ${v.title.substring(0, 50)}${v.title.length > 50 ? "..." : ""}`
    );
  });

  // Verificar que tengamos el mismo número de archivos y videos
  if (files.length !== videos.length) {
    console.log(
      `\n⚠️  ADVERTENCIA: ${files.length} archivos != ${videos.length} videos`
    );
    console.log("   Procederé con el mínimo de ambos.\n");
  }

  const count = Math.min(files.length, videos.length);

  // 3. Mostrar preview del mapeo
  console.log("\n📋 Preview del mapeo (video DB → archivo Tigris):\n");
  for (let i = 0; i < count; i++) {
    const video = videos[i];
    const file = files[i];
    console.log(`  ${i.toString().padStart(2)}. "${video.title.substring(0, 35)}..." → ${file.videoId}`);
  }

  // 4. Pedir confirmación
  console.log("\n¿Proceder con la actualización? (Ctrl+C para cancelar, Enter para continuar)");

  // 5. Actualizar cada video
  console.log("\n🔄 Actualizando videos...\n");

  for (let i = 0; i < count; i++) {
    const video = videos[i];
    const file = files[i];

    await db.video.update({
      where: { id: video.id },
      data: {
        storageLink: file.videoId, // video-xxx (sin prefijo animaciones/)
        m3u8: `animaciones/chunks/${file.videoId}/`, // Ruta a los chunks HLS
      },
    });

    console.log(
      `  ✅ ${(i + 1).toString().padStart(2)}/${count} ${video.title.substring(0, 40)}...`
    );
  }

  console.log(`\n✅ ${count} videos conectados exitosamente!`);

  // 6. Verificación final
  const updated = await db.video.findMany({
    where: { courseIds: { has: COURSE_ID } },
    orderBy: { index: "asc" },
    select: {
      title: true,
      storageLink: true,
      m3u8: true,
    },
  });

  console.log("\n📊 Verificación final:\n");
  const withStorage = updated.filter((v) => v.storageLink);
  const withM3u8 = updated.filter((v) => v.m3u8);
  console.log(`  Videos con storageLink: ${withStorage.length}/${updated.length}`);
  console.log(`  Videos con m3u8: ${withM3u8.length}/${updated.length}`);

  await db.$disconnect();
}

connectVideos().catch(console.error);
