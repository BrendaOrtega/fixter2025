import { useState } from "react";
import { redirect, data, useFetcher, Link } from "react-router";
import type { Route } from "./+types/cursos.$courseSlug.rating";
import { db } from "~/.server/db";
import { getUserOrNull } from "~/.server/dbGetters";
import { hasAccessToCourse } from "~/.server/services/course-access.server";
import { StarRating } from "~/components/common/StarRating";
import { NavBar } from "~/components/common/NavBar";
import SimpleFooter from "~/components/common/SimpleFooter";
import getMetaTags from "~/utils/getMetaTags";

export function meta({ data }: Route.MetaArgs) {
  if (!data?.course) {
    return getMetaTags({ title: "Calificar curso" });
  }
  return getMetaTags({
    title: `Califica ${data.course.title}`,
    description: `¿Qué te pareció el curso ${data.course.title}? Tu opinión nos ayuda a mejorar.`,
  });
}

export const loader = async ({ request, params }: Route.LoaderArgs) => {
  const { courseSlug } = params;
  const url = new URL(request.url);
  const emailParam = url.searchParams.get("email");

  // Get course
  const course = await db.course.findUnique({
    where: { slug: courseSlug },
    select: { id: true, title: true, slug: true, icon: true },
  });

  if (!course) {
    throw redirect("/404");
  }

  // Get user from session
  const user = await getUserOrNull(request);

  // Determine email to use
  const email = emailParam || user?.email;

  if (!email) {
    // No email - need to authenticate
    return {
      course,
      hasAccess: false,
      email: null,
      userName: null,
      existingRating: null,
      error: "no_email",
    };
  }

  // Check if user has access to course
  const accessResult = await hasAccessToCourse(email, course.id, courseSlug);

  if (!accessResult.hasAccess) {
    return {
      course,
      hasAccess: false,
      email,
      userName: user?.displayName || null,
      existingRating: null,
      error: "no_access",
    };
  }

  // Check for existing rating
  const existingRating = await db.courseRating.findUnique({
    where: {
      courseId_email: {
        courseId: course.id,
        email,
      },
    },
  });

  return {
    course,
    hasAccess: true,
    email,
    userName: user?.displayName || null,
    existingRating,
    error: null,
  };
};

export const action = async ({ request, params }: Route.ActionArgs) => {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const rating = parseInt(formData.get("rating") as string, 10);
  const comment = (formData.get("comment") as string) || null;
  const displayName = (formData.get("displayName") as string) || null;
  const { courseSlug } = params;

  if (!email || !rating || rating < 1 || rating > 5) {
    return data({ error: "Datos inválidos" }, { status: 400 });
  }

  // Validar longitud de comentario
  if (comment && comment.length > 1000) {
    return data({ error: "El comentario no puede exceder 1000 caracteres" }, { status: 400 });
  }

  const course = await db.course.findUnique({
    where: { slug: courseSlug },
    select: { id: true },
  });

  if (!course) {
    return data({ error: "Curso no encontrado" }, { status: 404 });
  }

  // Verify access
  const { hasAccess: canAccess, userId } = await hasAccessToCourse(email, course.id, courseSlug!);

  if (!canAccess) {
    return data({ error: "No tienes acceso a este curso" }, { status: 403 });
  }

  // Create or update rating (update resetea approved para re-moderación)
  await db.courseRating.upsert({
    where: {
      courseId_email: {
        courseId: course.id,
        email,
      },
    },
    create: {
      courseId: course.id,
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

  return { success: true };
};

export default function CourseRatingPage({
  loaderData: { course, hasAccess, email, userName, existingRating, error },
}: Route.ComponentProps) {
  const [rating, setRating] = useState(existingRating?.rating || 0);
  const [comment, setComment] = useState(existingRating?.comment || "");
  const [displayName, setDisplayName] = useState(
    existingRating?.displayName || userName || ""
  );
  const fetcher = useFetcher();

  const isSubmitting = fetcher.state === "submitting";
  const isSuccess = fetcher.data?.success;

  if (error === "no_email") {
    return (
      <main className="bg-dark min-h-screen flex flex-col">
        <NavBar />
        <section className="max-w-lg mx-auto px-4 py-20 text-center flex-1">
          <h1 className="text-2xl font-bold text-white mb-4">
            Inicia sesión para calificar
          </h1>
          <p className="text-gray-400 mb-6">
            Necesitas iniciar sesión para dejar tu calificación del curso.
          </p>
          <Link
            to={`/login?next=/cursos/${course.slug}/rating`}
            className="inline-block px-6 py-3 bg-brand_blue text-white rounded-lg hover:bg-brand_blue/90"
          >
            Iniciar sesión
          </Link>
        </section>
        <SimpleFooter />
      </main>
    );
  }

  if (error === "no_access") {
    return (
      <main className="bg-dark min-h-screen flex flex-col">
        <NavBar />
        <section className="max-w-lg mx-auto px-4 py-20 text-center flex-1">
          <h1 className="text-2xl font-bold text-white mb-4">
            Acceso no disponible
          </h1>
          <p className="text-gray-400 mb-6">
            Para calificar este curso necesitas haberlo comprado o estar
            suscrito.
          </p>
          <Link
            to={`/cursos/${course.slug}/detalle`}
            className="inline-block px-6 py-3 bg-brand_blue text-white rounded-lg hover:bg-brand_blue/90"
          >
            Ver curso
          </Link>
        </section>
        <SimpleFooter />
      </main>
    );
  }

  return (
    <main className="bg-dark min-h-screen flex flex-col">
      <NavBar />
      <section className="max-w-lg mx-auto px-4 py-20 flex-1">
        {isSuccess ? (
          <div className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold text-white mb-2">
              ¡Gracias por tu opinión!
            </h1>
            <p className="text-gray-400 mb-6">
              Tu calificación será revisada y publicada pronto.
            </p>
            <Link
              to={`/cursos/${course.slug}/viewer`}
              className="inline-block px-6 py-3 bg-brand_blue text-white rounded-lg hover:bg-brand_blue/90"
            >
              Volver al curso
            </Link>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <div className="text-center mb-8">
              {course.icon && (
                <img
                  src={course.icon}
                  alt={course.title}
                  className="w-16 h-16 mx-auto mb-4 rounded-xl"
                />
              )}
              <h1 className="text-2xl font-bold text-white mb-2">
                ¿Qué te pareció el curso?
              </h1>
              <p className="text-gray-400">{course.title}</p>
              {existingRating && (
                <p className="text-sm text-brand_blue mt-2">
                  Ya calificaste este curso. Puedes actualizar tu opinión.
                </p>
              )}
            </div>

            <fetcher.Form method="POST" className="space-y-6">
              <input type="hidden" name="email" value={email || ""} />

              <div className="flex flex-col items-center py-4">
                <p className="text-sm text-gray-400 mb-3">
                  Selecciona tu calificación
                </p>
                <input type="hidden" name="rating" value={rating} />
                <StarRating
                  rating={rating}
                  interactive
                  onChange={setRating}
                  size={40}
                />
                {rating > 0 && (
                  <p className="text-sm mt-2 text-yellow-400">
                    {getRatingText(rating)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  ¿Quieres añadir un comentario? (opcional)
                </label>
                <textarea
                  name="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Cuéntanos tu experiencia..."
                  rows={4}
                  maxLength={1000}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-brand_blue resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Tu nombre (como aparecerá públicamente)
                </label>
                <input
                  type="text"
                  name="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ej: Juan P."
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-brand_blue"
                />
              </div>

              <button
                type="submit"
                disabled={rating === 0 || isSubmitting}
                className="w-full py-3 px-4 rounded-lg bg-brand_blue text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand_blue/90 transition-colors"
              >
                {isSubmitting
                  ? "Enviando..."
                  : existingRating
                  ? "Actualizar calificación"
                  : "Enviar calificación"}
              </button>
            </fetcher.Form>
          </div>
        )}
      </section>
      <SimpleFooter />
    </main>
  );
}

function getRatingText(rating: number): string {
  const texts: Record<number, string> = {
    1: "Necesita mejorar",
    2: "Regular",
    3: "Bueno",
    4: "Muy bueno",
    5: "¡Excelente!",
  };
  return texts[rating] || "";
}
