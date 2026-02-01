import { type ActionFunctionArgs, data } from "react-router";
import { db } from "~/.server/db";

/**
 * POST /api/waitlist
 * Registra un email en la lista de espera de un curso "proximamente"
 *
 * Body (FormData):
 * - email: string (required)
 * - courseSlug: string (required) - slug del curso
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return data({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const formData = await request.formData();
    const email = String(formData.get("email") || "").toLowerCase().trim();
    const courseSlug = String(formData.get("courseSlug") || "").trim();

    // Validación básica
    if (!email || !email.includes("@")) {
      return data({ error: "Email inválido" }, { status: 400 });
    }

    if (!courseSlug) {
      return data({ error: "Falta el curso" }, { status: 400 });
    }

    // Generar tag basado en el slug del curso
    const tag = `espera-${courseSlug}`;

    // Upsert subscriber + añadir tag
    let subscriber = await db.subscriber.findUnique({ where: { email } });

    if (!subscriber) {
      // Crear nuevo subscriber con el tag
      subscriber = await db.subscriber.create({
        data: {
          email,
          confirmed: true, // Auto-confirmar para waitlists
          tags: [tag],
        },
      });
      console.log(`[Waitlist] Nuevo subscriber: ${email} con tag: ${tag}`);
    } else {
      // Añadir tag si no lo tiene
      const currentTags = subscriber.tags || [];
      if (!currentTags.includes(tag)) {
        await db.subscriber.update({
          where: { id: subscriber.id },
          data: { tags: { push: tag } },
        });
        console.log(`[Waitlist] Tag añadido a ${email}: ${tag}`);
      } else {
        console.log(`[Waitlist] ${email} ya tenía el tag: ${tag}`);
      }
    }

    // Registrar en LeadMagnetDownload si existe el leadmagnet correspondiente
    const leadMagnet = await db.leadMagnet.findUnique({
      where: { slug: tag },
    });

    if (leadMagnet) {
      // Verificar si ya existe el registro
      const existingDownload = await db.leadMagnetDownload.findFirst({
        where: {
          leadMagnetId: leadMagnet.id,
          email,
        },
      });

      if (!existingDownload) {
        await db.leadMagnetDownload.create({
          data: {
            leadMagnetId: leadMagnet.id,
            email,
            subscriberId: subscriber.id,
          },
        });

        // Incrementar contador
        await db.leadMagnet.update({
          where: { id: leadMagnet.id },
          data: { downloadCount: { increment: 1 } },
        });
      }
    }

    return data({ success: true });
  } catch (error) {
    console.error("[Waitlist] Error:", error);
    return data({ error: "Error al registrar" }, { status: 500 });
  }
};
