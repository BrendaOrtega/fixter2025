import { useState, useEffect, useRef, useCallback, Fragment } from "react";
import { motion, AnimatePresence, usePresence } from "motion/react";
import {
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  redirect,
  Link,
} from "react-router";
import type { Route } from "./+types/secuencias.$id";
import { getUserOrRedirect } from "~/.server/dbGetters";
import { db } from "~/.server/db";
import getMetaTags from "~/utils/getMetaTags";
import { cn } from "~/utils/cn";
import { marked } from "marked";
import { wrapEmailHtml, emailButton } from "~/utils/emailShell";
import { useFetcher } from "react-router";
import {
  FaArrowLeft,
  FaPlus,
  FaTrash,
  FaEye,
  FaArrowUp,
  FaTimes,
  FaEnvelope,
  FaShareAlt,
  FaPause,
  FaPlay,
} from "react-icons/fa";

// Verifica que la secuencia exista y sea del user logueado.
async function requireOwnedSequence(userId: string, sequenceId: string) {
  const sequence = await db.sequence.findUnique({ where: { id: sequenceId } });
  if (!sequence || sequence.ownerId !== userId) {
    throw redirect("/secuencias");
  }
  return sequence;
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const user = await getUserOrRedirect(request);
  const sequenceId = params.id as string;
  await requireOwnedSequence(user.id, sequenceId);

  const sequence = await db.sequence.findUnique({
    where: { id: sequenceId },
    include: {
      emails: { orderBy: { order: "asc" } },
      enrollments: {
        include: { subscriber: { select: { email: true, name: true } } },
        orderBy: { enrolledAt: "desc" },
      },
    },
  });

  if (!sequence) throw redirect("/secuencias");

  // Videos disponibles para adjuntar a un email (selector del drawer).
  const videos = await db.video.findMany({
    select: { slug: true, title: true },
    orderBy: { createdAt: "desc" },
  });

  return { sequence, videos, userEmail: user.email };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const user = await getUserOrRedirect(request);
  const sequenceId = params.id as string;
  await requireOwnedSequence(user.id, sequenceId);

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  // Crea el Video al GUARDAR (no al subir) → sin huérfanos si se cancela.
  // Local al action para que RR no lo arrastre al bundle del cliente.
  async function persistUploadedVideo(videoSlug: string | null, fd: FormData) {
    const link = fd.get("newVideoStorageLink") as string | null;
    if (!videoSlug || !link) return;
    await db.video.upsert({
      where: { slug: videoSlug },
      update: {},
      create: {
        slug: videoSlug,
        title: (fd.get("newVideoTitle") as string) || "Video",
        storageLink: link,
        accessLevel: "subscriber",
        isPublic: false,
        processingStatus: "ready",
      },
    });
  }

  if (intent === "send_test") {
    const subject = (formData.get("subject") as string) || "(sin asunto)";
    const content = (formData.get("content") as string) || "";
    const videoSlug = (formData.get("videoSlug") as string) || null;
    let html = content;
    if (videoSlug) {
      const base =
        process.env.NODE_ENV === "development"
          ? "http://localhost:3000"
          : "https://www.fixtergeek.com";
      // En prueba no hay enrollment → link de ejemplo (solo para ver el render).
      html += `<div style="text-align:center;margin:16px 0">${emailButton(
        "▶ Ver el video",
        `${base}/s/${sequenceId}`
      )}</div>`;
    }
    const dest = (formData.get("testEmail") as string)?.trim();
    const to = dest && dest.includes("@") ? dest : user.email;
    const { sendSESTEST } = await import("~/mailSenders/sendSESTEST");
    const result = await sendSESTEST(to, {
      subject: `[PRUEBA] ${subject}`,
      html,
      to: true,
    });
    if (!result?.messageId) {
      return { error: "No se pudo enviar la prueba. Intenta de nuevo." };
    }
    return { success: true, message: `Prueba enviada a ${to}` };
  }

  if (intent === "update_sequence") {
    const name = (formData.get("name") as string)?.trim();
    const description =
      (formData.get("description") as string)?.trim() || null;
    if (!name) return { error: "El nombre no puede estar vacío" };
    await db.sequence.update({
      where: { id: sequenceId },
      data: { name, description },
    });
    return { success: true, message: "Secuencia actualizada" };
  }

  if (intent === "toggle_active") {
    const seq = await db.sequence.findUnique({ where: { id: sequenceId } });
    await db.sequence.update({
      where: { id: sequenceId },
      data: { isActive: !seq?.isActive },
    });
    return { success: true };
  }

  if (intent === "add_email") {
    const subject = (formData.get("subject") as string)?.trim();
    const content = (formData.get("content") as string) || "";
    const schedulingType =
      (formData.get("schedulingType") as string) || "delay";
    const delayDays = parseInt(formData.get("delayDays") as string) || 0;
    const specificDateRaw = formData.get("specificDate") as string;
    const afterOrderRaw = formData.get("afterOrder") as string | null;

    if (!subject) return { error: "El asunto es obligatorio" };

    // Por defecto se agrega al final; si viene `afterOrder`, se inserta en esa
    // posición corriendo los siguientes +1 para mantener el orden contiguo.
    let order = (await db.sequenceEmail.count({ where: { sequenceId } })) + 1;
    if (afterOrderRaw !== null && afterOrderRaw !== "") {
      const after = parseInt(afterOrderRaw) || 0;
      await db.sequenceEmail.updateMany({
        where: { sequenceId, order: { gt: after } },
        data: { order: { increment: 1 } },
      });
      order = after + 1;
    }

    const videoSlug = (formData.get("videoSlug") as string) || null;
    await persistUploadedVideo(videoSlug, formData);

    await db.sequenceEmail.create({
      data: {
        sequenceId,
        order,
        subject,
        content,
        schedulingType,
        delayDays: schedulingType === "delay" ? delayDays : null,
        specificDate:
          schedulingType === "specific_date" && specificDateRaw
            ? new Date(specificDateRaw)
            : null,
        videoSlug,
        fromName: "FixterGeek",
        fromEmail: "contacto@fixter.org",
      },
    });
    return { success: true, message: "Email agregado" };
  }

  if (intent === "edit_email") {
    const emailId = formData.get("emailId") as string;
    const subject = (formData.get("subject") as string)?.trim();
    const content = (formData.get("content") as string) || "";
    const schedulingType =
      (formData.get("schedulingType") as string) || "delay";
    const delayDays = parseInt(formData.get("delayDays") as string) || 0;
    const specificDateRaw = formData.get("specificDate") as string;

    // Verificar que el email pertenezca a esta secuencia
    const email = await db.sequenceEmail.findUnique({ where: { id: emailId } });
    if (!email || email.sequenceId !== sequenceId) {
      return { error: "Email no encontrado" };
    }
    if (!subject) return { error: "El asunto es obligatorio" };

    const videoSlug = (formData.get("videoSlug") as string) || null;
    await persistUploadedVideo(videoSlug, formData);

    await db.sequenceEmail.update({
      where: { id: emailId },
      data: {
        subject,
        content,
        schedulingType,
        delayDays: schedulingType === "delay" ? delayDays : null,
        specificDate:
          schedulingType === "specific_date" && specificDateRaw
            ? new Date(specificDateRaw)
            : null,
        videoSlug,
      },
    });
    return { success: true, message: "Email actualizado" };
  }

  if (intent === "delete_email") {
    const emailId = formData.get("emailId") as string;
    await db.sequenceEmail.deleteMany({
      where: { id: emailId, sequenceId },
    });
    // Renumerar para mantener el orden contiguo (1..n)
    const remaining = await db.sequenceEmail.findMany({
      where: { sequenceId },
      orderBy: { order: "asc" },
      select: { id: true },
    });
    await Promise.all(
      remaining.map((e, i) =>
        db.sequenceEmail.update({ where: { id: e.id }, data: { order: i + 1 } })
      )
    );
    return { success: true, message: "Email eliminado" };
  }

  if (intent === "move_email_up") {
    const emailId = formData.get("emailId") as string;
    const emailToMove = await db.sequenceEmail.findUnique({
      where: { id: emailId },
      select: { id: true, order: true, sequenceId: true },
    });
    if (!emailToMove || emailToMove.sequenceId !== sequenceId) {
      return { error: "Email no encontrado" };
    }
    if (emailToMove.order <= 1) {
      return { error: "Ya está en primera posición" };
    }
    const emailAbove = await db.sequenceEmail.findFirst({
      where: { sequenceId, order: emailToMove.order - 1 },
      select: { id: true, order: true },
    });
    if (!emailAbove) return { error: "No hay email superior" };

    // Swap atómico vía orden temporal
    await db.sequenceEmail.update({
      where: { id: emailToMove.id },
      data: { order: -999 },
    });
    await db.sequenceEmail.update({
      where: { id: emailAbove.id },
      data: { order: emailToMove.order },
    });
    await db.sequenceEmail.update({
      where: { id: emailToMove.id },
      data: { order: emailAbove.order },
    });
    return { success: true, message: "Email reordenado" };
  }

  return { error: "Invalid intent" };
};

export const meta = () =>
  getMetaTags({ title: "Gestionar secuencia — Secuencias" });

// ── Métricas agregadas (arrays SES son 0/1 por enrollment → booleanos) ──
function aggregate(enrollments: any[]) {
  const total = enrollments.length;
  const active = enrollments.filter((e) => e.status === "active").length;
  const completed = enrollments.filter((e) => e.status === "completed").length;
  const paused = enrollments.filter((e) => e.status === "paused").length;
  const withSends = enrollments.filter((e) => e.emailsSent > 0).length;
  const delivered = enrollments.filter((e) => e.delivered?.length > 0).length;
  const opened = enrollments.filter((e) => e.opened?.length > 0).length;
  const clicked = enrollments.filter((e) => e.clicked?.length > 0).length;
  const bounced = enrollments.filter((e) => e.bounced?.length > 0).length;
  const rate = (n: number) => (withSends ? Math.round((n / withSends) * 100) : 0);
  return {
    total,
    active,
    completed,
    paused,
    withSends,
    delivered,
    opened,
    clicked,
    bounced,
    openRate: rate(opened),
    clickRate: rate(clicked),
    bounceRate: rate(bounced),
  };
}

export default function ManageSequence({ loaderData }: Route.ComponentProps) {
  const { sequence, videos, userEmail } = loaderData;
  const fetcher = useFetcher();
  const [tab, setTab] = useState<"monitor" | "emails" | "settings">("emails");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [detail, setDetail] = useState<any>(null);
  const [preview, setPreview] = useState<any>(null);
  const [drawer, setDrawer] = useState<
    | { mode: "add"; afterOrder?: number; prevSubject?: string; isFirst: boolean }
    | { mode: "edit"; email: any; prevSubject?: string; isFirst: boolean }
    | null
  >(null);
  const [copied, setCopied] = useState(false);

  const copyShareLink = () => {
    navigator.clipboard?.writeText(
      `${window.location.origin}/s/${sequence.id}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stats = aggregate(sequence.enrollments);
  const totalEmails = sequence.emails.length;

  const filtered = sequence.enrollments.filter((e: any) => {
    const matchSearch = e.subscriber.email
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <article className="min-h-screen pt-40 pb-32">
      <section className="max-w-5xl mx-auto px-4 md:px-[5%] xl:px-0">
        <Link
          to="/secuencias"
          className="inline-flex items-center gap-2 text-brand-100 hover:text-white text-sm mb-8 transition-colors"
        >
          <FaArrowLeft className="w-3 h-3" />
          Mis Secuencias
        </Link>

        <div className="flex items-start justify-between mb-8">
          <div>
            <span
              className={cn(
                "inline-block text-xs px-3 py-1 rounded-full font-medium mb-2",
                sequence.isActive
                  ? "text-green-400 bg-green-900/60"
                  : "text-yellow-400 bg-yellow-900/60"
              )}
            >
              {sequence.isActive ? "Activa" : "Borrador"}
            </span>
            <h1 className="text-3xl font-bold text-white mb-2">
              {sequence.name}
            </h1>
            <p className="text-brand-100 text-sm">
              {sequence.description || "Sin descripción"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {sequence.isActive && (
              <button
                onClick={copyShareLink}
                title="Copiar enlace público de suscripción"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-brand-800/60 text-brand-100 border border-brand-100/20 hover:text-white hover:border-brand-100/40 transition-colors"
              >
                <FaShareAlt className="w-3 h-3" />
                {copied ? "¡Copiado!" : "Compartir"}
              </button>
            )}
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="toggle_active" />
              <button
                type="submit"
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors",
                  sequence.isActive
                    ? "bg-brand-800/60 text-brand-100 border border-brand-100/20 hover:text-white hover:border-brand-100/40"
                    : "bg-brand-500 text-brand-900 hover:bg-brand-400"
                )}
              >
                {sequence.isActive ? (
                  <>
                    <FaPause className="w-3 h-3" /> Pausar
                  </>
                ) : (
                  <>
                    <FaPlay className="w-3 h-3" /> Activar
                  </>
                )}
              </button>
            </fetcher.Form>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <Stat label="Suscriptores" value={stats.total} />
          <Stat label="Activos" value={stats.active} />
          <Stat label="Completados" value={stats.completed} />
          <Stat label="Aperturas" value={`${stats.openRate}%`} />
          <Stat label="Clicks" value={`${stats.clickRate}%`} />
          <Stat label="Rebotes" value={`${stats.bounceRate}%`} />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-brand-100/10">
          {[
            { id: "emails", label: `Emails (${totalEmails})` },
            { id: "monitor", label: "Suscriptores" },
            { id: "settings", label: "Ajustes" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
                tab === t.id
                  ? "border-brand-500 text-white"
                  : "border-transparent text-brand-100 hover:text-white"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "monitor" && (
          <MonitorTab
            enrollments={filtered}
            totalEmails={totalEmails}
            search={search}
            setSearch={setSearch}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            onRowClick={setDetail}
          />
        )}

        {tab === "emails" && (
          <EmailsTab
            sequence={sequence}
            fetcher={fetcher}
            onOpen={setDrawer}
            onPreview={setPreview}
          />
        )}

        {tab === "settings" && (
          <SettingsTab sequence={sequence} fetcher={fetcher} />
        )}
      </section>

      {detail && (
        <SubscriberModal
          enrollment={detail}
          sequence={sequence}
          onClose={() => setDetail(null)}
        />
      )}
      {preview && (
        <EmailPreviewModal email={preview} onClose={() => setPreview(null)} />
      )}

      <AnimatePresence>
        {drawer && (
          <EmailDrawer
            key="email-drawer"
            drawer={drawer}
            sequence={sequence}
            videos={videos}
            userEmail={userEmail}
            fetcher={fetcher}
            onClose={() => setDrawer(null)}
          />
        )}
      </AnimatePresence>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-brand-900/40 border border-brand-100/10 rounded-lg p-4">
      <div className="text-brand-100 text-xs font-medium mb-1">{label}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

function statusPill(status: string) {
  const map: Record<string, string> = {
    active: "text-green-400 bg-green-900/60",
    completed: "text-blue-400 bg-blue-900/60",
    paused: "text-yellow-400 bg-yellow-900/60",
  };
  const label: Record<string, string> = {
    active: "Activo",
    completed: "Completado",
    paused: "Pausado",
  };
  return (
    <span
      className={cn(
        "text-xs px-2 py-1 rounded-full font-medium",
        map[status] || "text-gray-400 bg-gray-900/60"
      )}
    >
      {label[status] || status}
    </span>
  );
}

function EngagementBadges({ enrollment }: { enrollment: any }) {
  const items = [
    { key: "delivered", label: "D", on: enrollment.delivered?.length > 0, color: "bg-brand-500/30 text-brand-100" },
    { key: "opened", label: "O", on: enrollment.opened?.length > 0, color: "bg-green-900/60 text-green-300" },
    { key: "clicked", label: "C", on: enrollment.clicked?.length > 0, color: "bg-blue-900/60 text-blue-300" },
    { key: "bounced", label: "B", on: enrollment.bounced?.length > 0, color: "bg-red-900/60 text-red-300" },
  ];
  return (
    <div className="flex gap-1">
      {items.map((i) => (
        <span
          key={i.key}
          title={i.key}
          className={cn(
            "w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center",
            i.on ? i.color : "bg-brand-900/40 text-brand-100/30"
          )}
        >
          {i.label}
        </span>
      ))}
    </div>
  );
}

function MonitorTab({
  enrollments,
  totalEmails,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  onRowClick,
}: any) {
  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Buscar por email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 bg-brand-900/60 border border-brand-100/20 rounded-lg text-white placeholder-brand-300 text-sm focus:outline-none focus:border-brand-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-brand-900/60 border border-brand-100/20 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"
        >
          <option value="all">Todos</option>
          <option value="active">Activos</option>
          <option value="completed">Completados</option>
          <option value="paused">Pausados</option>
        </select>
      </div>

      {enrollments.length === 0 ? (
        <div className="text-center py-16 text-brand-100">
          Aún no hay suscriptores que coincidan.
        </div>
      ) : (
        <div className="bg-brand-900/40 border border-brand-100/10 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-900/60">
                <tr className="text-left text-xs text-brand-100 uppercase">
                  <th className="px-4 py-3">Suscriptor</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Progreso</th>
                  <th className="px-4 py-3">Enviados</th>
                  <th className="px-4 py-3">Engagement</th>
                  <th className="px-4 py-3">Próximo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-100/10">
                {enrollments.map((e: any) => (
                  <tr
                    key={e.id}
                    onClick={() => onRowClick(e)}
                    className="hover:bg-brand-800/30 cursor-pointer"
                  >
                    <td className="px-4 py-3 text-white">
                      {e.subscriber.email}
                    </td>
                    <td className="px-4 py-3">{statusPill(e.status)}</td>
                    <td className="px-4 py-3 text-brand-100">
                      {e.currentEmailIndex}/{totalEmails}
                    </td>
                    <td className="px-4 py-3 text-brand-100">{e.emailsSent}</td>
                    <td className="px-4 py-3">
                      <EngagementBadges enrollment={e} />
                    </td>
                    <td className="px-4 py-3 text-brand-100">
                      {e.nextEmailAt
                        ? new Date(e.nextEmailAt).toLocaleDateString("es-MX", {
                            day: "numeric",
                            month: "short",
                          })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Riel vertical de la secuencia (estilo Loops/Attio, contenido, no fullscreen) ──

// Etiqueta de la espera que antecede a un email.
function waitLabel(email: any) {
  if (email.schedulingType === "specific_date") return "📅 en fecha fija";
  const d = email.delayDays || 0;
  return d === 0
    ? "⚡ inmediato"
    : `⏳ espera ${d} ${d === 1 ? "día" : "días"}`;
}

// Día acumulado por email, anclado a la suscripción (Día 0).
function cumulativeDays(emails: any[]) {
  let acc = 0;
  return emails.map((e) => {
    if (e.schedulingType === "specific_date") {
      return e.specificDate
        ? new Date(e.specificDate).toLocaleDateString("es-MX", {
            day: "numeric",
            month: "short",
          })
        : "fecha sin definir";
    }
    acc += e.delayDays || 0;
    return `Día ${acc}`;
  });
}

function EmailsTab({ sequence, fetcher, onOpen, onPreview }: any) {
  const emails = sequence.emails;
  const days = cumulativeDays(emails);
  const lastOrder = emails.length ? emails[emails.length - 1].order : 0;
  const lastSubject = emails.length
    ? emails[emails.length - 1].subject
    : undefined;

  return (
    <div className="max-w-xl mx-auto pb-4">
      {/* Trigger (centrado sobre la línea del tiempo) */}
      <div className="flex justify-center">
        <span className="inline-flex items-center gap-2 bg-brand-900/60 border border-brand-500/30 rounded-full pl-2 pr-4 py-1.5">
          <span className="w-6 h-6 rounded-full bg-brand-500/15 flex items-center justify-center flex-shrink-0">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
          </span>
          <span className="text-white text-sm font-medium">Se suscribe</span>
          <span className="text-brand-100/60 text-xs">· Día 0</span>
        </span>
      </div>

      {emails.length === 0 ? (
        <>
          <Connector first onInsert={() => onOpen({ mode: "add", isFirst: true })} />
          <button
            onClick={() => onOpen({ mode: "add", isFirst: true })}
            className="w-full text-left bg-brand-900/40 border border-dashed border-brand-100/20 rounded-xl p-5 hover:border-brand-500/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-full bg-brand-500/15 flex items-center justify-center text-brand-100 group-hover:text-brand-500 flex-shrink-0">
                <FaPlus className="w-3.5 h-3.5" />
              </span>
              <div>
                <div className="text-white text-sm font-medium">
                  Crea tu primer email
                </div>
                <div className="text-brand-100 text-xs">
                  Escríbelo o genéralo con IA · agrega imágenes · programa el
                  envío
                </div>
              </div>
            </div>
          </button>
        </>
      ) : (
        emails.map((email: any, i: number) => (
          <Fragment key={email.id}>
            <Connector
              first={i === 0}
              label={waitLabel(email)}
              onInsert={() =>
                onOpen({
                  mode: "add",
                  afterOrder: email.order - 1,
                  isFirst: i === 0,
                  prevSubject: i === 0 ? undefined : emails[i - 1].subject,
                })
              }
            />
            <RailEmailNode
              email={email}
              dayLabel={days[i]}
              fetcher={fetcher}
              onEdit={() =>
                onOpen({
                  mode: "edit",
                  email,
                  isFirst: email.order === 1,
                  prevSubject: i === 0 ? undefined : emails[i - 1].subject,
                })
              }
              onPreview={() => onPreview(email)}
            />
          </Fragment>
        ))
      )}

      {emails.length > 0 && (
        <>
          <Connector
            onInsert={() =>
              onOpen({
                mode: "add",
                afterOrder: lastOrder,
                isFirst: false,
                prevSubject: lastSubject,
              })
            }
          />
          <button
            onClick={() =>
              onOpen({
                mode: "add",
                afterOrder: lastOrder,
                isFirst: false,
                prevSubject: lastSubject,
              })
            }
            className="flex items-center gap-2 text-brand-100 hover:text-white text-sm pl-1 py-1"
          >
            <FaPlus className="w-3 h-3" /> Agregar email
          </button>

          {/* Nodo de finalización — centrado, cierra el riel */}
          <Connector />
          <div className="flex justify-center mt-1">
            <span className="inline-flex items-center gap-2 bg-brand-900/60 border border-brand-100/15 rounded-full px-4 py-1.5">
              <span className="text-sm">🏁</span>
              <span className="text-brand-100 text-sm font-medium">
                Fin de la secuencia
              </span>
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// Conector vertical con chip de espera + botón "+" para insertar en posición.
function Connector({ label, onInsert }: any) {
  return (
    <div className="relative flex flex-col items-center py-1 group">
      <div className="w-px h-4 bg-brand-100/20" />
      {label && (
        <span className="text-[11px] text-brand-100 bg-brand-900/60 border border-brand-100/10 rounded-full px-2.5 py-0.5 my-1">
          {label}
        </span>
      )}
      <div className="w-px h-4 bg-brand-100/20" />
      {onInsert && (
        <button
          type="button"
          onClick={onInsert}
          title="Insertar email aquí"
          className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-brand-800 border border-brand-100/20 text-brand-100 opacity-0 group-hover:opacity-100 hover:text-brand-500 hover:border-brand-500/50 transition-all flex items-center justify-center"
        >
          <FaPlus className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  );
}

function RailEmailNode({ email, dayLabel, fetcher, onEdit, onPreview }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative"
    >
      <button
        type="button"
        onClick={onEdit}
        className="w-full text-left bg-brand-900/50 border border-brand-100/10 rounded-xl p-4 pr-28 hover:border-brand-500/40 transition-colors flex items-center gap-3"
      >
        <span className="w-9 h-9 rounded-full bg-brand-500/15 flex items-center justify-center text-brand-100 flex-shrink-0">
          <FaEnvelope className="w-3.5 h-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-white font-medium truncate">{email.subject}</div>
          <div className="text-brand-100 text-xs mt-0.5">{dayLabel}</div>
        </div>
      </button>
      <div className="absolute top-1/2 -translate-y-1/2 right-3 flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="move_email_up" />
          <input type="hidden" name="emailId" value={email.id} />
          <button
            type="submit"
            disabled={email.order <= 1}
            className="p-2 text-brand-100 hover:text-white disabled:opacity-30"
            title="Subir"
          >
            <FaArrowUp className="w-3 h-3" />
          </button>
        </fetcher.Form>
        <button
          type="button"
          onClick={onPreview}
          className="p-2 text-brand-100 hover:text-white"
          title="Previsualizar"
        >
          <FaEye className="w-3 h-3" />
        </button>
        <fetcher.Form
          method="post"
          onSubmit={(e: any) => {
            if (!confirm("¿Eliminar este email?")) e.preventDefault();
          }}
        >
          <input type="hidden" name="intent" value="delete_email" />
          <input type="hidden" name="emailId" value={email.id} />
          <button
            type="submit"
            className="p-2 text-red-400 hover:text-red-300"
            title="Eliminar"
          >
            <FaTrash className="w-3 h-3" />
          </button>
        </fetcher.Form>
      </div>
    </motion.div>
  );
}

// Borra (fire-and-forget) el objeto de S3 de un video subido pero no guardado.
function deletePendingVideoObject(storageLink: string) {
  fetch(`/api/sequence-video?storageLink=${encodeURIComponent(storageLink)}`, {
    method: "DELETE",
  }).catch(() => {});
}

function EmailDrawer({
  drawer,
  sequence,
  videos,
  userEmail,
  fetcher,
  onClose,
}: any) {
  const email = drawer.mode === "edit" ? drawer.email : undefined;
  const intent = drawer.mode === "edit" ? "edit_email" : "add_email";
  const { isFirst, prevSubject } = drawer;
  // Al cerrar, el overlay deja de capturar clics de inmediato (la animación de
  // salida sigue, pero no bloquea el sitio).
  const [isPresent] = usePresence();

  const initialSpecificDate = email?.specificDate
    ? new Date(email.specificDate).toISOString().slice(0, 16)
    : "";

  const [schedulingType, setSchedulingType] = useState(
    email?.schedulingType || "delay"
  );
  const [subject, setSubject] = useState(email?.subject || "");
  const [content, setContent] = useState(email?.content || "");
  const [delayDays, setDelayDays] = useState<number>(
    email?.delayDays ?? (isFirst ? 0 : 1)
  );
  const [specificDate, setSpecificDate] = useState(initialSpecificDate);
  const [videoSlug, setVideoSlug] = useState(email?.videoSlug || "");
  const [videoList, setVideoList] = useState<any[]>(videos || []);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [pendingVideo, setPendingVideo] = useState<any>(null);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [videoPreviewSrc, setVideoPreviewSrc] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const testFetcher = useFetcher<{
    success?: boolean;
    message?: string;
    error?: string;
  }>();
  const [showTest, setShowTest] = useState(false);
  const [testEmail, setTestEmail] = useState(userEmail || "");
  const sendingTest = testFetcher.state !== "idle";

  // Envía este email a un correo para ver el render real en la bandeja.
  function sendTest() {
    if (!subject.trim()) {
      setError("Ponle un asunto para la prueba");
      return;
    }
    const fd = new FormData();
    fd.append("intent", "send_test");
    fd.append("subject", subject);
    fd.append("content", content);
    fd.append("testEmail", testEmail);
    if (videoSlug) fd.append("videoSlug", videoSlug);
    testFetcher.submit(fd, { method: "POST" });
  }

  // Snapshot inicial para detectar cambios (dirty).
  const initial = useRef({
    subject: email?.subject || "",
    content: email?.content || "",
    schedulingType: email?.schedulingType || "delay",
    delayDays: email?.delayDays ?? (isFirst ? 0 : 1),
    specificDate: initialSpecificDate,
    videoSlug: email?.videoSlug || "",
  });
  const dirty =
    subject !== initial.current.subject ||
    content !== initial.current.content ||
    schedulingType !== initial.current.schedulingType ||
    delayDays !== initial.current.delayDays ||
    specificDate !== initial.current.specificDate ||
    videoSlug !== initial.current.videoSlug;

  // Cierra confirmando si hay cambios sin guardar.
  const attemptClose = useCallback(() => {
    if (
      dirty &&
      !window.confirm("Tienes cambios sin guardar. ¿Cerrar de todos modos?")
    ) {
      return;
    }
    // Video subido pero no guardado → borra su objeto de S3 (sin basura).
    if (pendingVideo) deletePendingVideoObject(pendingVideo.storageLink);
    onClose();
  }, [dirty, onClose, pendingVideo]);

  // ESC cierra el drawer (con guarda de dirty).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") attemptClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [attemptClose]);

  // Bloquea el scroll del fondo mientras el drawer está abierto.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Sube un video nuevo (suelto) sin salir del drawer y lo deja seleccionado.
  async function uploadVideo(file: File) {
    if (!file || uploadingVideo) return;
    // Si ya había un video subido-en-esta-sesión, borra su objeto (lo reemplaza).
    if (pendingVideo) deletePendingVideoObject(pendingVideo.storageLink);
    setUploadingVideo(true);
    setError(null);
    try {
      const res = await fetch("/api/sequence-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "No se pudo preparar la subida");
      const put = await fetch(data.putURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "video/mp4" },
      });
      if (!put.ok) throw new Error("Falló la subida del video");
      // Aún NO existe registro en DB; se crea al guardar el email.
      setPendingVideo({
        slug: data.slug,
        title: data.title,
        storageLink: data.storageLink,
      });
      setVideoList((l) => [{ slug: data.slug, title: data.title }, ...l]);
      setVideoSlug(data.slug);
      setShowVideoPreview(false);
      setVideoPreviewSrc("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploadingVideo(false);
    }
  }

  // Carga (o colapsa) el preview del video seleccionado.
  async function toggleVideoPreview() {
    if (showVideoPreview) {
      setShowVideoPreview(false);
      return;
    }
    setShowVideoPreview(true);
    if (videoPreviewSrc || !videoSlug) return;
    setLoadingPreview(true);
    try {
      const q =
        pendingVideo && pendingVideo.slug === videoSlug
          ? `storageLink=${encodeURIComponent(pendingVideo.storageLink)}`
          : `slug=${encodeURIComponent(videoSlug)}`;
      const res = await fetch(`/api/sequence-video?${q}`);
      const data = await res.json();
      if (data.src) setVideoPreviewSrc(data.src);
    } catch {
      // silencioso
    } finally {
      setLoadingPreview(false);
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={attemptClose}
        className={cn(
          "fixed inset-0 bg-black/50 z-[300]",
          !isPresent && "pointer-events-none"
        )}
      />
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className={cn(
          "fixed top-0 right-0 h-full w-full max-w-2xl bg-brand-900 border-l border-brand-100/10 z-[300] overflow-y-auto",
          !isPresent && "pointer-events-none"
        )}
      >
        <div className="flex items-center justify-between p-5 border-b border-brand-100/10 sticky top-0 bg-brand-900 z-10">
          <h3 className="text-white font-semibold">
            {email ? "Editar email" : "Nuevo email"}
          </h3>
          <button
            onClick={attemptClose}
            className="text-brand-100 hover:text-white"
          >
            <FaTimes />
          </button>
        </div>

        <fetcher.Form
          method="post"
          className="p-5 space-y-4"
          onSubmit={() => setTimeout(onClose, 150)}
        >
          <input type="hidden" name="intent" value={intent} />
          {email && <input type="hidden" name="emailId" value={email.id} />}
          {drawer.mode === "add" && drawer.afterOrder !== undefined && (
            <input type="hidden" name="afterOrder" value={drawer.afterOrder} />
          )}
          <input type="hidden" name="schedulingType" value={schedulingType} />

          <div>
            <label className="block text-xs text-brand-100 mb-1">Asunto</label>
            <input
              type="text"
              name="subject"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Asunto del email"
              className="w-full px-3 py-2 bg-brand-900/60 border border-brand-100/20 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* ¿Cuándo se envía? — con ancla */}
          <div>
            <label className="block text-xs text-brand-100 mb-1.5">
              ¿Cuándo se envía?
            </label>
            <div className="flex gap-2 mb-2">
              {[
                { id: "delay", label: "Espera relativa" },
                { id: "specific_date", label: "Fecha fija" },
              ].map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setSchedulingType(o.id)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                    schedulingType === o.id
                      ? "bg-brand-500 text-brand-900 border-brand-500"
                      : "text-brand-100 border-brand-100/20 hover:text-white"
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>

            {schedulingType === "delay" ? (
              <div className="bg-brand-800/30 border border-brand-100/10 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm text-white flex-wrap">
                  <span>{isFirst ? "Al suscribirse, esperar" : "Esperar"}</span>
                  <input
                    type="number"
                    name="delayDays"
                    min="0"
                    value={delayDays}
                    onChange={(e) => setDelayDays(parseInt(e.target.value) || 0)}
                    className="w-16 px-2 py-1 bg-brand-900/60 border border-brand-100/20 rounded text-white text-sm text-center focus:outline-none focus:border-brand-500"
                  />
                  <span>
                    {isFirst
                      ? "días"
                      : `días después de «${prevSubject || "el email anterior"}»`}
                  </span>
                </div>
                <p className="text-brand-100 text-xs mt-2">
                  🕒{" "}
                  {isFirst
                    ? delayDays > 0
                      ? `Se envía el Día ${delayDays}.`
                      : "Se envía inmediatamente al suscribirse (Día 0)."
                    : `Se envía ${delayDays} ${delayDays === 1 ? "día" : "días"} después del email anterior.`}
                </p>
              </div>
            ) : (
              <input
                type="datetime-local"
                name="specificDate"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                className="w-full px-3 py-2 bg-brand-900/60 border border-brand-100/20 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"
              />
            )}
          </div>

          {/* Video (opcional): se inserta un botón "Ver el video" en el email,
              con desbloqueo por avance del suscriptor. */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs text-brand-100">
                Video (opcional)
              </label>
              <label className="text-[11px] text-brand-100 hover:text-white cursor-pointer">
                {uploadingVideo ? "Subiendo video…" : "＋ Subir video nuevo"}
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  disabled={uploadingVideo}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadVideo(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <select
              name="videoSlug"
              value={videoSlug}
              onChange={(e) => {
                setVideoSlug(e.target.value);
                setShowVideoPreview(false);
                setVideoPreviewSrc("");
              }}
              className="w-full px-3 py-2 bg-brand-900/60 border border-brand-100/20 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"
            >
              <option value="">Sin video</option>
              {videoList?.map((v: any) => (
                <option key={v.slug} value={v.slug}>
                  {v.title}
                </option>
              ))}
            </select>

            {/* El Video se crea al GUARDAR (no al subir) → sin huérfanos. */}
            {pendingVideo && videoSlug === pendingVideo.slug && (
              <>
                <input
                  type="hidden"
                  name="newVideoTitle"
                  value={pendingVideo.title}
                />
                <input
                  type="hidden"
                  name="newVideoStorageLink"
                  value={pendingVideo.storageLink}
                />
              </>
            )}

            {videoSlug && (
              <div className="mt-1">
                <p className="text-brand-100/60 text-[11px]">
                  Se agregará un botón “▶ Ver el video”. Usa{" "}
                  <code className="text-brand-300">{"{{video}}"}</code> en el
                  contenido para ubicarlo, o se añade al final.
                </p>
                <button
                  type="button"
                  onClick={toggleVideoPreview}
                  className="text-[11px] text-brand-100 hover:text-white flex items-center gap-1 mt-1"
                >
                  <span>{showVideoPreview ? "▾" : "▸"}</span>
                  Ver video
                </button>
                {showVideoPreview && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-brand-100/15 bg-black">
                    {loadingPreview ? (
                      <p className="text-brand-100/60 text-xs p-4 text-center">
                        Cargando video…
                      </p>
                    ) : videoPreviewSrc ? (
                      <video
                        src={videoPreviewSrc}
                        controls
                        className="w-full max-h-[260px] bg-black"
                      />
                    ) : (
                      <p className="text-brand-100/60 text-xs p-4 text-center">
                        No se pudo cargar el preview.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <EmailBody
            content={content}
            setContent={setContent}
            subject={subject}
            sequenceId={sequence.id}
            error={error}
            setError={setError}
          />

          <div className="border-t border-brand-100/10 pt-3 space-y-2">
            {/* Enviar prueba: pide destino + feedback */}
            <div className="flex items-center gap-2 min-h-[34px]">
              {!showTest ? (
                <button
                  type="button"
                  onClick={() => setShowTest(true)}
                  className="text-sm text-brand-100 hover:text-white"
                >
                  ✉️ Enviar prueba
                </button>
              ) : (
                <>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    className="flex-1 px-3 py-1.5 bg-brand-900/60 border border-brand-100/20 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"
                  />
                  <button
                    type="button"
                    onClick={sendTest}
                    disabled={sendingTest || !testEmail.includes("@")}
                    className="px-3 py-1.5 bg-brand-800 text-brand-100 hover:text-white rounded-lg text-sm border border-brand-100/20 disabled:opacity-40 whitespace-nowrap"
                  >
                    {sendingTest ? "Enviando…" : "Enviar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTest(false)}
                    className="text-brand-100/60 hover:text-white text-sm px-1"
                  >
                    ✕
                  </button>
                </>
              )}
            </div>

            <AnimatePresence mode="wait">
              {testFetcher.data?.success && (
                <motion.p
                  key="ok"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-green-400 text-xs"
                >
                  ✓ {testFetcher.data.message}
                </motion.p>
              )}
              {testFetcher.data?.error && (
                <motion.p
                  key="err"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-red-400 text-xs"
                >
                  ✗ {testFetcher.data.error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Acciones */}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={attemptClose}
                className="px-4 py-2 text-brand-100 hover:text-white text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!dirty}
                className="bg-brand-500 text-brand-900 px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-400 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Guardar
              </button>
            </div>
          </div>
        </fetcher.Form>
      </motion.aside>
    </>
  );
}

// Chime suave (sin assets) al terminar de generar — dos notas ascendentes.
function playChime() {
  try {
    const Ctx =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [659.25, 987.77].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + i * 0.09;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.12, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    });
    setTimeout(() => ctx.close(), 700);
  } catch {}
}

// Área de contenido del email — AISLADA para enchufar el editor de easybits
// después (hoy: IA + HTML + imagen + preview; mañana: modo easybits/Section3).
function EmailBody({
  content,
  setContent,
  subject,
  sequenceId,
  error,
  setError,
}: any) {
  const [aiPrompt, setAiPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [view, setView] = useState<"edit" | "preview">("preview");
  // Contexto/fuente para la generación (opcional). NO se guarda con el email,
  // es solo material para que la IA no invente.
  const [context, setContext] = useState("");
  const [showContext, setShowContext] = useState(false);
  const [extracting, setExtracting] = useState(false);

  async function generateWithAI() {
    if (!aiPrompt.trim() || generating) return;
    setGenerating(true);
    setError(null);
    setView("preview"); // mostrar el preview mientras el email va apareciendo
    try {
      const res = await fetch("/api/ai.email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt, subject, context }),
      });
      if (!res.ok || !res.body) {
        let msg = "No se pudo generar el email";
        try {
          const j = await res.json();
          msg = j.error || msg;
        } catch {}
        throw new Error(msg);
      }
      // Lee el stream de markdown y va envolviendo en el shell en vivo.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let md = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        md += decoder.decode(value, { stream: true });
        setContent(wrapEmailHtml(await marked.parse(md), { preheader: subject }));
      }
      playChime(); // sonido al terminar el streaming
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  // Extrae texto de un archivo (md/txt/pdf) SIN almacenarlo y lo pone en el
  // textarea de contexto, editable, para que el usuario vea qué se obtuvo.
  async function attachFile(file: File) {
    if (!file || extracting) return;
    setExtracting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/extract-text", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo leer el archivo");
      setContext((c) => (c ? c + "\n\n" : "") + data.text);
      setShowContext(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setExtracting(false);
    }
  }

  async function uploadImage(file: File) {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("fileName", file.name);
      fd.append("sequenceId", sequenceId || "misc");
      const res = await fetch("/api/email-image", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo subir la imagen");
      const put = await fetch(data.putURL, { method: "PUT", body: file });
      if (!put.ok) throw new Error("Falló la subida a almacenamiento");
      setContent(
        (c: string) =>
          `${c}\n<img src="${data.publicURL}" style="max-width:100%;height:auto;display:block;margin:12px 0" />`
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      {/* Generar con IA */}
      <div className="bg-brand-800/30 border border-brand-100/10 rounded-lg p-3 space-y-2">
        <label className="block text-xs text-brand-100">✨ Generar con IA</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Ej. invita a un taller de React el sábado"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                generateWithAI();
              }
            }}
            className="flex-1 px-3 py-2 bg-brand-900/60 border border-brand-100/20 rounded-lg text-white placeholder-brand-100/50 text-sm focus:outline-none focus:border-brand-500"
          />
          <button
            type="button"
            onClick={generateWithAI}
            disabled={generating || !aiPrompt.trim()}
            className="px-4 py-2 bg-brand-500 text-brand-900 rounded-lg text-sm font-medium hover:bg-brand-400 disabled:opacity-40 whitespace-nowrap"
          >
            {generating ? "Generando…" : "Generar"}
          </button>
        </div>

        {/* Contexto / fuente — opcional y colapsado */}
        <button
          type="button"
          onClick={() => setShowContext((s) => !s)}
          className="text-[11px] text-brand-100 hover:text-white flex items-center gap-1"
        >
          <span>{showContext ? "▾" : "▸"}</span>
          Contexto / fuente (opcional)
        </button>
        {showContext && (
          <div className="space-y-2">
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={4}
              placeholder="Pega info real (de qué trata, datos, links). La IA usará SOLO esto como fuente; no inventará."
              className="w-full px-3 py-2 bg-brand-900/60 border border-brand-100/20 rounded-lg text-white placeholder-brand-100/40 text-sm focus:outline-none focus:border-brand-500"
            />
            <label className="text-xs text-brand-100 hover:text-white cursor-pointer inline-block">
              {extracting ? "Leyendo…" : "📎 Adjuntar md / txt / PDF"}
              <input
                type="file"
                accept=".md,.txt,.pdf,text/markdown,text/plain,application/pdf"
                className="hidden"
                disabled={extracting}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) attachFile(f);
                  e.target.value = "";
                }}
              />
            </label>
            <p className="text-brand-100/50 text-[10px]">
              No se guarda el archivo: se extrae el texto y lo ves aquí para
              editarlo.
            </p>
          </div>
        )}
      </div>

      {/* Contenido: toggle Editar | Vista previa + subir imagen */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex gap-1 text-xs">
            {[
              { id: "preview", label: "Vista previa" },
              { id: "edit", label: "Editar" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setView(t.id as any)}
                className={cn(
                  "px-2.5 py-1 rounded-md transition-colors",
                  view === t.id
                    ? "bg-brand-800 text-white"
                    : "text-brand-100 hover:text-white"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <label className="text-xs text-brand-100 hover:text-white cursor-pointer">
            {uploading ? "Subiendo…" : "📎 Subir imagen"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadImage(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        {/* El textarea siempre montado (name=content) para que se envíe; se
            oculta en preview sin desmontarse. */}
        <textarea
          name="content"
          rows={14}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="HTML del email, o genéralo con IA arriba…"
          className={cn(
            "w-full px-3 py-2 bg-brand-900/60 border border-brand-100/20 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-brand-500",
            view === "preview" && "hidden"
          )}
        />
        {view === "preview" && (
          <div className="border border-brand-100/20 rounded-lg overflow-hidden bg-white">
            <div className="text-[10px] text-gray-500 px-3 py-1 bg-gray-50 border-b border-gray-200 sticky top-0">
              Vista previa
            </div>
            <div
              className="p-3 text-sm text-gray-900"
              dangerouslySetInnerHTML={{
                __html:
                  content ||
                  '<p style="color:#9ca3af">La vista previa aparecerá aquí.</p>',
              }}
            />
          </div>
        )}
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}

function SettingsTab({ sequence, fetcher }: any) {
  return (
    <fetcher.Form
      method="post"
      className="bg-brand-900/40 border border-brand-100/10 rounded-lg p-6 space-y-4 max-w-xl"
    >
      <input type="hidden" name="intent" value="update_sequence" />
      <div>
        <label className="block text-sm text-brand-100 mb-1">Nombre</label>
        <input
          type="text"
          name="name"
          required
          defaultValue={sequence.name}
          className="w-full px-3 py-2 bg-brand-900/60 border border-brand-100/20 rounded-lg text-white focus:outline-none focus:border-brand-500"
        />
      </div>
      <div>
        <label className="block text-sm text-brand-100 mb-1">Descripción</label>
        <textarea
          name="description"
          rows={3}
          defaultValue={sequence.description || ""}
          className="w-full px-3 py-2 bg-brand-900/60 border border-brand-100/20 rounded-lg text-white focus:outline-none focus:border-brand-500"
        />
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          className="bg-brand-500 text-brand-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-400"
        >
          Guardar cambios
        </button>
      </div>
    </fetcher.Form>
  );
}

function SubscriberModal({ enrollment, sequence, onClose }: any) {
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-brand-900 border border-brand-100/20 rounded-lg max-w-lg w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-brand-100/10">
          <div>
            <h3 className="text-white font-semibold">
              {enrollment.subscriber.email}
            </h3>
            <div className="mt-1">{statusPill(enrollment.status)}</div>
          </div>
          <button
            onClick={onClose}
            className="text-brand-100 hover:text-white"
          >
            <FaTimes />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-brand-100 text-xs">Suscrito</div>
              <div className="text-white">
                {new Date(enrollment.enrolledAt).toLocaleDateString("es-MX")}
              </div>
            </div>
            <div>
              <div className="text-brand-100 text-xs">Próximo email</div>
              <div className="text-white">
                {enrollment.nextEmailAt
                  ? new Date(enrollment.nextEmailAt).toLocaleString("es-MX")
                  : "—"}
              </div>
            </div>
          </div>

          <div>
            <div className="text-brand-100 text-xs mb-2">Engagement</div>
            <EngagementBadges enrollment={enrollment} />
            <p className="text-brand-100/60 text-[11px] mt-2">
              D=entregado · O=abrió · C=clic · B=rebote (por suscriptor, no
              conteo)
            </p>
          </div>

          <div>
            <div className="text-brand-100 text-xs mb-2">
              Timeline de emails
            </div>
            <div className="space-y-2">
              {sequence.emails.map((email: any, idx: number) => {
                const sent = idx < enrollment.currentEmailIndex;
                const next =
                  idx === enrollment.currentEmailIndex &&
                  enrollment.status === "active";
                return (
                  <div
                    key={email.id}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full flex-shrink-0",
                        sent
                          ? "bg-green-400"
                          : next
                          ? "bg-brand-500"
                          : "bg-brand-100/20"
                      )}
                    />
                    <span className="text-white truncate flex-1">
                      {email.order}. {email.subject}
                    </span>
                    <span className="text-brand-100 text-xs flex-shrink-0">
                      {sent ? "Enviado" : next ? "Próximo" : "Pendiente"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmailPreviewModal({ email, onClose }: any) {
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-700">
            <div className="font-semibold">{email.subject}</div>
            <div className="text-xs text-gray-500">
              {email.fromName} &lt;{email.fromEmail}&gt;
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <FaTimes />
          </button>
        </div>
        <div
          className="p-6"
          dangerouslySetInnerHTML={{ __html: email.content }}
        />
      </div>
    </div>
  );
}
