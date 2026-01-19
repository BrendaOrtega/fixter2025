import { useState, useRef, useEffect } from "react";
import { redirect, data, useFetcher, Link } from "react-router";
import type { Route } from "./+types/cursos.$courseSlug.rating";
import { db } from "~/.server/db";
import { getUserOrNull } from "~/.server/dbGetters";
import { hasAccessToCourse } from "~/.server/services/course-access.server";
import { StarRating } from "~/components/common/StarRating";
import { NavBar } from "~/components/common/NavBar";
import SimpleFooter from "~/components/common/SimpleFooter";
import getMetaTags from "~/utils/getMetaTags";
import { FaCamera, FaSpinner } from "react-icons/fa";
import { useToast } from "~/hooks/useToaster";

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
  const title = (formData.get("title") as string) || null;
  const avatarUrl = (formData.get("avatarUrl") as string) || null;
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
      title,
      avatarUrl,
    },
    update: {
      rating,
      comment,
      displayName,
      title,
      avatarUrl,
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
  const [title, setTitle] = useState(existingRating?.title || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(existingRating?.avatarUrl || null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(existingRating?.avatarUrl || null);

  // Opciones de título predefinidas
  const titleOptions = [
    "Estudiante",
    "Desarrollador",
    "Desarrollador Frontend",
    "Desarrollador Backend",
    "Desarrollador Full Stack",
    "Diseñador",
    "Product Manager",
    "Data Scientist",
    "DevOps",
    "QA Engineer",
    "Tech Lead",
    "CTO",
    "Freelancer",
    "Emprendedor",
    "AI Hacker",
  ];
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fetcher = useFetcher();
  const toast = useToast();

  const isSubmitting = fetcher.state === "submitting";
  const isSuccess = fetcher.data?.success || showSuccess;

  // Mostrar toast cuando se completa exitosamente
  useEffect(() => {
    if (fetcher.data?.success && fetcher.state === "idle") {
      toast.success({ text: existingRating ? "Calificación actualizada" : "Calificación enviada" });
      setShowSuccess(true);
    }
  }, [fetcher.data, fetcher.state]);

  // Comprimir imagen a máximo 150x150px y devolver como base64
  const compressImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      img.onload = () => {
        // Calcular dimensiones manteniendo aspect ratio
        const maxSize = 150;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        // Devolver como base64 (data URL)
        const base64 = canvas.toDataURL("image/jpeg", 0.7);
        resolve(base64);
      };

      img.onerror = () => reject(new Error("Error cargando imagen"));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith("image/")) {
      toast.error({ text: "Solo se permiten imágenes" });
      return;
    }

    try {
      // Comprimir imagen y convertir a base64
      const base64 = await compressImageToBase64(file);
      setAvatarUrl(base64);
      setAvatarPreview(base64);
    } catch (error) {
      console.error("Error compressing image:", error);
      toast.error({ text: "Error procesando imagen" });
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    // Agregar avatarUrl (base64) si existe
    if (avatarUrl) {
      formData.set("avatarUrl", avatarUrl);
    }

    // Agregar title
    if (title) {
      formData.set("title", title);
    }

    fetcher.submit(formData, { method: "POST" });
  };

  if (error === "no_email") {
    return (
      <main className="bg-dark min-h-screen flex flex-col">
        <NavBar />
        <section className="max-w-lg mx-auto px-4 py-20 text-center flex-1 flex items-center justify-center">
          <div>
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
          </div>
        </section>
        <SimpleFooter />
      </main>
    );
  }

  if (error === "no_access") {
    return (
      <main className="bg-dark min-h-screen flex flex-col">
        <NavBar />
        <section className="max-w-lg mx-auto px-4 py-20 text-center flex-1 flex items-center justify-center">
          <div>
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
          </div>
        </section>
        <SimpleFooter />
      </main>
    );
  }

  return (
    <main className="bg-dark min-h-screen flex flex-col">
      <NavBar />
      <section className="max-w-lg mx-auto px-4 py-20 flex-1 flex items-center justify-center">
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

            <form onSubmit={handleSubmit} className="space-y-6">
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

              {/* Avatar upload */}
              <div className="flex flex-col items-center py-2">
                <p className="text-sm text-gray-400 mb-3">
                  Tu foto (opcional)
                </p>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-20 h-20 rounded-full overflow-hidden cursor-pointer group border-2 border-dashed border-white/20 hover:border-brand_blue transition-colors"
                >
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center">
                      <FaCamera className="text-gray-500 text-xl" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <FaCamera className="text-white text-lg" />
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Se comprime automáticamente
                </p>
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

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Tu rol o título (opcional)
                </label>
                <select
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-brand_blue"
                >
                  <option value="" className="bg-gray-900">Selecciona tu rol...</option>
                  {titleOptions.map((opt) => (
                    <option key={opt} value={opt} className="bg-gray-900">
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={rating === 0 || isSubmitting}
                className="w-full py-3 px-4 rounded-lg bg-brand_blue text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand_blue/90 transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Enviando...
                  </>
                ) : existingRating ? (
                  "Actualizar calificación"
                ) : (
                  "Enviar calificación"
                )}
              </button>
            </form>
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
