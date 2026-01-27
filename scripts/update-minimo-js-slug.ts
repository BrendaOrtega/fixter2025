import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  // Buscar el curso actual
  const course = await db.course.findFirst({
    where: {
      OR: [
        { slug: "javascript-minimo-react" },
        { slug: "minimo-js-para-react" },
        { title: { contains: "JavaScript Mínimo" } },
      ],
    },
  });

  if (!course) {
    console.log("❌ Curso no encontrado");
    return;
  }

  console.log("📚 Curso encontrado:", course.title, "| slug:", course.slug);

  // Actualizar al slug con tráfico
  const updated = await db.course.update({
    where: { id: course.id },
    data: {
      slug: "minimo-js-para-react",
      title: "Mínimo JS para React",
    },
  });

  console.log("✅ Curso actualizado:");
  console.log("   Slug:", updated.slug);
  console.log("   Título:", updated.title);
  console.log("   URL:", `https://www.fixtergeek.com/cursos/${updated.slug}/detalle`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
