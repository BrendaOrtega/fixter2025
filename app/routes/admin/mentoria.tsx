import { getAdminOrRedirect } from "~/.server/dbGetters";
import type { Route } from "./+types/mentoria";
import { db } from "~/.server/db";
import { Form, useActionData } from "react-router";
import { AdminNav } from "~/components/admin/AdminNav";
import { getCoachAnalytics } from "~/.server/services/coach.server";

export const loader = async ({ request }: Route.LoaderArgs) => {
  await getAdminOrRedirect(request);

  const [allSessions, allProfiles] = await Promise.all([
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
        dailyBonusSessions: true,
        dailyBonusDate: true,
      },
    }),
  ]);

  // Map profileId → userId
  const profileUserMap = new Map(allProfiles.map((p) => [p.id, p.userId]));
  const userProfileMap = new Map(allProfiles.map((p) => [p.userId, p]));

  // Get all relevant user IDs
  const sessionUserIds = allSessions
    .map((s) => profileUserMap.get(s.profileId))
    .filter(Boolean) as string[];
  const allUserIds = [...new Set(sessionUserIds)];

  const users = await db.user.findMany({
    where: { id: { in: allUserIds } },
    select: { id: true, email: true, displayName: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  // --- Stats globales ---
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todaySessions = allSessions.filter(
    (s) => new Date(s.startedAt) >= todayStart
  );

  const completedAll = allSessions.filter((s) => s.endedAt);
  const avgDurAll = completedAll.length
    ? Math.round(
        completedAll.reduce((sum, s) => {
          const ms = new Date(s.endedAt!).getTime() - new Date(s.startedAt).getTime();
          return sum + Math.min(ms, 3600000);
        }, 0) / completedAll.length / 60000
      )
    : 0;

  const bonusToday = allProfiles.reduce((sum, p) => {
    if (p.dailyBonusDate && new Date(p.dailyBonusDate) >= todayStart) {
      return sum + p.dailyBonusSessions;
    }
    return sum;
  }, 0);

  const stats = {
    totalUsers: allUserIds.length,
    totalSessions: allSessions.length,
    completedSessions: completedAll.length,
    sessionsToday: todaySessions.length,
    programmingToday: todaySessions.filter((s) => s.mode === "programming").length,
    interviewToday: todaySessions.filter((s) => s.mode === "interview").length,
    avgDurationMins: avgDurAll,
    bonusToday,
  };


  // --- Tabla de usuarios con historial ---
  const userRows = allUserIds.map((userId) => {
    const user = userMap.get(userId);
    const profile = userProfileMap.get(userId);
    const sessions = allSessions.filter(
      (s) => profileUserMap.get(s.profileId) === userId
    );
    const completed = sessions.filter((s) => s.endedAt);
    const lastSession = sessions[0];

    const sessionsToday = profile
      ? allSessions.filter(
          (s) =>
            s.profileId === profile.id &&
            new Date(s.startedAt) >= todayStart
        ).length
      : 0;

    const isAnon = !user;
    const bonusToday = profile?.dailyBonusDate && new Date(profile.dailyBonusDate) >= todayStart
      ? profile.dailyBonusSessions
      : 0;
    const dailyLimit = isAnon ? 2 + bonusToday : (bonusToday > 0 ? bonusToday : null);

    return {
      userId,
      profileId: profile?.id || null,
      email: user?.email || userId,
      displayName: user?.displayName || null,
      isAnon,
      dailyLimit,
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
      sessionsCount: sessions.length,
      completedCount: completed.length,
      sessionsToday,
      bonusToday,
      lastSessionAt: lastSession?.startedAt || null,
      lastMode: lastSession?.mode || null,
      avgDurationMins: completed.length
        ? Math.round(
            completed.reduce((sum, s) => {
              const ms = new Date(s.endedAt!).getTime() - new Date(s.startedAt).getTime();
              return sum + Math.min(ms, 3600000); // cap 60min per session
            }, 0) /
              completed.length /
              60000
          )
        : null,
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

  const analytics = await getCoachAnalytics();

  return { stats, userRows, analytics };
};

export const action = async ({ request }: Route.ActionArgs) => {
  await getAdminOrRedirect(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "grant_daily_sessions") {
    const profileId = (formData.get("profileId") as string)?.trim();
    const amount = parseInt(formData.get("amount") as string) || 5;
    if (!profileId) return { error: "profileId requerido" };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const profile = await db.learnerProfile.findUnique({ where: { id: profileId } });
    if (!profile) return { error: "Perfil no encontrado" };

    const isToday = profile.dailyBonusDate && new Date(profile.dailyBonusDate) >= todayStart;
    const newBonus = isToday ? profile.dailyBonusSessions + amount : amount;

    await db.learnerProfile.update({
      where: { id: profileId },
      data: { dailyBonusSessions: newBonus, dailyBonusDate: new Date() },
    });

    return {
      success: `+${amount} sesiones otorgadas (total bonus hoy: ${newBonus})`,
    };
  }

  return { error: "Intent no reconocido" };
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


export default function MentoriaAdmin({
  loaderData: { stats, userRows, analytics },
}: Route.ComponentProps) {
  const actionData = useActionData<typeof action>();

  return (
    <div className="min-h-screen bg-gray-950 ml-48">
      <AdminNav />

      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-10">
        <h1 className="text-2xl font-bold text-white mb-8">
          MentorIA
        </h1>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MiniStat label="Usuarios" value={`${stats.totalUsers}`} sub="total" />
          <MiniStat
            label="Sesiones hoy"
            value={`${stats.sessionsToday}`}
            sub={`${stats.programmingToday} prog · ${stats.interviewToday} entrev`}
          />
          <MiniStat
            label="Total sesiones"
            value={`${stats.totalSessions}`}
            sub={`${stats.completedSessions} completadas`}
          />
          <MiniStat
            label="Promedio"
            value={`${stats.avgDurationMins}m`}
            sub={`bonus hoy: ${stats.bonusToday}`}
          />
        </div>

        {/* Analytics Funnel (30 days) */}
        <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">
            Funnel (30 días)
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MiniStat label="Completion rate" value={`${analytics.completionRate}%`} sub={`${analytics.completedSessions}/${analytics.totalSessions}`} />
            <MiniStat label="Return rate (7d)" value={`${analytics.returnRate}%`} sub={`${analytics.returningUsers}/${analytics.totalUsers} usuarios`} />
          </div>
          {Object.keys(analytics.eventCounts).length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm text-gray-500 uppercase tracking-wider">Eventos</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {Object.entries(analytics.eventCounts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([event, count]) => (
                    <div key={event} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-800/40">
                      <span className="text-xs text-gray-400 truncate">{event}</span>
                      <span className="text-sm font-mono text-gray-300 ml-2">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Action feedback */}
        {actionData?.error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-5 py-3 mb-6">
            <p className="text-sm text-red-400">{actionData.error}</p>
          </div>
        )}
        {actionData?.success && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-5 py-3 mb-6">
            <p className="text-sm text-green-400">{actionData.success}</p>
          </div>
        )}

        {/* User history table */}
        <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-800">
            <h2 className="text-lg font-semibold text-white">
              Usuarios ({userRows.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-900 z-10">
                <tr className="text-left text-sm text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium">Usuario</th>
                  <th className="px-4 py-3 font-medium">Nivel</th>
                  <th className="px-4 py-3 font-medium">Sesiones</th>
                  <th className="px-4 py-3 font-medium">Hoy</th>
                  <th className="px-4 py-3 font-medium">Duración</th>
                  <th className="px-4 py-3 font-medium">Scores</th>
                  <th className="px-4 py-3 font-medium text-right">Última</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {userRows.map((row) => (
                  <tr
                    key={row.userId}
                    className="hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-base text-gray-200 truncate max-w-[240px]">
                            {row.displayName || row.email}
                          </p>
                          {row.displayName && (
                            <p className="text-sm text-gray-500 truncate max-w-[240px]">
                              {row.email}
                            </p>
                          )}
                        </div>
                        {row.isAnon && (
                          <span className="px-2 py-1 rounded text-xs bg-gray-500/10 text-gray-500 border border-gray-500/20">
                            anon
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-base text-gray-400">
                        {row.level || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-base text-gray-300">
                        {row.completedCount}/{row.sessionsCount}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {row.dailyLimit ? (
                          <span
                            className={`text-base font-mono ${
                              row.sessionsToday >= row.dailyLimit
                                ? "text-red-400"
                                : "text-green-400"
                            }`}
                            title={row.bonusToday > 0 ? `2 + ${row.bonusToday} otorgadas` : undefined}
                          >
                            {row.sessionsToday}/{row.dailyLimit}
                            {row.bonusToday > 0 && (
                              <span className="text-sm text-purple-400 ml-1">+{row.bonusToday}</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-base text-gray-500">
                            {row.sessionsToday || "—"}
                          </span>
                        )}
                        {row.profileId && (
                          <Form method="post" className="inline">
                            <input type="hidden" name="intent" value="grant_daily_sessions" />
                            <input type="hidden" name="profileId" value={row.profileId} />
                            <input type="hidden" name="amount" value="5" />
                            <button
                              type="submit"
                              className="px-3 py-1.5 rounded text-sm font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
                              title="Otorgar 5 sesiones extra hoy"
                            >
                              +5
                            </button>
                          </Form>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-base text-gray-400">
                        {row.avgDurationMins != null
                          ? row.avgDurationMins >= 60
                            ? `${Math.floor(row.avgDurationMins / 60)}h ${row.avgDurationMins % 60}m`
                            : `${row.avgDurationMins}m`
                          : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {row.scores ? (
                        <MiniScores scores={row.scores} />
                      ) : (
                        <span className="text-sm text-gray-700">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-base text-gray-500">
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
                      colSpan={7}
                      className="px-4 py-12 text-center text-sm text-gray-600"
                    >
                      No hay usuarios con MentorIA aún
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
    <div className="bg-gray-900/40 rounded-xl border border-gray-800/50 px-6 py-5">
      <p className="text-sm text-gray-500 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-3xl font-bold text-white mt-2">{value}</p>
      {sub && <p className="text-sm text-gray-500 mt-1">{sub}</p>}
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
    <div className="flex gap-1 items-end h-6">
      {dims.map((d) => {
        const val = scores[d.key] || 0;
        return (
          <div
            key={d.key}
            className={`w-2.5 rounded-t-sm ${d.color}`}
            style={{ height: `${Math.max(val, 2)}%` }}
            title={`${d.label}: ${val}`}
          />
        );
      })}
    </div>
  );
}
