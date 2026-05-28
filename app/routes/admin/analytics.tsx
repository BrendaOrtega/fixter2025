import type { Route } from "./+types/analytics";
import { db } from "~/.server/db";
import React, { useState } from "react";
import { Form, Link, useFetcher } from "react-router";
import { HeatmapVisualization } from "~/components/HeatmapVisualization";
import { getAdminOrRedirect } from "~/.server/dbGetters";
import { Prisma } from "@prisma/client";

export const action = async ({ request }: Route.ActionArgs) => {
  await getAdminOrRedirect(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "update-banner") {
    const postId = formData.get("postId") as string;
    const bannerImg = (formData.get("bannerImg") as string)?.trim();
    const bannerLink = (formData.get("bannerLink") as string)?.trim();

    await db.post.update({
      where: { id: postId },
      data: {
        banner: bannerImg
          ? { img: bannerImg, link: bannerLink || "" }
          : Prisma.DbNull,
      },
    });
    return { ok: true };
  }

  return { error: "Unknown intent" };
};

export const loader = async ({ request }: Route.LoaderArgs) => {
  await getAdminOrRedirect(request);

  const url = new URL(request.url);
  const startDateParam = url.searchParams.get("startDate");
  const endDateParam = url.searchParams.get("endDate");

  const endDate = endDateParam ? new Date(endDateParam) : new Date();
  const startDate = startDateParam
    ? new Date(startDateParam)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Aggregate stats
  const [totalSessions, totalPageViews, totalClicks] = await Promise.all([
    db.blogAnalytics
      .findMany({
        where: { timestamp: { gte: startDate, lte: endDate } },
        select: { sessionId: true },
        distinct: ["sessionId"],
      })
      .then((r) => r.length),
    db.blogAnalytics.count({
      where: { event: "page_view", timestamp: { gte: startDate, lte: endDate } },
    }),
    db.blogAnalytics.count({
      where: { event: "click", timestamp: { gte: startDate, lte: endDate } },
    }),
  ]);

  // Posts with per-post analytics
  const posts = await db.post.findMany({
    where: { published: true },
    select: { id: true, title: true, slug: true, createdAt: true, banner: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const postsWithAnalytics = await Promise.all(
    posts.map(async (post) => {
      const [pageViews, clickCount] = await Promise.all([
        db.blogAnalytics.count({
          where: {
            postId: post.id,
            event: "page_view",
            timestamp: { gte: startDate, lte: endDate },
          },
        }),
        db.blogAnalytics.count({
          where: {
            postId: post.id,
            event: "click",
            clickX: { not: null },
            timestamp: { gte: startDate, lte: endDate },
          },
        }),
      ]);
      return { ...post, pageViews, clickCount };
    })
  );

  // Video analytics — agregación en memoria (admin-only, volumen acotado por rango)
  const videoViews = await db.videoView.findMany({
    where: { startedAt: { gte: startDate, lte: endDate } },
    select: {
      videoSlug: true,
      courseId: true,
      sessionId: true,
      completedAt: true,
    },
  });

  const totalVideoViews = videoViews.length;
  const uniqueVideoViewers = new Set(videoViews.map((v) => v.sessionId)).size;

  const byVideo = new Map<string, { views: number; completed: number }>();
  const byCourse = new Map<string, { views: number; completed: number }>();
  for (const v of videoViews) {
    const ve = byVideo.get(v.videoSlug) ?? { views: 0, completed: 0 };
    ve.views++;
    if (v.completedAt) ve.completed++;
    byVideo.set(v.videoSlug, ve);
    if (v.courseId) {
      const ce = byCourse.get(v.courseId) ?? { views: 0, completed: 0 };
      ce.views++;
      if (v.completedAt) ce.completed++;
      byCourse.set(v.courseId, ce);
    }
  }

  const [videoMetaRows, courseMetaRows] = await Promise.all([
    byVideo.size
      ? db.video.findMany({
          where: { slug: { in: [...byVideo.keys()] } },
          select: { slug: true, title: true, accessLevel: true },
        })
      : Promise.resolve([]),
    byCourse.size
      ? db.course.findMany({
          where: { id: { in: [...byCourse.keys()] } },
          select: { id: true, title: true },
        })
      : Promise.resolve([]),
  ]);
  const videoMeta = new Map(videoMetaRows.map((v) => [v.slug, v]));
  const courseMeta = new Map(courseMetaRows.map((c) => [c.id, c]));

  const pct = (part: number, total: number) =>
    total ? Math.round((part / total) * 100) : 0;

  const topVideos = [...byVideo.entries()]
    .map(([slug, s]) => ({
      slug,
      title: videoMeta.get(slug)?.title ?? slug,
      accessLevel: videoMeta.get(slug)?.accessLevel ?? "?",
      views: s.views,
      completionRate: pct(s.completed, s.views),
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 20);

  const topCourses = [...byCourse.entries()]
    .map(([id, s]) => ({
      id,
      title: courseMeta.get(id)?.title ?? id,
      views: s.views,
      completionRate: pct(s.completed, s.views),
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 20);

  return {
    stats: { totalSessions, totalPageViews, totalClicks },
    videoStats: { totalVideoViews, uniqueVideoViewers },
    topVideos,
    topCourses,
    postsWithAnalytics,
    dateRange: {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    },
  };
};

function BannerCell({
  postId,
  banner,
}: {
  postId: string;
  banner: { img: string; link: string } | null;
}) {
  const fetcher = useFetcher();
  const [editing, setEditing] = useState(false);
  const [img, setImg] = useState(banner?.img || "");
  const [link, setLink] = useState(banner?.link || "");

  const optimisticBanner =
    fetcher.formData?.get("intent") === "update-banner"
      ? fetcher.formData.get("bannerImg")
        ? {
            img: fetcher.formData.get("bannerImg") as string,
            link: fetcher.formData.get("bannerLink") as string,
          }
        : null
      : banner;

  const save = () => {
    fetcher.submit(
      { intent: "update-banner", postId, bannerImg: img, bannerLink: link },
      { method: "post" }
    );
    setEditing(false);
  };

  const remove = () => {
    fetcher.submit(
      { intent: "update-banner", postId, bannerImg: "", bannerLink: "" },
      { method: "post" }
    );
    setImg("");
    setLink("");
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-1.5 min-w-[200px]">
        <input
          type="text"
          placeholder="URL imagen"
          value={img}
          onChange={(e) => setImg(e.target.value)}
          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs w-full"
        />
        <input
          type="text"
          placeholder="URL destino"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs w-full"
        />
        <div className="flex gap-1">
          <button
            onClick={save}
            className="bg-blue-600 hover:bg-blue-700 px-2 py-0.5 rounded text-xs"
          >
            Guardar
          </button>
          <button
            onClick={() => setEditing(false)}
            className="bg-gray-700 hover:bg-gray-600 px-2 py-0.5 rounded text-xs"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  if (optimisticBanner?.img) {
    return (
      <div className="flex items-center gap-2">
        <img
          src={optimisticBanner.img}
          alt="banner"
          className="w-10 h-5 object-cover rounded border border-gray-600"
        />
        <button
          onClick={() => setEditing(true)}
          className="text-blue-400 hover:text-blue-300 text-xs"
        >
          Editar
        </button>
        <button
          onClick={remove}
          className="text-red-400 hover:text-red-300 text-xs"
        >
          Quitar
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="text-gray-500 hover:text-gray-300 text-xs"
    >
      + Agregar
    </button>
  );
}

export default function AnalyticsPage({
  loaderData: {
    stats,
    videoStats,
    topVideos,
    topCourses,
    postsWithAnalytics,
    dateRange,
  },
}: Route.ComponentProps) {
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "views" | "clicks">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  const sorted = [...postsWithAnalytics].sort((a, b) => {
    const mul = sortDir === "asc" ? 1 : -1;
    if (sortBy === "views") return (a.pageViews - b.pageViews) * mul;
    if (sortBy === "clicks") return (a.clickCount - b.clickCount) * mul;
    return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * mul;
  });

  const arrow = (col: typeof sortBy) =>
    sortBy === col ? (sortDir === "asc" ? " \u2191" : " \u2193") : "";

  return (
    <div className="min-h-screen bg-gray-900 text-white pt-20">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header + date filter */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <h1 className="text-3xl font-bold">Analytics</h1>
          <Form method="get" className="flex items-end gap-3">
            <input
              type="date"
              name="startDate"
              defaultValue={dateRange.startDate}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm"
            />
            <input
              type="date"
              name="endDate"
              defaultValue={dateRange.endDate}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded text-sm font-medium"
            >
              Filtrar
            </button>
            {[
              { label: "7d", days: 7 },
              { label: "30d", days: 30 },
              { label: "90d", days: 90 },
            ].map((p) => {
              const end = new Date();
              const start = new Date(Date.now() - p.days * 86400000);
              return (
                <Link
                  key={p.days}
                  to={`/admin/analytics?startDate=${start.toISOString().split("T")[0]}&endDate=${end.toISOString().split("T")[0]}`}
                  className="bg-gray-800 hover:bg-gray-700 px-2 py-1.5 rounded text-xs text-gray-300"
                >
                  {p.label}
                </Link>
              );
            })}
          </Form>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-400 mb-1">Sessions</p>
            <p className="text-2xl font-bold text-blue-400">
              {stats.totalSessions.toLocaleString()}
            </p>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-400 mb-1">Page Views</p>
            <p className="text-2xl font-bold text-green-400">
              {stats.totalPageViews.toLocaleString()}
            </p>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-400 mb-1">Clicks</p>
            <p className="text-2xl font-bold text-purple-400">
              {stats.totalClicks.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Video stats row */}
        <h2 className="text-xl font-bold mb-3">Videos</h2>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-400 mb-1">Reproducciones</p>
            <p className="text-2xl font-bold text-yellow-400">
              {videoStats.totalVideoViews.toLocaleString()}
            </p>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-400 mb-1">Viewers únicos</p>
            <p className="text-2xl font-bold text-pink-400">
              {videoStats.uniqueVideoViewers.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Top videos + top courses */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700 text-gray-300 font-medium">
              Top videos
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-left text-gray-400">
                  <th className="px-4 py-2">Video</th>
                  <th className="px-4 py-2 text-right">Vistas</th>
                  <th className="px-4 py-2 text-right">% Compl.</th>
                </tr>
              </thead>
              <tbody>
                {topVideos.map((v) => (
                  <tr
                    key={v.slug}
                    className="border-b border-gray-700/50 hover:bg-gray-700/30"
                  >
                    <td className="px-4 py-2">
                      <span className="text-gray-200">{v.title}</span>
                      <span className="ml-2 text-[10px] uppercase text-gray-500">
                        {v.accessLevel}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right text-gray-300">
                      {v.views}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-300">
                      {v.completionRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {topVideos.length === 0 && (
              <div className="py-8 text-center text-gray-500 text-sm">
                Sin reproducciones en este rango.
              </div>
            )}
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700 text-gray-300 font-medium">
              Top cursos
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-left text-gray-400">
                  <th className="px-4 py-2">Curso</th>
                  <th className="px-4 py-2 text-right">Vistas</th>
                  <th className="px-4 py-2 text-right">% Compl.</th>
                </tr>
              </thead>
              <tbody>
                {topCourses.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-gray-700/50 hover:bg-gray-700/30"
                  >
                    <td className="px-4 py-2 text-gray-200">{c.title}</td>
                    <td className="px-4 py-2 text-right text-gray-300">
                      {c.views}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-300">
                      {c.completionRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {topCourses.length === 0 && (
              <div className="py-8 text-center text-gray-500 text-sm">
                Sin vistas de curso en este rango.
              </div>
            )}
          </div>
        </div>

        {/* Posts table */}
        <h2 className="text-xl font-bold mb-3">Blog</h2>
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-left text-gray-400">
                <th className="px-4 py-3">
                  <button onClick={() => toggleSort("date")} className="hover:text-white">
                    Post{arrow("date")}
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <button onClick={() => toggleSort("views")} className="hover:text-white">
                    Views{arrow("views")}
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <button onClick={() => toggleSort("clicks")} className="hover:text-white">
                    Clicks{arrow("clicks")}
                  </button>
                </th>
                <th className="px-4 py-3">Banner</th>
                <th className="px-4 py-3 text-right">Heatmap</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((post) => (
                <React.Fragment key={post.id}>
                  <tr className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="px-4 py-3">
                      <Link
                        to={`/blog/${post.slug}`}
                        className="text-gray-200 hover:text-blue-400"
                      >
                        {post.title}
                      </Link>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">
                      {post.pageViews}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">
                      {post.clickCount}
                    </td>
                    <td className="px-4 py-3">
                      <BannerCell postId={post.id} banner={post.banner ?? null} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {post.clickCount > 0 ? (
                        <button
                          onClick={() =>
                            setExpandedPost(
                              expandedPost === post.id ? null : post.id
                            )
                          }
                          className="text-blue-400 hover:text-blue-300 text-xs"
                        >
                          {expandedPost === post.id ? "Cerrar" : "Ver"}
                        </button>
                      ) : (
                        <span className="text-gray-600 text-xs">--</span>
                      )}
                    </td>
                  </tr>
                  {expandedPost === post.id && (
                    <tr>
                      <td colSpan={5} className="p-4 bg-gray-850">
                        <div
                          className="relative bg-gray-700 rounded border border-gray-600 overflow-hidden"
                          style={{ height: 300 }}
                        >
                          <div className="absolute inset-0">
                            <HeatmapVisualization
                              postId={post.id}
                              className="w-full h-full"
                              opacity={0.7}
                              radius={20}
                            />
                          </div>
                        </div>
                        <div className="mt-2 flex justify-end">
                          <Link
                            to={`/admin/heatmap/${post.id}`}
                            className="text-blue-400 hover:text-blue-300 text-xs"
                          >
                            Analisis completo
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>

          {postsWithAnalytics.length === 0 && (
            <div className="py-12 text-center text-gray-500">
              No hay posts publicados.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
