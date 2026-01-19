import type { Route } from "./+types/ratings";
import { db } from "~/.server/db";
import { getUserOrNull } from "~/.server/dbGetters";
import { hasAccessToCourse } from "~/.server/services/course-access.server";

// POST - Crear/actualizar rating
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "submit_rating") {
      const courseId = formData.get("courseId") as string;
      const rating = parseInt(formData.get("rating") as string, 10);
      const comment = (formData.get("comment") as string) || null;
      const displayName = (formData.get("displayName") as string) || null;
      const email = formData.get("email") as string;

      if (!courseId || !rating || !email) {
        return Response.json(
          { error: "Missing required fields" },
          { status: 400 }
        );
      }

      if (rating < 1 || rating > 5) {
        return Response.json(
          { error: "Rating must be between 1 and 5" },
          { status: 400 }
        );
      }

      // Validar longitud de comentario
      if (comment && comment.length > 1000) {
        return Response.json(
          { error: "El comentario no puede exceder 1000 caracteres" },
          { status: 400 }
        );
      }

      // Obtener el curso para verificar acceso
      const course = await db.course.findUnique({
        where: { id: courseId },
        select: { id: true, slug: true },
      });

      if (!course) {
        return Response.json({ error: "Curso no encontrado" }, { status: 404 });
      }

      // Verificar que el usuario tenga acceso al curso
      const { hasAccess, userId } = await hasAccessToCourse(email, courseId, course.slug);

      if (!hasAccess) {
        return Response.json(
          { error: "No tienes acceso a este curso" },
          { status: 403 }
        );
      }

      // Crear o actualizar rating (update resetea approved para re-moderación)
      const courseRating = await db.courseRating.upsert({
        where: {
          courseId_email: {
            courseId,
            email,
          },
        },
        create: {
          courseId,
          email,
          userId,
          rating,
          comment,
          displayName,
        },
        update: {
          rating,
          comment,
          displayName,
          approved: false, // Reset para re-moderación si se actualiza
        },
      });

      return Response.json({ success: true, rating: courseRating });
    }

    // Admin actions
    if (intent === "approve" || intent === "feature" || intent === "delete") {
      const currentUser = await getUserOrNull(request);
      if (!currentUser || currentUser.role !== "ADMIN") {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const ratingId = formData.get("ratingId") as string;
      if (!ratingId) {
        return Response.json({ error: "Missing ratingId" }, { status: 400 });
      }

      if (intent === "approve") {
        const approved = formData.get("approved") === "true";
        await db.courseRating.update({
          where: { id: ratingId },
          data: { approved },
        });
        return Response.json({ success: true });
      }

      if (intent === "feature") {
        const featured = formData.get("featured") === "true";
        await db.courseRating.update({
          where: { id: ratingId },
          data: { featured },
        });
        return Response.json({ success: true });
      }

      if (intent === "delete") {
        await db.courseRating.delete({
          where: { id: ratingId },
        });
        return Response.json({ success: true });
      }
    }

    return Response.json({ error: "Invalid intent" }, { status: 400 });
  } catch (error) {
    console.error("Rating error:", error);
    return Response.json({ error: "Failed to process rating" }, { status: 500 });
  }
}

// GET - Obtener ratings aprobados de un curso
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const courseId = url.searchParams.get("courseId");
  const courseSlug = url.searchParams.get("courseSlug");
  const featured = url.searchParams.get("featured") === "true";
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);

  if (!courseId && !courseSlug) {
    return Response.json(
      { error: "courseId or courseSlug required" },
      { status: 400 }
    );
  }

  let finalCourseId: string | null = courseId;

  // Si se pasó slug, buscar el curso
  if (courseSlug && !courseId) {
    const course = await db.course.findUnique({
      where: { slug: courseSlug },
      select: { id: true },
    });
    if (!course) {
      return Response.json({ error: "Course not found" }, { status: 404 });
    }
    finalCourseId = course.id;
  }

  if (!finalCourseId) {
    return Response.json({ error: "Course not found" }, { status: 404 });
  }

  const where: any = {
    courseId: finalCourseId,
    approved: true,
  };

  if (featured) {
    where.featured = true;
  }

  const ratings = await db.courseRating.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      rating: true,
      comment: true,
      displayName: true,
      createdAt: true,
      featured: true,
    },
  });

  // Calcular promedio
  const allRatings = await db.courseRating.findMany({
    where: { courseId: finalCourseId, approved: true },
    select: { rating: true },
  });

  const average =
    allRatings.length > 0
      ? allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length
      : 0;

  return Response.json({
    ratings,
    average: Math.round(average * 10) / 10, // Una decimal
    total: allRatings.length,
  });
}
