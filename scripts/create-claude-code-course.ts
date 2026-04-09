#!/usr/bin/env npx tsx

import { PrismaClient } from "@prisma/client";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readFileSync } from "fs";
import slugify from "slugify";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

const VIDEOS = [
  { file: "/Users/bliss/Downloads/cc/1.mp4", title: "Intro", index: 0, isPublic: true },
  { file: "/Users/bliss/Downloads/cc/2.mp4", title: "Intermedio", index: 1, isPublic: false },
  { file: "/Users/bliss/Downloads/cc/3.mp4", title: "Avanzado", index: 2, isPublic: false },
];

const COURSE = {
  slug: "power-user-en-claude-code",
  title: "Power User en Claude Code",
  basePrice: 1499,
  isFree: false,
  published: true,
  icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/claude/claude-original.svg",
  level: "Todos los niveles",
  authorName: "Héctorbliss",
  authorAt: "@hectorbliss",
  photoUrl: "https://i.imgur.com/TaDTihr.png",
  description: "Domina Claude Code desde cero hasta nivel avanzado. Aprende a usar el CLI de Anthropic para automatizar tu desarrollo, crear agentes y ser más productivo.",
  summary: "Curso completo de Claude Code: desde instalación hasta técnicas avanzadas de agentes y automatización.",
  duration: "3 videos",
};

async function createS3Client() {
  return new S3Client({
    region: "auto",
    endpoint: process.env.AWS_ENDPOINT_URL_S3 || "https://fly.storage.tigris.dev",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true,
  });
}

async function uploadToS3(s3: S3Client, key: string, filePath: string) {
  console.log(`  ⬆️  Subiendo ${filePath} → ${key}...`);
  const body = readFileSync(filePath);
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET || "wild-bird-2039",
      Key: key,
      Body: body,
      ContentType: "video/mp4",
      CacheControl: "public, max-age=31536000",
    })
  );
  console.log(`  ✅ Subido (${(body.length / 1024 / 1024).toFixed(0)} MB)`);
  return `https://fly.storage.tigris.dev/${process.env.AWS_S3_BUCKET || "wild-bird-2039"}/${key}`;
}

async function main() {
  console.log("🚀 Creando curso Power User en Claude Code...\n");

  // Check if course already exists
  const existing = await prisma.course.findUnique({ where: { slug: COURSE.slug } });
  if (existing) {
    console.log("❌ El curso ya existe con id:", existing.id);
    return;
  }

  // 1. Create video records first
  console.log("📹 Creando registros de videos...");
  const videoIds: string[] = [];
  const videoRecords: { id: string; file: string; title: string }[] = [];

  for (const v of VIDEOS) {
    const slug = slugify(v.title, { lower: true }) + "-" + randomUUID().slice(0, 8);
    const video = await prisma.video.create({
      data: {
        slug,
        title: v.title,
        index: v.index,
        isPublic: v.isPublic,
        accessLevel: v.isPublic ? "public" : "paid",
        authorName: "Héctorbliss",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
      },
    });
    videoIds.push(video.id);
    videoRecords.push({ id: video.id, file: v.file, title: v.title });
    console.log(`  ✅ Video "${v.title}" creado: ${video.id}`);
  }

  // 2. Create course with video references
  console.log("\n📚 Creando curso...");
  const course = await prisma.course.create({
    data: {
      ...COURSE,
      videoIds,
    },
  });
  console.log(`  ✅ Curso creado: ${course.id} (slug: ${course.slug})`);

  // 3. Update videos to reference the course
  console.log("\n🔗 Vinculando videos al curso...");
  for (const vr of videoRecords) {
    await prisma.video.update({
      where: { id: vr.id },
      data: { courseIds: [course.id] },
    });
  }
  console.log("  ✅ Videos vinculados");

  // 4. Upload videos to S3
  console.log("\n☁️  Subiendo videos a S3...");
  const s3 = await createS3Client();

  for (const vr of videoRecords) {
    const fileName = vr.file.split("/").pop()!;
    const key = `fixtergeek/videos/${course.id}/${vr.id}/original/${fileName}`;
    const url = await uploadToS3(s3, key, vr.file);

    // Update video with storageLink
    await prisma.video.update({
      where: { id: vr.id },
      data: { storageLink: url },
    });
    console.log(`  📎 storageLink actualizado para "${vr.title}"`);
  }

  console.log("\n🎉 ¡Curso creado exitosamente!");
  console.log(`   URL: /cursos/power-user-en-claude-code`);
  console.log(`   Precio: $${COURSE.basePrice} MXN`);
  console.log(`   Videos: ${VIDEOS.length}`);
  console.log("\n⚠️  Nota: Los videos necesitan procesamiento HLS para streaming.");
  console.log("   Puedes triggerearlo desde el admin o ejecutar el processing manualmente.");

  await prisma.$disconnect();
}

main().catch(console.error);
