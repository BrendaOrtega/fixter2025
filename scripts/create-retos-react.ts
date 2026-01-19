import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function getPublicUrl(filePath: string): string {
  const encodedPath = encodeURIComponent(filePath);
  return `https://firebasestorage.googleapis.com/v0/b/fixter-67253.appspot.com/o/${encodedPath}?alt=media`;
}

async function main() {
  console.log("🎯 Creando curso: Retos de React\n");

  const course = await prisma.course.upsert({
    where: { slug: "retos-react" },
    update: {},
    create: {
      slug: "retos-react",
      title: "Retos de React: Practica con Proyectos Reales",
      icon: "/icons/react.svg",
      description: `¿Ya conoces la teoría de React pero te cuesta aplicarla? Este curso es para ti.

Aprende React de la única forma que realmente funciona: resolviendo problemas reales. Cada reto te presenta un desafío práctico que deberás resolver antes de ver la solución.

No más tutoriales pasivos. Aquí programas, te equivocas, aprendes y dominas React de verdad.

Incluye 7 retos progresivos con soluciones detalladas que cubren desde componentes básicos hasta patrones avanzados de estado y props.`,
      summary:
        "7 retos prácticos de React con soluciones paso a paso. Aprende haciendo, no solo viendo.",
      level: "Principiante",
      duration: "259 MB de video",
      basePrice: 0,
      isFree: true,
      published: true,
    },
  });

  console.log(`✅ Curso creado: ${course.id}`);

  const videos = [
    { file: "intro_react.mp4", title: "Introducción al curso de retos" },
    { file: "reto1.mp4", title: "Reto 1: Tu primer componente" },
    { file: "solucion_reto1.mp4", title: "Solución Reto 1" },
    { file: "reto2.mp4", title: "Reto 2: Props y datos" },
    { file: "reto2_solucion.mp4", title: "Solución Reto 2" },
    { file: "reto3.mp4", title: "Reto 3: Eventos y handlers" },
    { file: "reto3_solucion.mp4", title: "Solución Reto 3" },
    { file: "reto4.mp4", title: "Reto 4: Estado con useState" },
    { file: "reto4_solucion.mp4", title: "Solución Reto 4" },
    { file: "reto5.mp4", title: "Reto 5: Listas y keys" },
    { file: "reto5_solution.mp4", title: "Solución Reto 5" },
    { file: "reto6.mp4", title: "Reto 6: Formularios controlados" },
    { file: "reto6_solucion.mp4", title: "Solución Reto 6" },
    { file: "reto7.mp4", title: "Reto 7: Proyecto integrador" },
    { file: "reto7_solucion.mp4", title: "Solución Reto 7" },
  ];

  const videoIds: string[] = [];

  for (let i = 0; i < videos.length; i++) {
    const v = videos[i];
    const storageLink = getPublicUrl(`fixtergeek.com/tutorials/${v.file}`);

    const video = await prisma.video.create({
      data: {
        title: `${i + 1}. ${v.title}`,
        slug: `retos-react-${i + 1}`,
        storageLink,
        index: i,
        isPublic: i < 3, // Intro y primer reto con solución gratis
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
