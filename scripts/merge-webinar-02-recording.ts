/**
 * Fusiona las DOS filas que quedaron del webinar del 20-ago-2026 (sandboxing).
 *
 * El `intent:"draft"` de la grabación creó una pieza nueva en vez de reusar la que ya
 * estaba preparada, así que el programa tiene dos: la preparada (con las slides y el slug
 * que apuntan los correos) y la de la grabación (que es donde vive el HLS).
 *
 * ⚠️ Se conserva la de la GRABACIÓN, no la preparada: la caja ya está subiendo el HLS bajo
 * `fixtergeek/videos/<courseId>/<videoId>/hls` con el id nuevo, y ese prefijo no se puede
 * cambiar sin volver a transcodificar. Lo que se mueve es todo lo demás — slug, título,
 * índice, descripción, fecha y las slides.
 *
 *   npx tsx scripts/merge-webinar-02-recording.ts          # sólo enseña el plan
 *   npx tsx scripts/merge-webinar-02-recording.ts --apply  # lo ejecuta
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PREPARED_SLUG = "sandboxing-la-caja-donde-vive-tu-agente";
const RECORDING_SLUG = "la-caja-donde-vive-tu-agente-de-ia-2026-08-21-0340";
const apply = process.argv.includes("--apply");

async function main() {
  const prepared: any = await prisma.video.findUnique({ where: { slug: PREPARED_SLUG } });
  const recording: any = await prisma.video.findUnique({ where: { slug: RECORDING_SLUG } });
  if (!prepared || !recording) throw new Error("falta alguna de las dos piezas");

  const resources = await prisma.resource.findMany({ where: { videoId: prepared.id } });

  console.log(`conservar  → ${recording.slug} (${recording.id})`);
  console.log(`   hereda  → slug "${PREPARED_SLUG}", índice ${prepared.index}, título "${prepared.title}"`);
  console.log(`   recursos→ ${resources.map((r: any) => r.slug).join(", ") || "ninguno"}`);
  console.log(`borrar     → ${prepared.slug} (${prepared.id})`);
  if (!apply) return console.log("\n(sin --apply no se tocó nada)");

  // 1) Las slides se mudan ANTES de borrar: si se borra primero y esto falla, el recurso
  //    queda colgando de un video que ya no existe.
  for (const r of resources) {
    await prisma.resource.update({ where: { id: r.id }, data: { videoId: recording.id } });
  }

  // 2) La pieza preparada sale del curso y desaparece. Se libera su slug en el mismo paso:
  //    es único, así que no se le puede dar a la grabación mientras ella lo tenga.
  const course: any = await prisma.course.findFirst({ where: { videoIds: { has: prepared.id } } });
  if (course) {
    await prisma.course.update({
      where: { id: course.id },
      data: { videoIds: { set: course.videoIds.filter((x: string) => x !== prepared.id) } },
    });
  }
  await prisma.video.delete({ where: { id: prepared.id } });

  // 3) Y la grabación toma su identidad.
  await prisma.video.update({
    where: { id: recording.id },
    data: {
      slug: prepared.slug,
      title: prepared.title,
      description: prepared.description,
      index: prepared.index,
      moduleName: prepared.moduleName,
      accessLevel: prepared.accessLevel,
      eventDate: prepared.eventDate,
    },
  });

  console.log(`\n✅ /cursos/sistemas-agenticos/${PREPARED_SLUG}`);
  console.log("   sigue en isPublic:false — se abre a mano cuando la mires.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
