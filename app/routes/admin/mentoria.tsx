import { getAdminOrRedirect } from "~/.server/dbGetters";
import type { Route } from "./+types/mentoria";
import { db } from "~/.server/db";
import { Form, useActionData } from "react-router";
import { AdminNav } from "~/components/admin/AdminNav";
import {
  grantCredits,
  PACKAGES,
  type PackageKey,
} from "~/.server/services/coach-credits.server";

const PACKAGE_OPTIONS = [
  { value: "5", label: "5 sesiones" },
  { value: "15", label: "15 sesiones" },
  { value: "50", label: "50 sesiones" },
];

export const loader = async ({ request }: Route.LoaderArgs) => {
  await getAdminOrRedirect(request);

  const [allCredits, allSessions, allProfiles] = await Promise.all([
    db.sessionCredit.findMany({ orderBy: { createdAt: "desc" } }),
    db.coachingSession.findMany({
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        mode: true,
        topic: true,
        phase: true,
        startedAt: true,
        endedAt: true,
        profileId: true,
        scoreDeltas: true,
        summary: true,
      },
    }),
    db.learnerProfile.findMany({
      select: {
        id: true,
        userId: true,
        level: true,
        totalSessions: true,
        algorithms: true,
        syntaxFluency: true,
        systemDesign: true,
        debugging: true,
        communication: true,
      },
    }),
  ]);

  // Map profileId → userId
  const profileUserMap = new Map(allProfiles.map((p) => [p.id, p.userId]));
  const userProfileMap = new Map(allProfiles.map((p) => [p.userId, p]));

  // Get all relevant user IDs
  const creditUserIds = allCredits.map((c) => c.userId);
  const sessionUserIds = allSessions
    .map((s) => profileUserMap.get(s.profileId))
    .filter(Boolean) as string[];
  const allUserIds = [...new Set([...creditUserIds, ...sessionUserIds])];

  const users = await db.user.findMany({
    where: { id: { in: allUserIds } },
    select: { id: true, email: true, displayName: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  // --- Stats globales ---
  const totalCreditsGranted = allCredits.reduce((s, c) => s + c.total, 0);
  const totalCreditsUsed = allCredits.reduce((s, c) => s + c.used, 0);
  const adminGrants = allCredits.filter(
    (c) => c.purchaseId === "admin-grant"
  );
  const stripeCredits = allCredits.filter(
    (c) => c.purchaseId !== "admin-grant"
  );
  const completedSessions = allSessions.filter((s) => s.endedAt);
  const avgDurationMs =
    completedSessions.length > 0
      ? completedSessions.reduce(
          (sum, s) =>
            sum +
            (new Date(s.endedAt!).getTime() - new Date(s.startedAt).getTime()),
          0
        ) / completedSessions.length
      : 0;

  const stats = {
    totalUsers: allUserIds.length,
    totalSessions: allSessions.length,
    completedSessions: completedSessions.length,
    avgDurationMin: Math.round(avgDurationMs / 60000),
    totalCreditsGranted,
    totalCreditsUsed,
    creditsRemaining: totalCreditsGranted - totalCreditsUsed,
    adminGrantCount: adminGrants.length,
    adminGrantSessions: adminGrants.reduce((s, c) => s + c.total, 0),
    stripeCount: stripeCredits.length,
    stripeSessions: stripeCredits.reduce((s, c) => s + c.total, 0),
    programmingSessions: allSessions.filter((s) => s.mode === "programming")
      .length,
    interviewSessions: allSessions.filter((s) => s.mode === "interview")
      .length,
  };

  // --- Sesiones por día (últimos 30 días) para gráfica ---
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sessionsByDay: { date: string; programming: number; interview: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    const daySessions = allSessions.filter(
      (s) => new Date(s.startedAt).toISOString().slice(0, 10) === key
    );
    sessionsByDay.push({
      date: key,
      programming: daySessions.filter((s) => s.mode === "programming").length,
      interview: daySessions.filter((s) => s.mode === "interview").length,
    });
  }

  // --- Tabla de usuarios con historial ---
  const userRows = allUserIds.map((userId) => {
    const user = userMap.get(userId);
    const profile = userProfileMap.get(userId);
    const credits = allCredits.filter((c) => c.userId === userId);
    const sessions = allSessions.filter(
      (s) => profileUserMap.get(s.profileId) === userId
    );
    const completed = sessions.filter((s) => s.endedAt);
    const adminSes = credits
      .filter((c) => c.purchaseId === "admin-grant")
      .reduce((s, c) => s + c.total, 0);
    const stripeSes = credits
      .filter((c) => c.purchaseId !== "admin-grant")
      .reduce((s, c) => s + c.total, 0);
    const totalUsed = credits.reduce((s, c) => s + c.used, 0);
    const totalTotal = credits.reduce((s, c) => s + c.total, 0);
    const lastSession = sessions[0];

    return {
      userId,
      email: user?.email || userId,
      displayName: user?.displayName || null,
      level: profile?.level || null,
      scores: profile
        ? {
            algorithms: profile.algorithms,
            syntaxFluency: profile.syntaxFluency,
            systemDesign: profile.systemDesign,
            debugging: profile.debugging,
            communication: profile.communication,
          }
        : null,
      creditsAdmin: adminSes,
      creditsStripe: stripeSes,
      creditsUsed: totalUsed,
      creditsTotal: totalTotal,
      sessionsCount: sessions.length,
      completedCount: completed.length,
      lastSessionAt: lastSession?.startedAt || null,
      lastMode: lastSession?.mode || null,
    };
  });

  // Sort by most recent session
  userRows.sort((a, b) => {
    if (!a.lastSessionAt && !b.lastSessionAt) return 0;
    if (!a.lastSessionAt) return 1;
    if (!b.lastSessionAt) return -1;
    return (
      new Date(b.lastSessionAt).getTime() -
      new Date(a.lastSessionAt).getTime()
    );
  });

  // Recent credits for the grants table
  const recentCredits = allCredits.slice(0, 30).map((c) => ({
    ...c,
    user: userMap.get(c.userId) || null,
  }));

  return { stats, sessionsByDay, userRows, recentCredits };
};

export const action = async ({ request }: Route.ActionArgs) => {
  await getAdminOrRedirect(request);
  const formData = await request.formData();
  const email = (formData.get("email") as string)?.trim();
  const packageKey = formData.get("package") as string;

  if (!email) return { error: "Email requerido" };
  if (!["5", "15", "50"].includes(packageKey))
    return { error: "Paquete inválido" };

  const user = await db.user.findFirst({ where: { email } });
  if (!user) return { error: `No se encontró usuario con email: ${email}` };

  const credit = await grantCredits(
    user.id,
    packageKey as PackageKey,
    "admin-grant"
  );

  return {
    success: `Se otorgaron ${PACKAGES[packageKey as PackageKey].sessions} sesiones a ${email}`,
    creditId: credit.id,
  };
};

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

// Mini bar chart using divs
function SparkBars({
  data,
}: {
  data: { date: string; programming: number; interview: number }[];
}) {
  const max = Math.max(
    1,
    ...data.map((d) => d.programming + d.interview)
  );
  return (
    <div className="flex items-end gap-px h-16">
      {data.map((d) => {
        const total = d.programming + d.interview;
        const pH = (d.programming / max) * 100;
        const iH = (d.interview / max) * 100;
        return (
          <div
            key={d.date}
            className="flex-1 flex flex-col justify-end group relative"
            title={`${d.date}: ${d.programming}p + ${d.interview}i = ${total}`}
          >
            {d.interview > 0 && (
              <div
                className="bg-orange-500 rounded-t-sm w-full min-h-[1px]"
                style={{ height: `${iH}%` }}
              />
            )}
            {d.programming > 0 && (
              <div
                className="bg-purple-500 w-full min-h-[1px]"
                style={{
                  height: `${pH}%`,
                  borderRadius:
                    d.interview > 0 ? undefined : "2px 2px 0 0",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function MentoriaAdmin({
  loaderData: { stats, sessionsByDay, userRows, recentCredits },
}: Route.ComponentProps) {
  const actionData = useActionData<typeof action>();

  return (
    <div className="min-h-screen bg-gray-950 ml-48">
      <AdminNav />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-lg font-semibold text-white mb-4">
          MentorIA
        </h1>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-4">
          <MiniStat label="Usuarios" value={`${stats.totalUsers}`} />
          <MiniStat
            label="Sesiones"
            value={`${stats.completedSessions}`}
            sub={`${stats.totalSessions} iniciadas`}
          />
          <MiniStat
            label="Duración prom"
            value={`${stats.avgDurationMin}min`}
          />
          <MiniStat
            label="Credits"
            value={`${stats.creditsRemaining}`}
            sub={`${stats.creditsUsed}/${stats.totalCreditsGranted} usados`}
          />
          <MiniStat
            label="Admin grants"
            value={`${stats.adminGrantSessions}`}
            sub={`${stats.adminGrantCount} paquetes`}
          />
          <MiniStat
            label="Stripe"
            value={`${stats.stripeSessions}`}
            sub={`${stats.stripeCount} compras`}
          />
          <MiniStat
            label="Modo"
            value={`${stats.programmingSessions}p / ${stats.interviewSessions}i`}
          />
        </div>

        {/* Spark chart - sessions last 30 days */}
        <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-medium text-gray-400">
              Sesiones últimos 30 días
            </h2>
            <div className="flex items-center gap-3 text-[10px] text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-purple-500 inline-block" />
                programming
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-orange-500 inline-block" />
                interview
              </span>
            </div>
          </div>
          <SparkBars data={sessionsByDay} />
          <div className="flex justify-between mt-1 text-[9px] text-gray-600">
            <span>{sessionsByDay[0]?.date.slice(5)}</span>
            <span>{sessionsByDay[sessionsByDay.length - 1]?.date.slice(5)}</span>
          </div>
        </div>

        {/* Grant form */}
        <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4 mb-4">
          <h2 className="text-sm font-medium text-gray-300 mb-3">
            Otorgar sesiones
          </h2>
          <Form method="post" className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                Email del usuario
              </label>
              <input
                type="email"
                name="email"
                required
                placeholder="usuario@email.com"
                className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                Paquete
              </label>
              <select
                name="package"
                className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs focus:outline-none focus:border-purple-500"
              >
                {PACKAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-lg transition-colors"
            >
              Otorgar
            </button>
          </Form>
          {actionData?.error && (
            <p className="mt-2 text-xs text-red-400">{actionData.error}</p>
          )}
          {actionData?.success && (
            <p className="mt-2 text-xs text-green-400">{actionData.success}</p>
          )}
        </div>

        {/* User history table */}
        <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-white">
              Usuarios ({userRows.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-900 z-10">
                <tr className="text-left text-[10px] text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-2 font-medium">Usuario</th>
                  <th className="px-3 py-2 font-medium">Nivel</th>
                  <th className="px-3 py-2 font-medium">Sesiones</th>
                  <th className="px-3 py-2 font-medium">Credits admin</th>
                  <th className="px-3 py-2 font-medium">Credits stripe</th>
                  <th className="px-3 py-2 font-medium">Usados</th>
                  <th className="px-3 py-2 font-medium">Scores</th>
                  <th className="px-3 py-2 font-medium text-right">Última</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {userRows.map((row) => (
                  <tr
                    key={row.userId}
                    className="hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="px-3 py-2">
                      <p className="text-xs text-gray-300 truncate max-w-[180px]">
                        {row.displayName || row.email}
                      </p>
                      {row.displayName && (
                        <p className="text-[10px] text-gray-600 truncate max-w-[180px]">
                          {row.email}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs text-gray-400">
                        {row.level || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs text-gray-300">
                        {row.completedCount}
                        <span className="text-gray-600">
                          /{row.sessionsCount}
                        </span>
                      </span>
                      {row.lastMode && (
                        <span
                          className={`ml-1 px-1 py-0.5 rounded text-[9px] ${
                            row.lastMode === "programming"
                              ? "bg-purple-500/10 text-purple-400"
                              : "bg-orange-500/10 text-orange-400"
                          }`}
                        >
                          {row.lastMode === "programming" ? "prog" : "int"}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs text-purple-400">
                        {row.creditsAdmin || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs text-gray-400">
                        {row.creditsStripe || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs text-gray-400">
                        {row.creditsUsed}/{row.creditsTotal}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {row.scores ? (
                        <MiniScores scores={row.scores} />
                      ) : (
                        <span className="text-[10px] text-gray-700">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="text-[10px] text-gray-500">
                        {row.lastSessionAt
                          ? timeAgo(row.lastSessionAt)
                          : "—"}
                      </span>
                    </td>
                  </tr>
                ))}
                {userRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-8 text-center text-xs text-gray-600"
                    >
                      No hay usuarios con MentorIA aún
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent credits */}
        <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-white">
              Credits recientes
            </h2>
          </div>
          <div className="overflow-y-auto max-h-[320px]">
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-900 z-10">
                <tr className="text-left text-[10px] text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-2 font-medium">Usuario</th>
                  <th className="px-3 py-2 font-medium">Paquete</th>
                  <th className="px-3 py-2 font-medium">Usadas</th>
                  <th className="px-3 py-2 font-medium">Origen</th>
                  <th className="px-3 py-2 font-medium text-right">Hace</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {recentCredits.map((credit) => (
                  <tr
                    key={credit.id}
                    className="hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="px-3 py-2">
                      <p className="text-xs text-gray-300 truncate max-w-[180px]">
                        {credit.user?.displayName ||
                          credit.user?.email ||
                          credit.userId}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs text-gray-300">
                        {credit.total} ses
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs text-gray-400">
                        {credit.used}/{credit.total}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] ${
                          credit.purchaseId === "admin-grant"
                            ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                            : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                        }`}
                      >
                        {credit.purchaseId === "admin-grant"
                          ? "admin"
                          : "stripe"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="text-[10px] text-gray-500">
                        {timeAgo(credit.createdAt)}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentCredits.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-8 text-center text-xs text-gray-600"
                    >
                      No hay credits aún
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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

function MiniScores({
  scores,
}: {
  scores: Record<string, number>;
}) {
  const dims = [
    { key: "algorithms", label: "Alg", color: "bg-purple-500" },
    { key: "syntaxFluency", label: "Syn", color: "bg-blue-500" },
    { key: "systemDesign", label: "Sys", color: "bg-green-500" },
    { key: "debugging", label: "Dbg", color: "bg-yellow-500" },
    { key: "communication", label: "Com", color: "bg-pink-500" },
  ];
  return (
    <div className="flex gap-0.5 items-end h-4">
      {dims.map((d) => {
        const val = scores[d.key] || 0;
        return (
          <div
            key={d.key}
            className={`w-1.5 rounded-t-sm ${d.color}`}
            style={{ height: `${Math.max(val, 2)}%` }}
            title={`${d.label}: ${val}`}
          />
        );
      })}
    </div>
  );
}
