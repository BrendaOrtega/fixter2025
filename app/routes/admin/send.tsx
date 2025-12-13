import { db } from "~/.server/db";
import type { Route } from "./+types/send";
import { useState, useEffect, useMemo } from "react";
import { useFetcher, useSearchParams, useRevalidator } from "react-router";
import { cn } from "~/utils/cn";
import { AdminNav } from "~/components/admin/AdminNav";
import fs from "fs/promises";
import path from "path";
import { getSesTransport, getSesRemitent } from "~/utils/sendGridTransport";
import { getAdminOrRedirect } from "~/.server/dbGetters";
import { scheduleResend } from "~/.server/agenda";

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
  const templateParam = url.searchParams.get("template");
  const subjectParam = url.searchParams.get("subject");

  // Obtener TODOS los usuarios con sus tags y emails
  const allUsers = await db.user.findMany({
    select: { tags: true, email: true, displayName: true },
  });

  // Obtener TODOS los subscribers con sus tags y emails
  const allSubscribers = await db.subscriber.findMany({
    select: { tags: true, email: true, name: true },
  });

  // Construir tagGroups para Users: { tag -> emails[] }
  const userTagMap = new Map<string, string[]>();
  allUsers.forEach((user) => {
    user.tags.forEach((tag) => {
      if (!userTagMap.has(tag)) {
        userTagMap.set(tag, []);
      }
      userTagMap.get(tag)!.push(user.email);
    });
  });

  // Construir tagGroups para Subscribers: { tag -> emails[] }
  const subscriberTagMap = new Map<string, string[]>();
  allSubscribers.forEach((sub) => {
    sub.tags.forEach((tag) => {
      if (!subscriberTagMap.has(tag)) {
        subscriberTagMap.set(tag, []);
      }
      subscriberTagMap.get(tag)!.push(sub.email);
    });
  });

  // Convertir a arrays ordenados
  const userTags = Array.from(userTagMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([tag, emails]) => ({ tag, count: emails.length, emails }));

  const subscriberTags = Array.from(subscriberTagMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([tag, emails]) => ({ tag, count: emails.length, emails }));

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
      sentAt: true,
      delivered: true,
      opened: true,
      clicked: true,
      recipients: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return {
    // Metadata de tags con emails incluidos
    tagGroups: {
      users: userTags,
      subscribers: subscriberTags,
    },
    // Totales para "Añadir Todos"
    totals: {
      users: allUsers.length,
      subscribers: allSubscribers.length,
      usersEmails: allUsers.map((u) => u.email),
      subscribersEmails: allSubscribers.map((s) => s.email),
    },
    availableTemplates,
    selectedTemplate: templateParam,
    templateContent,
    subject: subjectParam || "",
    newsletters,
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
            sentAt: new Date(),
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
            sentAt: new Date(),
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
              bcc: batch,
              html: finalHtmlContent,
              // Usar opción "ses" de nodemailer-SES (los headers X-SES-* no funcionan)
              ses: {
                ConfigurationSetName: configurationSet || undefined,
                Tags: [{ Name: "newsletter_id", Value: newsletter.id }],
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
            results.push({ success: false, batch, error: error instanceof Error ? error.message : "Error desconocido" });
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

    case "resend": {
      try {
        const newsletterId = formData.get("newsletterId") as string;
        if (!newsletterId) {
          return { error: "Newsletter ID requerido" };
        }
        await scheduleResend(newsletterId);
        return { queued: true, newsletterId };
      } catch (error) {
        console.error("Error scheduling resend:", error);
        return {
          error: error instanceof Error ? error.message : "Error al programar reenvío",
        };
      }
    }

    default:
      return { error: "Invalid intent" };
  }
};

// Tipos para el estado de audiencia
type AudienceGroup = {
  source: "users" | "subscribers";
  tag: string; // 'all' para todos
  emails: string[];
};

type AudienceState = {
  groups: AudienceGroup[];
  manual: string[];
};

export default function AdminSend({ loaderData }: Route.ComponentProps) {
  const {
    tagGroups,
    totals,
    availableTemplates,
    selectedTemplate,
    templateContent: initialTemplateContent,
    subject: initialSubject,
    newsletters,
  } = loaderData;

  const fetcher = useFetcher();
  const [searchParams, setSearchParams] = useSearchParams();

  const [htmlContent, setHtmlContent] = useState(initialTemplateContent || "");
  const [subject, setSubject] = useState(initialSubject);
  const [showPreview, setShowPreview] = useState(false);
  const [manualEmailInput, setManualEmailInput] = useState("");

  // Estado para streaming de envío
  const [sendProgress, setSendProgress] = useState<{
    active: boolean;
    percent: number;
    batch: number;
    totalBatches: number;
    sent: number;
    failed: number;
    status: string;
    newsletterId?: string;
  } | null>(null);

  // Estado para modal de detalles de newsletter
  const [detailsModal, setDetailsModal] = useState<{
    newsletter: (typeof newsletters)[0];
    notDelivered: string[];
  } | null>(null);

  // Estado para reenvío con Agenda (resiliente)
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [initialPending, setInitialPending] = useState<number>(0);
  const revalidator = useRevalidator();
  const resendFetcher = useFetcher();

  // Polling cuando hay reenvío activo
  useEffect(() => {
    if (resendingId) {
      const interval = setInterval(() => {
        revalidator.revalidate();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [resendingId]);

  // Actualizar progreso dinámicamente basado en delivered
  useEffect(() => {
    if (resendingId && initialPending > 0) {
      const newsletter = newsletters.find((n) => n.id === resendingId);
      if (newsletter) {
        const currentPending =
          newsletter.recipients.length - newsletter.delivered.length;
        const sent = initialPending - currentPending;
        const percent = Math.round((sent / initialPending) * 100);

        if (currentPending <= 0) {
          // Terminado
          setResendingId(null);
          setInitialPending(0);
          setSendProgress({
            active: false,
            percent: 100,
            batch: 0,
            totalBatches: 0,
            sent: newsletter.delivered.length,
            failed: 0,
            status: "¡Reenvío completado!",
            newsletterId: resendingId,
          });
        } else {
          // En progreso - actualizar barra
          setSendProgress((prev) =>
            prev
              ? {
                  ...prev,
                  percent,
                  sent,
                  status: `Procesando en segundo plano... ${sent}/${initialPending} enviados`,
                }
              : null
          );
        }
      }
    }
  }, [newsletters, resendingId, initialPending]);

  // Estado para construir audiencia - EMPIEZA VACÍO
  const [audience, setAudience] = useState<AudienceState>({
    groups: [],
    manual: [],
  });

  // Pestaña activa: users o subscribers
  const [activeSource, setActiveSource] = useState<"users" | "subscribers">(
    "subscribers"
  );

  // Actualizar contenido cuando cambie el template inicial (desde loader)
  useEffect(() => {
    setHtmlContent(initialTemplateContent || "");
  }, [initialTemplateContent]);

  useEffect(() => {
    setSubject(initialSubject);
  }, [initialSubject]);

  // Emails únicos computados desde grupos + manuales
  const allEmails = useMemo(() => {
    const fromGroups = audience.groups.flatMap((g) => g.emails);
    return [...new Set([...fromGroups, ...audience.manual])];
  }, [audience]);

  // ========== FUNCIONES DE AUDIENCIA ==========

  const addGroup = (
    source: "users" | "subscribers",
    tag: string,
    emails: string[]
  ) => {
    // Evitar duplicados
    const exists = audience.groups.some(
      (g) => g.source === source && g.tag === tag
    );
    if (exists) return;

    setAudience((prev) => ({
      ...prev,
      groups: [...prev.groups, { source, tag, emails }],
    }));
  };

  const addAll = (source: "users" | "subscribers") => {
    const exists = audience.groups.some(
      (g) => g.source === source && g.tag === "all"
    );
    if (exists) return;

    const emails =
      source === "users" ? totals.usersEmails : totals.subscribersEmails;
    setAudience((prev) => ({
      ...prev,
      groups: [...prev.groups, { source, tag: "all", emails }],
    }));
  };

  const removeGroup = (index: number) => {
    setAudience((prev) => ({
      ...prev,
      groups: prev.groups.filter((_, i) => i !== index),
    }));
  };

  const addManualEmail = () => {
    const newEmails = manualEmailInput
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e && e.includes("@"));
    if (newEmails.length === 0) return;

    setAudience((prev) => ({
      ...prev,
      manual: [...new Set([...prev.manual, ...newEmails])],
    }));
    setManualEmailInput("");
  };

  const removeManualEmail = (email: string) => {
    setAudience((prev) => ({
      ...prev,
      manual: prev.manual.filter((e) => e !== email),
    }));
  };

  const clearAudience = () => {
    setAudience({ groups: [], manual: [] });
  };

  // ========== FUNCIONES DE TEMPLATE ==========

  const handleTemplateSelect = (templateName: string) => {
    if (selectedTemplate !== templateName) {
      searchParams.set("template", templateName);
      setSearchParams(searchParams);
    }
  };

  // Manejar respuestas del fetcher (cargar borrador)
  useEffect(() => {
    if (fetcher.data?.loadedDraft) {
      setSubject(fetcher.data.loadedDraft.subject);
      setHtmlContent(fetcher.data.loadedDraft.htmlContent);
      // Cargar emails del borrador como manuales
      const emails = fetcher.data.loadedDraft.recipients
        .split(",")
        .map((e: string) => e.trim())
        .filter(Boolean);
      setAudience((prev) => ({
        ...prev,
        manual: [...new Set([...prev.manual, ...emails])],
      }));
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

  const handleRealSend = async () => {
    const confirmMessage = `⚠️ ATENCIÓN: Estás a punto de enviar correos REALES a ${allEmails.length} destinatarios.\n\n¿Estás seguro de que quieres continuar?`;

    if (!confirm(confirmMessage)) return;

    const doubleCheck = confirm(
      `🔴 ÚLTIMA CONFIRMACIÓN:\n\nEnviar "${subject}" a ${allEmails.length} correos?\n\nEsta acción NO se puede deshacer.`
    );

    if (!doubleCheck) return;

    // Iniciar progreso
    setSendProgress({
      active: true,
      percent: 0,
      batch: 0,
      totalBatches: Math.ceil(allEmails.length / 50),
      sent: 0,
      failed: 0,
      status: "Iniciando...",
    });

    try {
      const formData = new FormData();
      formData.append("subject", subject);
      formData.append("htmlContent", htmlContent);
      formData.append("recipients", allEmails.join(","));

      const response = await fetch("/api/send-stream", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Error al iniciar envío");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No se pudo leer la respuesta");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              switch (data.type) {
                case "start":
                  setSendProgress((prev) => ({
                    ...prev!,
                    status: `Enviando a ${data.total} destinatarios...`,
                    newsletterId: data.newsletterId,
                  }));
                  break;

                case "progress":
                  setSendProgress((prev) => ({
                    ...prev!,
                    batch: data.batch,
                    totalBatches: data.totalBatches,
                    percent: data.percent,
                    status: `Lote ${data.batch}/${data.totalBatches} (${data.sending} emails)`,
                  }));
                  break;

                case "batch_complete":
                  setSendProgress((prev) => ({
                    ...prev!,
                    sent: data.successCount,
                    failed: data.failCount,
                  }));
                  break;

                case "batch_error":
                  setSendProgress((prev) => ({
                    ...prev!,
                    failed: data.failCount,
                    status: `Error en lote ${data.batch}: ${data.error}`,
                  }));
                  break;

                case "complete":
                  setSendProgress({
                    active: false,
                    percent: 100,
                    batch: data.totalBatches || 0,
                    totalBatches: data.totalBatches || 0,
                    sent: data.sent,
                    failed: data.failed,
                    status: "¡Completado!",
                    newsletterId: data.newsletterId,
                  });
                  break;
              }
            } catch (e) {
              // Ignorar líneas mal formadas
            }
          }
        }
      }
    } catch (error) {
      console.error("Error en streaming:", error);
      setSendProgress((prev) =>
        prev
          ? {
              ...prev,
              active: false,
              status: `Error: ${error instanceof Error ? error.message : "Error desconocido"}`,
            }
          : null
      );
    }
  };

  // Reenviar newsletter a emails pendientes (usa Agenda - resiliente)
  const handleResendPending = (
    newsletter: { id: string; title: string; content: string | null },
    pendingEmails: string[]
  ) => {
    if (!newsletter.content) {
      alert("Este newsletter no tiene contenido guardado");
      return;
    }

    if (
      !confirm(
        `¿Reenviar "${newsletter.title}" a ~${pendingEmails.length} emails pendientes?\n\n` +
          "El proceso continuará en segundo plano aunque cierres el navegador."
      )
    ) {
      return;
    }

    // Cerrar modal y mostrar progreso
    setDetailsModal(null);
    setInitialPending(pendingEmails.length);
    setSendProgress({
      active: true,
      percent: 0,
      batch: 0,
      totalBatches: Math.ceil(pendingEmails.length / 14), // batch size 14
      sent: 0,
      failed: 0,
      status: "Encolando reenvío con Agenda...",
      newsletterId: newsletter.id,
    });

    // Encolar job con Agenda
    setResendingId(newsletter.id);
    resendFetcher.submit(
      { intent: "resend", newsletterId: newsletter.id },
      { method: "post" }
    );
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

          {/* Panel de Destinatarios - AUDIENCE BUILDER */}
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-3">
                Construir Audiencia
              </h2>

              {/* Tabs: Users / Subscribers */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setActiveSource("subscribers")}
                  className={cn(
                    "px-3 py-1.5 rounded text-sm transition-colors",
                    activeSource === "subscribers"
                      ? "bg-brand-600 text-white"
                      : "bg-gray-800 hover:bg-gray-700 text-gray-300"
                  )}
                >
                  Subscribers ({totals.subscribers})
                </button>
                <button
                  onClick={() => setActiveSource("users")}
                  className={cn(
                    "px-3 py-1.5 rounded text-sm transition-colors",
                    activeSource === "users"
                      ? "bg-brand-600 text-white"
                      : "bg-gray-800 hover:bg-gray-700 text-gray-300"
                  )}
                >
                  Users ({totals.users})
                </button>
              </div>

              {/* Sección: Añadir por Tag */}
              <div className="border border-gray-700 rounded-lg p-3 mb-4">
                <h4 className="text-sm font-medium mb-3 text-gray-300">
                  Añadir por Tag
                </h4>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(activeSource === "users"
                    ? tagGroups.users
                    : tagGroups.subscribers
                  ).map(({ tag, count, emails }) => {
                    const isAdded = audience.groups.some(
                      (g) => g.source === activeSource && g.tag === tag
                    );
                    return (
                      <div
                        key={tag}
                        className="flex items-center justify-between py-1"
                      >
                        <span className="text-sm">
                          {tag}{" "}
                          <span className="text-gray-500">({count})</span>
                        </span>
                        <button
                          onClick={() => addGroup(activeSource, tag, emails)}
                          disabled={isAdded}
                          className={cn(
                            "px-2 py-1 rounded text-xs transition-colors",
                            isAdded
                              ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                              : "bg-blue-600 hover:bg-blue-500 text-white"
                          )}
                        >
                          {isAdded ? "Añadido ✓" : "+ Añadir"}
                        </button>
                      </div>
                    );
                  })}

                  {(activeSource === "users"
                    ? tagGroups.users
                    : tagGroups.subscribers
                  ).length === 0 && (
                    <p className="text-gray-500 text-sm text-center py-2">
                      No hay tags disponibles
                    </p>
                  )}
                </div>

                {/* Botón Añadir Todos */}
                <button
                  onClick={() => addAll(activeSource)}
                  disabled={audience.groups.some(
                    (g) => g.source === activeSource && g.tag === "all"
                  )}
                  className={cn(
                    "mt-3 w-full py-2 rounded text-sm transition-colors",
                    audience.groups.some(
                      (g) => g.source === activeSource && g.tag === "all"
                    )
                      ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                      : "bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-600"
                  )}
                >
                  {audience.groups.some(
                    (g) => g.source === activeSource && g.tag === "all"
                  )
                    ? `Todos añadidos ✓`
                    : `+ Añadir Todos (${
                        activeSource === "users"
                          ? totals.users
                          : totals.subscribers
                      })`}
                </button>
              </div>

              {/* Sección: Audiencia Seleccionada */}
              <div className="border border-gray-700 rounded-lg p-3 mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-medium text-gray-300">
                    Audiencia ({allEmails.length} emails)
                  </h4>
                  {(audience.groups.length > 0 ||
                    audience.manual.length > 0) && (
                    <button
                      onClick={clearAudience}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      Limpiar Todo
                    </button>
                  )}
                </div>

                {/* Chips de grupos añadidos */}
                {audience.groups.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {audience.groups.map((group, i) => (
                      <span
                        key={i}
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 rounded text-xs",
                          group.source === "subscribers"
                            ? "bg-blue-900/50 text-blue-300"
                            : "bg-purple-900/50 text-purple-300"
                        )}
                      >
                        <span className="opacity-60">
                          {group.source === "subscribers" ? "S" : "U"}:
                        </span>
                        {group.tag === "all" ? "Todos" : group.tag} (
                        {group.emails.length})
                        <button
                          onClick={() => removeGroup(i)}
                          className="ml-1 hover:text-red-400 transition-colors"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Emails manuales como chips */}
                {audience.manual.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-2">
                      Emails manuales ({audience.manual.length}):
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {audience.manual.slice(0, 10).map((email) => (
                        <span
                          key={email}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-300"
                        >
                          {email.length > 25
                            ? email.substring(0, 25) + "..."
                            : email}
                          <button
                            onClick={() => removeManualEmail(email)}
                            className="hover:text-red-400"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                      {audience.manual.length > 10 && (
                        <span className="text-xs text-gray-500 px-2">
                          +{audience.manual.length - 10} más
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Preview de emails (colapsable) */}
                {allEmails.length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-gray-400 hover:text-gray-300 py-1">
                      Ver todos los emails ({allEmails.length})
                    </summary>
                    <div className="mt-2 max-h-32 overflow-y-auto bg-gray-800 rounded p-2 space-y-0.5">
                      {allEmails.slice(0, 100).map((email) => (
                        <div key={email} className="text-gray-300 truncate">
                          {email}
                        </div>
                      ))}
                      {allEmails.length > 100 && (
                        <div className="text-gray-500 pt-1">
                          ...y {allEmails.length - 100} más
                        </div>
                      )}
                    </div>
                  </details>
                )}

                {/* Estado vacío */}
                {allEmails.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">
                    Añade grupos o emails para construir tu audiencia
                  </p>
                )}
              </div>

              {/* Emails manuales - Input */}
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">
                  Añadir emails manualmente:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualEmailInput}
                    onChange={(e) => setManualEmailInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addManualEmail();
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-gray-800 rounded-lg text-gray-100 text-sm"
                    placeholder="email1@ejemplo.com, email2@ejemplo.com"
                  />
                  <button
                    onClick={addManualEmail}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
                  >
                    + Añadir
                  </button>
                </div>
              </div>

              {/* Resumen / Checklist */}
              <div className="p-3 bg-gray-800 rounded-lg mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">
                    Total destinatarios:
                  </span>
                  <span className="text-brand-400 font-semibold text-xl">
                    {allEmails.length}
                  </span>
                </div>

                {/* Desglose */}
                {(audience.groups.length > 0 ||
                  audience.manual.length > 0) && (
                  <div className="text-xs text-gray-500 mb-2 space-y-0.5">
                    {audience.groups.map((g, i) => (
                      <p key={i}>
                        • {g.emails.length} de {g.source} (
                        {g.tag === "all" ? "todos" : g.tag})
                      </p>
                    ))}
                    {audience.manual.length > 0 && (
                      <p>• {audience.manual.length} manuales</p>
                    )}
                  </div>
                )}

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
                    sendProgress?.active ||
                    !subject ||
                    !htmlContent ||
                    allEmails.length === 0
                  }
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors border-2",
                    fetcher.state !== "idle" ||
                      sendProgress?.active ||
                      !subject ||
                      !htmlContent ||
                      allEmails.length === 0
                      ? "bg-gray-700 text-gray-400 border-gray-600 cursor-not-allowed"
                      : "bg-red-600 hover:bg-red-700 text-white border-red-500 hover:border-red-400 cursor-pointer shadow-lg"
                  )}
                  title={
                    sendProgress?.active
                      ? "Envío en progreso..."
                      : !subject
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
                  {sendProgress?.active ? "📤 Enviando..." : "🚨 ENVIAR REAL"}
                </button>
              </div>

              {/* Progreso de envío en tiempo real */}
              {sendProgress && (
                <div
                  className={cn(
                    "mt-4 p-4 rounded-lg border",
                    sendProgress.active
                      ? "bg-blue-900/20 border-blue-700"
                      : sendProgress.failed > 0
                      ? "bg-yellow-900/20 border-yellow-700"
                      : "bg-green-900/20 border-green-700"
                  )}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">
                      {sendProgress.active ? "📤 Enviando..." : "✅ Completado"}
                    </span>
                    <span className="text-sm text-gray-400">
                      {sendProgress.percent}%
                    </span>
                  </div>

                  {/* Barra de progreso */}
                  <div className="w-full bg-gray-700 rounded-full h-3 mb-3">
                    <div
                      className={cn(
                        "h-3 rounded-full transition-all duration-300",
                        sendProgress.active
                          ? "bg-blue-500"
                          : sendProgress.failed > 0
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      )}
                      style={{ width: `${sendProgress.percent}%` }}
                    />
                  </div>

                  {/* Estado actual */}
                  <p className="text-sm text-gray-300 mb-2">
                    {sendProgress.status}
                  </p>

                  {/* Estadísticas */}
                  <div className="flex gap-4 text-xs">
                    <span className="text-green-400">
                      ✓ {sendProgress.sent} enviados
                    </span>
                    {sendProgress.failed > 0 && (
                      <span className="text-red-400">
                        ✗ {sendProgress.failed} fallidos
                      </span>
                    )}
                    <span className="text-gray-500">
                      Lote {sendProgress.batch}/{sendProgress.totalBatches}
                    </span>
                  </div>

                  {/* Botón para cerrar cuando termine */}
                  {!sendProgress.active && (
                    <button
                      onClick={() => setSendProgress(null)}
                      className="mt-3 text-xs text-gray-400 hover:text-gray-300"
                    >
                      Cerrar
                    </button>
                  )}
                </div>
              )}

              {/* Feedback del fetcher (para borradores y simulaciones) */}
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
                      {newsletter.sentAt
                        ? new Date(newsletter.sentAt).toLocaleDateString(
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
                    <td className="py-2 px-3">
                      {newsletter.status === "SENT" ? (() => {
                        const total = newsletter.recipients.length;
                        const delivered = newsletter.delivered.length;
                        const opened = newsletter.opened.length;
                        const clicked = newsletter.clicked.length;
                        const deliveryRate = total > 0 ? Math.round((delivered / total) * 100) : 0;
                        const openRate = delivered > 0 ? Math.round((opened / delivered) * 100) : 0;
                        const clickRate = opened > 0 ? Math.round((clicked / opened) * 100) : 0;

                        return (
                          <div className="space-y-1">
                            {/* Barra de entrega */}
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-700 rounded-full h-2">
                                <div
                                  className={cn(
                                    "h-2 rounded-full",
                                    deliveryRate >= 95 ? "bg-green-500" :
                                    deliveryRate >= 80 ? "bg-yellow-500" : "bg-red-500"
                                  )}
                                  style={{ width: `${deliveryRate}%` }}
                                />
                              </div>
                              <span className={cn(
                                "text-xs font-mono",
                                deliveryRate >= 95 ? "text-green-400" :
                                deliveryRate >= 80 ? "text-yellow-400" : "text-red-400"
                              )}>
                                {deliveryRate}%
                              </span>
                            </div>
                            {/* Números compactos */}
                            <div className="flex gap-2 text-[10px]">
                              <span className="text-blue-400">{delivered}/{total}</span>
                              <span className="text-green-400">{openRate}% abr</span>
                              <span className="text-yellow-400">{clickRate}% clk</span>
                            </div>
                          </div>
                        );
                      })() : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="text-center py-2 px-3">
                      <div className="flex gap-1 justify-center">
                        {newsletter.status === "SENT" && (
                          <button
                            onClick={() => {
                              const notDelivered = newsletter.recipients.filter(
                                (r) => !newsletter.delivered.includes(r)
                              );
                              setDetailsModal({ newsletter, notDelivered });
                            }}
                            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                            title="Ver detalles"
                          >
                            Detalles
                          </button>
                        )}
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

      {/* Modal de Detalles */}
      {detailsModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setDetailsModal(null)}
        >
          <div
            className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
              <div>
                <h3 className="font-semibold">{detailsModal.newsletter.title}</h3>
                <p className="text-xs text-gray-500">
                  Enviado:{" "}
                  {detailsModal.newsletter.sentAt
                    ? new Date(detailsModal.newsletter.sentAt).toLocaleString("es-MX")
                    : "-"}
                </p>
              </div>
              <button
                onClick={() => setDetailsModal(null)}
                className="text-gray-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-120px)]">
              {(() => {
                const n = detailsModal.newsletter;
                const total = n.recipients.length;
                const delivered = n.delivered.length;
                const opened = n.opened.length;
                const clicked = n.clicked.length;
                const notDelivered = detailsModal.notDelivered;
                const deliveryRate = total > 0 ? Math.round((delivered / total) * 100) : 0;
                const openRate = delivered > 0 ? Math.round((opened / delivered) * 100) : 0;
                const clickRate = opened > 0 ? Math.round((clicked / opened) * 100) : 0;

                return (
                  <div className="space-y-6">
                    {/* Resumen de métricas */}
                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-gray-800 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-gray-100">{total}</div>
                        <div className="text-xs text-gray-500">Enviados</div>
                      </div>
                      <div className="bg-gray-800 rounded-lg p-3 text-center">
                        <div className={cn(
                          "text-2xl font-bold",
                          deliveryRate >= 95 ? "text-green-400" :
                          deliveryRate >= 80 ? "text-yellow-400" : "text-red-400"
                        )}>
                          {deliveryRate}%
                        </div>
                        <div className="text-xs text-gray-500">Entregados</div>
                      </div>
                      <div className="bg-gray-800 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-green-400">{openRate}%</div>
                        <div className="text-xs text-gray-500">Abiertos</div>
                      </div>
                      <div className="bg-gray-800 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-yellow-400">{clickRate}%</div>
                        <div className="text-xs text-gray-500">Clicks</div>
                      </div>
                    </div>

                    {/* Barra de entrega detallada */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">Tasa de entrega</span>
                        <span className={cn(
                          "font-mono",
                          deliveryRate >= 95 ? "text-green-400" :
                          deliveryRate >= 80 ? "text-yellow-400" : "text-red-400"
                        )}>
                          {delivered} / {total} ({deliveryRate}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-4">
                        <div
                          className={cn(
                            "h-4 rounded-full transition-all",
                            deliveryRate >= 95 ? "bg-green-500" :
                            deliveryRate >= 80 ? "bg-yellow-500" : "bg-red-500"
                          )}
                          style={{ width: `${deliveryRate}%` }}
                        />
                      </div>
                    </div>

                    {/* Emails no entregados */}
                    {notDelivered.length > 0 ? (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-sm font-medium text-red-400">
                            No entregados ({notDelivered.length})
                          </h4>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  notDelivered.join(", ")
                                );
                              }}
                              className="text-xs text-gray-400 hover:text-gray-300"
                            >
                              Copiar lista
                            </button>
                            <button
                              onClick={() =>
                                handleResendPending(n, notDelivered)
                              }
                              className="text-xs px-2 py-1 bg-brand-500 text-white rounded hover:bg-brand-600"
                            >
                              Reenviar a {notDelivered.length}
                            </button>
                          </div>
                        </div>
                        <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 max-h-40 overflow-y-auto">
                          <div className="grid grid-cols-2 gap-1 text-xs">
                            {notDelivered.map((email) => (
                              <div key={email} className="text-red-300 truncate">
                                {email}
                              </div>
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Estos emails pueden haber rebotado, estar mal escritos, o aún no
                          haber confirmado entrega (espera ~5 min para eventos de SES).
                        </p>
                      </div>
                    ) : (
                      <div className="bg-green-900/20 border border-green-800 rounded-lg p-4 text-center">
                        <p className="text-green-400">
                          ✓ Todos los emails fueron entregados exitosamente
                        </p>
                      </div>
                    )}

                    {/* Emails que abrieron */}
                    {opened > 0 && (
                      <details>
                        <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
                          Ver quiénes abrieron ({opened})
                        </summary>
                        <div className="mt-2 bg-gray-800 rounded-lg p-3 max-h-40 overflow-y-auto">
                          <div className="grid grid-cols-2 gap-1 text-xs">
                            {n.opened.map((email) => (
                              <div key={email} className="text-green-300 truncate">
                                {email}
                              </div>
                            ))}
                          </div>
                        </div>
                      </details>
                    )}

                    {/* Emails que clickearon */}
                    {clicked > 0 && (
                      <details>
                        <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
                          Ver quiénes clickearon ({clicked})
                        </summary>
                        <div className="mt-2 bg-gray-800 rounded-lg p-3 max-h-40 overflow-y-auto">
                          <div className="grid grid-cols-2 gap-1 text-xs">
                            {n.clicked.map((email) => (
                              <div key={email} className="text-yellow-300 truncate">
                                {email}
                              </div>
                            ))}
                          </div>
                        </div>
                      </details>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
