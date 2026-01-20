import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { getAdminOrRedirect } from "~/.server/dbGetters";
import { db } from "~/.server/db";
import { AdminNav } from "~/components/admin/AdminNav";
import { FaExclamationTriangle, FaTrash, FaExternalLinkAlt } from "react-icons/fa";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await getAdminOrRedirect(request);

  const logs = await db.notFoundLog.findMany({
    orderBy: { count: "desc" },
    take: 100,
  });

  const stats = {
    totalPaths: logs.length,
    totalHits: logs.reduce((sum, log) => sum + log.count, 0),
  };

  return { logs, stats };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await getAdminOrRedirect(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "delete") {
    const id = formData.get("id") as string;
    await db.notFoundLog.delete({ where: { id } });
    return { success: true };
  }

  if (intent === "clear-all") {
    await db.notFoundLog.deleteMany();
    return { success: true };
  }

  return { error: "Intent no reconocido" };
};

export default function Admin404s() {
  const { logs, stats } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  return (
    <main className="min-h-screen bg-gray-50">
      <AdminNav />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <FaExclamationTriangle className="text-amber-500" />
              404s
            </h1>
            <p className="text-gray-600 mt-1">
              URLs que no existen - identificar contenido a recuperar o redireccionar
            </p>
          </div>

          {logs.length > 0 && (
            <fetcher.Form method="post" onSubmit={(e) => {
              if (!confirm("¿Eliminar todos los registros de 404?")) {
                e.preventDefault();
              }
            }}>
              <input type="hidden" name="intent" value="clear-all" />
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium
                         hover:bg-red-700 transition-colors"
              >
                <FaTrash />
                Limpiar todo
              </button>
            </fetcher.Form>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="text-sm text-gray-500 mb-1">URLs únicas</div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalPaths}</div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="text-sm text-gray-500 mb-1">Total de hits</div>
            <div className="text-2xl font-bold text-amber-600">{stats.totalHits}</div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">URLs con 404</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Path
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Veces visto
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Última vez
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      <FaExclamationTriangle className="text-4xl text-gray-300 mx-auto mb-3" />
                      <p>No hay 404s registrados</p>
                      <p className="text-sm mt-1">
                        Las URLs que den 404 se registrarán aquí automáticamente
                      </p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono text-gray-800">
                          {log.path}
                        </code>
                        <a
                          href={`https://web.archive.org/web/*/fixtergeek.com${log.path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-gray-400 hover:text-indigo-600 inline-flex items-center"
                          title="Buscar en Wayback Machine"
                        >
                          <FaExternalLinkAlt className="text-xs" />
                        </a>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-sm font-bold ${log.count >= 10 ? 'text-red-600' : log.count >= 5 ? 'text-amber-600' : 'text-gray-700'}`}>
                          {log.count}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {log.lastSeenAt ? (
                          <>
                            <div className="text-sm text-gray-600">
                              {new Date(log.lastSeenAt).toLocaleDateString("es-MX", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </div>
                            <div className="text-xs text-gray-400">
                              {new Date(log.lastSeenAt).toLocaleTimeString("es-MX", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <fetcher.Form method="post" className="inline">
                          <input type="hidden" name="intent" value="delete" />
                          <input type="hidden" name="id" value={log.id} />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <FaTrash />
                            Eliminar
                          </button>
                        </fetcher.Form>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-800 mb-2">Cómo usar estos datos</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>URLs con alto count indican tráfico real - considera recuperar el contenido o crear un redirect.</li>
            <li>Haz clic en el ícono de enlace externo para buscar en Wayback Machine.</li>
            <li>Una vez resuelto (contenido recuperado o redirect creado), elimina el registro.</li>
            <li>Se capturan todas las URLs que dan 404 en el sitio.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
