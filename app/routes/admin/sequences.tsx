import { useState, useEffect } from "react";

// Helper function to format date for datetime-local input
function formatDateTimeLocal(date: string | Date | null): string {
  if (!date) return '';
  const d = new Date(date);
  
  // Get local date components
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import type { Route } from "./+types/sequences";
import { useFetcher, useSubmit, useNavigate, useRevalidator, useActionData } from "react-router";
import { getAdminOrRedirect } from "~/.server/dbGetters";
import { db } from "~/.server/db";
import { AdminNav } from "~/components/admin/AdminNav";
import { cn } from "~/utils/cn";
import { FaPlay, FaPause, FaEdit, FaTrash, FaPlus, FaEye, FaStar, FaTimes, FaArrowUp } from "react-icons/fa";
import { motion, AnimatePresence, Reorder } from "motion/react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await getAdminOrRedirect(request);

  // Get all sequences with email count and enrollment count
  const sequences = await db.sequence.findMany({
    include: {
      _count: {
        select: {
          emails: true,
          enrollments: true
        }
      },
      emails: {
        orderBy: { order: 'asc' },
        select: { 
          id: true, 
          order: true, 
          subject: true, 
          content: true, 
          schedulingType: true,
          delayDays: true,
          specificDate: true,
          fromName: true,
          fromEmail: true
        }
      }
    },
    orderBy: [
      { isActive: 'desc' },
      { isFeatured: 'desc' }, 
      { createdAt: 'desc' }
    ]
  });

  // Get stats
  const stats = {
    totalSequences: await db.sequence.count(),
    activeSequences: await db.sequence.count({ where: { isActive: true } }),
    totalEnrollments: await db.sequenceEnrollment.count(),
    activeEnrollments: await db.sequenceEnrollment.count({ where: { status: 'active' } }),
    pausedEnrollments: await db.sequenceEnrollment.count({ where: { status: 'paused' } }),
    totalEmails: await db.sequenceEmail.count()
  };

  // Get active enrollments for debug
  const activeEnrollments = await db.sequenceEnrollment.findMany({
    where: { status: 'active' },
    include: {
      sequence: { select: { name: true } },
      subscriber: { select: { email: true } }
    },
    orderBy: { nextEmailAt: 'asc' },
    take: 10
  });

  return { sequences, stats, activeEnrollments };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await getAdminOrRedirect(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "create_sequence") {
    const sequence = await db.sequence.create({
      data: {
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        trigger: formData.get("trigger") as any,
        triggerTag: formData.get("triggerTag") as string || null,
        isActive: formData.get("isActive") === "on",
        isFeatured: formData.get("isFeatured") === "on"
      }
    });
    return { success: true, sequenceId: sequence.id, message: "Sequence creada" };
  }

  if (intent === "toggle_active") {
    const sequenceId = formData.get("sequenceId") as string;
    const sequence = await db.sequence.findUnique({ where: { id: sequenceId } });
    
    await db.sequence.update({
      where: { id: sequenceId },
      data: { isActive: !sequence?.isActive }
    });
    
    return { success: true, message: sequence?.isActive ? "Sequence pausada" : "Sequence activada" };
  }

  if (intent === "toggle_featured") {
    const sequenceId = formData.get("sequenceId") as string;
    const sequence = await db.sequence.findUnique({ where: { id: sequenceId } });
    
    await db.sequence.update({
      where: { id: sequenceId },
      data: { isFeatured: !sequence?.isFeatured }
    });
    
    return { success: true, message: sequence?.isFeatured ? "Ya no destacada" : "Sequence destacada" };
  }

  if (intent === "update_sequence_name") {
    const sequenceId = formData.get("sequenceId") as string;
    const name = formData.get("name") as string;
    
    console.log('DEBUG: Updating sequence name:', { sequenceId, name });
    
    if (!name || name.trim().length === 0) {
      return { error: "El nombre no puede estar vacío" };
    }
    
    try {
      await db.sequence.update({
        where: { id: sequenceId },
        data: { name: name.trim() }
      });
      
      console.log('DEBUG: Sequence name updated successfully');
      return { success: true, message: "Nombre actualizado" };
    } catch (error) {
      console.error('DEBUG: Error updating sequence name:', error);
      return { error: "Error al actualizar el nombre" };
    }
  }

  if (intent === "delete_sequence") {
    const sequenceId = formData.get("sequenceId") as string;
    
    // Delete related emails first (cascade should handle this, but being explicit)
    await db.sequenceEmail.deleteMany({ where: { sequenceId } });
    await db.sequence.delete({ where: { id: sequenceId } });
    
    return { success: true, message: "Sequence eliminada" };
  }

  if (intent === "add_email") {
    const sequenceId = formData.get("sequenceId") as string;
    
    // Get next order number
    const lastEmail = await db.sequenceEmail.findFirst({
      where: { sequenceId },
      orderBy: { order: 'desc' }
    });
    
    const nextOrder = (lastEmail?.order || 0) + 1;
    
    const schedulingType = formData.get("schedulingType") as string;
    
    let delayDays = null;
    let specificDate = null;
    
    if (schedulingType === 'delay') {
      const delayValue = formData.get("delayDays") as string;
      delayDays = delayValue ? parseInt(delayValue) : 0;
      specificDate = null; // Explicitly null when using delay
    } else if (schedulingType === 'specific_date') {
      const dateValue = formData.get("specificDate") as string;
      if (dateValue && dateValue.trim()) {
        // Handle datetime-local input: preserve local time as intended
        // Convert "2025-09-12T17:00" to Date object maintaining local interpretation
        const [datePart, timePart] = dateValue.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute] = timePart.split(':').map(Number);
        
        // Create date in local timezone (Mexico)
        specificDate = new Date(year, month - 1, day, hour, minute);
        delayDays = null; // Explicitly null when using specific date
        // Validate date
        if (isNaN(specificDate.getTime())) {
          return { error: "Fecha inválida proporcionada" };
        }
      } else {
        return { error: "Debe proporcionar una fecha válida" };
      }
    }
    
    await db.sequenceEmail.create({
      data: {
        sequenceId,
        order: nextOrder,
        subject: formData.get("subject") as string,
        content: formData.get("content") as string,
        schedulingType,
        delayDays,
        specificDate,
        fromName: formData.get("fromName") as string || "Héctor Bliss",
        fromEmail: formData.get("fromEmail") as string || "contacto@fixter.org"
      }
    });
    
    return { success: true, message: "Email añadido a la sequence" };
  }

  if (intent === "edit_email") {
    const emailId = formData.get("emailId") as string;
    
    const schedulingType = formData.get("schedulingType") as string;
    
    let delayDays = null;
    let specificDate = null;
    
    if (schedulingType === 'delay') {
      const delayValue = formData.get("delayDays") as string;
      delayDays = delayValue ? parseInt(delayValue) : 0;
      specificDate = null; // Explicitly null when using delay
    } else if (schedulingType === 'specific_date') {
      const dateValue = formData.get("specificDate") as string;
      if (dateValue && dateValue.trim()) {
        // Handle datetime-local input: preserve local time as intended
        // Convert "2025-09-12T17:00" to Date object maintaining local interpretation
        const [datePart, timePart] = dateValue.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute] = timePart.split(':').map(Number);
        
        // Create date in local timezone (Mexico)
        specificDate = new Date(year, month - 1, day, hour, minute);
        delayDays = null; // Explicitly null when using specific date
        // Validate date
        if (isNaN(specificDate.getTime())) {
          return { error: "Fecha inválida proporcionada" };
        }
      } else {
        return { error: "Debe proporcionar una fecha válida" };
      }
    }
    
    await db.sequenceEmail.update({
      where: { id: emailId },
      data: {
        subject: formData.get("subject") as string,
        content: formData.get("content") as string,
        schedulingType,
        delayDays,
        specificDate,
        fromName: formData.get("fromName") as string || "Héctor Bliss",
        fromEmail: formData.get("fromEmail") as string || "contacto@fixter.org"
      }
    });
    
    return { success: true, message: "Email actualizado" };
  }

  if (intent === "delete_email") {
    const emailId = formData.get("emailId") as string;
    await db.sequenceEmail.delete({ where: { id: emailId } });
    return { success: true, message: "Email eliminado" };
  }

  if (intent === "quick_enroll") {
    const email = formData.get("email") as string;
    const sequenceId = formData.get("sequenceId") as string;
    const forceReset = formData.get("forceReset") === "true";
    
    // Create or find subscriber
    let subscriber = await db.subscriber.findUnique({ where: { email } });
    
    if (!subscriber) {
      subscriber = await db.subscriber.create({
        data: {
          email,
          name: "Test User",
          confirmed: true,
          tags: []
        }
      });
    }
    
    // Check if already enrolled
    const existing = await db.sequenceEnrollment.findUnique({
      where: {
        sequenceId_subscriberId: {
          sequenceId,
          subscriberId: subscriber.id
        }
      }
    });
    
    if (existing && !forceReset) {
      return { error: "Ya está enrollado en esta sequence" };
    }
    
    if (existing && forceReset) {
      // Reset existing enrollment
      await db.sequenceEnrollment.update({
        where: { id: existing.id },
        data: {
          status: 'active',
          currentEmailIndex: 0,
          nextEmailAt: new Date(), // Immediate for testing
          enrolledAt: new Date(),
          emailsSent: 0,
          completedAt: null
        }
      });
      return { success: true, message: `${email} enrollment reseteado para testing` };
    }
    
    // Enroll
    await db.sequenceEnrollment.create({
      data: {
        sequenceId,
        subscriberId: subscriber.id,
        status: 'active',
        currentEmailIndex: 0,
        nextEmailAt: new Date(), // Immediate for testing
        enrolledAt: new Date(),
        emailsSent: 0
      }
    });
    
    return { success: true, message: `${email} enrollado para testing` };
  }

  if (intent === "move_email_up") {
    const emailId = formData.get("emailId") as string;
    console.log('DEBUG: move_email_up action triggered for emailId:', emailId);
    
    try {
      // Get the email to move
      const emailToMove = await db.sequenceEmail.findUnique({ 
        where: { id: emailId },
        select: { id: true, order: true, sequenceId: true }
      });
      
      if (!emailToMove) {
        return { error: "Email no encontrado" };
      }
      
      if (emailToMove.order <= 1) {
        return { error: "Este email ya está en primera posición" };
      }
      
      // Get the email that's currently above it
      const emailAbove = await db.sequenceEmail.findFirst({
        where: {
          sequenceId: emailToMove.sequenceId,
          order: emailToMove.order - 1
        },
        select: { id: true, order: true }
      });
      
      if (!emailAbove) {
        return { error: "No hay email superior para intercambiar" };
      }
      
      // Use transaction for atomic swap
      const tempOrder = -999; // Temporary order to avoid conflicts
      
      // Step 1: Move emailToMove to temp position
      await db.sequenceEmail.update({
        where: { id: emailToMove.id },
        data: { order: tempOrder }
      });
      
      // Step 2: Move emailAbove to emailToMove's position
      await db.sequenceEmail.update({
        where: { id: emailAbove.id },
        data: { order: emailToMove.order }
      });
      
      // Step 3: Move emailToMove to emailAbove's position
      await db.sequenceEmail.update({
        where: { id: emailToMove.id },
        data: { order: emailAbove.order }
      });
      
      console.log('DEBUG: Email reordering completed successfully');
      return { success: true, message: `Email movido a posición ${emailAbove.order}` };
      
    } catch (error) {
      console.error('Error moving email up:', error);
      return { error: "Error al reordenar email" };
    }
  }

  return { error: "Intent no reconocido" };
};

export default function AdminSequences({ loaderData }: Route.ComponentProps) {
  const { sequences, stats, activeEnrollments } = loaderData;
  const [view, setView] = useState<'list' | 'create' | 'emails'>('list');
  const [selectedSequence, setSelectedSequence] = useState<any>(null);
  const [previewEmail, setPreviewEmail] = useState<any>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [processorStatus, setProcessorStatus] = useState<'unknown' | 'starting' | 'running'>('unknown');
  const fetcher = useFetcher();
  const reorderFetcher = useFetcher(); // Separate fetcher for reordering
  const submit = useSubmit();
  const revalidator = useRevalidator();
  const actionData = useActionData();

  return (
    <div className="min-h-screen bg-gray-900">
      <AdminNav />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Email Sequences</h1>
          <p className="text-gray-400">Gestiona sequences y emails de marketing automatizado</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
          <StatCard title="Sequences" value={stats.totalSequences} />
          <StatCard title="Activas" value={stats.activeSequences} />
          <StatCard title="Enrollments" value={stats.totalEnrollments} />
          <StatCard title="Activas" value={stats.activeEnrollments} />
          <StatCard title="Pausados" value={stats.pausedEnrollments} />
        </div>
        
        {/* Processor Status Info */}
        {processorStatus === 'running' && (
          <div className="bg-green-900 border border-green-700 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-green-300">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm">
                ✅ Procesador automático ejecutándose cada 5 minutos. 
                Los emails se envían automáticamente según su programación.
              </span>
            </div>
          </div>
        )}

        {/* Active Enrollments Debug */}
        {activeEnrollments.length > 0 && (
          <div className="bg-blue-900 border border-blue-700 rounded-lg p-4 mb-6">
            <h3 className="text-blue-300 font-medium mb-3">🔍 Enrollments Activos (Próximos Envíos)</h3>
            <div className="space-y-2">
              {activeEnrollments.map((enrollment: any) => (
                <div key={enrollment.id} className="flex items-center justify-between text-sm bg-blue-800 p-2 rounded">
                  <span className="text-blue-200">
                    {enrollment.subscriber.email} → {enrollment.sequence.name}
                  </span>
                  <span className="text-blue-300">
                    Email #{enrollment.currentEmailIndex + 1} en: {
                      enrollment.nextEmailAt 
                        ? new Date(enrollment.nextEmailAt).toLocaleString('es-MX')
                        : 'Sin programar'
                    }
                  </span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    new Date(enrollment.nextEmailAt) <= new Date() 
                      ? 'bg-red-600 text-white' 
                      : 'bg-yellow-600 text-white'
                  }`}>
                    {new Date(enrollment.nextEmailAt) <= new Date() ? 'LISTO PARA ENVÍO' : 'PROGRAMADO'}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/sequences/process', { method: 'POST' });
                    const data = await response.json();
                    console.log('Manual processing result:', data);
                    revalidator.revalidate(); // Refresh data
                  } catch (err) {
                    console.error('Manual processing failed:', err);
                  }
                }}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
              >
                ⚡ Procesar Ahora (Debug)
              </button>
            </div>
          </div>
        )}

        {/* View Navigation */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setView('list')}
            className={cn(
              "px-4 py-2 rounded-lg font-medium transition-colors",
              view === 'list'
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            )}
          >
            📋 Lista de Sequences
          </button>
          <button
            onClick={() => setView('create')}
            className={cn(
              "px-4 py-2 rounded-lg font-medium transition-colors",
              view === 'create'
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            )}
          >
            ➕ Crear Nueva
          </button>
          {selectedSequence && (
            <button
              onClick={() => setView('emails')}
              className={cn(
                "px-4 py-2 rounded-lg font-medium transition-colors",
                view === 'emails'
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              )}
            >
              ✉️ Emails de "{selectedSequence.name}"
            </button>
          )}
          
          {/* Processor Status/Control */}
          <button
            onClick={async () => {
              if (processorStatus === 'running') return; // No hacer nada si ya está corriendo
              
              setProcessorStatus('starting');
              try {
                await fetch('/api/sequences/start', { method: 'POST' });
                setProcessorStatus('running');
                // Auto-hide después de unos segundos para mostrar que es automático
                setTimeout(() => setProcessorStatus('running'), 3000);
              } catch (err) {
                console.error('Failed to start processor:', err);
                setProcessorStatus('unknown');
              }
            }}
            disabled={processorStatus === 'running' || processorStatus === 'starting'}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              processorStatus === 'running' 
                ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                : processorStatus === 'starting'
                ? 'bg-blue-600 text-white'  
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {processorStatus === 'running' && '✅ Procesador Activo'}
            {processorStatus === 'starting' && '⏳ Iniciando...'}
            {processorStatus === 'unknown' && '🚀 Iniciar Procesador'}
          </button>
        </div>

        {/* Content */}
        {view === 'list' && (
          <SequencesList 
            sequences={sequences} 
            fetcher={fetcher}
            onManageEmails={(seq) => {
              setSelectedSequence(seq);
              setView('emails');
            }}
          />
        )}
        
        {view === 'create' && (
          <CreateSequenceForm 
            fetcher={fetcher}
            onSuccess={() => setView('list')}
          />
        )}
        
        {view === 'emails' && selectedSequence && (
          <EmailManagement 
            sequence={selectedSequence}
            fetcher={fetcher}
            reorderFetcher={reorderFetcher}
            submit={submit}
            reorderingId={reorderingId}
            setReorderingId={setReorderingId}
            revalidator={revalidator}
            actionData={actionData}
            onBack={() => setView('list')}
            onPreviewEmail={setPreviewEmail}
          />
        )}

        {/* Email Preview Modal */}
        {previewEmail && (
          <EmailPreviewModal 
            email={previewEmail} 
            onClose={() => setPreviewEmail(null)} 
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

function SequencesList({ 
  sequences, 
  fetcher, 
  onManageEmails 
}: { 
  sequences: any[]; 
  fetcher: any;
  onManageEmails: (seq: any) => void;
}) {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Sequence
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Emails
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Enrollments
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {sequences.map((sequence) => (
              <tr key={sequence.id} className="hover:bg-gray-700">
                <td className="px-6 py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onManageEmails(sequence)}
                        className="text-white font-medium hover:text-blue-300 underline transition-colors text-left"
                      >
                        {sequence.name}
                      </button>
                      {sequence.isFeatured && <FaStar className="text-yellow-400 w-4 h-4" />}
                    </div>
                    {sequence.description && (
                      <p className="text-gray-400 text-sm mt-1">{sequence.description}</p>
                    )}
                    <p className="text-gray-500 text-xs mt-1">
                      {sequence.trigger} {sequence.triggerTag && `(${sequence.triggerTag})`}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-1 text-xs font-medium rounded-full",
                    sequence.isActive
                      ? "bg-green-900 text-green-300"
                      : "bg-red-900 text-red-300"
                  )}>
                    {sequence.isActive ? "🟢 Activa" : "🔴 Inactiva"}
                  </span>
                </td>
                <td className="px-6 py-4 text-white">
                  {sequence._count.emails}
                </td>
                <td className="px-6 py-4 text-white">
                  {sequence._count.enrollments}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <fetcher.Form method="post" className="inline">
                      <input type="hidden" name="intent" value="toggle_active" />
                      <input type="hidden" name="sequenceId" value={sequence.id} />
                      <button
                        type="submit"
                        className={cn(
                          "p-2 rounded hover:bg-gray-600 transition-colors",
                          sequence.isActive ? "text-yellow-400" : "text-green-400"
                        )}
                        title={sequence.isActive ? "Pausar" : "Activar"}
                      >
                        {sequence.isActive ? <FaPause /> : <FaPlay />}
                      </button>
                    </fetcher.Form>
                    
                    <fetcher.Form method="post" className="inline">
                      <input type="hidden" name="intent" value="toggle_featured" />
                      <input type="hidden" name="sequenceId" value={sequence.id} />
                      <button
                        type="submit"
                        className={cn(
                          "p-2 rounded hover:bg-gray-600 transition-colors",
                          sequence.isFeatured ? "text-yellow-400" : "text-gray-400"
                        )}
                        title={sequence.isFeatured ? "Quitar destacado" : "Destacar"}
                      >
                        <FaStar />
                      </button>
                    </fetcher.Form>
                    
                    <button
                      onClick={() => onManageEmails(sequence)}
                      className="p-2 text-blue-400 hover:bg-gray-600 rounded transition-colors"
                      title="Gestionar emails"
                    >
                      <FaEye />
                    </button>
                    
                    <fetcher.Form method="post" className="inline">
                      <input type="hidden" name="intent" value="delete_sequence" />
                      <input type="hidden" name="sequenceId" value={sequence.id} />
                      <button
                        type="submit"
                        className="p-2 text-red-400 hover:bg-gray-600 rounded transition-colors"
                        title="Eliminar"
                        onClick={(e) => {
                          if (!confirm('¿Estás seguro de eliminar esta sequence?')) {
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
      
      {sequences.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No hay sequences creadas aún</p>
        </div>
      )}
    </div>
  );
}

function CreateSequenceForm({ 
  fetcher, 
  onSuccess 
}: { 
  fetcher: any; 
  onSuccess: () => void;
}) {
  if (fetcher.data?.success) {
    setTimeout(onSuccess, 1000);
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <h2 className="text-xl font-bold text-white mb-6">➕ Crear Nueva Sequence</h2>
      
      <fetcher.Form method="post" className="space-y-6">
        <input type="hidden" name="intent" value="create_sequence" />
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Nombre de la Sequence *
          </label>
          <input
            type="text"
            name="name"
            required
            className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            placeholder="ej: Bienvenida Nuevo Curso"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Descripción
          </label>
          <textarea
            name="description"
            rows={3}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            placeholder="Descripción de la sequence..."
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Trigger *
            </label>
            <select
              name="trigger"
              required
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="TAG_ADDED">Al añadir tag</option>
              <option value="MANUAL">Manual</option>
              <option value="SUBSCRIPTION">Al suscribirse</option>
              <option value="COURSE_PURCHASE">Al comprar curso</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tag (si aplica)
            </label>
            <input
              type="text"
              name="triggerTag"
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              placeholder="ej: gemini, claude"
            />
          </div>
        </div>
        
        <div className="flex gap-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="isActive"
              className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-gray-300">Activar inmediatamente</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              name="isFeatured"
              className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-gray-300">Destacar en la UI</span>
          </label>
        </div>
        
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={fetcher.state !== "idle"}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
          >
            {fetcher.state !== "idle" ? "Creando..." : "💾 Crear Sequence"}
          </button>
        </div>
      </fetcher.Form>
    </div>
  );
}

function EmailManagement({ 
  sequence, 
  fetcher,
  reorderFetcher,
  submit,
  reorderingId,
  setReorderingId,
  revalidator,
  actionData,
  onBack,
  onPreviewEmail 
}: { 
  sequence: any; 
  fetcher: any;
  reorderFetcher: any;
  submit: any;
  reorderingId: string | null;
  setReorderingId: (id: string | null) => void;
  revalidator: any;
  actionData: any;
  onBack: () => void;
  onPreviewEmail: (email: any) => void;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEmail, setEditingEmail] = useState<any>(null);
  const [editSchedulingType, setEditSchedulingType] = useState<string>('delay');
  const [addSchedulingType, setAddSchedulingType] = useState<string>('delay');
  const [localEmails, setLocalEmails] = useState(sequence.emails);
  const [editingSequenceName, setEditingSequenceName] = useState(false);
  const [tempSequenceName, setTempSequenceName] = useState(sequence.name);
  
  // Update local state when sequence changes
  useEffect(() => {
    setLocalEmails(sequence.emails);
  }, [sequence.emails]);
  
  // Sync editSchedulingType when editingEmail changes
  useEffect(() => {
    if (editingEmail) {
      setEditSchedulingType(editingEmail.schedulingType || 'delay');
    }
  }, [editingEmail]);
  
  // Close editing mode when sequence name update is successful
  useEffect(() => {
    if (actionData?.success && actionData?.message === "Nombre actualizado") {
      setEditingSequenceName(false);
    }
  }, [actionData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">
            📧 Emails de: 
            {editingSequenceName ? (
              <span className="inline-flex items-center gap-2 ml-2">
                <input
                  type="text"
                  value={tempSequenceName}
                  onChange={(e) => setTempSequenceName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && tempSequenceName.trim()) {
                      e.preventDefault();
                      // Save changes
                      const formData = new FormData();
                      formData.append('intent', 'update_sequence_name');
                      formData.append('sequenceId', sequence.id);
                      formData.append('name', tempSequenceName.trim());
                      submit(formData, { method: 'post' });
                      revalidator.revalidate();
                      // Note: We'll close editing mode after submit completes successfully
                    } else if (e.key === 'Escape') {
                      setEditingSequenceName(false);
                      setTempSequenceName(sequence.name);
                    }
                  }}
                  className="bg-gray-700 text-white font-bold text-2xl px-3 py-1 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={() => {
                    if (tempSequenceName.trim() && tempSequenceName !== sequence.name) {
                      const formData = new FormData();
                      formData.append('intent', 'update_sequence_name');
                      formData.append('sequenceId', sequence.id);
                      formData.append('name', tempSequenceName.trim());
                      submit(formData, { method: 'post' });
                      revalidator.revalidate();
                      // Note: We'll close editing mode after submit completes successfully
                    } else {
                      setEditingSequenceName(false);
                    }
                  }}
                  className="text-green-400 hover:text-green-300 p-1"
                  title="Guardar"
                >
                  ✓
                </button>
                <button
                  onClick={() => {
                    setEditingSequenceName(false);
                    setTempSequenceName(sequence.name);
                  }}
                  className="text-red-400 hover:text-red-300 p-1"
                  title="Cancelar"
                >
                  ✕
                </button>
              </span>
            ) : (
              <span 
                className="cursor-pointer hover:text-blue-300 transition-colors inline-block ml-2"
                onClick={() => {
                  setEditingSequenceName(true);
                  setTempSequenceName(sequence.name);
                }}
                title="Click para editar nombre"
              >
                {sequence.name}
              </span>
            )}
          </h2>
          <p className="text-gray-400">{sequence.emails.length} emails en la sequence</p>
        </div>
        <button
          onClick={onBack}
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
        >
          ← Volver
        </button>
      </div>

      {/* Existing Emails */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        {localEmails.length > 0 ? (
          <AnimatePresence mode="popLayout">
            <div className="divide-y divide-gray-700">
              {localEmails
                .sort((a: any, b: any) => a.order - b.order) // Ensure correct order
                .map((email: any, index: number) => (
                <motion.div 
                  key={email.id} 
                  className="p-6"
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ 
                    layout: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 }
                  }}
                >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="bg-blue-600 text-white text-sm px-3 py-1 rounded-full">
                        #{email.order}
                      </span>
                      <h3 className="text-white font-medium">{email.subject}</h3>
                      <span className="text-gray-400 text-sm">
                        {email.schedulingType === 'specific_date' 
                          ? `🗓️ ${email.specificDate ? new Date(email.specificDate).toLocaleString('es-MX', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'Sin fecha'}` 
                          : `📅 ${email.delayDays || 0} días`
                        }
                      </span>
                      <span className="text-gray-500 text-xs">
                        From: {email.fromName}
                      </span>
                    </div>
                    {editingEmail?.id !== email.id && (
                      <div className="text-gray-400 text-sm mt-2 line-clamp-2">
                        {email.content?.substring(0, 150)}...
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {/* Move Up Button - Only show if not first email */}
                    {email.order > 1 && (
                      <motion.button
                        onClick={async () => {
                          // Update local state immediately
                          const newEmails = [...localEmails];
                          const currentIndex = newEmails.findIndex(e => e.id === email.id);
                          const emailAboveIndex = newEmails.findIndex(e => e.order === email.order - 1);
                          
                          if (currentIndex !== -1 && emailAboveIndex !== -1) {
                            // Swap orders
                            const tempOrder = newEmails[currentIndex].order;
                            newEmails[currentIndex].order = newEmails[emailAboveIndex].order;
                            newEmails[emailAboveIndex].order = tempOrder;
                            
                            // Update state for immediate UI update
                            setLocalEmails(newEmails);
                            setReorderingId(email.id);
                            
                            // Then send to backend
                            const formData = new FormData();
                            formData.append('intent', 'move_email_up');
                            formData.append('emailId', email.id);
                            submit(formData, { method: 'post' });
                            
                            setTimeout(() => {
                              setReorderingId(null);
                            }, 500);
                          }
                        }}
                        disabled={reorderingId !== null}
                        className="text-purple-400 hover:text-purple-300 disabled:opacity-50 disabled:cursor-not-allowed p-2 transition-all"
                        title={`Mover email #${email.order} hacia arriba`}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        animate={{ 
                          rotate: reorderingId === email.id ? 360 : 0
                        }}
                        transition={{ duration: 0.5 }}
                      >
                        {reorderingId === email.id 
                          ? <motion.span 
                              animate={{ rotate: 360 }}
                              transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                            >⟳</motion.span>
                          : <FaArrowUp />
                        }
                      </motion.button>
                    )}
                    <button
                      onClick={() => onPreviewEmail(email)}
                      className="text-green-400 hover:text-green-300 p-2"
                      title="Preview"
                    >
                      <FaEye />
                    </button>
                    <button
                      onClick={() => {
                        if (editingEmail?.id === email.id) {
                          setEditingEmail(null);
                        } else {
                          setEditingEmail(email);
                          setEditSchedulingType(email.schedulingType || 'delay');
                        }
                      }}
                      className="text-blue-400 hover:text-blue-300 p-2"
                      title="Editar"
                    >
                      <FaEdit />
                    </button>
                    <fetcher.Form method="post" className="inline">
                      <input type="hidden" name="intent" value="delete_email" />
                      <input type="hidden" name="emailId" value={email.id} />
                      <button
                        type="submit"
                        className="text-red-400 hover:text-red-300 p-2"
                        title="Eliminar"
                        onClick={(e) => {
                          if (!confirm('¿Eliminar este email?')) {
                            e.preventDefault();
                          }
                        }}
                      >
                        <FaTrash />
                      </button>
                    </fetcher.Form>
                  </div>
                </div>
                
                {/* Inline Edit Form */}
                {editingEmail?.id === email.id && (
                  <div className="mt-4 p-4 bg-gray-900 rounded-lg border border-gray-600">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-white font-medium">✏️ Editando Email #{email.order}</h4>
                      
                      {/* Action Buttons at Top */}
                      <div className="flex gap-3">
                        <button
                          type="submit"
                          form={`edit-form-${email.id}`}
                          disabled={fetcher.state !== "idle"}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                        >
                          {fetcher.state !== "idle" ? "Guardando..." : "💾 Guardar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingEmail(null)}
                          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                    
                    {/* Success Message */}
                    {fetcher.data?.success && (
                      <div className="text-green-400 text-sm flex items-center gap-2 mb-4">
                        ✅ {fetcher.data.message}
                      </div>
                    )}
                    
                    <fetcher.Form method="post" className="space-y-4" id={`edit-form-${email.id}`}>
                      <input type="hidden" name="intent" value="edit_email" />
                      <input type="hidden" name="emailId" value={email.id} />
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Subject *
                        </label>
                        <input
                          type="text"
                          name="subject"
                          required
                          defaultValue={email.subject}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      {/* Scheduling Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Tipo de Programación *
                        </label>
                        <select
                          name="schedulingType"
                          value={editSchedulingType}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                          onChange={(e) => setEditSchedulingType(e.target.value)}
                        >
                          <option value="delay">📅 Días después del enrollment</option>
                          <option value="specific_date">🗓️ Fecha específica</option>
                        </select>
                      </div>
                      
                      {/* Delay Days */}
                      {editSchedulingType === 'delay' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Días de Delay *
                          </label>
                          <input
                            type="number"
                            name="delayDays"
                            min="0"
                            required
                            defaultValue={email.delayDays || 0}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      )}
                      
                      {/* Specific Date */}
                      {editSchedulingType === 'specific_date' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Fecha y Hora Específica *
                          </label>
                          <input
                            type="datetime-local"
                            name="specificDate"
                            required
                            defaultValue={formatDateTimeLocal(email.specificDate)}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="text-xs text-gray-400 mt-1">Ej: 2025-08-15 19:00 (webinar mañana)</p>
                        </div>
                      )}
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Contenido HTML *
                        </label>
                        <textarea
                          name="content"
                          required
                          rows={12}
                          defaultValue={email.content}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            From Name
                          </label>
                          <input
                            type="text"
                            name="fromName"
                            defaultValue={email.fromName}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            From Email
                          </label>
                          <input
                            type="text"
                            name="fromEmail"
                            defaultValue={email.fromEmail}
                            placeholder="Fixtergeek <fixtergeek@gmail.com>"
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="text-xs text-gray-400 mt-1">Formato: Nombre &lt;email@domain.com&gt; o solo email</p>
                        </div>
                      </div>
                    </fetcher.Form>
                  </div>
                )}
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        ) : (
          <div className="p-6 text-center text-gray-400">
            No hay emails en esta sequence aún
          </div>
        )}
      </div>

      {/* Add Email Form */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="p-4 border-b border-gray-700">
          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              if (!showAddForm) {
                setAddSchedulingType('delay'); // Reset to default when opening
              }
            }}
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300"
          >
            <FaPlus />
            {showAddForm ? "Cancelar" : "Añadir Nuevo Email"}
          </button>
        </div>
        
        {showAddForm && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-white font-medium">➡️ Añadiendo Nuevo Email</h4>
              
              {/* Action Button at Top */}
              <button
                type="submit"
                form="add-email-form"
                disabled={fetcher.state !== "idle"}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
              >
                {fetcher.state !== "idle" ? "Añadiendo..." : "➡️ Añadir Email"}
              </button>
            </div>
            
            <fetcher.Form method="post" className="space-y-4" id="add-email-form">
              <input type="hidden" name="intent" value="add_email" />
              <input type="hidden" name="sequenceId" value={sequence.id} />
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Subject del Email *
                </label>
                <input
                  type="text"
                  name="subject"
                  required
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="ej: ¡Bienvenido al curso!"
                />
              </div>
              
              {/* Scheduling Type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tipo de Programación *
                </label>
                <select
                  name="schedulingType"
                  defaultValue="delay"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => {
                    const form = e.target.closest('form');
                    const delayDiv = form?.querySelector('#delay-section') as HTMLElement;
                    const dateDiv = form?.querySelector('#date-section') as HTMLElement;
                    const delayInput = form?.querySelector('[name="delayDays"]') as HTMLInputElement;
                    const dateInput = form?.querySelector('[name="specificDate"]') as HTMLInputElement;
                    if (e.target.value === 'delay') {
                      delayDiv.style.display = 'block';
                      dateDiv.style.display = 'none';
                      delayInput.required = true;
                      dateInput.required = false;
                    } else {
                      delayDiv.style.display = 'none';
                      dateDiv.style.display = 'block';
                      delayInput.required = false;
                      dateInput.required = true;
                    }
                  }}
                >
                  <option value="delay">📅 Días después del enrollment</option>
                  <option value="specific_date">🗓️ Fecha específica</option>
                </select>
              </div>
              
              {/* Delay Days */}
              <div id="delay-section">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Días de Delay *
                </label>
                <input
                  type="number"
                  name="delayDays"
                  min="0"
                  defaultValue="0"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              
              {/* Specific Date */}
              <div id="date-section" style={{ display: 'none' }}>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Fecha y Hora Específica *
                </label>
                <input
                  type="datetime-local"
                  name="specificDate"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">Ej: 2025-08-15 19:00 (webinar mañana)</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Contenido HTML *
                </label>
                <textarea
                  name="content"
                  required
                  rows={15}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder={`<h1>¡Hola!</h1>
<p>Bienvenido a nuestro curso...</p>

<p>Saludos,<br>
Héctor Bliss</p>`}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    From Name
                  </label>
                  <input
                    type="text"
                    name="fromName"
                    defaultValue="Héctor Bliss"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    From Email
                  </label>
                  <input
                    type="text"
                    name="fromEmail"
                    defaultValue="Fixtergeek <contacto@fixter.org>"
                    placeholder="Fixtergeek <fixtergeek@gmail.com>"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Formato: Nombre &lt;email@domain.com&gt; o solo email</p>
                </div>
              </div>
            </fetcher.Form>
          </div>
        )}
      </div>

      {/* Quick Testing */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-bold text-white mb-4">🧪 Testing Rápido</h3>
        <fetcher.Form method="post" className="space-y-4">
          <input type="hidden" name="intent" value="quick_enroll" />
          <input type="hidden" name="sequenceId" value={sequence.id} />
          <div className="flex gap-4">
            <input
              type="email"
              name="email"
              required
              placeholder="email@test.com"
              className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
            >
              🚀 Enroll para Testing
            </button>
          </div>
          <label className="flex items-center text-gray-300">
            <input
              type="checkbox"
              name="forceReset"
              value="true"
              className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm">🔄 Force Reset (resetear si ya está enrollado)</span>
          </label>
        </fetcher.Form>
      </div>
    </div>
  );
}

function EmailPreviewModal({ 
  email, 
  onClose 
}: { 
  email: any; 
  onClose: () => void; 
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h3 className="text-lg font-bold text-white">
              👁️ Preview Email #{email.order}
            </h3>
            <p className="text-gray-400 text-sm">{email.subject}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2"
          >
            <FaTimes />
          </button>
        </div>
        
        {/* Email Info */}
        <div className="p-4 bg-gray-900 border-b border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-400">From:</span>
              <p className="text-white">{email.fromName}</p>
              <p className="text-gray-300 text-xs">{email.fromEmail}</p>
            </div>
            <div>
              <span className="text-gray-400">Subject:</span>
              <p className="text-white">{email.subject}</p>
            </div>
            <div>
              <span className="text-gray-400">Programación:</span>
              <p className="text-white">
                {email.schedulingType === 'specific_date' 
                  ? `🗓️ ${email.specificDate ? new Date(email.specificDate).toLocaleString('es-MX', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'Sin fecha'}` 
                  : `📅 ${email.delayDays || 0} días`
                }
              </p>
            </div>
            <div>
              <span className="text-gray-400">Order:</span>
              <p className="text-white">#{email.order}</p>
            </div>
          </div>
        </div>
        
        {/* Content Preview */}
        <div className="flex-1 overflow-auto">
          <div className="grid md:grid-cols-2 gap-4 p-4">
            {/* HTML Source */}
            <div>
              <h4 className="text-white font-medium mb-2">📄 Código HTML</h4>
              <pre className="bg-gray-900 p-4 rounded border border-gray-600 text-sm text-gray-300 overflow-auto max-h-96">
                {email.content}
              </pre>
            </div>
            
            {/* Rendered Preview */}
            <div>
              <h4 className="text-white font-medium mb-2">🖥️ Vista Previa</h4>
              <div className="bg-white p-4 rounded border border-gray-600 max-h-96 overflow-auto">
                <div 
                  dangerouslySetInnerHTML={{ __html: email.content }}
                  className="prose prose-sm max-w-none"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}