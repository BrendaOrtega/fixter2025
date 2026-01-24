import { initializeApp, cert } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const app = initializeApp({
  credential: cert("/tmp/firebase-creds.json"),
  storageBucket: "fixter-67253.appspot.com",
});

const bucket = getStorage().bucket();

// Configuración de cursos a restaurar
const COURSES_CONFIG = [
  {
    slug: "react-desde-cero",
    title: "React desde Cero",
    icon: "/icons/react.svg",
    description:
      "Aprende React desde los fundamentos. Domina componentes, hooks, estado y construye tu primer proyecto completo.",
    summary:
      "Curso completo de React para principiantes. Aprende JSX, componentes, props, hooks (useState, useEffect) y más.",
    level: "Principiante",
    duration: "3.3 GB de video",
    basePrice: 499,
    firebasePath: "fixtergeek.com/cursos_HD/reactDesdeCero/",
    videoOrder: [
      "1_que-es-react.mov",
      "2_enviroment.mov",
      "3_ create_vite.mov",
      "4_estructura.mov",
      "5_primer_componente.mov",
      "6_reactYReactDOM.mov",
      "7_checkpoint.mov",
      "8_estilos.mov",
      "9_props.mov",
      "10_arrays.mov",
      "11_hooks.mov",
      "12_useState.mov",
      "13_useEffect.mov",
      "14_proyecto_final.mov",
    ],
  },
  {
    slug: "intro-tailwind",
    title: "Introducción a Tailwind CSS",
    icon: "/icons/tailwind.svg",
    description:
      "Domina Tailwind CSS, el framework de utilidades más popular. Aprende a crear interfaces modernas y responsivas.",
    summary:
      "Aprende Tailwind CSS desde la instalación hasta crear componentes estilizados profesionalmente.",
    level: "Principiante",
    duration: "1 GB de video",
    basePrice: 299,
    firebasePath: "fixtergeek.com/cursos_HD/introATailwind/",
    videoOrder: ["1_Intro_tailwind_course.mov", "3_Instalación_tailwind.mov"],
  },
  {
    slug: "intro-remix-2023",
    title: "Introducción a Remix",
    icon: "/icons/remix.svg",
    description:
      "Aprende Remix, el framework fullstack de React. Entiende el flujo de datos, loaders, actions y más.",
    summary:
      "Curso introductorio a Remix v2. Aprende por qué Remix, flujo de datos fullstack y cómo funciona.",
    level: "Intermedio",
    duration: "1 GB de video",
    basePrice: 399,
    firebasePath: "fixtergeek.com/cursos_HD/introRemix_2023/",
    videoOrder: [
      "1_why_remix.mov",
      "2_Remix_v2.mov",
      "3_fullstack_data_flow.mov",
      "4_how_remix.mov",
    ],
  },
  {
    slug: "tetris-javascript",
    title: "Crea Tetris con JavaScript",
    icon: "/icons/arcade.svg",
    description:
      "Construye el clásico juego Tetris desde cero usando JavaScript vanilla. Aprende lógica de juegos y manipulación del DOM.",
    summary:
      "Proyecto práctico: crea Tetris completo con JavaScript. Piezas, rotación, colisiones y puntuación.",
    level: "Intermedio",
    duration: "1.6 GB de video",
    basePrice: 399,
    firebasePath: "fixtergeek.com/micro-cursos/",
    videoOrder: [
      "tetris_1.mp4",
      "tetris_2.mp4",
      "tetris_3.mp4",
      "tetris_4.mp4",
      "tetris_5.mp4",
      "tetris_6.mp4",
      "tetris_7.mp4",
      "tetris_8.mp4",
      "tetris_9.mp4",
      "tetris_10.mp4",
      "tetris_11.mp4",
    ],
  },
  {
    slug: "construye-un-backend-con-prisma-typescript-y-express-en-nodejs",
    title: "Construye un Backend con Prisma, TypeScript y Express en Node.js",
    icon: "/icons/prisma.svg",
    description:
      "Domina Prisma, el ORM moderno para Node.js. Aprende esquemas, migraciones, queries y relaciones.",
    summary:
      "Curso completo de Prisma ORM. Desde la configuración hasta queries avanzadas con TypeScript.",
    level: "Intermedio",
    duration: "563 MB de video",
    basePrice: 349,
    firebasePath: "fixtergeek.com/micro-cursos/",
    videoOrder: [
      "prisma_1.mp4",
      "prisma_2.mp4",
      "prisma_3.mp4",
      "prisma_4.mp4",
      "prisma_5.mp4",
      "prisma_6.mp4",
      "prisma_7.mp4",
      "prisma_8.mp4",
      "prisma_9.mp4",
      "prisma_10.mp4",
      "prisma_11.mp4",
      "prisma_12.mp4",
    ],
  },
  {
    slug: "nextjs-fundamentos",
    title: "Next.js Fundamentos",
    icon: "/icons/react.svg",
    description:
      "Aprende Next.js, el framework de React para producción. Routing, data fetching, SSR y más.",
    summary:
      "Fundamentos de Next.js: App Router, segmentos, navegación, fetching de datos e imágenes optimizadas.",
    level: "Intermedio",
    duration: "642 MB de video",
    basePrice: 349,
    firebasePath: "fixtergeek.com/micro-cursos/",
    videoOrder: [
      "next_1_segmentos.mp4",
      "next_2_archivos.mp4",
      "next_3_create-next-app.mp4",
      "next_4_actualizando_home_page.mp4",
      "next_5_navigation.mp4",
      "next_6_dynamic_vs_static.mp4",
      "next_7_data_fetching.mp4",
      "next_8_Fuentes_e_Image.mp4",
    ],
  },
  {
    slug: "gpt-api-curso",
    title: "API de GPT para Desarrolladores",
    icon: "/icons/robot.svg",
    description:
      "Aprende a integrar la API de OpenAI/GPT en tus aplicaciones. Construye chatbots y herramientas con IA.",
    summary:
      "Curso práctico de la API de GPT. Desde configuración hasta crear aplicaciones con inteligencia artificial.",
    level: "Intermedio",
    duration: "547 MB de video",
    basePrice: 449,
    firebasePath: "fixtergeek.com/micro-cursos/",
    videoOrder: [
      "gpt-1.mp4",
      "gpt-2.mp4",
      "gpt-3.mp4",
      "gpt-4.mp4",
      "gpt-5.mp4",
      "gpt-6.mp4",
      "gpt-7.mp4",
    ],
  },
];

async function getFirebaseDownloadUrl(filePath: string): Promise<string> {
  const file = bucket.file(filePath);
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: "03-01-2030", // URL válida por mucho tiempo
  });
  return url;
}

async function getPublicUrl(filePath: string): Promise<string> {
  // Formato de URL pública de Firebase Storage
  const encodedPath = encodeURIComponent(filePath);
  return `https://firebasestorage.googleapis.com/v0/b/fixter-67253.appspot.com/o/${encodedPath}?alt=media`;
}

function extractVideoTitle(fileName: string): string {
  // Limpiar el nombre del archivo para usarlo como título
  return fileName
    .replace(/\.(mp4|mov|webm)$/, "")
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/^\d+\s*/, "") // Quitar números al inicio
    .trim();
}

async function restoreCourse(config: (typeof COURSES_CONFIG)[0]) {
  console.log(`\n📚 Restaurando: ${config.title}`);

  // 1. Crear el curso
  const course = await prisma.course.upsert({
    where: { slug: config.slug },
    update: {
      title: config.title,
      icon: config.icon,
      description: config.description,
      summary: config.summary,
      level: config.level,
      duration: config.duration,
      basePrice: config.basePrice,
      published: true,
      isFree: false,
    },
    create: {
      slug: config.slug,
      title: config.title,
      icon: config.icon,
      description: config.description,
      summary: config.summary,
      level: config.level,
      duration: config.duration,
      basePrice: config.basePrice,
      published: true,
      isFree: false,
    },
  });

  console.log(`   ✅ Curso creado: ${course.id}`);

  // 2. Crear los videos
  const videoIds: string[] = [];

  for (let i = 0; i < config.videoOrder.length; i++) {
    const fileName = config.videoOrder[i];
    const filePath = config.firebasePath + fileName;

    try {
      const storageLink = await getPublicUrl(filePath);
      const title = extractVideoTitle(fileName);

      const video = await prisma.video.create({
        data: {
          title: `${i + 1}. ${title}`,
          slug: `${config.slug}-${i + 1}`,
          storageLink,
          index: i,
          isPublic: i === 0, // Primer video público
          courseIds: [course.id],
        },
      });

      videoIds.push(video.id);
      console.log(`   📹 Video ${i + 1}: ${video.title}`);
    } catch (error) {
      console.error(`   ❌ Error con ${fileName}:`, error);
    }
  }

  // 3. Actualizar el curso con los IDs de videos
  await prisma.course.update({
    where: { id: course.id },
    data: { videoIds },
  });

  console.log(`   ✅ ${videoIds.length} videos vinculados al curso`);
}

async function main() {
  console.log("🚀 Iniciando restauración de cursos desde Firebase\n");
  console.log("⚠️  SOLO LECTURA Y CREACIÓN - No se borra nada\n");

  for (const config of COURSES_CONFIG) {
    try {
      await restoreCourse(config);
    } catch (error) {
      console.error(`❌ Error restaurando ${config.title}:`, error);
    }
  }

  console.log("\n✅ Restauración completada");

  // Resumen final
  const totalCourses = await prisma.course.count();
  const totalVideos = await prisma.video.count();
  console.log(`\n📊 Resumen:`);
  console.log(`   Cursos totales: ${totalCourses}`);
  console.log(`   Videos totales: ${totalVideos}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Error fatal:", e);
  process.exit(1);
});
