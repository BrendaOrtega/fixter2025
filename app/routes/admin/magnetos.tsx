import { useState, useRef, useCallback, useMemo } from "react";
import { ModernEditor } from "~/components/blog/ModernEditor";
import {
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  data,
} from "react-router";
import type { Route } from "./+types/magnetos";
import { useFetcher, useRevalidator } from "react-router";
import { getAdminOrRedirect } from "~/.server/dbGetters";
import { db } from "~/.server/db";
import { getLeadMagnetUploadUrl } from "~/.server/services/s3-leadmagnet";
import { tiptapToMarkdown } from "~/.server/utils/tiptap-to-markdown";
import { AdminNav } from "~/components/admin/AdminNav";
import { cn } from "~/utils/cn";
import {
  FaEdit,
  FaTrash,
  FaPlus,
  FaEye,
  FaDownload,
  FaUpload,
  FaCheck,
  FaTimes,
  FaLink,
} from "react-icons/fa";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await getAdminOrRedirect(request);

  const leadMagnets = await db.leadMagnet.findMany({
    include: {
      _count: {
        select: {
          downloads: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get sequences for dropdown
  const sequences = await db.sequence.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const stats = {
    totalMagnets: leadMagnets.length,
    activeMagnets: leadMagnets.filter((m) => m.isActive).length,
    totalDownloads: leadMagnets.reduce((acc, m) => acc + m.downloadCount, 0),
  };

  return { leadMagnets, sequences, stats };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await getAdminOrRedirect(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "create_magnet") {
    const type = (formData.get("type") as string) || "download";
    const eventDateStr = formData.get("eventDate") as string;
    const descriptionContentStr = formData.get("descriptionContent") as string;
    const descriptionContentParsed = descriptionContentStr ? JSON.parse(descriptionContentStr) : null;

    const magnetData = {
      slug: formData.get("slug") as string,
      title: formData.get("title") as string,
      description: descriptionContentParsed ? tiptapToMarkdown(descriptionContentParsed) : null,
      descriptionContent: descriptionContentParsed,
      type,
      s3Key: (formData.get("s3Key") as string) || null,
      fileName: (formData.get("fileName") as string) || null,
      fileType: (formData.get("fileType") as string) || null,
      eventName: (formData.get("eventName") as string) || null,
      eventDate: eventDateStr ? new Date(eventDateStr) : null,
      eventTime: (formData.get("eventTime") as string) || null,
      eventLink: (formData.get("eventLink") as string) || null,
      eventDescription: (formData.get("eventDescription") as string) || null,
      heroTitle: formData.get("heroTitle") as string,
      heroSubtitle: (formData.get("heroSubtitle") as string) || null,
      coverImage: (formData.get("coverImage") as string) || null,
      primaryColor: (formData.get("primaryColor") as string) || "#CA9B77",
      secondaryColor: (formData.get("secondaryColor") as string) || "#845A8F",
      bgPattern: (formData.get("bgPattern") as string) || "gradient",
      layout: (formData.get("layout") as string) || "centered",
      ctaText: (formData.get("ctaText") as string) || (type === "waitlist" ? "Reservar mi lugar" : "Descargar ahora"),
      inputPlaceholder: (formData.get("inputPlaceholder") as string) || "tu@email.com",
      successTitle: (formData.get("successTitle") as string) || "¡Listo!",
      successMessage: (formData.get("successMessage") as string) || (type === "waitlist" ? "Te enviamos los detalles por email" : "Revisa tu email para descargar"),
      showFooter: formData.get("showFooter") === "on",
      footerText: (formData.get("footerText") as string) || null,
      tagOnDownload: formData.get("tagOnDownload") as string,
      sequenceId: (formData.get("sequenceId") as string) || null,
      urlExpirationHours: parseInt(formData.get("urlExpirationHours") as string) || 24,
      isActive: formData.get("isActive") === "on",
    };

    // Validate required fields (s3Key only required for download type)
    if (!magnetData.slug || !magnetData.title || !magnetData.tagOnDownload) {
      return data({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    if (type === "download" && !magnetData.s3Key) {
      return data({ error: "Falta el archivo para tipo descarga" }, { status: 400 });
    }

    // Check slug uniqueness
    const existing = await db.leadMagnet.findUnique({
      where: { slug: magnetData.slug },
    });

    if (existing) {
      return data({ error: "Ya existe un magneto con ese slug" }, { status: 400 });
    }

    await db.leadMagnet.create({ data: magnetData });
    return data({ success: true, message: "Lead Magnet creado" });
  }

  if (intent === "update_magnet") {
    const id = formData.get("id") as string;
    const type = (formData.get("type") as string) || "download";
    const eventDateStr = formData.get("eventDate") as string;
    const descriptionContentStr = formData.get("descriptionContent") as string;
    const descriptionContentParsed = descriptionContentStr ? JSON.parse(descriptionContentStr) : null;

    const magnetData = {
      slug: formData.get("slug") as string,
      title: formData.get("title") as string,
      description: descriptionContentParsed ? tiptapToMarkdown(descriptionContentParsed) : null,
      descriptionContent: descriptionContentParsed,
      type,
      s3Key: (formData.get("s3Key") as string) || null,
      fileName: (formData.get("fileName") as string) || null,
      fileType: (formData.get("fileType") as string) || null,
      eventName: (formData.get("eventName") as string) || null,
      eventDate: eventDateStr ? new Date(eventDateStr) : null,
      eventTime: (formData.get("eventTime") as string) || null,
      eventLink: (formData.get("eventLink") as string) || null,
      eventDescription: (formData.get("eventDescription") as string) || null,
      heroTitle: formData.get("heroTitle") as string,
      heroSubtitle: (formData.get("heroSubtitle") as string) || null,
      coverImage: (formData.get("coverImage") as string) || null,
      primaryColor: (formData.get("primaryColor") as string) || "#CA9B77",
      secondaryColor: (formData.get("secondaryColor") as string) || "#845A8F",
      bgPattern: (formData.get("bgPattern") as string) || "gradient",
      layout: (formData.get("layout") as string) || "centered",
      ctaText: (formData.get("ctaText") as string) || (type === "waitlist" ? "Reservar mi lugar" : "Descargar ahora"),
      inputPlaceholder: (formData.get("inputPlaceholder") as string) || "tu@email.com",
      successTitle: (formData.get("successTitle") as string) || "¡Listo!",
      successMessage: (formData.get("successMessage") as string) || (type === "waitlist" ? "Te enviamos los detalles por email" : "Revisa tu email para descargar"),
      showFooter: formData.get("showFooter") === "on",
      footerText: (formData.get("footerText") as string) || null,
      tagOnDownload: formData.get("tagOnDownload") as string,
      sequenceId: (formData.get("sequenceId") as string) || null,
      urlExpirationHours: parseInt(formData.get("urlExpirationHours") as string) || 24,
      isActive: formData.get("isActive") === "on",
    };

    await db.leadMagnet.update({
      where: { id },
      data: magnetData,
    });

    return data({ success: true, message: "Lead Magnet actualizado" });
  }

  if (intent === "toggle_active") {
    const id = formData.get("id") as string;
    const magnet = await db.leadMagnet.findUnique({ where: { id } });

    await db.leadMagnet.update({
      where: { id },
      data: { isActive: !magnet?.isActive },
    });

    return data({
      success: true,
      message: magnet?.isActive ? "Magneto desactivado" : "Magneto activado",
    });
  }

  if (intent === "delete_magnet") {
    const id = formData.get("id") as string;

    await db.leadMagnetDownload.deleteMany({ where: { leadMagnetId: id } });
    await db.leadMagnet.delete({ where: { id } });

    return data({ success: true, message: "Lead Magnet eliminado" });
  }

  if (intent === "get_upload_url") {
    const slug = formData.get("slug") as string;
    const fileName = formData.get("fileName") as string;
    const contentType = formData.get("contentType") as string;

    if (!slug || !fileName) {
      return data({ error: "Faltan slug o fileName" }, { status: 400 });
    }

    try {
      const result = await getLeadMagnetUploadUrl(slug, fileName, contentType);
      return data({ uploadUrl: result.uploadUrl, s3Key: result.s3Key });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      return data({ error: "Error generando URL de upload" }, { status: 500 });
    }
  }

  return data({ error: "Intent no reconocido" }, { status: 400 });
};

export default function AdminMagnetos({ loaderData }: Route.ComponentProps) {
  const { leadMagnets, sequences, stats } = loaderData;
  const [view, setView] = useState<"list" | "create" | "edit">("list");
  const [editingMagnet, setEditingMagnet] = useState<any>(null);
  const fetcher = useFetcher();
  const revalidator = useRevalidator();

  return (
    <div className="min-h-screen bg-gray-900">
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Lead Magnets</h1>
          <p className="text-gray-400">
            Gestiona recursos descargables para captura de leads
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard title="Total Magnetos" value={stats.totalMagnets} />
          <StatCard title="Activos" value={stats.activeMagnets} />
          <StatCard title="Descargas Totales" value={stats.totalDownloads} />
        </div>

        {/* View Navigation */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => {
              setView("list");
              setEditingMagnet(null);
            }}
            className={cn(
              "px-4 py-2 rounded-lg font-medium transition-colors",
              view === "list"
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            )}
          >
            📋 Lista
          </button>
          <button
            onClick={() => {
              setView("create");
              setEditingMagnet(null);
            }}
            className={cn(
              "px-4 py-2 rounded-lg font-medium transition-colors",
              view === "create"
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            )}
          >
            ➕ Crear Nuevo
          </button>
          {editingMagnet && (
            <button
              onClick={() => setView("edit")}
              className={cn(
                "px-4 py-2 rounded-lg font-medium transition-colors",
                view === "edit"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              )}
            >
              ✏️ Editando: {editingMagnet.title}
            </button>
          )}
        </div>

        {/* Content */}
        {view === "list" && (
          <MagnetsList
            magnets={leadMagnets}
            fetcher={fetcher}
            onEdit={(magnet) => {
              setEditingMagnet(magnet);
              setView("edit");
            }}
          />
        )}

        {view === "create" && (
          <MagnetForm
            sequences={sequences}
            fetcher={fetcher}
            revalidator={revalidator}
            onSuccess={() => setView("list")}
          />
        )}

        {view === "edit" && editingMagnet && (
          <MagnetForm
            magnet={editingMagnet}
            sequences={sequences}
            fetcher={fetcher}
            revalidator={revalidator}
            onSuccess={() => {
              setView("list");
              setEditingMagnet(null);
            }}
          />
        )}

        {/* Success/Error Messages */}
        {fetcher.data?.success && (
          <div className="fixed bottom-4 right-4 bg-green-600 text-white p-4 rounded-lg shadow-lg">
            ✅ {fetcher.data.message}
          </div>
        )}

        {fetcher.data?.error && (
          <div className="fixed bottom-4 right-4 bg-red-600 text-white p-4 rounded-lg shadow-lg">
            ❌ {fetcher.data.error}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
      <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function MagnetsList({
  magnets,
  fetcher,
  onEdit,
}: {
  magnets: any[];
  fetcher: any;
  onEdit: (magnet: any) => void;
}) {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Lead Magnet
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Descargas
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Tag
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {magnets.map((magnet) => (
              <tr key={magnet.id} className="hover:bg-gray-700">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {magnet.coverImage && (
                      <img
                        src={magnet.coverImage}
                        alt={magnet.title}
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium">{magnet.title}</p>
                        <span className={cn(
                          "px-1.5 py-0.5 text-[10px] font-medium rounded",
                          magnet.type === "waitlist"
                            ? "bg-purple-900 text-purple-300"
                            : "bg-blue-900 text-blue-300"
                        )}>
                          {magnet.type === "waitlist" ? "📋 Waitlist" : "📥 Download"}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm">/descarga/{magnet.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={cn(
                      "px-2 py-1 text-xs font-medium rounded-full",
                      magnet.isActive
                        ? "bg-green-900 text-green-300"
                        : "bg-red-900 text-red-300"
                    )}
                  >
                    {magnet.isActive ? "🟢 Activo" : "🔴 Inactivo"}
                  </span>
                </td>
                <td className="px-6 py-4 text-white">
                  {magnet.downloadCount}
                  <span className="text-gray-500 text-xs ml-1">
                    {magnet.type === "waitlist" ? "registros" : "descargas"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <code className="text-blue-300 text-sm bg-blue-900/30 px-2 py-1 rounded">
                    {magnet.tagOnDownload}
                  </code>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <a
                      href={`/descarga/${magnet.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 text-green-400 hover:bg-gray-600 rounded transition-colors"
                      title="Ver landing"
                    >
                      <FaEye />
                    </a>
                    <button
                      onClick={() =>
                        navigator.clipboard.writeText(
                          `https://www.fixtergeek.com/descarga/${magnet.slug}`
                        )
                      }
                      className="p-2 text-blue-400 hover:bg-gray-600 rounded transition-colors"
                      title="Copiar URL"
                    >
                      <FaLink />
                    </button>
                    <fetcher.Form method="post" className="inline">
                      <input type="hidden" name="intent" value="toggle_active" />
                      <input type="hidden" name="id" value={magnet.id} />
                      <button
                        type="submit"
                        className={cn(
                          "p-2 rounded hover:bg-gray-600 transition-colors",
                          magnet.isActive ? "text-yellow-400" : "text-green-400"
                        )}
                        title={magnet.isActive ? "Desactivar" : "Activar"}
                      >
                        {magnet.isActive ? <FaTimes /> : <FaCheck />}
                      </button>
                    </fetcher.Form>
                    <button
                      onClick={() => onEdit(magnet)}
                      className="p-2 text-blue-400 hover:bg-gray-600 rounded transition-colors"
                      title="Editar"
                    >
                      <FaEdit />
                    </button>
                    <fetcher.Form method="post" className="inline">
                      <input type="hidden" name="intent" value="delete_magnet" />
                      <input type="hidden" name="id" value={magnet.id} />
                      <button
                        type="submit"
                        className="p-2 text-red-400 hover:bg-gray-600 rounded transition-colors"
                        title="Eliminar"
                        onClick={(e) => {
                          if (!confirm("¿Eliminar este lead magnet?")) {
                            e.preventDefault();
                          }
                        }}
                      >
                        <FaTrash />
                      </button>
                    </fetcher.Form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {magnets.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No hay lead magnets creados aún</p>
        </div>
      )}
    </div>
  );
}

function MagnetForm({
  magnet,
  sequences,
  fetcher,
  revalidator,
  onSuccess,
}: {
  magnet?: any;
  sequences: any[];
  fetcher: any;
  revalidator: any;
  onSuccess: () => void;
}) {
  const [magnetType, setMagnetType] = useState(magnet?.type || "download");
  const [s3Key, setS3Key] = useState(magnet?.s3Key || "");
  const [fileName, setFileName] = useState(magnet?.fileName || "");
  const [fileType, setFileType] = useState(magnet?.fileType || "");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [descriptionContent, setDescriptionContent] = useState<Record<string, any> | null>(
    magnet?.descriptionContent || null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!magnet;
  const isWaitlist = magnetType === "waitlist";

  // AI Command handler
  const handleAICommand = useCallback(
    async (command: string, text: string): Promise<string> => {
      const prompts: Record<string, string> = {
        continue: `Continúa escribiendo este texto de manera natural y coherente. Mantén el mismo tono y estilo:\n\n${text}\n\nContinuación:`,
        improve: `Mejora este texto sin cambiar el significado. Enfócate en claridad, tono profesional y fluidez:\n\n${text}`,
        expand: `Expande este párrafo con más detalles, ejemplos prácticos y contexto:\n\n${text}`,
        shorten: `Condensa este texto manteniendo la idea principal. Sé conciso:\n\n${text}`,
      };

      const response = await fetch("/api/ai.text-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command,
          text,
          prompt: prompts[command] || text,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const { result } = await response.json();
      return result;
    },
    []
  );

  // Handle file upload
  const handleFileUpload = useCallback(
    async (file: File, slug: string) => {
      if (!slug) {
        setUploadError("Primero ingresa el slug del magneto");
        return;
      }

      setUploadError(null);
      setUploadProgress(0);

      // Get presigned URL
      const formData = new FormData();
      formData.append("intent", "get_upload_url");
      formData.append("slug", slug);
      formData.append("fileName", file.name);
      formData.append("contentType", file.type);

      try {
        const response = await fetch("/admin/magnetos", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (result.error) {
          setUploadError(result.error);
          setUploadProgress(null);
          return;
        }

        // Upload to S3 with presigned URL
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", result.uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            setS3Key(result.s3Key);
            setFileName(file.name);
            setFileType(file.name.split(".").pop() || "");
            setUploadProgress(null);
          } else {
            setUploadError("Error subiendo archivo");
            setUploadProgress(null);
          }
        };

        xhr.onerror = () => {
          setUploadError("Error de conexión");
          setUploadProgress(null);
        };

        xhr.send(file);
      } catch (error) {
        setUploadError("Error inesperado");
        setUploadProgress(null);
      }
    },
    []
  );

  // Handle drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) {
        const slugInput = document.querySelector(
          'input[name="slug"]'
        ) as HTMLInputElement;
        handleFileUpload(file, slugInput?.value || "");
      }
    },
    [handleFileUpload]
  );

  if (fetcher.data?.success) {
    setTimeout(() => {
      onSuccess();
      revalidator.revalidate();
    }, 500);
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <h2 className="text-xl font-bold text-white mb-6">
        {isEditing ? "✏️ Editar Lead Magnet" : "➕ Crear Lead Magnet"}
      </h2>

      <fetcher.Form method="post" className="space-y-6">
        <input
          type="hidden"
          name="intent"
          value={isEditing ? "update_magnet" : "create_magnet"}
        />
        {isEditing && <input type="hidden" name="id" value={magnet.id} />}
        <input type="hidden" name="type" value={magnetType} />
        <input type="hidden" name="s3Key" value={s3Key} />
        <input type="hidden" name="fileName" value={fileName} />
        <input type="hidden" name="fileType" value={fileType} />

        {/* Type Selector */}
        <div className="flex gap-4 p-4 bg-gray-900 rounded-lg">
          <button
            type="button"
            onClick={() => setMagnetType("download")}
            className={cn(
              "flex-1 py-3 px-4 rounded-lg font-medium transition-all",
              magnetType === "download"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            )}
          >
            📥 Descarga (PDF/EPUB)
          </button>
          <button
            type="button"
            onClick={() => setMagnetType("waitlist")}
            className={cn(
              "flex-1 py-3 px-4 rounded-lg font-medium transition-all",
              magnetType === "waitlist"
                ? "bg-green-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            )}
          >
            📋 Lista de Espera (Taller/Webinar)
          </button>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Slug (URL) *
            </label>
            <input
              type="text"
              name="slug"
              required
              defaultValue={magnet?.slug}
              pattern="[a-z0-9-]+"
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              placeholder="guia-claude-code"
            />
            <p className="text-xs text-gray-400 mt-1">
              Solo letras minúsculas, números y guiones
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Título *
            </label>
            <input
              type="text"
              name="title"
              required
              defaultValue={magnet?.title}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              placeholder="Guía Completa de Claude Code"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Descripción
          </label>
          <input
            type="hidden"
            name="descriptionContent"
            value={descriptionContent ? JSON.stringify(descriptionContent) : ""}
          />
          <div className="rounded-lg overflow-hidden border border-gray-600 bg-white p-4">
            <ModernEditor
              content={descriptionContent || undefined}
              onChange={setDescriptionContent}
              onAICommand={handleAICommand}
            />
          </div>
        </div>

        {/* Event Info (for waitlist) */}
        {isWaitlist && (
          <div className="border border-green-700 bg-green-900/20 rounded-lg p-6">
            <h3 className="text-lg font-medium text-green-300 mb-4">
              📅 Información del Evento
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre del Evento
                </label>
                <input
                  type="text"
                  name="eventName"
                  defaultValue={magnet?.eventName || ""}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500"
                  placeholder="Taller: Monta tu MoltBot"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Fecha
                </label>
                <input
                  type="date"
                  name="eventDate"
                  defaultValue={magnet?.eventDate ? new Date(magnet.eventDate).toISOString().split('T')[0] : ""}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Hora
                </label>
                <input
                  type="text"
                  name="eventTime"
                  defaultValue={magnet?.eventTime || ""}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500"
                  placeholder="7:00 PM CDMX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Link de Videollamada
                </label>
                <input
                  type="url"
                  name="eventLink"
                  defaultValue={magnet?.eventLink || ""}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500"
                  placeholder="https://meet.google.com/..."
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Descripción del Evento
                </label>
                <textarea
                  name="eventDescription"
                  rows={2}
                  defaultValue={magnet?.eventDescription || ""}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500"
                  placeholder="Descripción breve de qué se verá en el evento..."
                />
              </div>
            </div>
          </div>
        )}

        {/* File Upload (only for download type) */}
        {!isWaitlist && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Archivo (PDF/EPUB) *
            </label>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center",
                uploadProgress !== null
                  ? "border-blue-500 bg-blue-900/20"
                  : s3Key
                  ? "border-green-500 bg-green-900/20"
                  : "border-gray-600 hover:border-gray-500"
              )}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              {uploadProgress !== null ? (
                <div>
                  <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-blue-300">Subiendo... {uploadProgress}%</p>
                </div>
              ) : s3Key ? (
                <div className="text-green-300">
                  <FaCheck className="w-8 h-8 mx-auto mb-2" />
                  <p className="font-medium">{fileName}</p>
                  <p className="text-sm text-gray-400">{s3Key}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setS3Key("");
                      setFileName("");
                      setFileType("");
                    }}
                    className="text-red-400 text-sm mt-2 hover:underline"
                  >
                    Cambiar archivo
                  </button>
                </div>
              ) : (
                <>
                  <FaUpload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-300">
                    Arrastra un archivo aquí o{" "}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-blue-400 hover:underline"
                    >
                      selecciona uno
                    </button>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PDF, EPUB o ZIP (máx 50MB)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.epub,.zip"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const slugInput = document.querySelector(
                          'input[name="slug"]'
                        ) as HTMLInputElement;
                        handleFileUpload(file, slugInput?.value || "");
                      }
                    }}
                  />
                </>
              )}
            </div>
            {uploadError && (
              <p className="text-red-400 text-sm mt-2">{uploadError}</p>
            )}
          </div>
        )}

        {/* Landing Page Config */}
        <div className="border-t border-gray-700 pt-6">
          <h3 className="text-lg font-medium text-white mb-4">
            Configuración de Landing
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Título Hero *
              </label>
              <input
                type="text"
                name="heroTitle"
                required
                defaultValue={magnet?.heroTitle}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                placeholder={isWaitlist ? "Reserva tu lugar en el taller" : "Descarga la guía definitiva"}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Subtítulo Hero
              </label>
              <input
                type="text"
                name="heroSubtitle"
                defaultValue={magnet?.heroSubtitle || ""}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                placeholder="Todo lo que necesitas saber..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                URL Imagen Cover
              </label>
              <input
                type="url"
                name="coverImage"
                defaultValue={magnet?.coverImage || ""}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Patrón de Fondo
              </label>
              <select
                name="bgPattern"
                defaultValue={magnet?.bgPattern || "gradient"}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="gradient">Gradiente</option>
                <option value="dots">Puntos</option>
                <option value="grid">Cuadrícula</option>
                <option value="none">Sin patrón</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Color Primario
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  name="primaryColor"
                  defaultValue={magnet?.primaryColor || "#CA9B77"}
                  className="w-12 h-10 bg-gray-900 border border-gray-600 rounded cursor-pointer"
                />
                <input
                  type="text"
                  defaultValue={magnet?.primaryColor || "#CA9B77"}
                  className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white"
                  readOnly
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Color Secundario
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  name="secondaryColor"
                  defaultValue={magnet?.secondaryColor || "#845A8F"}
                  className="w-12 h-10 bg-gray-900 border border-gray-600 rounded cursor-pointer"
                />
                <input
                  type="text"
                  defaultValue={magnet?.secondaryColor || "#845A8F"}
                  className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white"
                  readOnly
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Texto CTA
              </label>
              <input
                type="text"
                name="ctaText"
                defaultValue={magnet?.ctaText || (isWaitlist ? "Reservar mi lugar" : "Descargar ahora")}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Placeholder Email
              </label>
              <input
                type="text"
                name="inputPlaceholder"
                defaultValue={magnet?.inputPlaceholder || "tu@email.com"}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Título de Éxito
              </label>
              <input
                type="text"
                name="successTitle"
                defaultValue={magnet?.successTitle || "¡Listo!"}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Mensaje de Éxito
              </label>
              <input
                type="text"
                name="successMessage"
                defaultValue={
                  magnet?.successMessage || (isWaitlist ? "Te enviamos los detalles por email" : "Revisa tu email para descargar")
                }
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Behavior Config */}
        <div className="border-t border-gray-700 pt-6">
          <h3 className="text-lg font-medium text-white mb-4">
            Comportamiento
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tag al Descargar *
              </label>
              <input
                type="text"
                name="tagOnDownload"
                required
                defaultValue={magnet?.tagOnDownload}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                placeholder="leadmagnet-guia-claude"
              />
              <p className="text-xs text-gray-400 mt-1">
                Tag que se añade al suscriptor
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Sequence (opcional)
              </label>
              <select
                name="sequenceId"
                defaultValue={magnet?.sequenceId || ""}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sin sequence</option>
                {sequences.map((seq) => (
                  <option key={seq.id} value={seq.id}>
                    {seq.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Inscribe al suscriptor en esta sequence
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Expiración URL (horas)
              </label>
              <input
                type="number"
                name="urlExpirationHours"
                min="1"
                max="168"
                defaultValue={magnet?.urlExpirationHours || 24}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-4 pt-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={magnet?.isActive ?? true}
                  className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-gray-300">Activo</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="showFooter"
                  defaultChecked={magnet?.showFooter ?? true}
                  className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-gray-300">Mostrar Footer</span>
              </label>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4 pt-4">
          <button
            type="button"
            onClick={onSuccess}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={fetcher.state !== "idle" || (!isWaitlist && !s3Key)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {fetcher.state !== "idle"
              ? "Guardando..."
              : isEditing
              ? "💾 Actualizar"
              : "💾 Crear Lead Magnet"}
          </button>
        </div>
      </fetcher.Form>
    </div>
  );
}
