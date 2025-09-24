import type { Route } from "./+types/webinar";
import { useState } from "react";
import { cn } from "~/utils/cn";
import { AdminNav } from "~/components/admin/AdminNav";
import { getWebinarData } from "~/.server/webinarUtils";
import { getAdminOrRedirect } from "~/.server/dbGetters";
import { COURSE_IDS } from "~/constants/webinar";
import { BiCopy, BiLogoWhatsapp } from "react-icons/bi";

export const loader = async ({ request }: Route.LoaderArgs) => {
  await getAdminOrRedirect(request);

  // Obtener toda la data procesada del webinar
  const webinarData = await getWebinarData();

  return webinarData;
};

export default function WebinarAdmin({ loaderData }: Route.ComponentProps) {
  const { stats, onlyRegistered, purchasedWorkshop, availableTags } =
    loaderData;
  const [activeTab, setActiveTab] = useState<"registered" | "purchased">(
    "registered"
  );
  const [tagFilter, setTagFilter] = useState("");

  // Filtrar usuarios por tag
  const filteredUsers = (
    activeTab === "registered" ? onlyRegistered : purchasedWorkshop
  ).filter((user) => {
    if (!tagFilter) return true;
    const userTags = Array.isArray(user.tags) ? user.tags : [];
    return userTags.includes(tagFilter);
  });

  // Función para copiar teléfono al clipboard
  const copyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      // Simple feedback visual
      const button = document.activeElement as HTMLElement;
      if (button) {
        const originalText = button.title;
        button.title = "¡Copiado!";
        setTimeout(() => {
          button.title = originalText;
        }, 1000);
      }
    } catch (err) {
      console.error('Error copiando teléfono:', err);
    }
  };

  // Función para abrir WhatsApp
  const openWhatsApp = (phone: string) => {
    // Limpiar el teléfono de caracteres especiales
    const cleanPhone = phone.replace(/[^\d]/g, '');
    // Si no tiene código de país, asumir México (+52)
    const finalPhone = cleanPhone.startsWith('52') ? cleanPhone : `52${cleanPhone}`;
    window.open(`https://wa.me/${finalPhone}`, '_blank');
  };
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
              <label
                htmlFor="tagFilter"
                className="text-sm font-medium text-gray-700"
              >
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
                )}{" "}
                Mostrando: {filteredUsers.length} usuarios
              </span>
            </div>
          </div>

          {/* Lista de usuarios */}
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                    Registro
                  </th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                    Tel
                  </th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                    Nivel
                  </th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                    Interés
                  </th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                    Objetivo
                  </th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  {activeTab === "purchased" && (
                    <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Módulos
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={activeTab === "purchased" ? 9 : 8}
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
                        .find((t) => String(t).startsWith("level-") || String(t).startsWith("experience-"))
                        ?.toString()
                        .replace("level-", "")
                        .replace("experience-", "") ||
                      "-";

                    // Interest: específico de cada landing (ej: single_agents, multi_agents, etc.)
                    const interest =
                      userTags
                        .find((t) => String(t).startsWith("interest-"))
                        ?.toString()
                        .replace("interest-", "") ||
                      "-";

                    // Context: lo que se guarda en webinar.contextObjective (puede variar por landing)
                    const context =
                      webinarData?.contextObjective ||
                      userTags
                        .find((t) => String(t).startsWith("context-"))
                        ?.toString()
                        .replace("context-", "") ||
                      "-";

                    return (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-2 py-1">
                          <div className="flex items-center gap-1">
                            <div
                              className="font-medium text-gray-900 truncate max-w-[120px]"
                              title={user.displayName || "Sin nombre"}
                            >
                              {(user.displayName || "Sin nombre").split(' ')[0]}
                            </div>
                            {user.courses &&
                              user.courses.includes(COURSE_IDS.CLAUDE) && (
                                <span
                                  className="inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800"
                                  title="Tiene curso de Claude Code"
                                >
                                  C
                                </span>
                              )}
                            {user.courses &&
                              user.courses.includes(COURSE_IDS.GEMINI) && (
                                <span
                                  className="inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800"
                                  title="Tiene curso de Gemini CLI"
                                >
                                  G
                                </span>
                              )}
                            {user.courses &&
                              user.courses.includes(COURSE_IDS.LLAMAINDEX) && (
                                <span
                                  className="inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-800"
                                  title="Tiene curso de LlamaIndex"
                                >
                                  L
                                </span>
                              )}
                          </div>
                        </td>
                        <td className="px-2 py-1">
                          <div
                            className="text-gray-500 truncate max-w-[140px]"
                            title={user.email}
                          >
                            {user.email}
                          </div>
                        </td>
                        <td className="px-2 py-1">
                          <div className="text-gray-500">
                            {webinarData?.registeredAt
                              ? new Date(
                                  webinarData.registeredAt
                                ).toLocaleDateString("es-MX", {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }).replace(/\s/g, '-').replace(/,/g, '')
                              : "-"}
                          </div>
                        </td>
                        <td className="px-2 py-1">
                          {user.phoneNumber ? (
                            <div className="flex items-center gap-1">
                              <span
                                className="text-gray-500 truncate max-w-[40px]"
                                title={user.phoneNumber}
                              >
                                {user.phoneNumber.slice(-4)}
                              </span>
                              <button
                                onClick={() => copyPhone(user.phoneNumber!)}
                                className="p-0.5 text-gray-400 hover:text-blue-600 transition-colors"
                                title={`Copiar: ${user.phoneNumber}`}
                              >
                                <BiCopy className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => openWhatsApp(user.phoneNumber!)}
                                className="p-0.5 text-gray-400 hover:text-green-600 transition-colors"
                                title={`WhatsApp: ${user.phoneNumber}`}
                              >
                                <BiLogoWhatsapp className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-2 py-1">
                          <span
                            className={cn(
                              "px-1 py-0.5 rounded whitespace-nowrap",
                              experienceLevel === "junior" &&
                                "bg-green-100 text-green-800",
                              experienceLevel === "mid" &&
                                "bg-blue-100 text-blue-800",
                              experienceLevel === "senior" &&
                                "bg-purple-100 text-purple-800",
                              experienceLevel === "lead" &&
                                "bg-red-100 text-red-800",
                              experienceLevel === "student" &&
                                "bg-yellow-100 text-yellow-800",
                              experienceLevel === "beginner" &&
                                "bg-green-100 text-green-800",
                              experienceLevel === "intermediate" &&
                                "bg-blue-100 text-blue-800",
                              experienceLevel === "advanced" &&
                                "bg-purple-100 text-purple-800"
                            )}
                          >
                            {experienceLevel === "beginner" ? "beg" :
                             experienceLevel === "intermediate" ? "int" :
                             experienceLevel === "advanced" ? "adv" :
                             experienceLevel === "junior" ? "jr" :
                             experienceLevel === "senior" ? "sr" :
                             experienceLevel === "lead" ? "lead" :
                             experienceLevel === "student" ? "stu" :
                             experienceLevel === "mid" ? "mid" : experienceLevel}
                          </span>
                        </td>
                        <td className="px-2 py-1">
                          <div
                            className="text-gray-500 truncate max-w-[80px]"
                            title={interest === "single_agents" ? "Agentes individuales" :
                                    interest === "multi_agents" ? "Multi-agentes" :
                                    interest === "workflows" ? "Workflows" :
                                    interest === "all" ? "Todo" : interest}
                          >
                            {interest === "single_agents" ? "Individual" :
                             interest === "multi_agents" ? "Multi" :
                             interest === "workflows" ? "Workflow" :
                             interest === "all" ? "Todo" : interest}
                          </div>
                        </td>
                        <td className="px-2 py-1">
                          <div
                            className="text-gray-500 truncate max-w-[60px]"
                            title={context}
                          >
                            {context.substring(0, 15)}
                          </div>
                        </td>
                        <td className="px-2 py-1">
                          <div
                            className="text-gray-500 truncate max-w-[50px]"
                            title={webinarData?.webinarType || "-"}
                          >
                            {webinarData?.webinarType?.includes("llamaindex") ? "llama" :
                             webinarData?.webinarType?.includes("claude") ? "claude" :
                             webinarData?.webinarType?.includes("gemini") ? "gemini" :
                             webinarData?.webinarType?.substring(0, 8) || "-"}
                          </div>
                        </td>
                        {activeTab === "purchased" && (
                          <td className="px-2 py-1">
                            <div className="text-gray-500">
                              {workshopData?.selectedModules ? (
                                <div className="space-y-0.5">
                                  {JSON.parse(
                                    workshopData.selectedModules as any
                                  )
                                    .slice(0, 1)
                                    .map((mod: any, idx: number) => (
                                      <div
                                        key={idx}
                                        className="bg-gray-100 rounded px-1 truncate"
                                        title={mod.title}
                                      >
                                        {mod.title.substring(0, 15)}
                                      </div>
                                    ))}
                                  {JSON.parse(
                                    workshopData.selectedModules as any
                                  ).length > 1 && (
                                    <span className="text-[10px] text-gray-400">
                                      +{JSON.parse(
                                        workshopData.selectedModules as any
                                      ).length - 1}
                                    </span>
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
                  "Interés",
                  "Objetivo",
                  "Tipo Webinar",
                  "Fecha",
                ],
                ...data.map((user) => {
                  const webinarData = user.webinar as any;
                  const userTags = Array.isArray(user.tags) ? user.tags : [];

                  const experienceLevel = webinarData?.experienceLevel ||
                    userTags
                      .find((t) => t.startsWith("level-") || t.startsWith("experience-"))
                      ?.replace("level-", "")
                      .replace("experience-", "") ||
                    "";

                  const interest = userTags
                    .find((t) => t.startsWith("interest-"))
                    ?.replace("interest-", "") ||
                    "";

                  const context = webinarData?.contextObjective ||
                    userTags
                      .find((t) => t.startsWith("context-"))
                      ?.replace("context-", "") ||
                    "";

                  return [
                    user.displayName || "Sin nombre",
                    user.email,
                    webinarData?.registeredAt
                      ? new Date(webinarData.registeredAt).toLocaleDateString(
                          "es-MX",
                          {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        ).replace(/\s/g, '-').replace(/,/g, '')
                      : "",
                    user.phoneNumber || "",
                    experienceLevel,
                    interest,
                    context,
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
