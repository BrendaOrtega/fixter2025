import { PrismaClient } from "@prisma/client";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const prisma = new PrismaClient();

const s3Client = new S3Client({
  region: "auto",
  endpoint: "https://t3.storage.dev",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

async function main() {
  console.log("🎬 Restaurando curso de Animaciones\n");

  // 1. Obtener lista de videos en Tigris
  const cmd = new ListObjectsV2Command({
    Bucket: "wild-bird-2039",
    Prefix: "animaciones/chunks/",
    Delimiter: "/",
  });
  const res = await s3Client.send(cmd);

  const videoIds = (res.CommonPrefixes || [])
    .map((p) => p.Prefix?.replace("animaciones/chunks/", "").replace("/", ""))
    .filter(Boolean)
    .sort() as string[];

  console.log(`Encontrados ${videoIds.length} videos en Tigris\n`);

  // 2. Buscar el curso
  const course = await prisma.course.findFirst({
    where: { slug: "construye-mas-de-14-componentes-animados-con-react-y-motion" },
  });

  if (!course) {
    console.error("Curso no encontrado");
    return;
  }

  console.log(`Curso: ${course.title} (${course.id})\n`);

  // 3. Crear videos
  const createdVideoIds: string[] = [];

  for (let i = 0; i < videoIds.length; i++) {
    const videoId = videoIds[i];
    // Usar 720p como default
    const m3u8Key = `animaciones/chunks/${videoId}/720p`;

    const video = await prisma.video.create({
      data: {
        title: `${i + 1}. Componente animado ${i + 1}`,
        slug: `animaciones-${i + 1}`,
        m3u8: m3u8Key,
        index: i,
        isPublic: i === 0,
        courseIds: [course.id],
      },
    });

    createdVideoIds.push(video.id);
    console.log(`📹 Video ${i + 1}: ${video.title}`);
  }

  // 4. Actualizar curso
  await prisma.course.update({
    where: { id: course.id },
    data: {
      videoIds: createdVideoIds,
      published: true,
      icon: "/icons/react.svg",
      description: `Domina las animaciones en React con Motion (Framer Motion). Construye más de 14 componentes animados profesionales.

Aprende a crear transiciones suaves, gestos interactivos, animaciones de entrada/salida, scroll animations y mucho más.

Cada componente es un proyecto práctico que puedes usar directamente en tus aplicaciones.`,
      summary: "14+ componentes animados con React y Motion. Aprende animaciones profesionales para tus aplicaciones web.",
      level: "Intermedio",
      basePrice: 999,
    },
  });

  console.log(`\n✅ ${createdVideoIds.length} videos vinculados al curso`);

  const total = await prisma.course.count({ where: { published: true } });
  const totalVideos = await prisma.video.count();
  console.log(`\n📊 Total: ${total} cursos publicados, ${totalVideos} videos`);

  await prisma.$disconnect();
}

main().catch(console.error);
