import { db } from "~/.server/db";
import type { Route } from "./+types/send";
import { useState, useEffect, useMemo } from "react";
import { useFetcher, useSearchParams } from "react-router";
import { cn } from "~/utils/cn";
import { AdminNav } from "~/components/admin/AdminNav";
import fs from "fs/promises";
import path from "path";
import { getSesTransport, getSesRemitent } from "~/utils/sendGridTransport";
import { getAdminOrRedirect } from "~/.server/dbGetters";

// Cargar templates disponibles
async function loadTemplates() {
  const templatesDir = path.join(process.cwd(), "app/mailSenders/templates");
  try {
    const files = await fs.readdir(templatesDir);
    const templates = files
      .filter((f) => f.endsWith(".ts"))
      .map((f) => f.replace(".ts", ""));
    return templates;
  } catch {
    return [];
  }
}

// Cargar contenido de un template
async function loadTemplateContent(templateName: string) {
  try {
    const templatePath = path.join(
      process.cwd(),
      "app/mailSenders/templates",
      `${templateName}.ts`
    );
    const content = await fs.readFile(templatePath, "utf-8");

    // Los templates son funciones, necesitamos extraer el HTML template
    // Buscar el template literal que está después del arrow function
    const templateMatch = content.match(/=>\s*`([\s\S]*?)`\s*;?\s*$/);
    if (templateMatch) {
      // Reemplazar variables con valores de ejemplo
      let html = templateMatch[1];
      html = html.replace(/\$\{[^}]+\}/g, (match) => {
        // Proveer valores de ejemplo para las variables
        if (match.includes("link")) return "https://fixtergeek.com";
        if (match.includes("webinarTitle")) return "Claude Workshop";
        if (match.includes("webinarDate")) return "Próximamente";
        return "ejemplo";
      });
      return html;
    }

    // Si no encontramos el patrón de arrow function, buscar return statement
    const returnMatch = content.match(/return\s+`([\s\S]*?)`/);
    if (returnMatch) {
      let html = returnMatch[1];
      html = html.replace(/\$\{[^}]+\}/g, "ejemplo");
      return html;
    }

    return "";
  } catch (error) {
    console.error("Error loading template:", error);
    return "";
  }
}

export const loader = async ({ request }: Route.LoaderArgs) => {
  await getAdminOrRedirect(request);

  const url = new URL(request.url);
  const tagsParam = url.searchParams.get("tags");
  const templateParam = url.searchParams.get("template");
  const subjectParam = url.searchParams.get("subject");
  const sourceParam = url.searchParams.get("source") || "users"; // default to users

  // Parsear tags desde URL
  const selectedTags = tagsParam ? tagsParam.split(",") : [];

  // Obtener todos los tags únicos según el modelo seleccionado
  const allTags = new Map<string, number>(); // tag -> count
  let filteredRecipients: any[] = [];
  let allRecords: any[] = []; // Para contar tags

  if (sourceParam === "users" || sourceParam === "all") {
    const allUsers = await db.user.findMany({
      select: { tags: true, email: true, displayName: true },
    });

    // Guardar todos los usuarios para conteo
    allRecords = [
      ...allRecords,
      ...allUsers.map((u) => ({ ...u, source: "user" })),
    ];

    // Contar tags
    allUsers.forEach((user) => {
      user.tags.forEach((tag) => {
        allTags.set(tag, (allTags.get(tag) || 0) + 1);
      });
    });

    // Filtrar usuarios según tags - solo si hay tags seleccionados
    if (selectedTags.length > 0) {
      filteredRecipients = allUsers
        .filter((user) => user.tags.some((tag) => selectedTags.includes(tag)))
        .map((u) => ({ ...u, source: "user" }));
    }
  }

  if (sourceParam === "subscribers" || sourceParam === "all") {
    const allSubscribers = await db.subscriber.findMany({
      select: { tags: true, email: true, name: true },
    });

    // Guardar todos los subscribers para conteo
    const subscribersForCount = allSubscribers.map((s) => ({
      email: s.email,
      displayName: s.name,
      tags: s.tags,
      source: "subscriber",
    }));
    allRecords = [...allRecords, ...subscribersForCount];

    // Si es solo subscribers, limpiar tags primero
    if (sourceParam === "subscribers") {
      allTags.clear();
    }

    // Contar tags de subscribers
    allSubscribers.forEach((sub) => {
      sub.tags.forEach((tag) => {
        allTags.set(tag, (allTags.get(tag) || 0) + 1);
      });
    });

    // Filtrar subscribers según tags - solo si hay tags seleccionados
    const subscriberRecipients =
      selectedTags.length > 0
        ? allSubscribers
            .filter((sub) => sub.tags.some((tag) => selectedTags.includes(tag)))
            .map((s) => ({
              email: s.email,
              displayName: s.name,
              tags: s.tags,
              source: "subscriber",
            }))
        : [];

    if (sourceParam === "all") {
      // Combinar y eliminar duplicados por email
      const emailMap = new Map();
      [...filteredRecipients, ...subscriberRecipients].forEach((r) => {
        if (!emailMap.has(r.email)) {
          emailMap.set(r.email, r);
        }
      });
      filteredRecipients = Array.from(emailMap.values());
    } else if (sourceParam === "subscribers") {
      filteredRecipients = subscriberRecipients;
    }
  }

  // Cargar templates disponibles
  const availableTemplates = await loadTemplates();

  // Cargar contenido del template si está especificado
  let templateContent = "";
  if (templateParam) {
    templateContent = await loadTemplateContent(templateParam);
  }

  // Obtener newsletters anteriores para métricas
  const newsletters = await db.newsletter.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      content: true,
      sent: true,
      delivered: true,
      opened: true,
      clicked: true,
      recipients: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return {
    users: filteredRecipients,
    allTags: Array.from(allTags.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([tag, count]) => ({ tag, count })),
    selectedTags,
    availableTemplates,
    selectedTemplate: templateParam,
    templateContent,
    subject: subjectParam || "",
    newsletters,
    source: sourceParam,
  };
};

export const action = async ({ request }: Route.ActionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent");

  switch (intent) {
    case "preview_template": {
      const templateName = formData.get("templateName") as string;
      const content = await loadTemplateContent(templateName);
      return { templateContent: content };
    }

    case "delete_newsletter": {
      try {
        const newsletterId = formData.get("newsletterId") as string;
        await db.newsletter.delete({
          where: { id: newsletterId },
        });
        return { success: true, deleted: true };
      } catch (error) {
        console.error("Error deleting newsletter:", error);
        return { error: "Error al eliminar" };
      }
    }

    case "load_draft": {
      try {
        const newsletterId = formData.get("newsletterId") as string;
        const newsletter = await db.newsletter.findUnique({
          where: { id: newsletterId },
          select: {
            title: true,
            content: true,
            recipients: true,
          },
        });

        if (!newsletter) {
          return { error: "Borrador no encontrado" };
        }

        return {
          success: true,
          loadedDraft: {
            subject: newsletter.title,
            htmlContent: newsletter.content || "",
            recipients: newsletter.recipients.join(", "),
          },
        };
      } catch (error) {
        console.error("Error loading draft:", error);
        return { error: "Error al cargar borrador" };
      }
    }

    case "save_draft": {
      const subject = formData.get("subject") as string;
      const htmlContent = formData.get("htmlContent") as string;
      const recipients = formData.get("recipients") as string;

      const recipientsList = recipients
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);

      // Guardar como borrador en Newsletter
      const newsletter = await db.newsletter.create({
        data: {
          slug: `draft-${Date.now()}`,
          title: subject,
          status: "DRAFT",
          content: htmlContent,
          recipients: recipientsList,
        },
      });

      return { success: true, newsletterId: newsletter.id };
    }

    case "simulate_send": {
      try {
        const subject = formData.get("subject") as string;
        const htmlContent = formData.get("htmlContent") as string;
        const recipients = formData.get("recipients") as string;

        if (!subject || !htmlContent || !recipients) {
          return { error: "Faltan campos requeridos" };
        }

        const recipientsList = recipients
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean);

        if (recipientsList.length === 0) {
          return { error: "No hay destinatarios" };
        }

        // Simular envío (guardar como SENT)
        const newsletter = await db.newsletter.create({
          data: {
            slug: `sent-${Date.now()}`,
            title: subject,
            status: "SENT",
            content: htmlContent,
            recipients: recipientsList,
            sent: new Date(),
            // Simular métricas
            delivered: recipientsList.slice(
              0,
              Math.floor(recipientsList.length * 0.95)
            ),
            opened: recipientsList.slice(
              0,
              Math.floor(recipientsList.length * 0.35)
            ),
            clicked: recipientsList.slice(
              0,
              Math.floor(recipientsList.length * 0.15)
            ),
          },
        });

        return { success: true, simulated: true, newsletterId: newsletter.id };
      } catch (error) {
        console.error("Error simulating send:", error);
        return {
          error:
            error instanceof Error ? error.message : "Error al simular envío",
        };
      }
    }

    case "send_real": {
      try {
        const subject = formData.get("subject") as string;
        const htmlContent = formData.get("htmlContent") as string;
        const recipients = formData.get("recipients") as string;

        if (!subject || !htmlContent || !recipients) {
          return { error: "Faltan campos requeridos" };
        }

        const recipientsList = recipients
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean);

        if (recipientsList.length === 0) {
          return { error: "No hay destinatarios" };
        }

        // Crear newsletter primero
        const newsletter = await db.newsletter.create({
          data: {
            slug: `real-${Date.now()}`,
            title: subject,
            status: "SENT",
            content: htmlContent,
            recipients: recipientsList,
            sent: new Date(),
            delivered: [],
            opened: [],
            clicked: [],
          },
        });

        // Añadir pixel de tracking de SES al HTML
        // SES reemplazará {{ses:openTracker}} con el pixel de tracking automáticamente
        let finalHtmlContent = htmlContent;
        if (!htmlContent.includes("{{ses:openTracker}}")) {
          // Añadir el pixel de tracking al principio del body para evitar truncamiento
          // Algunos clientes de email truncan el final del mensaje
          if (htmlContent.includes("<body")) {
            finalHtmlContent = htmlContent.replace(
              /<body[^>]*>/i,
              "$&\n{{ses:openTracker}}"
            );
          } else {
            // Si no hay tag body, añadir al principio
            finalHtmlContent = "{{ses:openTracker}}\n" + htmlContent;
          }
          console.log("📍 Added SES open tracking pixel to email");
        }

        // Enviar correos realmente
        const transporter = getSesTransport();
        const from = getSesRemitent();

        // Configuration Set desde variable de entorno (opcional)
        const configurationSet = process.env.SES_CONFIGURATION_SET;
        console.log("📧 SES Configuration Set:", configurationSet || "none");

        // Enviar en lotes de 50 para evitar límites de SES
        const batchSize = 50;
        const results = [];

        for (let i = 0; i < recipientsList.length; i += batchSize) {
          const batch = recipientsList.slice(i, i + batchSize);

          try {
            const result = await transporter.sendMail({
              from,
              subject,
              bcc: batch, // Usar BCC para proteger privacidad
              html: finalHtmlContent,
              // Headers para SES Configuration Set y tracking
              headers: configurationSet ? {
                "X-SES-CONFIGURATION-SET": configurationSet,
                "X-SES-MESSAGE-TAGS": `newsletter_id=${newsletter.id}`,
              } : {
                "X-SES-MESSAGE-TAGS": `newsletter_id=${newsletter.id}`,
              },
            });

            results.push({ success: true, batch, messageId: result.messageId });

            // Actualizar newsletter con emails enviados
            await db.newsletter.update({
              where: { id: newsletter.id },
              data: {
                delivered: {
                  push: batch,
                },
                messageIds: {
                  push: result.messageId || "",
                },
              },
            });
          } catch (error) {
            console.error(`Error sending batch ${i}:`, error);
            results.push({ success: false, batch, error: error.message });
          }

          // Esperar 1 segundo entre lotes para evitar rate limiting
          if (i + batchSize < recipientsList.length) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        const successCount = results
          .filter((r) => r.success)
          .reduce((acc, r) => acc + r.batch.length, 0);
        const failCount = recipientsList.length - successCount;

        return {
          success: true,
          real: true,
          newsletterId: newsletter.id,
          stats: {
            total: recipientsList.length,
            sent: successCount,
            failed: failCount,
          },
        };
      } catch (error) {
        console.error("Error sending real emails:", error);
        return {
          error:
            error instanceof Error ? error.message : "Error al enviar correos",
        };
      }
    }

    default:
      return { error: "Invalid intent" };
  }
};

export default function AdminSend({ loaderData }: Route.ComponentProps) {
  const {
    users,
    allTags,
    selectedTags,
    availableTemplates,
    selectedTemplate,
    templateContent: initialTemplateContent,
    subject: initialSubject,
    newsletters,
    source,
  } = loaderData;

  const fetcher = useFetcher();
  const [searchParams, setSearchParams] = useSearchParams();

  const [htmlContent, setHtmlContent] = useState(initialTemplateContent || "");
  const [subject, setSubject] = useState(initialSubject);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [manualEmails, setManualEmails] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  // Actualizar contenido cuando cambie el template inicial (desde loader)
  useEffect(() => {
    setHtmlContent(initialTemplateContent || "");
  }, [initialTemplateContent]);

  useEffect(() => {
    setSubject(initialSubject);
  }, [initialSubject]);

  // Actualizar emails seleccionados basado en filtros
  useEffect(() => {
    setSelectedEmails(users.map((u) => u.email));
  }, [users]);

  // Combinar emails filtrados y manuales
  const allEmails = useMemo(() => {
    const manualList = manualEmails
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    return [...new Set([...selectedEmails, ...manualList])];
  }, [selectedEmails, manualEmails]);

  const handleTagChange = (tag: string, checked: boolean) => {
    const newTags = checked
      ? [...selectedTags, tag]
      : selectedTags.filter((t) => t !== tag);

    if (newTags.length > 0) {
      searchParams.set("tags", newTags.join(","));
    } else {
      searchParams.delete("tags");
    }
    setSearchParams(searchParams);
  };

  const handleTemplateSelect = (templateName: string) => {
    // Solo actualizar URL si es diferente
    if (selectedTemplate !== templateName) {
      searchParams.set("template", templateName);
      setSearchParams(searchParams);
    }
  };

  const handleSourceChange = (newSource: string) => {
    searchParams.set("source", newSource);
    // Limpiar tags al cambiar de fuente
    searchParams.delete("tags");
    setSearchParams(searchParams);
  };

  // Manejar respuestas del fetcher
  useEffect(() => {
    if (fetcher.data?.loadedDraft) {
      setSubject(fetcher.data.loadedDraft.subject);
      setHtmlContent(fetcher.data.loadedDraft.htmlContent);
      setManualEmails(fetcher.data.loadedDraft.recipients);
    }
  }, [fetcher.data]);

  const handleExportCSV = () => {
    const csv = allEmails.join(",");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `emails-${Date.now()}.csv`;
    a.click();
  };

  const handleSaveDraft = () => {
    fetcher.submit(
      {
        intent: "save_draft",
        subject,
        htmlContent,
        recipients: allEmails.join(","),
      },
      { method: "post" }
    );
  };

  const handleSimulateSend = () => {
    console.log("Simulating send with:", {
      subject,
      htmlContent: htmlContent?.substring(0, 100),
      recipientsCount: allEmails.length,
    });

    fetcher.submit(
      {
        intent: "simulate_send",
        subject,
        htmlContent,
        recipients: allEmails.join(","),
      },
      { method: "post" }
    );
  };

  const handleRealSend = () => {
    const confirmMessage = `⚠️ ATENCIÓN: Estás a punto de enviar correos REALES a ${allEmails.length} destinatarios.\n\n¿Estás seguro de que quieres continuar?`;

    if (confirm(confirmMessage)) {
      const doubleCheck = confirm(
        `🔴 ÚLTIMA CONFIRMACIÓN:\n\nEnviar "${subject}" a ${allEmails.length} correos?\n\nEsta acción NO se puede deshacer.`
      );

      if (doubleCheck) {
        fetcher.submit(
          {
            intent: "send_real",
            subject,
            htmlContent,
            recipients: allEmails.join(","),
          },
          { method: "post" }
        );
      }
    }
  };

  const copyShareableUrl = () => {
    const url = new URL(window.location.href);
    navigator.clipboard.writeText(url.toString());
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <AdminNav />

      <div className="max-w-7xl mx-auto p-4 pt-20">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Envío de Correos</h1>
          <button
            onClick={copyShareableUrl}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm"
          >
            Copiar URL con filtros
          </button>
        </div>

        {/* Tabs para seleccionar modelo */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => handleSourceChange("users")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm transition-colors",
              source === "users"
                ? "bg-brand-600 text-white"
                : "bg-gray-800 hover:bg-gray-700 text-gray-300"
            )}
          >
            Users
          </button>
          <button
            onClick={() => handleSourceChange("subscribers")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm transition-colors",
              source === "subscribers"
                ? "bg-brand-600 text-white"
                : "bg-gray-800 hover:bg-gray-700 text-gray-300"
            )}
          >
            Subscribers
          </button>
          <button
            onClick={() => handleSourceChange("all")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm transition-colors",
              source === "all"
                ? "bg-brand-600 text-white"
                : "bg-gray-800 hover:bg-gray-700 text-gray-300"
            )}
          >
            Todos
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor de Template */}
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-3">Template HTML</h2>

              {/* Selector de templates */}
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">
                  Templates disponibles:
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableTemplates.map((template) => (
                    <button
                      key={template}
                      onClick={() => handleTemplateSelect(template)}
                      className={cn(
                        "px-3 py-1 rounded text-sm transition-colors",
                        selectedTemplate === template
                          ? "bg-brand-600 text-white"
                          : "bg-gray-800 hover:bg-gray-700 text-gray-300"
                      )}
                    >
                      {template}
                    </button>
                  ))}
                </div>
              </div>

              {/* Campo de asunto */}
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">
                  Asunto:
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 rounded-lg text-gray-100"
                  placeholder="Asunto del correo..."
                />
              </div>

              {/* Editor HTML */}
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">
                  Contenido HTML:
                </label>
                <textarea
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  className="w-full h-64 px-3 py-2 bg-gray-800 rounded-lg text-gray-100 font-mono text-sm"
                  placeholder="<div>Tu template HTML aquí...</div>"
                />
              </div>

              {/* Botones de acción */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm"
                >
                  {showPreview ? "Ocultar" : "Mostrar"} Preview
                </button>
              </div>

              {/* Preview */}
              {showPreview && htmlContent && (
                <div className="mt-4 p-4 bg-white rounded-lg overflow-auto max-h-96">
                  <div
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                    className="text-gray-900"
                    style={{ minHeight: "100px" }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Panel de Destinatarios */}
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-3">Destinatarios</h2>

              {/* Filtros por tags */}
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">
                  Filtrar por tags:
                </label>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {allTags.map(({ tag, count }) => (
                    <label key={tag} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedTags.includes(tag)}
                        onChange={(e) => handleTagChange(tag, e.target.checked)}
                        className="rounded bg-gray-800 border-gray-700"
                      />
                      <span className="text-sm">{tag}</span>
                      <span className="text-xs text-gray-500">({count})</span>
                      <span className="text-xs text-gray-400 ml-1">
                        {source === "users"
                          ? "users"
                          : source === "subscribers"
                          ? "subs"
                          : "total"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Lista de emails */}
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">
                  Emails filtrados ({selectedEmails.length}):
                </label>
                <textarea
                  value={selectedEmails.join(", ")}
                  readOnly
                  className="w-full h-32 px-3 py-2 bg-gray-800 rounded-lg text-gray-100 text-sm"
                />
              </div>

              {/* Emails manuales */}
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">
                  Agregar emails manualmente (separados por coma):
                </label>
                <textarea
                  value={manualEmails}
                  onChange={(e) => setManualEmails(e.target.value)}
                  className="w-full h-24 px-3 py-2 bg-gray-800 rounded-lg text-gray-100 text-sm"
                  placeholder="email1@ejemplo.com, email2@ejemplo.com"
                />
              </div>

              {/* Resumen */}
              <div className="p-3 bg-gray-800 rounded-lg mb-4 space-y-2">
                <p className="text-sm">
                  <span className="text-gray-400">Total destinatarios:</span>{" "}
                  <span className="text-brand-400 font-semibold text-lg">
                    {allEmails.length}
                  </span>
                </p>
                <div className="text-xs text-gray-500">
                  {selectedEmails.length > 0 && (
                    <p>
                      • {selectedEmails.length} desde{" "}
                      {source === "all" ? "filtros" : source}
                    </p>
                  )}
                  {manualEmails && (
                    <p>
                      • {manualEmails.split(",").filter((e) => e.trim()).length}{" "}
                      manuales
                    </p>
                  )}
                </div>

                {/* Checklist para envío */}
                <div className="pt-2 border-t border-gray-700 text-xs space-y-1">
                  <p className={subject ? "text-green-500" : "text-gray-500"}>
                    {subject ? "✓" : "○"} Asunto
                  </p>
                  <p
                    className={htmlContent ? "text-green-500" : "text-gray-500"}
                  >
                    {htmlContent ? "✓" : "○"} Contenido HTML
                  </p>
                  <p
                    className={
                      allEmails.length > 0 ? "text-green-500" : "text-gray-500"
                    }
                  >
                    {allEmails.length > 0 ? "✓" : "○"} Destinatarios (
                    {allEmails.length})
                  </p>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm"
                >
                  Exportar CSV
                </button>
                <button
                  onClick={handleSaveDraft}
                  disabled={fetcher.state !== "idle"}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm disabled:bg-gray-700 disabled:text-gray-400"
                >
                  Guardar Borrador
                </button>
                <button
                  onClick={handleSimulateSend}
                  disabled={
                    fetcher.state !== "idle" ||
                    !subject ||
                    !htmlContent ||
                    allEmails.length === 0
                  }
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm transition-colors",
                    fetcher.state !== "idle" ||
                      !subject ||
                      !htmlContent ||
                      allEmails.length === 0
                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                      : "bg-brand-600 hover:bg-brand-700 text-white cursor-pointer"
                  )}
                  title={
                    !subject
                      ? "Falta el asunto"
                      : !htmlContent
                      ? "Falta el contenido HTML"
                      : allEmails.length === 0
                      ? "No hay destinatarios"
                      : fetcher.state !== "idle"
                      ? "Procesando..."
                      : "Simular envío de correo"
                  }
                >
                  Simular Envío
                </button>
                <button
                  onClick={handleRealSend}
                  disabled={
                    fetcher.state !== "idle" ||
                    !subject ||
                    !htmlContent ||
                    allEmails.length === 0
                  }
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors border-2",
                    fetcher.state !== "idle" ||
                      !subject ||
                      !htmlContent ||
                      allEmails.length === 0
                      ? "bg-gray-700 text-gray-400 border-gray-600 cursor-not-allowed"
                      : "bg-red-600 hover:bg-red-700 text-white border-red-500 hover:border-red-400 cursor-pointer shadow-lg"
                  )}
                  title={
                    !subject
                      ? "Falta el asunto"
                      : !htmlContent
                      ? "Falta el contenido HTML"
                      : allEmails.length === 0
                      ? "No hay destinatarios"
                      : fetcher.state !== "idle"
                      ? "Procesando..."
                      : "🚨 ENVÍO REAL de correos"
                  }
                >
                  🚨 ENVIAR REAL
                </button>
              </div>

              {/* Feedback */}
              {fetcher.state === "submitting" && (
                <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700 rounded-lg">
                  <p className="text-sm text-blue-400">⏳ Procesando...</p>
                </div>
              )}

              {fetcher.state === "idle" && fetcher.data?.success && (
                <div className="mt-4 p-3 bg-green-900/20 border border-green-700 rounded-lg">
                  <p className="text-sm text-green-400">
                    {fetcher.data.real
                      ? "🎉 ¡Correos enviados exitosamente!"
                      : fetcher.data.simulated
                      ? "✓ Envío simulado exitosamente"
                      : "✓ Borrador guardado exitosamente"}
                  </p>

                  {fetcher.data.stats && (
                    <div className="text-xs text-gray-300 mt-2 space-y-1">
                      <p>
                        📊 <strong>Estadísticas del envío:</strong>
                      </p>
                      <p>• Total: {fetcher.data.stats.total} correos</p>
                      <p>
                        • Enviados:{" "}
                        <span className="text-green-400">
                          {fetcher.data.stats.sent}
                        </span>
                      </p>
                      {fetcher.data.stats.failed > 0 && (
                        <p>
                          • Fallidos:{" "}
                          <span className="text-red-400">
                            {fetcher.data.stats.failed}
                          </span>
                        </p>
                      )}
                    </div>
                  )}

                  {fetcher.data.newsletterId && (
                    <p className="text-xs text-gray-500 mt-2">
                      ID: {fetcher.data.newsletterId}
                    </p>
                  )}
                </div>
              )}

              {fetcher.state === "idle" && fetcher.data?.error && (
                <div className="mt-4 p-3 bg-red-900/20 border border-red-700 rounded-lg">
                  <p className="text-sm text-red-400">
                    ⚠️ Error: {fetcher.data.error}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Panel de Métricas */}
        <div className="mt-6 bg-gray-900 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">
            Métricas de Envíos Anteriores
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-2 px-3">Asunto</th>
                  <th className="text-center py-2 px-3">Estado</th>
                  <th className="text-center py-2 px-3">Enviado</th>
                  <th className="text-center py-2 px-3">Destinatarios</th>
                  <th className="text-center py-2 px-3">Métricas</th>
                  <th className="text-center py-2 px-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {newsletters.map((newsletter) => (
                  <tr key={newsletter.id} className="border-b border-gray-800">
                    <td className="py-2 px-3">
                      <div>
                        <p className="font-medium">{newsletter.title}</p>
                        <p className="text-xs text-gray-500">
                          ID: {newsletter.id.slice(-8)}
                        </p>
                      </div>
                    </td>
                    <td className="text-center py-2 px-3">
                      <span
                        className={cn(
                          "px-2 py-1 rounded text-xs",
                          newsletter.status === "SENT"
                            ? "bg-green-900/30 text-green-400"
                            : newsletter.status === "DRAFT"
                            ? "bg-yellow-900/30 text-yellow-400"
                            : "bg-gray-900/30 text-gray-400"
                        )}
                      >
                        {newsletter.status}
                      </span>
                    </td>
                    <td className="text-center py-2 px-3">
                      {newsletter.sent
                        ? new Date(newsletter.sent).toLocaleDateString(
                            "es-MX",
                            {
                              day: "numeric",
                              month: "long",
                              hour: "numeric",
                              hour12: true,
                            }
                          )
                        : "-"}
                    </td>
                    <td className="text-center py-2 px-3">
                      {newsletter.recipients.length}
                    </td>
                    <td className="text-center py-2 px-3">
                      {newsletter.status === "SENT" ? (
                        <div className="text-xs">
                          <span className="text-gray-400">E:</span>{" "}
                          {newsletter.delivered.length} |{" "}
                          <span className="text-gray-400">A:</span>{" "}
                          {newsletter.opened.length} |{" "}
                          <span className="text-gray-400">C:</span>{" "}
                          {newsletter.clicked.length}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="text-center py-2 px-3">
                      <div className="flex gap-1 justify-center">
                        {newsletter.status === "DRAFT" && (
                          <button
                            onClick={() => {
                              fetcher.submit(
                                {
                                  intent: "load_draft",
                                  newsletterId: newsletter.id,
                                },
                                { method: "post" }
                              );
                            }}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                            title="Cargar borrador"
                          >
                            Cargar
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm("¿Eliminar este newsletter?")) {
                              fetcher.submit(
                                {
                                  intent: "delete_newsletter",
                                  newsletterId: newsletter.id,
                                },
                                { method: "post" }
                              );
                            }
                          }}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
                          title="Eliminar"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
