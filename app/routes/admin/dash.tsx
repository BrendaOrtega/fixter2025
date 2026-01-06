import { getAdminOrRedirect } from "~/.server/dbGetters";
import type { Route } from "./+types/dash";
import { db } from "~/.server/db";
import { useEffect, useState } from "react";
import { cn } from "~/utils/cn";
import { useFetcher } from "react-router";
import { AdminNav } from "~/components/admin/AdminNav";
import { motion } from "motion/react";
import {
  FaUsers,
  FaEnvelope,
  FaCheckCircle,
  FaChevronDown,
  FaSearch,
  FaDollarSign,
  FaGraduationCap,
  FaBook,
  FaVideo,
  FaNewspaper,
  FaCalendarAlt,
  FaShoppingCart,
} from "react-icons/fa";

export const loader = async ({ request }: Route.LoaderArgs) => {
  await getAdminOrRedirect(request);

  // Usuarios recientes
  const firstUsers = await db.user.findMany({
    select: {
      createdAt: true,
      email: true,
      displayName: true,
      confirmed: true,
      role: true,
      photoURL: true,
      courses: true,
      books: true,
    },
    take: 20,
    orderBy: {
      createdAt: "desc",
    },
  });

  const totalAccounts = await db.user.count();

  // Suscriptores
  const total_subs = await db.subscriber.count();
  const total_confirmed_subs = await db.subscriber.count({
    where: { confirmed: true },
  });
  const confirmationRate = total_subs > 0
    ? Math.round((total_confirmed_subs / total_subs) * 100)
    : 0;

  // Cursos y ventas
  const courses = await db.course.findMany({
    where: { published: true },
    select: { id: true, title: true, slug: true, basePrice: true },
  });

  // Contar estudiantes por curso desde User.courses (la relación está del lado del usuario)
  const courseEnrollments = await Promise.all(
    courses.map(async (course) => {
      const count = await db.user.count({
        where: { courses: { has: course.id } }
      });
      return { ...course, studentCount: count };
    })
  );

  const totalCourses = courses.length;
  const totalCourseEnrollments = courseEnrollments.reduce((acc, c) => acc + c.studentCount, 0);

  // Ingresos estimados de cursos
  const courseRevenue = courseEnrollments.reduce((acc, c) => {
    return acc + (c.studentCount * c.basePrice);
  }, 0);

  // Libros vendidos
  const usersWithBooks = await db.user.count({
    where: {
      books: { isEmpty: false }
    }
  });

  // Desglose de libros (asumiendo $499 cada uno)
  const BOOK_PRICE = 499;
  const allUsersWithBooks = await db.user.findMany({
    where: { books: { isEmpty: false } },
    select: { books: true }
  });
  const totalBooksSold = allUsersWithBooks.reduce((acc, u) => acc + u.books.length, 0);
  const bookRevenue = totalBooksSold * BOOK_PRICE;

  // Webinar AI SDK registrations (en Subscriber, no en User)
  const aiSdkWebinarPending = await db.subscriber.count({
    where: {
      tags: { has: "aisdk-webinar-pending" }
    }
  });
  const aiSdkWebinarRegistered = await db.subscriber.count({
    where: {
      tags: { has: "aisdk-webinar-registered" }
    }
  });
  const webinarAiSdkTotal = aiSdkWebinarPending + aiSdkWebinarRegistered;

  // Blog posts publicados
  const totalPosts = await db.post.count({ where: { published: true } });

  // Videos publicados
  const totalVideos = await db.video.count();

  // Top courses por enrollments
  const topCourses = courseEnrollments
    .map(c => ({ title: c.title, slug: c.slug, enrollments: c.studentCount, revenue: c.studentCount * c.basePrice }))
    .sort((a, b) => b.enrollments - a.enrollments)
    .slice(0, 5);

  // Usuarios nuevos últimos 7 días
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const newUsersThisWeek = await db.user.count({
    where: { createdAt: { gte: weekAgo } }
  });

  // Ingresos totales estimados
  const totalRevenue = courseRevenue + bookRevenue;

  return {
    totalAccounts,
    total_subs,
    total_confirmed_subs,
    confirmationRate,
    firstUsers,
    // Nuevos datos
    totalCourses,
    totalCourseEnrollments,
    courseRevenue,
    totalBooksSold,
    bookRevenue,
    usersWithBooks,
    // Webinar AI SDK
    webinarAiSdkTotal,
    aiSdkWebinarRegistered,
    totalPosts,
    totalVideos,
    topCourses,
    newUsersThisWeek,
    totalRevenue,
  };
};

export const action = async ({ request }: Route.ActionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent");
  if (intent === "load_all") {
    return {
      users: await db.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          createdAt: true,
          email: true,
          displayName: true,
          confirmed: true,
          role: true,
          photoURL: true,
          courses: true,
          books: true,
        },
      }),
    };
  }
};

// Stat Card Component
function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  color,
  delay = 0,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  subValue?: string;
  color: string;
  delay?: number;
}) {
  const colorClasses: Record<string, string> = {
    purple: "from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400",
    blue: "from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400",
    green: "from-green-500/20 to-green-600/10 border-green-500/30 text-green-400",
    orange: "from-orange-500/20 to-orange-600/10 border-orange-500/30 text-orange-400",
    pink: "from-pink-500/20 to-pink-600/10 border-pink-500/30 text-pink-400",
    cyan: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/30 text-cyan-400",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6",
        "backdrop-blur-sm hover:scale-[1.02] transition-transform duration-300",
        colorClasses[color]
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{label}</p>
          <p className="text-3xl font-bold text-white">{typeof value === 'number' ? value.toLocaleString() : value}</p>
          {subValue && (
            <p className="text-xs text-gray-500 mt-1">{subValue}</p>
          )}
        </div>
        <div className={cn("p-3 rounded-xl bg-white/5", colorClasses[color])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {/* Decorative gradient blob */}
      <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/5 blur-2xl" />
    </motion.div>
  );
}

// User Avatar Component
function UserAvatar({ name, photoURL }: { name?: string | null; photoURL?: string | null }) {
  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt={name || "User"}
        className="w-8 h-8 rounded-full object-cover ring-2 ring-gray-700"
      />
    );
  }

  const initial = name?.charAt(0)?.toUpperCase() || "?";
  const colors = [
    "bg-purple-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-cyan-500",
  ];
  const colorIndex = name ? name.charCodeAt(0) % colors.length : 0;

  return (
    <div
      className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ring-2 ring-gray-700",
        colors[colorIndex]
      )}
    >
      {initial}
    </div>
  );
}

// Componente para formatear dinero
function formatMoney(cents: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
  }).format(cents);
}

export default function Page({
  loaderData: {
    total_confirmed_subs,
    total_subs,
    firstUsers,
    totalAccounts,
    confirmationRate,
    totalCourses,
    totalCourseEnrollments,
    courseRevenue,
    totalBooksSold,
    bookRevenue,
    webinarAiSdkTotal,
    aiSdkWebinarRegistered,
    totalPosts,
    totalVideos,
    topCourses,
    newUsersThisWeek,
    totalRevenue,
  },
}: Route.ComponentProps) {
  const fetcher = useFetcher();
  const [users, setUsers] = useState(firstUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (fetcher.data?.users && fetcher.data.users.length > 0) {
      setUsers(fetcher.data.users);
      setShowAll(true);
    }
  }, [fetcher.data]);

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats principales - Ingresos y ventas
  const revenueStats = [
    { icon: FaDollarSign, label: "Ingresos Totales", value: formatMoney(totalRevenue), color: "green", subValue: "Cursos + Libros" },
    { icon: FaShoppingCart, label: "Ingresos Cursos", value: formatMoney(courseRevenue), color: "purple", subValue: `${totalCourseEnrollments} enrollments` },
    { icon: FaBook, label: "Libros Vendidos", value: totalBooksSold, color: "orange", subValue: formatMoney(bookRevenue) },
  ];

  // Stats de audiencia
  const audienceStats = [
    { icon: FaUsers, label: "Usuarios", value: totalAccounts, color: "blue", subValue: `+${newUsersThisWeek} esta semana` },
    { icon: FaEnvelope, label: "Suscriptores", value: total_subs, color: "cyan", subValue: `${confirmationRate}% confirmados` },
    { icon: FaCalendarAlt, label: "Webinar AI SDK", value: webinarAiSdkTotal, color: "pink", subValue: `${aiSdkWebinarRegistered} confirmados` },
  ];

  // Stats de contenido
  const contentStats = [
    { icon: FaGraduationCap, label: "Cursos", value: totalCourses, color: "purple", subValue: "Publicados" },
    { icon: FaVideo, label: "Videos", value: totalVideos, color: "blue", subValue: "Total" },
    { icon: FaNewspaper, label: "Posts", value: totalPosts, color: "green", subValue: "Blog" },
  ];

  return (
    <div className="min-h-screen bg-gray-950">
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">Métricas de negocio y audiencia</p>
        </motion.div>

        {/* Revenue Stats - Principal */}
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <FaDollarSign className="w-4 h-4" />
            Ingresos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {revenueStats.map((stat, i) => (
              <StatCard key={stat.label} {...stat} delay={i * 0.1} />
            ))}
          </div>
        </div>

        {/* Audience Stats */}
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <FaUsers className="w-4 h-4" />
            Audiencia
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {audienceStats.map((stat, i) => (
              <StatCard key={stat.label} {...stat} delay={0.3 + i * 0.1} />
            ))}
          </div>
        </div>

        {/* Content Stats */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <FaNewspaper className="w-4 h-4" />
            Contenido
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {contentStats.map((stat, i) => (
              <StatCard key={stat.label} {...stat} delay={0.6 + i * 0.1} />
            ))}
          </div>
        </div>

        {/* Two Column Layout: Top Courses + Users Table */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Courses */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-800 p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FaGraduationCap className="w-5 h-5 text-purple-400" />
              Top Cursos
            </h2>
            <div className="space-y-3">
              {topCourses.map((course, i) => (
                <motion.div
                  key={course.slug}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 + i * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-800/50 hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-white text-sm font-medium truncate max-w-[140px]">{course.title}</p>
                      <p className="text-gray-500 text-xs">{course.enrollments} estudiantes</p>
                    </div>
                  </div>
                  <span className="text-green-400 text-sm font-medium">
                    {formatMoney(course.revenue)}
                  </span>
                </motion.div>
              ))}
              {topCourses.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">Sin cursos aún</p>
              )}
            </div>
          </motion.div>

          {/* Users Table Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="lg:col-span-2 bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-800 overflow-hidden"
          >
            {/* Table Header */}
            <div className="px-6 py-4 border-b border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {showAll ? "Todos los Usuarios" : "Usuarios Recientes"}
                </h2>
                <p className="text-sm text-gray-400">
                  {showAll
                    ? `${filteredUsers.length} usuarios${searchTerm ? " encontrados" : " totales"}`
                    : `Mostrando ${Math.min(10, filteredUsers.length)} de ${users.length}`
                  }
                </p>
              </div>

              {/* Search */}
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 w-full sm:w-48 transition-colors text-sm"
                />
              </div>
            </div>

            {/* Table */}
            <div className={cn("overflow-x-auto", showAll && "max-h-[600px] overflow-y-auto")}>
              <table className="w-full">
                <thead className={cn(showAll && "sticky top-0 bg-gray-900 z-10")}>
                  <tr className="text-left text-xs text-gray-400 uppercase tracking-wider">
                    <th className="px-6 py-3 font-medium">Usuario</th>
                    <th className="px-6 py-3 font-medium hidden lg:table-cell">Compras</th>
                    <th className="px-6 py-3 font-medium">Estado</th>
                    <th className="px-6 py-3 font-medium">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {(showAll ? filteredUsers : filteredUsers.slice(0, 10)).map((user, i) => (
                    <motion.tr
                      key={user.email}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1 + i * 0.03 }}
                      className="hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar name={user.displayName} photoURL={user.photoURL} />
                          <div>
                            <p className="text-white text-sm font-medium truncate max-w-[120px]">
                              {user.displayName || "Sin nombre"}
                            </p>
                            <p className="text-gray-500 text-xs truncate max-w-[120px]">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 hidden lg:table-cell">
                        <div className="flex gap-1">
                          {user.courses.length > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                              {user.courses.length} curso{user.courses.length !== 1 && 's'}
                            </span>
                          )}
                          {user.books.length > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">
                              {user.books.length} libro{user.books.length !== 1 && 's'}
                            </span>
                          )}
                          {user.courses.length === 0 && user.books.length === 0 && (
                            <span className="text-gray-600 text-xs">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        {user.confirmed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                            Ok
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                            Pendiente
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-gray-400 text-xs">
                          {new Date(user.createdAt).toLocaleDateString("es-MX", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Load More Button */}
            {!showAll && (
              <div className="px-6 py-3 border-t border-gray-800">
                <fetcher.Form method="post" className="flex justify-center">
                  <button
                    name="intent"
                    value="load_all"
                    type="submit"
                    disabled={fetcher.state !== "idle"}
                    className={cn(
                      "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                      "bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {fetcher.state !== "idle" ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Cargando...
                      </>
                    ) : (
                      <>
                        <FaChevronDown className="w-3 h-3" />
                        Ver todos ({totalAccounts} usuarios)
                      </>
                    )}
                  </button>
                </fetcher.Form>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
