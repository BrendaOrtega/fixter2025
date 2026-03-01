import { useState } from "react";
import type { Route } from "./+types/ratings";
import { useFetcher } from "react-router";
import { getAdminOrRedirect } from "~/.server/dbGetters";
import { db } from "~/.server/db";
import { AdminNav } from "~/components/admin/AdminNav";
import { cn } from "~/utils/cn";
import {
  FaCheck,
  FaTimes,
  FaStar,
  FaTrash,
  FaFilter,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import { StarRating } from "~/components/common/StarRating";

export const loader = async ({ request }: Route.LoaderArgs) => {
  await getAdminOrRedirect(request);

  const url = new URL(request.url);
  const courseFilter = url.searchParams.get("course") || "all";
  const statusFilter = url.searchParams.get("status") || "all";
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const perPage = 20;

  // Get all courses for filter dropdown
  const courses = await db.course.findMany({
    select: { id: true, title: true, slug: true },
    orderBy: { title: "asc" },
  });

  // Build where clause
  const where: any = {};
  if (courseFilter !== "all") {
    where.courseId = courseFilter;
  }
  if (statusFilter === "pending") {
    where.approved = false;
  } else if (statusFilter === "approved") {
    where.approved = true;
  }

  // Get ratings with pagination
  const [ratings, totalFiltered] = await Promise.all([
    db.courseRating.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.courseRating.count({ where }),
  ]);

  // Get course names for each rating
  const courseIds = [...new Set(ratings.map((r) => r.courseId))];
  const courseNames = await db.course.findMany({
    where: { id: { in: courseIds } },
    select: { id: true, title: true, slug: true },
  });

  const ratingsWithCourse = ratings.map((r) => ({
    ...r,
    courseName:
      courseNames.find((c) => c.id === r.courseId)?.title || "Unknown",
    courseSlug:
      courseNames.find((c) => c.id === r.courseId)?.slug || "",
  }));

  // Stats - optimizado: una sola query en vez de 4 COUNTs
  const allRatingsForStats = await db.courseRating.findMany({
    select: { approved: true, featured: true },
  });
  const stats = {
    total: allRatingsForStats.length,
    pending: allRatingsForStats.filter((r) => !r.approved).length,
    approved: allRatingsForStats.filter((r) => r.approved).length,
    featured: allRatingsForStats.filter((r) => r.featured).length,
  };

  const totalPages = Math.ceil(totalFiltered / perPage);

  return {
    ratings: ratingsWithCourse,
    courses,
    stats,
    courseFilter,
    statusFilter,
    page,
    totalPages,
    totalFiltered,
  };
};

export const action = async ({ request }: Route.ActionArgs) => {
  await getAdminOrRedirect(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const ratingId = formData.get("ratingId") as string;

  if (!ratingId) {
    return { error: "Missing ratingId" };
  }

  if (intent === "approve") {
    const approved = formData.get("approved") === "true";
    await db.courseRating.update({
      where: { id: ratingId },
      data: { approved },
    });
    return { success: true };
  }

  if (intent === "feature") {
    const featured = formData.get("featured") === "true";
    await db.courseRating.update({
      where: { id: ratingId },
      data: { featured },
    });
    return { success: true };
  }

  if (intent === "delete") {
    await db.courseRating.delete({
      where: { id: ratingId },
    });
    return { success: true };
  }

  return { error: "Invalid intent" };
};

export default function AdminRatings({
  loaderData: { ratings, courses, stats, courseFilter, statusFilter, page, totalPages, totalFiltered },
}: Route.ComponentProps) {
  const fetcher = useFetcher();

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", String(newPage));
    window.location.search = params.toString();
  };

  const handleApprove = (ratingId: string, approved: boolean) => {
    fetcher.submit(
      { intent: "approve", ratingId, approved: String(approved) },
      { method: "POST" }
    );
  };

  const handleFeature = (ratingId: string, featured: boolean) => {
    fetcher.submit(
      { intent: "feature", ratingId, featured: String(featured) },
      { method: "POST" }
    );
  };

  const handleDelete = (ratingId: string) => {
    if (confirm("¿Eliminar esta calificación?")) {
      fetcher.submit({ intent: "delete", ratingId }, { method: "POST" });
    }
  };

  return (
    <main className="bg-dark min-h-screen ml-48">
      <AdminNav />
      <section className="max-w-7xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Calificaciones de Cursos
          </h1>
          <p className="text-gray-400">
            Modera y gestiona las calificaciones de los estudiantes
          </p>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total" value={stats.total} />
          <StatCard
            label="Pendientes"
            value={stats.pending}
            highlight={stats.pending > 0}
          />
          <StatCard label="Aprobadas" value={stats.approved} />
          <StatCard label="Destacadas" value={stats.featured} icon={<FaStar />} />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2">
            <FaFilter className="text-gray-400" />
            <select
              value={courseFilter}
              onChange={(e) => {
                const params = new URLSearchParams(window.location.search);
                params.set("course", e.target.value);
                window.location.search = params.toString();
              }}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
            >
              <option value="all">Todos los cursos</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              const params = new URLSearchParams(window.location.search);
              params.set("status", e.target.value);
              window.location.search = params.toString();
            }}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
          >
            <option value="all">Todos los estados</option>
            <option value="pending">Pendientes</option>
            <option value="approved">Aprobadas</option>
          </select>
        </div>

        {/* Ratings Table */}
        {ratings.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No hay calificaciones para mostrar
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-left text-gray-400 text-sm">
                  <th className="pb-3 font-medium">Curso</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Nombre</th>
                  <th className="pb-3 font-medium">Rating</th>
                  <th className="pb-3 font-medium">Comentario</th>
                  <th className="pb-3 font-medium">Fecha</th>
                  <th className="pb-3 font-medium">Estado</th>
                  <th className="pb-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ratings.map((rating) => (
                  <tr
                    key={rating.id}
                    className={cn(
                      "border-b border-white/5 hover:bg-white/5 transition-colors",
                      !rating.approved && "bg-yellow-500/5"
                    )}
                  >
                    <td className="py-4 text-white text-sm">
                      {rating.courseName}
                    </td>
                    <td className="py-4 text-gray-400 text-sm">{rating.email}</td>
                    <td className="py-4 text-white text-sm">
                      {rating.displayName || "-"}
                    </td>
                    <td className="py-4">
                      <StarRating rating={rating.rating} size={14} />
                    </td>
                    <td className="py-4 text-gray-300 text-sm max-w-xs">
                      <p className="line-clamp-2">{rating.comment || "-"}</p>
                    </td>
                    <td className="py-4 text-gray-400 text-sm">
                      {new Date(rating.createdAt).toLocaleDateString("es-MX")}
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        {rating.approved ? (
                          <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
                            Aprobada
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
                            Pendiente
                          </span>
                        )}
                        {rating.featured && (
                          <span className="px-2 py-1 rounded-full text-xs bg-brand_blue/20 text-brand_blue">
                            <FaStar className="inline" /> Destacada
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        {!rating.approved ? (
                          <button
                            onClick={() => handleApprove(rating.id, true)}
                            className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                            title="Aprobar"
                          >
                            <FaCheck size={12} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleApprove(rating.id, false)}
                            className="p-2 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors"
                            title="Desaprobar"
                          >
                            <FaTimes size={12} />
                          </button>
                        )}
                        <button
                          onClick={() => handleFeature(rating.id, !rating.featured)}
                          className={cn(
                            "p-2 rounded-lg transition-colors",
                            rating.featured
                              ? "bg-brand_blue/20 text-brand_blue hover:bg-brand_blue/30"
                              : "bg-white/5 text-gray-400 hover:bg-white/10"
                          )}
                          title={rating.featured ? "Quitar destacado" : "Destacar"}
                        >
                          <FaStar size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(rating.id)}
                          className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                          title="Eliminar"
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/10">
            <p className="text-gray-400 text-sm">
              Mostrando {ratings.length} de {totalFiltered} resultados
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="p-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FaChevronLeft size={14} />
              </button>
              <span className="text-white px-4">
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className="p-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FaChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
  highlight,
  icon,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "bg-white/5 border border-white/10 rounded-xl p-4",
        highlight && "border-yellow-500/50 bg-yellow-500/5"
      )}
    >
      <p className="text-gray-400 text-sm">{label}</p>
      <div className="flex items-center gap-2">
        <p
          className={cn(
            "text-2xl font-bold",
            highlight ? "text-yellow-400" : "text-white"
          )}
        >
          {value}
        </p>
        {icon && <span className="text-yellow-400">{icon}</span>}
      </div>
    </div>
  );
}
