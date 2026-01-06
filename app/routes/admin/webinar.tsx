import type { Route } from "./+types/webinar";
import { useState } from "react";
import { AdminNav } from "~/components/admin/AdminNav";
import { getWebinarData } from "~/.server/webinarUtils";
import { getAdminOrRedirect } from "~/.server/dbGetters";

export const loader = async ({ request }: Route.LoaderArgs) => {
  await getAdminOrRedirect(request);
  return await getWebinarData();
};

export default function WebinarAdmin({ loaderData }: Route.ComponentProps) {
  const { subscribers = [], availableTags = [], stats = { total: 0, confirmed: 0 } } = loaderData;
  const [tagFilter, setTagFilter] = useState("");

  const filtered = tagFilter
    ? subscribers.filter((s) => s.tags.includes(tagFilter))
    : subscribers;

  return (
    <article className="pt-20">
      <AdminNav />
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <h1 className="text-2xl font-bold mb-6 text-white">Suscriptores</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Confirmados</div>
            <div className="text-2xl font-bold text-green-600">
              {stats.confirmed}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Tags únicos</div>
            <div className="text-2xl font-bold text-blue-600">
              {availableTags.length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Filtrados</div>
            <div className="text-2xl font-bold text-purple-600">
              {filtered.length}
            </div>
          </div>
        </div>

        {/* Filtro */}
        <div className="bg-white rounded-lg shadow mb-4">
          <div className="p-4 flex items-center gap-3 flex-wrap">
            <label className="text-sm font-medium text-gray-700">
              Filtrar por tag:
            </label>
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos ({stats.total})</option>
              {availableTags.map(({ tag, count }) => (
                <option key={tag} value={tag}>
                  {tag} ({count})
                </option>
              ))}
            </select>
            {tagFilter && (
              <button
                onClick={() => setTagFilter("")}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Email
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Nombre
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Tags
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Fecha
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">
                  Confirmado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No hay suscriptores
                    {tagFilter && ` con el tag "${tagFilter}"`}
                  </td>
                </tr>
              ) : (
                filtered.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-900">{sub.email}</td>
                    <td className="px-4 py-2 text-gray-600">
                      {sub.name || "-"}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        {sub.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs cursor-pointer hover:bg-blue-100"
                            onClick={() => setTagFilter(tag)}
                          >
                            {tag}
                          </span>
                        ))}
                        {sub.tags.length > 3 && (
                          <span className="text-xs text-gray-400">
                            +{sub.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-gray-500">
                      {new Date(sub.createdAt).toLocaleDateString("es-MX", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {sub.confirmed ? (
                        <span className="text-green-600 font-medium">Sí</span>
                      ) : (
                        <span className="text-gray-400">No</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Export */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => {
              const csv = [
                ["Email", "Nombre", "Tags", "Fecha", "Confirmado"],
                ...filtered.map((s) => [
                  s.email,
                  s.name || "",
                  s.tags.join(";"),
                  new Date(s.createdAt).toLocaleDateString("es-MX"),
                  s.confirmed ? "Sí" : "No",
                ]),
              ]
                .map((row) => row.join(","))
                .join("\n");

              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `suscriptores-${tagFilter || "todos"}-${new Date().toISOString().split("T")[0]}.csv`;
              a.click();
            }}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800"
          >
            Exportar CSV
          </button>
        </div>
      </div>
    </article>
  );
}
