import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// TODO: Revisar manualmente el orden de títulos — el mapeo por index no coincide
// con el orden real de los videos en S3. Ej: "Bienvenida al curso" quedó en index 15
// pero debería ser el primero. Hay que ver cada video y asignar el título correcto.
//
// Títulos recuperados desde Wayback Machine (Aug 2025 snapshot)
// ⚠️ El orden de esta lista NO corresponde al index de los videos en DB
const TITLES: string[] = [
  "Instalación de herramientas",
  "Tips para mejorar tus curvas",
  "Keyframes",
  "Construyendo <MovingBorderButton>",
  "El componente <AnimatePresence>",
  "Cómo usar <Reorder>",
  "DraggableList",
  "Algunos gestos",
  "HeroHighlight",
  "3DLayers",
  "ImageSlider",
  "SwipeGallery",
  "SimpleScrollHero",
  "StickyScroll",
  "Componente RotaryGallery",
  "Bienvenida al curso",
  "Fundamentos React",
  "Fundamentos de Motion",
  "Fundamentos de Vite",
  "¿Cómo se anima en React?",
  "Framer Motion ahora es solo Motion",
  "Intro al MotionValue",
  "LinkPreview",
  "El componente motion",
  "Construyendo <FlipWords>",
  "Scroll offsets",
  "Beam",
  "3DCard",
  "Plan para <InfinityMovingChips>",
  "Construyendo useInfinityMovement",
  "Componente RedBanners",
  "Práctica para RotaryGallery",
];

// Free intro videos (index 15-20, matching isPublic: true pattern)
const FREE_INDICES = [15, 16, 17, 18, 19, 20];

async function main() {
  console.log("🎬 Actualizando títulos del curso de Animaciones\n");

  const course = await prisma.course.findFirst({
    where: {
      slug: "construye-mas-de-14-componentes-animados-con-react-y-motion",
    },
  });

  if (!course) {
    console.error("❌ Curso no encontrado");
    return;
  }

  console.log(`Curso: ${course.title} (${course.id})`);
  console.log(`Videos en curso: ${course.videoIds.length}\n`);

  // Fetch all videos for this course, sorted by index
  const videos = await prisma.video.findMany({
    where: { id: { in: course.videoIds } },
    orderBy: { index: "asc" },
  });

  console.log(`Videos encontrados en DB: ${videos.length}\n`);

  if (videos.length === 0) {
    console.error("❌ No se encontraron videos");
    return;
  }

  let updated = 0;
  let skipped = 0;

  for (const video of videos) {
    const idx = video.index ?? 0;
    if (idx >= TITLES.length) {
      console.log(`⚠️  Video index ${idx} fuera de rango, saltando: ${video.title}`);
      skipped++;
      continue;
    }

    const newTitle = `${idx + 1}. ${TITLES[idx]}`;
    const isPublic = FREE_INDICES.includes(idx);

    if (video.title === newTitle && video.isPublic === isPublic) {
      console.log(`✓  [${idx}] Sin cambios: ${newTitle}`);
      skipped++;
      continue;
    }

    await prisma.video.update({
      where: { id: video.id },
      data: {
        title: newTitle,
        isPublic,
      },
    });

    console.log(`✅ [${idx}] ${video.title} → ${newTitle}${isPublic ? " (FREE)" : ""}`);
    updated++;
  }

  console.log(`\n📊 Resultado: ${updated} actualizados, ${skipped} sin cambios`);
  console.log(`Total videos en curso: ${videos.length}`);

  await prisma.$disconnect();
}

main().catch(console.error);
