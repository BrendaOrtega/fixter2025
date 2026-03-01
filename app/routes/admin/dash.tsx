import { getAdminOrRedirect } from "~/.server/dbGetters";
import type { Route } from "./+types/dash";
import { db } from "~/.server/db";
import { useEffect, useState } from "react";
import { cn } from "~/utils/cn";
import { useFetcher } from "react-router";
import { AdminNav } from "~/components/admin/AdminNav";
import { FaChevronDown, FaSearch } from "react-icons/fa";

export const loader = async ({ request }: Route.LoaderArgs) => {
  await getAdminOrRedirect(request);

  const [
    firstUsers,
    totalAccounts,
    recentSubscribers,
    total_subs,
    total_confirmed_subs,
    totalCourses,
    totalPosts,
    totalVideos,
    courses,
    _usersWithBooks,
    allUsersWithBooks,
    newUsersThisWeek_count,
    aiSdkWebinarPending,
    aiSdkWebinarRegistered,
  ] = await Promise.all([
    db.user.findMany({
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
      orderBy: { createdAt: "desc" },
    }),
    db.user.count(),
    db.subscriber.findMany({
      select: {
        email: true,
        name: true,
        firstName: true,
        tags: true,
        confirmed: true,
        createdAt: true,
      },
      take: 30,
      orderBy: { createdAt: "desc" },
    }),
    db.subscriber.count(),
    db.subscriber.count({ where: { confirmed: true } }),
    db.course.count({ where: { published: true } }),
    db.post.count({ where: { published: true } }),
    db.video.count(),
    db.course.findMany({
      where: { published: true },
      select: { id: true, title: true, slug: true, basePrice: true },
    }),
    db.user.count({ where: { books: { isEmpty: false } } }),
    db.user.findMany({
      where: { books: { isEmpty: false } },
      select: { books: true },
    }),
    (() => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return db.user.count({ where: { createdAt: { gte: weekAgo } } });
    })(),
    db.subscriber.count({ where: { tags: { has: "aisdk-webinar-pending" } } }),
    db.subscriber.count({
      where: { tags: { has: "aisdk-webinar-registered" } },
    }),
  ]);

  const courseEnrollments = await Promise.all(
    courses.map(async (course) => {
      const count = await db.user.count({
        where: { courses: { has: course.id } },
      });
      return { ...course, studentCount: count };
    })
  );

  const totalCourseEnrollments = courseEnrollments.reduce(
    (acc, c) => acc + c.studentCount,
    0
  );
  const courseRevenue = courseEnrollments.reduce(
    (acc, c) => acc + c.studentCount * c.basePrice,
    0
  );
  const totalBooksSold = allUsersWithBooks.reduce(
    (acc, u) => acc + u.books.length,
    0
  );
  const BOOK_PRICE = 499;
  const bookRevenue = totalBooksSold * BOOK_PRICE;
  const totalRevenue = courseRevenue + bookRevenue;
  const confirmationRate =
    total_subs > 0
      ? Math.round((total_confirmed_subs / total_subs) * 100)
      : 0;
  return {
    totalAccounts,
    total_subs,
    total_confirmed_subs,
    confirmationRate,
    firstUsers,
    recentSubscribers,
    totalCourses,
    totalCourseEnrollments,
    courseRevenue,
    totalBooksSold,
    bookRevenue,
    webinarAiSdkTotal: aiSdkWebinarPending + aiSdkWebinarRegistered,
    totalPosts,
    totalVideos,
    newUsersThisWeek: newUsersThisWeek_count,
    totalRevenue,
  };
};

export const action = async ({ request }: Route.ActionArgs) => {
  await getAdminOrRedirect(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  if (intent === "load_all_users") {
    const users = await db.user.findMany({
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
    });
    return { intent: "load_all_users", users };
  }
  if (intent === "load_all_subs") {
    const subscribers = await db.subscriber.findMany({
      select: {
        email: true,
        name: true,
        firstName: true,
        tags: true,
        confirmed: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return { intent: "load_all_subs", subscribers };
  }
  return null;
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
  }).format(cents);
}

function timeAgo(date: string | Date) {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

export default function Page({
  loaderData: {
    total_confirmed_subs,
    total_subs,
    firstUsers,
    totalAccounts,
    confirmationRate,
    recentSubscribers,
    totalCourses,
    totalCourseEnrollments,
    courseRevenue,
    totalBooksSold,
    bookRevenue,
    webinarAiSdkTotal,
    totalPosts,
    totalVideos,
    newUsersThisWeek,
    totalRevenue,
  },
}: Route.ComponentProps) {
  const userFetcher = useFetcher();
  const subFetcher = useFetcher();
  const [users, setUsers] = useState(firstUsers);
  const [subs, setSubs] = useState(recentSubscribers);
  const [userSearch, setUserSearch] = useState("");
  const [subSearch, setSubSearch] = useState("");
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [showAllSubs, setShowAllSubs] = useState(false);

  useEffect(() => {
    if (userFetcher.data?.intent === "load_all_users" && userFetcher.data.users) {
      setUsers(userFetcher.data.users);
      setShowAllUsers(true);
    }
  }, [userFetcher.data]);

  useEffect(() => {
    if (subFetcher.data?.intent === "load_all_subs" && subFetcher.data.subscribers) {
      setSubs(subFetcher.data.subscribers);
      setShowAllSubs(true);
    }
  }, [subFetcher.data]);

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.displayName?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredSubs = subs.filter(
    (sub) =>
      sub.email.toLowerCase().includes(subSearch.toLowerCase()) ||
      sub.tags.some((t) => t.toLowerCase().includes(subSearch.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-950 ml-48">
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Two main tables side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Últimos suscriptores */}
          <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-white flex-shrink-0">
                {showAllSubs ? "Todos los suscriptores" : "Suscriptores recientes"}
              </h2>
              <div className="relative">
                <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 w-3 h-3" />
                <input
                  type="text"
                  placeholder="Email o tag..."
                  value={subSearch}
                  onChange={(e) => setSubSearch(e.target.value)}
                  className="pl-7 pr-3 py-1 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 w-36 text-xs"
                />
              </div>
            </div>
            <div className={cn("overflow-y-auto", showAllSubs ? "max-h-[480px]" : "max-h-[420px]")}>
              <table className="w-full">
                <thead className="sticky top-0 bg-gray-900 z-10">
                  <tr className="text-left text-[10px] text-gray-500 uppercase tracking-wider">
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Tags</th>
                    <th className="px-3 py-2 font-medium text-right">Hace</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {(showAllSubs ? filteredSubs : filteredSubs.slice(0, 20)).map((sub) => (
                    <tr
                      key={sub.email}
                      className="hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full flex-shrink-0",
                              sub.confirmed ? "bg-green-400" : "bg-yellow-400"
                            )}
                          />
                          <span className="text-xs text-gray-300 truncate max-w-[180px]">
                            {sub.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1 flex-wrap">
                          {sub.tags.length > 0 ? (
                            sub.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20"
                              >
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-600 text-[10px]">
                              sin tags
                            </span>
                          )}
                          {sub.tags.length > 3 && (
                            <span className="text-[10px] text-gray-500">
                              +{sub.tags.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="text-[10px] text-gray-500">
                          {timeAgo(sub.createdAt)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!showAllSubs && (
              <div className="px-3 py-2 border-t border-gray-800">
                <subFetcher.Form method="post" className="flex justify-center">
                  <button
                    name="intent"
                    value="load_all_subs"
                    type="submit"
                    disabled={subFetcher.state !== "idle"}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    {subFetcher.state !== "idle" ? (
                      "Cargando..."
                    ) : (
                      <>
                        <FaChevronDown className="w-2 h-2" />
                        Ver todos ({total_subs})
                      </>
                    )}
                  </button>
                </subFetcher.Form>
              </div>
            )}
          </div>

          {/* Últimos usuarios */}
          <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-white flex-shrink-0">
                {showAllUsers ? "Todos los usuarios" : "Usuarios recientes"}
              </h2>
              <div className="relative">
                <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 w-3 h-3" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-7 pr-3 py-1 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 w-36 text-xs"
                />
              </div>
            </div>
            <div
              className={cn(
                "overflow-y-auto",
                showAllUsers ? "max-h-[480px]" : "max-h-[420px]"
              )}
            >
              <table className="w-full">
                <thead className="sticky top-0 bg-gray-900 z-10">
                  <tr className="text-left text-[10px] text-gray-500 uppercase tracking-wider">
                    <th className="px-3 py-2 font-medium">Usuario</th>
                    <th className="px-3 py-2 font-medium">Compras</th>
                    <th className="px-3 py-2 font-medium text-right">Hace</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {(showAllUsers ? filteredUsers : filteredUsers.slice(0, 15)).map(
                    (user) => (
                      <tr
                        key={user.email}
                        className="hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="px-3 py-2">
                          <div>
                            <p className="text-xs text-gray-300 truncate max-w-[180px]">
                              {user.displayName || user.email}
                            </p>
                            {user.displayName && (
                              <p className="text-[10px] text-gray-600 truncate max-w-[180px]">
                                {user.email}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            {user.courses.length > 0 && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-400">
                                {user.courses.length}c
                              </span>
                            )}
                            {user.books.length > 0 && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-orange-500/10 text-orange-400">
                                {user.books.length}l
                              </span>
                            )}
                            {user.courses.length === 0 &&
                              user.books.length === 0 && (
                                <span className="text-gray-700 text-[10px]">
                                  —
                                </span>
                              )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span className="text-[10px] text-gray-500">
                            {timeAgo(user.createdAt)}
                          </span>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
            {!showAllUsers && (
              <div className="px-3 py-2 border-t border-gray-800">
                <userFetcher.Form method="post" className="flex justify-center">
                  <button
                    name="intent"
                    value="load_all_users"
                    type="submit"
                    disabled={userFetcher.state !== "idle"}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    {userFetcher.state !== "idle" ? (
                      "Cargando..."
                    ) : (
                      <>
                        <FaChevronDown className="w-2 h-2" />
                        Ver todos ({totalAccounts})
                      </>
                    )}
                  </button>
                </userFetcher.Form>
              </div>
            )}
          </div>
        </div>

        {/* Stats compactos + Top cursos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-4">
          <MiniStat label="Ingresos" value={formatMoney(totalRevenue)} />
          <MiniStat label="Cursos $" value={formatMoney(courseRevenue)} />
          <MiniStat label="Libros" value={`${totalBooksSold}`} sub={formatMoney(bookRevenue)} />
          <MiniStat label="Usuarios" value={`${totalAccounts}`} sub={`+${newUsersThisWeek} sem`} />
          <MiniStat label="Suscriptores" value={`${total_subs}`} sub={`${total_confirmed_subs} ok`} />
          <MiniStat label="Enrollments" value={`${totalCourseEnrollments}`} />
          <MiniStat label="Webinar SDK" value={`${webinarAiSdkTotal}`} />
          <MiniStat label="Contenido" value={`${totalCourses}c ${totalVideos}v ${totalPosts}p`} />
        </div>

      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-gray-900/40 rounded-lg border border-gray-800/50 px-3 py-2">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-sm font-semibold text-white mt-0.5">{value}</p>
      {sub && <p className="text-[10px] text-gray-600">{sub}</p>}
    </div>
  );
}
