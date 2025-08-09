import { db } from "~/.server/db";
import type { Route } from "./+types/webinar";
import { useState } from "react";
import { cn } from "~/utils/cn";
import { AdminNav } from "~/components/admin/AdminNav";
import { getAdminOrRedirect } from "~/.server/dbGetters";

export const loader = async ({ request }: Route.LoaderArgs) => {
  await getAdminOrRedirect(request);

  // Debug: obtener algunos usuarios para ver sus tags
  const debugUsers = await db.user.findMany({
    take: 5,
    select: {
      email: true,
      tags: true,
    },
    orderBy: { createdAt: "desc" },
  });
  console.log("Debug - Últimos 5 usuarios y sus tags:", debugUsers);

  // Obtener usuarios registrados al webinar o que compraron el workshop
  const webinarRegistrants = await db.user.findMany({
    where: {
      OR: [
        { tags: { has: "webinar_agosto" } },
        { tags: { has: "claude-workshop-paid" } },
        { webinar: { not: null } },
      ],
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      phoneNumber: true,
      createdAt: true,
      tags: true,
      webinar: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Separar entre los que solo se registraron y los que compraron
  const onlyRegistered = webinarRegistrants.filter(
    (user) => !user.tags.includes("claude-workshop-paid")
  );

  const purchasedWorkshop = webinarRegistrants.filter((user) =>
    user.tags.includes("claude-workshop-paid")
  );

  // Estadísticas
  const stats = {
    totalRegistrants: webinarRegistrants.length,
    onlyRegistered: onlyRegistered.length,
    purchased: purchasedWorkshop.length,
    conversionRate:
      webinarRegistrants.length > 0
        ? (
            (purchasedWorkshop.length / webinarRegistrants.length) *
            100
          ).toFixed(1)
        : "0",
  };

  return {
    stats,
    onlyRegistered,
    purchasedWorkshop,
  };
};

export default function WebinarAdmin({ loaderData }: Route.ComponentProps) {
  const { stats, onlyRegistered, purchasedWorkshop } = loaderData;
  const [activeTab, setActiveTab] = useState<"registered" | "purchased">(
    "registered"
  );
  return (
    <>
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

          {/* Lista de usuarios */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teléfono
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nivel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contexto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Urgencia
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo Webinar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Webinar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registrado En
                  </th>
                  {activeTab === "purchased" && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Módulos
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(activeTab === "registered"
                  ? onlyRegistered
                  : purchasedWorkshop
                ).map((user) => {
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
                  const urgency =
                    webinarData?.urgencyTimeline ||
                    userTags
                      .find((t) => String(t).startsWith("urgency-"))
                      ?.toString()
                      .replace("urgency-", "") ||
                    "-";

                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {user.displayName || "Sin nombre"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {user.phoneNumber || "-"}
                        </div>
                        <div className="text-xs text-gray-400">
                          Metadata: {JSON.stringify(user.metadata)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={cn(
                            "px-2 py-1 text-xs rounded-full",
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{context}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={cn(
                            "px-2 py-1 text-xs rounded-full",
                            urgency === "inmediato" &&
                              "bg-red-100 text-red-800",
                            urgency === "proximas-semanas" &&
                              "bg-orange-100 text-orange-800",
                            urgency === "proximos-meses" &&
                              "bg-blue-100 text-blue-800",
                            urgency === "largo-plazo" &&
                              "bg-gray-100 text-gray-800"
                          )}
                        >
                          {urgency}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {webinarData?.webinarType || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {webinarData?.webinarDate
                            ? new Date(
                                webinarData.webinarDate
                              ).toLocaleDateString("es-MX", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {webinarData?.registeredAt
                            ? new Date(
                                webinarData.registeredAt
                              ).toLocaleDateString("es-MX")
                            : "-"}
                        </div>
                      </td>
                      {activeTab === "purchased" && (
                        <td className="px-6 py-4">
                          <div className="text-xs text-gray-500">
                            {workshopData?.selectedModules ? (
                              <div className="space-y-1">
                                {JSON.parse(
                                  workshopData.selectedModules as any
                                ).map((mod: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className="bg-gray-100 rounded px-2 py-1"
                                  >
                                    {mod.title}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              "-"
                            )}
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString("es-MX")}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {(activeTab === "registered"
                  ? onlyRegistered
                  : purchasedWorkshop
                ).length === 0 && (
                  <tr>
                    <td
                      colSpan={activeTab === "purchased" ? 11 : 10}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No hay usuarios en esta categoría
                    </td>
                  </tr>
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
                  "Teléfono",
                  "Nivel",
                  "Contexto",
                  "Urgencia",
                  "Tipo Webinar",
                  "Fecha Webinar",
                  "Registrado En",
                  "Fecha",
                ],
                ...data.map((user) => {
                  const webinarData = user.webinar as any;
                  return [
                    user.displayName || "Sin nombre",
                    user.email,
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
                    webinarData?.urgencyTimeline ||
                      user.tags
                        .find((t) => t.startsWith("urgency-"))
                        ?.replace("urgency-", "") ||
                      "",
                    webinarData?.webinarType || "",
                    webinarData?.webinarDate
                      ? new Date(webinarData.webinarDate).toLocaleDateString(
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
                    webinarData?.registeredAt
                      ? new Date(webinarData.registeredAt).toLocaleDateString(
                          "es-MX"
                        )
                      : "",
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
    </>
  );
}
