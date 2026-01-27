import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function getPublicUrl(filePath: string): string {
  const encodedPath = encodeURIComponent(filePath);
  return `https://firebasestorage.googleapis.com/v0/b/fixter-67253.appspot.com/o/${encodedPath}?alt=media`;
}

const COURSES_TO_RESTORE = [
  {
    slug: "remix-blog-fullstack",
    title: "Construye un Blog Fullstack con Remix",
    icon: "/icons/remix.svg",
    description:
      "Aprende a construir un blog completo con Remix. Autenticación, base de datos, SSR, SEO y deploy a producción.",
    summary:
      "Proyecto práctico: crea un blog fullstack con Remix, Tailwind, Prisma, login, markdown y SEO optimizado.",
    level: "Intermedio",
    duration: "2.1 GB de video",
    basePrice: 549,
    firebasePath: "fixtergeek.com/micro-cursos/remixBlog/",
    videos: [
      { file: "1_clonando-el-proyecto.mp4", title: "Clonando el proyecto" },
      { file: "2_anatomía-del-proyecto.mp4", title: "Anatomía del proyecto" },
      { file: "3_tailwind.mp4", title: "Configurando Tailwind" },
      { file: "4_db_connection.mp4", title: "Conexión a base de datos" },
      { file: "5_login.mov", title: "Sistema de login" },
      { file: "6_maquetando_dash.mov", title: "Maquetando el dashboard" },
      { file: "7_editando_parte_1.mov", title: "Editor de posts - Parte 1" },
      { file: "8_editando_parte_2.mov", title: "Editor de posts - Parte 2" },
      { file: "9_blog_route.mov", title: "Ruta del blog público" },
      { file: "10_index_redirect.mov", title: "Index y redirects" },
      { file: "11_vista_de_lista.mov", title: "Vista de lista de posts" },
      { file: "12_css_markdown.mov", title: "CSS para Markdown" },
      { file: "13_seo_detail.mov", title: "SEO y meta tags" },
      { file: "14_production_adn_error.mov", title: "Producción y manejo de errores" },
      { file: "15_ssr.mov", title: "Server Side Rendering" },
      { file: "16_sitemap.mov", title: "Generando Sitemap" },
      { file: "17_final.mov", title: "Toques finales y deploy" },
    ],
  },
  {
    slug: "minimo-js-para-react",
    title: "Mínimo JS para React",
    icon: "/icons/javascript.svg",
    description:
      "Aprende el JavaScript esencial que necesitas antes de empezar con React. Arrays, funciones, async/await, DOM y más.",
    summary:
      "Los fundamentos de JavaScript que todo desarrollador React debe dominar: map, filter, fetch, closures y manipulación del DOM.",
    level: "Principiante",
    duration: "1 GB de video",
    basePrice: 349,
    firebasePath: "fixtergeek.com/micro-cursos/mínimoJSparaReact/",
    videos: [
      { file: "Functions_1.mp4", title: "Funciones en JavaScript" },
      { file: "desestructurando_2.mp4", title: "Desestructuración" },
      { file: "async_3.mp4", title: "Funciones Async" },
      { file: "await_4.mp4", title: "Usando Await" },
      { file: "promises_5.mp4", title: "Promesas" },
      { file: "6_forEach_map_.mp4", title: "forEach y map" },
      { file: "7_filter.mp4", title: "filter" },
      { file: "8_importExport.mp4", title: "Import y Export" },
      { file: "9_closure.mov", title: "Closures" },
      { file: "10_fetchAPI.mov", title: "Fetch API" },
      { file: "11_DOM.mov", title: "Manipulación del DOM" },
    ],
  },
];

async function restoreCourse(config: (typeof COURSES_TO_RESTORE)[0]) {
  console.log(`\n📚 Restaurando: ${config.title}`);

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

  const videoIds: string[] = [];

  for (let i = 0; i < config.videos.length; i++) {
    const v = config.videos[i];
    const filePath = config.firebasePath + v.file;
    const storageLink = getPublicUrl(filePath);

    const video = await prisma.video.create({
      data: {
        title: `${i + 1}. ${v.title}`,
        slug: `${config.slug}-${i + 1}`,
        storageLink,
        index: i,
        isPublic: i === 0,
        courseIds: [course.id],
      },
    });

    videoIds.push(video.id);
    console.log(`   📹 Video ${i + 1}: ${v.title}`);
  }

  await prisma.course.update({
    where: { id: course.id },
    data: { videoIds },
  });

  console.log(`   ✅ ${videoIds.length} videos vinculados`);
}

async function main() {
  console.log("🚀 Restaurando cursos adicionales\n");

  for (const config of COURSES_TO_RESTORE) {
    await restoreCourse(config);
  }

  const total = await prisma.course.count();
  const videos = await prisma.video.count();
  console.log(`\n📊 Total: ${total} cursos, ${videos} videos`);

  await prisma.$disconnect();
}

main().catch(console.error);
