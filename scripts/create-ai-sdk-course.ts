import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🤖 Creando curso: AI SDK\n");

  const course = await prisma.course.upsert({
    where: { slug: "ai-sdk" },
    update: {
      title: "AI SDK con React y TypeScript",
      icon: "/icons/robot.svg",
      description: `Domina el AI SDK de Vercel para construir aplicaciones de inteligencia artificial con React y TypeScript.

Aprende a integrar modelos de lenguaje como GPT y Claude en tus aplicaciones web de forma profesional. Desde streaming de respuestas hasta manejo de contexto y herramientas.

Este curso te enseña los patrones modernos para crear chatbots, asistentes y aplicaciones inteligentes usando el stack más demandado: React + TypeScript + AI SDK.

Construye interfaces conversacionales elegantes con useChat, implementa streaming en tiempo real, y aprende a manejar el contexto de conversaciones como un profesional.`,
      summary:
        "Aprende a construir aplicaciones de IA con React, TypeScript y el AI SDK de Vercel. Streaming, chat, contexto y más.",
      level: "Intermedio",
      duration: "1 GB de video",
      basePrice: 599,
      isFree: false,
      published: true,
    },
    create: {
      slug: "ai-sdk",
      title: "AI SDK con React y TypeScript",
      icon: "/icons/robot.svg",
      description: `Domina el AI SDK de Vercel para construir aplicaciones de inteligencia artificial con React y TypeScript.

Aprende a integrar modelos de lenguaje como GPT y Claude en tus aplicaciones web de forma profesional. Desde streaming de respuestas hasta manejo de contexto y herramientas.

Este curso te enseña los patrones modernos para crear chatbots, asistentes y aplicaciones inteligentes usando el stack más demandado: React + TypeScript + AI SDK.

Construye interfaces conversacionales elegantes con useChat, implementa streaming en tiempo real, y aprende a manejar el contexto de conversaciones como un profesional.`,
      summary:
        "Aprende a construir aplicaciones de IA con React, TypeScript y el AI SDK de Vercel. Streaming, chat, contexto y más.",
      level: "Intermedio",
      duration: "1 GB de video",
      basePrice: 599,
      isFree: false,
      published: true,
    },
  });

  console.log(`✅ Curso creado: ${course.id}`);

  // URLs de Tigris (público)
  const tigrisBase = "https://t3.storage.dev/wild-bird-2039/";

  const videos = [
    {
      path: "fixtergeek/videos/692e5ded0917a1d2896c5eb9/6933379c88a49ff14e1bad14/original/1_Introducción.mov",
      title: "Introducción al AI SDK",
    },
    {
      path: "fixtergeek/videos/692e5ded0917a1d2896c5eb9/6933382688a49ff14e1bad16/original/2_interfaz.mov",
      title: "Construyendo la interfaz de chat",
    },
    {
      path: "fixtergeek/videos/692e5ded0917a1d2896c5eb9/6933388b88a49ff14e1bad19/original/2_react.mov",
      title: "Integrando React con useChat",
    },
    {
      path: "fixtergeek/videos/692e5ded0917a1d2896c5eb9/695bda1586c336ca93e1e6bd/original/3_contexto.mov",
      title: "Manejo de contexto y conversaciones",
    },
  ];

  const videoIds: string[] = [];

  for (let i = 0; i < videos.length; i++) {
    const v = videos[i];
    const storageLink = tigrisBase + v.path;

    const video = await prisma.video.create({
      data: {
        title: `${i + 1}. ${v.title}`,
        slug: `ai-sdk-${i + 1}`,
        storageLink,
        index: i,
        isPublic: i === 0, // Solo intro gratis
        courseIds: [course.id],
      },
    });

    videoIds.push(video.id);
    console.log(`📹 ${video.title}`);
  }

  await prisma.course.update({
    where: { id: course.id },
    data: { videoIds },
  });

  console.log(`\n✅ ${videoIds.length} videos vinculados`);

  const total = await prisma.course.count();
  const totalVideos = await prisma.video.count();
  console.log(`\n📊 Total: ${total} cursos, ${totalVideos} videos`);

  await prisma.$disconnect();
}

main().catch(console.error);
