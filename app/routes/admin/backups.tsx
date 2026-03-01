import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { useFetcher, useLoaderData, useRevalidator } from "react-router";
import { useEffect } from "react";
import { getAdminOrRedirect } from "~/.server/dbGetters";
import { db } from "~/.server/db";
import { AdminNav } from "~/components/admin/AdminNav";
import { scheduleBackupNow } from "~/.server/agenda";
import { FaDatabase, FaDownload, FaPlay, FaCheck, FaTimes, FaSpinner, FaClock, FaSync } from "react-icons/fa";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatTimeUntil(dateString: string): string {
  const diffMs = new Date(dateString).getTime() - Date.now();
  if (diffMs <= 0) return "Ahora";

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 && days === 0) parts.push(`${minutes}m`);

  return parts.join(" ") || "Menos de 1m";
}

function getNextSunday3AM(): Date {
  const now = new Date();
  const nextSunday = new Date(now);

  // Calculate days until next Sunday
  const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
  nextSunday.setDate(now.getDate() + daysUntilSunday);
  nextSunday.setHours(3, 0, 0, 0);

  // If it's Sunday and before 3 AM, the next backup is today
  if (now.getDay() === 0 && now.getHours() < 3) {
    nextSunday.setDate(now.getDate());
  }

  return nextSunday;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await getAdminOrRedirect(request);

  // Get last 20 backups
  const backups = await db.backup.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // Get stats
  const stats = {
    totalBackups: await db.backup.count(),
    completedBackups: await db.backup.count({ where: { status: "COMPLETED" } }),
    failedBackups: await db.backup.count({ where: { status: "FAILED" } }),
    lastSuccessful: await db.backup.findFirst({
      where: { status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
    }),
    totalSize: await db.backup.aggregate({
      where: { status: "COMPLETED" },
      _sum: { sizeBytes: true },
    }),
  };

  const nextBackupAt = getNextSunday3AM().toISOString();

  return { backups, stats, nextBackupAt };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await getAdminOrRedirect(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "trigger-backup") {
    await scheduleBackupNow();
    return { success: true, message: "Backup iniciado" };
  }

  return { error: "Intent no reconocido" };
};

export default function AdminBackups() {
  const { backups, stats, nextBackupAt } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  const isTriggering = fetcher.state === "submitting";
  const hasRunningBackup = backups.some((b) => b.status === "RUNNING");
  const isRevalidating = revalidator.state === "loading";

  // Auto-refresh cada 3 segundos cuando hay un backup en progreso
  useEffect(() => {
    if (!hasRunningBackup) return;

    const interval = setInterval(() => {
      if (revalidator.state === "idle") {
        revalidator.revalidate();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [hasRunningBackup, revalidator]);

  // También refrescar después de disparar un backup
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      // Esperar un momento y refrescar para ver el nuevo backup
      const timeout = setTimeout(() => {
        revalidator.revalidate();
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [fetcher.state, fetcher.data, revalidator]);

  return (
    <main className="min-h-screen bg-gray-50 ml-48">
      <AdminNav />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <FaDatabase className="text-indigo-600" />
              Backups
            </h1>
            <p className="text-gray-600 mt-1">
              Respaldos semanales de la base de datos MongoDB
            </p>
          </div>

          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="trigger-backup" />
            <button
              type="submit"
              disabled={isTriggering || hasRunningBackup}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium
                       hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isTriggering ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Iniciando...
                </>
              ) : hasRunningBackup ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Backup en progreso...
                </>
              ) : (
                <>
                  <FaPlay />
                  Ejecutar Backup Ahora
                </>
              )}
            </button>
          </fetcher.Form>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="text-sm text-gray-500 mb-1">Total Backups</div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalBackups}</div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="text-sm text-gray-500 mb-1">Completados</div>
            <div className="text-2xl font-bold text-green-600">{stats.completedBackups}</div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="text-sm text-gray-500 mb-1">Fallidos</div>
            <div className="text-2xl font-bold text-red-600">{stats.failedBackups}</div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="text-sm text-gray-500 mb-1">Espacio Total</div>
            <div className="text-2xl font-bold text-gray-900">
              {formatBytes(stats.totalSize._sum.sizeBytes || 0)}
            </div>
          </div>
        </div>

        {/* Next Backup Info */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-indigo-100 mb-2">
                <FaClock />
                <span className="text-sm font-medium">Proximo backup programado</span>
              </div>
              <div className="text-3xl font-bold">
                en {formatTimeUntil(nextBackupAt)}
              </div>
              <div className="text-indigo-200 mt-1">
                {new Date(nextBackupAt).toLocaleDateString("es-MX", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>

            {stats.lastSuccessful && (
              <div className="text-right">
                <div className="text-indigo-200 text-sm mb-1">Ultimo backup exitoso</div>
                <div className="font-semibold">
                  {new Date(stats.lastSuccessful.createdAt).toLocaleDateString("es-MX", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <div className="text-indigo-200 text-sm">
                  {formatBytes(stats.lastSuccessful.sizeBytes)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Backup History */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900">Historial de Backups</h2>
              {hasRunningBackup && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                  Actualizando cada 3s
                </span>
              )}
            </div>
            <button
              onClick={() => revalidator.revalidate()}
              disabled={isRevalidating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <FaSync className={isRevalidating ? "animate-spin" : ""} />
              {isRevalidating ? "Actualizando..." : "Actualizar"}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Archivo
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Tamano
                  </th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {backups.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <FaDatabase className="text-4xl text-gray-300 mx-auto mb-3" />
                      <p>No hay backups registrados</p>
                      <p className="text-sm mt-1">
                        Ejecuta un backup manual o espera al proximo domingo a las 3:00 AM
                      </p>
                    </td>
                  </tr>
                ) : (
                  backups.map((backup) => (
                    <tr key={backup.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {new Date(backup.createdAt).toLocaleDateString("es-MX", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(backup.createdAt).toLocaleTimeString("es-MX", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                          {backup.filename}
                        </code>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-medium text-gray-700">
                          {backup.status === "RUNNING" ? "..." : formatBytes(backup.sizeBytes)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          {backup.status === "COMPLETED" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <FaCheck className="text-[10px]" />
                              Completado
                            </span>
                          )}
                          {backup.status === "RUNNING" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <FaSpinner className="animate-spin text-[10px]" />
                              En progreso
                            </span>
                          )}
                          {backup.status === "FAILED" && (
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 cursor-help"
                              title={backup.error || "Error desconocido"}
                            >
                              <FaTimes className="text-[10px]" />
                              Fallido
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {backup.status === "COMPLETED" && (
                          <a
                            href={`/api/backup-download?key=${encodeURIComponent(backup.s3Key)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <FaDownload />
                            Descargar
                          </a>
                        )}
                        {backup.status === "FAILED" && backup.error && (
                          <button
                            onClick={() => alert(backup.error)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            Ver error
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h3 className="font-semibold text-amber-800 mb-2">Informacion importante</h3>
          <ul className="text-sm text-amber-700 space-y-1">
            <li>
              Los backups se ejecutan automaticamente cada domingo a las 3:00 AM (hora del servidor).
            </li>
            <li>Los archivos se almacenan en S3/Tigris en la ruta <code className="bg-amber-100 px-1 rounded">backups/fixtergeek/</code>.</li>
            <li>Se envia un email de notificacion a los administradores despues de cada backup.</li>
            <li>Los enlaces de descarga son validos por 7 dias.</li>
            <li>
              <strong>CRITICO:</strong> Nunca ejecutar comandos destructivos como{" "}
              <code className="bg-red-100 text-red-700 px-1 rounded">prisma db push --force-reset</code>.
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
