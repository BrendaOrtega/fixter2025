import type { Route } from "./+types/webinar";
import { useState } from "react";
import { cn } from "~/utils/cn";
import { AdminNav } from "~/components/admin/AdminNav";
import { getWebinarData, filterUsersByTag, COURSE_IDS } from "~/.server/webinarUtils";
// import { getAdminOrRedirect } from "~/.server/dbGetters";

export const loader = async ({ request }: Route.LoaderArgs) => {
  // await getAdminOrRedirect(request);
  
  // Obtener toda la data procesada del webinar
  const webinarData = await getWebinarData();
  
  return webinarData;
};

export default function WebinarAdmin({ loaderData }: Route.ComponentProps) {
  const { stats, onlyRegistered, purchasedWorkshop, availableTags } = loaderData;
  const [activeTab, setActiveTab] = useState<"registered" | "purchased">(
    "registered"
  );
  const [tagFilter, setTagFilter] = useState("");


  // Filtrar usuarios por tag
  const filteredUsers = (activeTab === "registered" ? onlyRegistered : purchasedWorkshop).filter(user => {
    if (!tagFilter) return true;
    const userTags = Array.isArray(user.tags) ? user.tags : [];
    return userTags.includes(tagFilter);
  });
  return (
    <article className="pt-20">
      <AdminNav />
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <h1 className="text-3xl font-bold mb-6 text-white">
          Administración del Webinar
        </h1>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Registrados</div>
            <div className="text-3xl font-bold text-gray-900">
              {stats.totalRegistrants}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Solo Webinar</div>
            <div className="text-3xl font-bold text-blue-600">
              {stats.onlyRegistered}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Compraron Taller</div>
            <div className="text-3xl font-bold text-green-600">
              {stats.purchased}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Tasa Conversión</div>
            <div className="text-3xl font-bold text-purple-600">
              {stats.conversionRate}%
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab("registered")}
                className={cn(
                  "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
                  activeTab === "registered"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                Solo Registrados ({stats.onlyRegistered})
              </button>
              <button
                onClick={() => setActiveTab("purchased")}
                className={cn(
                  "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
                  activeTab === "purchased"
                    ? "border-green-500 text-green-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                Compraron Taller ({stats.purchased})
              </button>
            </nav>
          </div>

          {/* Filtro de tags */}
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <label htmlFor="tagFilter" className="text-sm font-medium text-gray-700">
                Filtrar por tag:
              </label>
              <select
                id="tagFilter"
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todas las tags</option>
                {availableTags.map(({ tag, count }) => (
                  <option key={tag} value={tag}>
                    {tag} ({count})
                  </option>
                ))}
              </select>
              {tagFilter && (
                <button
                  onClick={() => setTagFilter("")}
                  className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                >
                  Limpiar
                </button>
              )}
              <span className="text-xs text-gray-500 ml-2">
                {tagFilter && (
                  <span>
                    Tag: <strong>{tagFilter}</strong> | 
                  </span>
                )} Mostrando: {filteredUsers.length} usuarios
              </span>
            </div>
          </div>

          {/* Lista de usuarios */}
          <div className="overflow-hidden">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                    Usuario
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                    Email
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                    Registro
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                    Teléfono
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/10">
                    Nivel
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Contexto
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                    Sesión
                  </th>
                  {activeTab === "purchased" && (
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                      Módulos
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={activeTab === "purchased" ? 8 : 7}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      {tagFilter 
                        ? `No hay usuarios con el tag "${tagFilter}"`
                        : activeTab === "registered"
                        ? "No hay usuarios registrados solamente al webinar"
                        : "No hay usuarios que hayan comprado el taller"}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const webinarData = user.webinar as any;
                    const workshopData = user.metadata?.workshop as any;

                    // Asegurar que tags es un array
                    const userTags = Array.isArray(user.tags) ? user.tags : [];

                    const experienceLevel =
                      webinarData?.experienceLevel ||
                      userTags
                        .find((t) => String(t).startsWith("level-"))
                        ?.toString()
                        .replace("level-", "") ||
                      "-";
                    const context =
                      webinarData?.contextObjective ||
                      userTags
                        .find((t) => String(t).startsWith("context-"))
                        ?.toString()
                        .replace("context-", "") ||
                      "-";

                    return (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            <div
                              className="text-sm font-medium text-gray-900"
                              title={user.displayName || "Sin nombre"}
                            >
                              {user.displayName || "Sin nombre"}
                            </div>
                            {user.courses &&
                              user.courses.includes(COURSE_IDS.CLAUDE) && (
                                <span
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                  title="Tiene curso de Claude Code"
                                >
                                  Claude
                                </span>
                              )}
                            {user.courses &&
                              user.courses.includes(COURSE_IDS.GEMINI) && (
                                <span
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                                  title="Tiene curso de Gemini CLI"
                                >
                                  Gemini
                                </span>
                              )}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div
                            className="text-sm text-gray-500"
                            title={user.email}
                          >
                            {user.email}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="text-xs text-gray-500">
                            {webinarData?.registeredAt
                              ? new Date(
                                  webinarData.registeredAt
                                ).toLocaleDateString("es-MX", {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "-"}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div
                            className="text-xs text-gray-500 truncate"
                            title={user.phoneNumber || "-"}
                          >
                            {user.phoneNumber || "-"}
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          <span
                            className={cn(
                              "px-1 py-0.5 text-xs rounded-full whitespace-nowrap",
                              experienceLevel === "junior" &&
                                "bg-green-100 text-green-800",
                              experienceLevel === "mid" &&
                                "bg-blue-100 text-blue-800",
                              experienceLevel === "senior" &&
                                "bg-purple-100 text-purple-800",
                              experienceLevel === "lead" &&
                                "bg-red-100 text-red-800",
                              experienceLevel === "student" &&
                                "bg-yellow-100 text-yellow-800"
                            )}
                          >
                            {experienceLevel}
                          </span>
                        </td>
                        <td className="px-2 py-3">
                          <div
                            className="text-xs text-gray-500 truncate max-w-24"
                            title={context}
                          >
                            {context}
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          <div
                            className="text-xs text-gray-500 truncate max-w-20"
                            title={webinarData?.webinarType || "-"}
                          >
                            {webinarData?.webinarType || "-"}
                          </div>
                        </td>
                        {activeTab === "purchased" && (
                          <td className="px-2 py-3">
                            <div className="text-xs text-gray-500">
                              {workshopData?.selectedModules ? (
                                <div className="space-y-0.5">
                                  {JSON.parse(
                                    workshopData.selectedModules as any
                                  )
                                    .slice(0, 2)
                                    .map((mod: any, idx: number) => (
                                      <div
                                        key={idx}
                                        className="bg-gray-100 rounded px-1 py-0.5 text-xs truncate"
                                        title={mod.title}
                                      >
                                        {mod.title}
                                      </div>
                                    ))}
                                  {JSON.parse(
                                    workshopData.selectedModules as any
                                  ).length > 2 && (
                                    <div className="text-xs text-gray-400">
                                      +
                                      {JSON.parse(
                                        workshopData.selectedModules as any
                                      ).length - 2}{" "}
                                      más
                                    </div>
                                  )}
                                </div>
                              ) : (
                                "-"
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Botón de exportar */}
        <div className="mt-6 flex justify-end gap-4">
          <button
            onClick={() => {
              const data =
                activeTab === "registered" ? onlyRegistered : purchasedWorkshop;
              const csv = [
                [
                  "Nombre",
                  "Email",
                  "Fecha Registro",
                  "Teléfono",
                  "Nivel",
                  "Contexto",
                  "Tipo Webinar",
                  "Fecha",
                ],
                ...data.map((user) => {
                  const webinarData = user.webinar as any;
                  return [
                    user.displayName || "Sin nombre",
                    user.email,
                    webinarData?.registeredAt
                      ? new Date(webinarData.registeredAt).toLocaleDateString(
                          "es-MX",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )
                      : "",
                    user.phoneNumber || "",
                    webinarData?.experienceLevel ||
                      user.tags
                        .find((t) => t.startsWith("level-"))
                        ?.replace("level-", "") ||
                      "",
                    webinarData?.contextObjective ||
                      user.tags
                        .find((t) => t.startsWith("context-"))
                        ?.replace("context-", "") ||
                      "",
                    webinarData?.webinarType || "",
                    new Date(user.createdAt).toLocaleDateString("es-MX"),
                  ];
                }),
              ]
                .map((row) => row.join(","))
                .join("\n");

              const blob = new Blob([csv], { type: "text/csv" });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `webinar-${activeTab}-${
                new Date().toISOString().split("T")[0]
              }.csv`;
              a.click();
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Exportar CSV
          </button>
        </div>
      </div>
    </article>
  );
}
