import { useState, useEffect } from "react";
import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import type { Route } from "./+types/newsletters";
import { getUserOrRedirect, getUserOrNull } from "~/.server/dbGetters";
import { db } from "~/.server/db";
import getMetaTags from "~/utils/getMetaTags";
import { cn } from "~/utils/cn";
import { PrimaryButton } from "~/components/common/PrimaryButton";
import { useFetcher } from "react-router";
import { FaPause, FaPlay } from "react-icons/fa";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await getUserOrNull(request);
  
  let subscriber = null;
  let enrolledSequences: any[] = [];
  let pausedSequences: any[] = [];
  
  // Get user's current subscriber info only if user is logged in
  if (user) {
    subscriber = await db.subscriber.findUnique({
      where: { email: user.email },
      include: {
        sequenceEnrollments: {
          include: {
            sequence: {
              include: {
                emails: {
                  select: { id: true }
                }
              }
            }
          },
          where: {
            status: { in: ['active', 'paused'] }
          },
          orderBy: { enrolledAt: 'desc' }
        }
      }
    });
    
    // Separar sequences activas y pausadas
    const allEnrollments = subscriber?.sequenceEnrollments || [];
    enrolledSequences = allEnrollments.filter(e => e.status === 'active');
    pausedSequences = allEnrollments.filter(e => e.status === 'paused');
  }

  // Get all sequences to show in discover (both enrolled and available)
  const enrolledSequenceIds = enrolledSequences.map(e => e.sequenceId) || [];
  
  const allSequences = await db.sequence.findMany({
    where: {
      isActive: true
    },
    select: {
      id: true,
      name: true,
      description: true,
      trigger: true,
      triggerTag: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 6
  });
  
  // Marcar temporalmente Gemini como featured mientras Prisma actualiza el schema
  const sequencesWithFeatured = allSequences.map(seq => ({
    ...seq,
    isFeatured: seq.name === 'Pre-Webinar | Gemini-CLI'
  }));

  return { 
    user, 
    subscriber,
    enrolledSequences,
    pausedSequences,
    allSequences: sequencesWithFeatured,
    enrolledSequenceIds,
    isSubscribed: !!subscriber?.confirmed,
    isLoggedIn: !!user
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const user = await getUserOrRedirect(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  
  if (intent === "pause_sequence") {
    const sequenceId = formData.get("sequenceId") as string;
    
    const subscriber = await db.subscriber.findUnique({
      where: { email: user.email }
    });
    
    if (subscriber) {
      // Pausar pero mantener currentEmailIndex para poder retomar
      await db.sequenceEnrollment.updateMany({
        where: {
          subscriberId: subscriber.id,
          sequenceId: sequenceId
        },
        data: {
          status: 'paused'
          // currentEmailIndex se mantiene intacto
        }
      });
    }
    
    return { success: true };
  }
  
  if (intent === "resume_sequence") {
    const sequenceId = formData.get("sequenceId") as string;
    
    const subscriber = await db.subscriber.findUnique({
      where: { email: user.email }
    });
    
    if (subscriber) {
      // Buscar el enrollment pausado
      const enrollment = await db.sequenceEnrollment.findUnique({
        where: {
          sequenceId_subscriberId: {
            sequenceId,
            subscriberId: subscriber.id
          }
        }
      });
      
      if (enrollment && enrollment.status === 'paused') {
        // Calcular el próximo email basado en el currentEmailIndex actual
        const sequence = await db.sequence.findUnique({
          where: { id: sequenceId },
          include: {
            emails: {
              where: { order: { gte: enrollment.currentEmailIndex } },
              orderBy: { order: 'asc' },
              take: 1
            }
          }
        });
        
        const nextEmail = sequence?.emails[0];
        const nextEmailAt = nextEmail 
          ? new Date(Date.now() + (nextEmail.delayDays * 24 * 60 * 60 * 1000))
          : null;
        
        // Reanudar desde donde quedó
        await db.sequenceEnrollment.update({
          where: {
            sequenceId_subscriberId: {
              sequenceId,
              subscriberId: subscriber.id
            }
          },
          data: {
            status: 'active',
            nextEmailAt
            // currentEmailIndex se mantiene para continuar desde donde pausó
          }
        });
      }
    }
    
    return { success: true };
  }
  
  if (intent === "join_sequence") {
    const sequenceId = formData.get("sequenceId") as string;
    
    let subscriber = await db.subscriber.findUnique({
      where: { email: user.email }
    });
    
    if (!subscriber) {
      subscriber = await db.subscriber.create({
        data: {
          email: user.email,
          name: user.displayName || user.username,
          confirmed: true,
          tags: []
        }
      });
    }
    
    // Check if already enrolled
    const existingEnrollment = await db.sequenceEnrollment.findUnique({
      where: {
        sequenceId_subscriberId: {
          sequenceId,
          subscriberId: subscriber.id
        }
      }
    });
    
    if (!existingEnrollment) {
      // Get sequence to calculate first email timing
      const sequence = await db.sequence.findUnique({
        where: { id: sequenceId },
        include: {
          emails: {
            orderBy: { order: 'asc' },
            take: 1
          }
        }
      });
      
      const firstEmail = sequence?.emails[0];
      const nextEmailAt = firstEmail 
        ? new Date(Date.now() + (firstEmail.delayDays * 24 * 60 * 60 * 1000))
        : null;
      
      await db.sequenceEnrollment.create({
        data: {
          sequenceId,
          subscriberId: subscriber.id,
          status: 'active',
          currentEmailIndex: 0,
          nextEmailAt,
          enrolledAt: new Date(),
          emailsSent: 0
        }
      });
    }
    
    return { success: true };
  }
  
  if (intent === "delete_account") {
    // First pause all active sequence enrollments
    const subscriber = await db.subscriber.findUnique({
      where: { email: user.email }
    });
    
    if (subscriber) {
      // Pause all active enrollments
      await db.sequenceEnrollment.updateMany({
        where: {
          subscriberId: subscriber.id,
          status: 'active'
        },
        data: {
          status: 'paused'
        }
      });
      
      // Delete subscriber record
      await db.subscriber.delete({
        where: { email: user.email }
      });
    }
    
    return { deleted: true };
  }

  if (intent === "update_settings") {
    const frequency = formData.get("frequency") as string;
    const notifications = formData.get("notifications") === "on";
    const digest = formData.get("digest") === "on";
    
    const subscriber = await db.subscriber.findUnique({
      where: { email: user.email }
    });
    
    if (subscriber) {
      // For now we'll use tags array to store preferences
      // In a real implementation, you'd add these fields to the schema
      const preferences = {
        frequency,
        notifications,
        digest
      };
      
      await db.subscriber.update({
        where: { id: subscriber.id },
        data: {
          tags: [
            ...subscriber.tags.filter(tag => !tag.startsWith('pref:')),
            `pref:${JSON.stringify(preferences)}`
          ]
        }
      });
    }
    
    return { success: true };
  }
  
  return { error: "Invalid intent" };
};

export const meta = () =>
  getMetaTags({
    title: "Email Sequences",
    description: "Administra tus secuencias de email y descubre nuevo contenido automatizado",
  });

export default function Route({
  loaderData: { user, subscriber, enrolledSequences, pausedSequences, allSequences, enrolledSequenceIds, isSubscribed, isLoggedIn },
}: Route.ComponentProps) {
  // Inicializar tab desde localStorage o usar default
  const [activeTab, setActiveTab] = useState<"subscriptions" | "discover" | "settings">(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('newsletter-active-tab');
      if (saved === 'subscriptions' || saved === 'discover' || saved === 'settings') {
        return saved;
      }
    }
    return "subscriptions";
  });
  
  const fetcher = useFetcher();
  
  // Guardar en localStorage cuando cambie el tab
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('newsletter-active-tab', activeTab);
    }
  }, [activeTab]);

  // Show success message if subscription was deleted
  if (fetcher.data?.deleted) {
    return (
      <article className="min-h-screen py-20">
        <section className="max-w-4xl mx-auto px-4 md:px-[5%] xl:px-0">
          <div className="text-center py-16">
            <div className="text-6xl mb-6">✅</div>
            <h1 className="text-3xl font-bold text-white mb-4">
              Suscripción eliminada
            </h1>
            <p className="text-brand-100 mb-8">
              Has sido desuscrito exitosamente de todos nuestros newsletters.
            </p>
            <div className="space-y-3 text-sm text-brand-300">
              <p>• Todas tus sequences han sido pausadas</p>
              <p>• No recibirás más emails automáticos</p>
              <p>• Puedes volver a suscribirte cuando quieras</p>
            </div>
          </div>
        </section>
      </article>
    );
  }

  return (
    <>
      <article className="min-h-screen py-20 pb-32">
        <section className="max-w-4xl mx-auto px-4 md:px-[5%] xl:px-0">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Email Sequences
            </h1>
            <p className="text-xl text-brand-100 font-light">
              Administra tus secuencias automáticas y descubre nuevo contenido
            </p>
          </div>

          {/* Tabs */}
          <div className="flex justify-center mb-8">
            <div className="bg-brand-900/60 rounded-full p-1">
              <button
                onClick={() => setActiveTab("subscriptions")}
                className={cn(
                  "px-6 py-2 rounded-full transition-all text-sm font-medium",
                  activeTab === "subscriptions"
                    ? "bg-brand-500 text-brand-900"
                    : "text-brand-100 hover:text-white"
                )}
              >
                Mis Sequences
              </button>
              <button
                onClick={() => setActiveTab("discover")}
                className={cn(
                  "px-6 py-2 rounded-full transition-all text-sm font-medium",
                  activeTab === "discover"
                    ? "bg-brand-500 text-brand-900"
                    : "text-brand-100 hover:text-white"
                )}
              >
                Descubrir
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={cn(
                  "px-6 py-2 rounded-full transition-all text-sm font-medium",
                  activeTab === "settings"
                    ? "bg-brand-500 text-brand-900"
                    : "text-brand-100 hover:text-white"
                )}
              >
                Configuración
              </button>
            </div>
          </div>

          {/* Content */}
          {activeTab === "subscriptions" ? (
            <SequencesTab 
              enrolledSequences={enrolledSequences}
              pausedSequences={pausedSequences} 
              isSubscribed={isSubscribed}
              fetcher={fetcher}
              isLoggedIn={isLoggedIn}
            />
          ) : activeTab === "discover" ? (
            <DiscoverTab 
              sequences={allSequences}
              enrolledSequenceIds={enrolledSequenceIds}
              fetcher={fetcher}
              isLoggedIn={isLoggedIn}
            />
          ) : (
            <SettingsTab 
              subscriber={subscriber}
              fetcher={fetcher}
              isLoggedIn={isLoggedIn}
            />
          )}
        </section>
      </article>

      {/* Fixed Banner for non-logged users */}
      {!isLoggedIn && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-brand-700/95 to-brand-500/95 backdrop-blur-md border-t border-brand-100/20 shadow-2xl z-50">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="text-2xl">📧</div>
                <div>
                  <h3 className="text-white font-semibold text-lg">
                    ¡Suscríbete al Newsletter de FixterGeek!
                  </h3>
                  <p className="text-brand-100 text-sm">
                    Accede a sequences automáticas, contenido exclusivo y mantente al día con las últimas tendencias tech.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 ml-4">
              <a
                href="/login"
                className="text-brand-100 hover:text-white text-sm underline transition-colors"
              >
                Iniciar Sesión
              </a>
              <a
                href="/subscribe"
                className="bg-white text-brand-900 px-6 py-2 rounded-full font-medium hover:bg-brand-100 transition-colors"
              >
                Suscribirme Gratis
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SequencesTab({ 
  enrolledSequences,
  pausedSequences, 
  isSubscribed, 
  fetcher,
  isLoggedIn 
}: { 
  enrolledSequences: any[];
  pausedSequences: any[]; 
  isSubscribed: boolean;
  fetcher: any;
  isLoggedIn: boolean;
}) {
  if (!isSubscribed || (!enrolledSequences?.length && !pausedSequences?.length)) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-6">🤖</div>
        <h2 className="text-2xl font-bold text-white mb-4">
          No tienes sequences activas
        </h2>
        <p className="text-brand-100 mb-8">
          Explora la sección "Descubrir" para encontrar sequences interesantes
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {enrolledSequences.map((enrollment: any) => (
          <div
            key={enrollment.id}
            className="bg-brand-900/40 border border-brand-100/10 rounded-lg p-6 hover:border-brand-500/30 transition-colors"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-white leading-tight">
                {enrollment.sequence.name}
              </h3>
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                enrollment.status === 'active' 
                  ? 'text-green-400 bg-green-900/60'
                  : 'text-yellow-400 bg-yellow-900/60'
              }`}>
                {enrollment.status === 'active' ? 'Activa' : 'Pausada'}
              </span>
            </div>
            
            {/* Description */}
            <p className="text-brand-100 mb-6 text-sm leading-relaxed">
              {enrollment.sequence.description || "Secuencia de emails automatizada"}
            </p>
            
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-brand-800/30 rounded-lg p-3">
                <div className="text-brand-300 text-xs font-medium mb-1">Progreso</div>
                <div className="text-white text-lg font-semibold">
                  {enrollment.sequence.emails?.length > 0 
                    ? Math.round((enrollment.emailsSent / enrollment.sequence.emails.length) * 100)
                    : 0}%
                </div>
              </div>
              {enrollment.nextEmailAt && (
                <div className="bg-brand-800/30 rounded-lg p-3">
                  <div className="text-brand-300 text-xs font-medium mb-1">Próximo email</div>
                  <div className="text-white text-sm font-medium">
                    {new Date(enrollment.nextEmailAt).toLocaleDateString('es-MX', { 
                      day: 'numeric', 
                      month: 'short' 
                    })}
                  </div>
                </div>
              )}
            </div>
            
            {/* Actions */}
            <div className="flex justify-end">
              <fetcher.Form method="post">
                <input type="hidden" name="intent" value="pause_sequence" />
                <input type="hidden" name="sequenceId" value={enrollment.sequenceId} />
                <button
                  type="submit"
                  className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 text-sm font-medium transition-colors"
                  disabled={fetcher.state !== "idle" && fetcher.formData?.get("intent") === "pause_sequence" && fetcher.formData?.get("sequenceId") === enrollment.sequenceId}
                >
                  {fetcher.state !== "idle" && fetcher.formData?.get("intent") === "pause_sequence" && fetcher.formData?.get("sequenceId") === enrollment.sequenceId ? (
                    "Pausando..."
                  ) : (
                    <>
                      <FaPause className="w-3 h-3" />
                      Pausar
                    </>
                  )}
                </button>
              </fetcher.Form>
            </div>
          </div>
        ))}
      </div>

      {/* Sequences Pausadas */}
      {pausedSequences && pausedSequences.length > 0 && (
        <>
          <div className="mt-12 mb-6">
            <h3 className="text-xl font-semibold text-white">Sequences Pausadas</h3>
            <p className="text-brand-100 text-sm mt-1">
              Puedes reanudar estas sequences para continuar donde lo dejaste
            </p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pausedSequences.map((enrollment: any) => (
              <div
                key={enrollment.id}
                className="bg-brand-900/30 border border-brand-100/5 rounded-lg p-6 opacity-80 hover:opacity-100 transition-opacity"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white/80 leading-tight">
                    {enrollment.sequence.name}
                  </h3>
                  <span className="text-xs px-3 py-1 rounded-full font-medium text-gray-400 bg-gray-900/60">
                    ⏸️ Pausada
                  </span>
                </div>
                
                {/* Description */}
                <p className="text-brand-100/70 mb-6 text-sm leading-relaxed">
                  {enrollment.sequence.description || "Secuencia de emails automatizada"}
                </p>
                
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-brand-800/20 rounded-lg p-3">
                    <div className="text-brand-300/70 text-xs font-medium mb-1">Progreso</div>
                    <div className="text-white text-lg font-semibold">
                      {enrollment.sequence.emails?.length > 0 
                        ? Math.round((enrollment.emailsSent / enrollment.sequence.emails.length) * 100)
                        : 0}%
                    </div>
                  </div>
                  <div className="bg-brand-800/20 rounded-lg p-3">
                    <div className="text-brand-300/70 text-xs font-medium mb-1">Pausado desde</div>
                    <div className="text-white text-sm font-medium">
                      {new Date(enrollment.updatedAt || enrollment.enrolledAt).toLocaleDateString('es-MX', { 
                        day: 'numeric', 
                        month: 'short' 
                      })}
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex justify-end">
                  <fetcher.Form method="post">
                    <input type="hidden" name="intent" value="resume_sequence" />
                    <input type="hidden" name="sequenceId" value={enrollment.sequenceId} />
                    <button
                      type="submit"
                      className="flex items-center gap-2 text-green-400 hover:text-green-300 text-sm font-medium transition-colors"
                      disabled={fetcher.state !== "idle" && fetcher.formData?.get("intent") === "resume_sequence" && fetcher.formData?.get("sequenceId") === enrollment.sequenceId}
                    >
                      {fetcher.state !== "idle" && fetcher.formData?.get("intent") === "resume_sequence" && fetcher.formData?.get("sequenceId") === enrollment.sequenceId ? (
                        "Reanudando..."
                      ) : (
                        <>
                          <FaPlay className="w-3 h-3" />
                          Reanudar
                        </>
                      )}
                    </button>
                  </fetcher.Form>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

    </div>
  );
}

function DiscoverTab({ 
  sequences, 
  enrolledSequenceIds,
  fetcher,
  isLoggedIn 
}: { 
  sequences: any[];
  enrolledSequenceIds: string[];
  fetcher: any;
  isLoggedIn: boolean;
}) {
  if (!sequences.length) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-6">🎯</div>
        <h2 className="text-2xl font-bold text-white mb-4">
          No hay sequences disponibles
        </h2>
        <p className="text-brand-100">
          Pronto tendremos más contenido automatizado para ti
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <p className="text-brand-100">
          Descubre nuevas sequences automáticas y mantente actualizado
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sequences.map((sequence) => {
          const isEnrolled = enrolledSequenceIds.includes(sequence.id);
          const isFeatured = sequence.isFeatured;
          
          return (
            <div
              key={sequence.id}
              className={`relative bg-brand-900/40 border rounded-lg p-6 transition-all ${
                isFeatured 
                  ? 'border-brand-500/40 bg-gradient-to-br from-brand-900/60 to-brand-800/40 shadow-lg shadow-brand-500/10 hover:shadow-xl hover:shadow-brand-500/20' 
                  : isEnrolled 
                    ? 'border-brand-500/60 bg-brand-500/5' 
                    : 'border-brand-100/10 hover:border-brand-500/30'
              }`}
            >
              {isFeatured && (
                <div className="absolute -top-3 -right-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-brand-500 rounded-full blur-md opacity-60"></div>
                    <span className="relative bg-gradient-to-r from-brand-500 to-brand-400 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      Nuevo
                    </span>
                  </div>
                </div>
              )}
              <div className="flex items-start justify-between mb-3">
                <h3 className={`text-xl font-semibold ${isFeatured ? 'text-brand-100' : 'text-white'}`}>
                  {sequence.name}
                </h3>
                <span className="text-xs text-brand-500 bg-brand-900/60 px-2 py-1 rounded">
                  {sequence.trigger === 'SUBSCRIPTION' && '📥 Al suscribirse'}
                  {sequence.trigger === 'TAG_ADDED' && `🏷️ ${sequence.triggerTag}`}
                  {sequence.trigger === 'MANUAL' && '✋ Manual'}
                  {sequence.trigger === 'COURSE_PURCHASE' && '🎓 Al comprar'}
                </span>
              </div>
              
              <p className="text-brand-100 mb-6 text-sm">
                {sequence.description || "Secuencia de emails automatizada"}
              </p>
              
              {isLoggedIn ? (
                isEnrolled ? (
                  <div className="w-full text-green-400 bg-green-900/20 cursor-default px-4 py-2 rounded-lg text-center font-medium">
                    ✅ Suscrito
                  </div>
                ) : (
                  <fetcher.Form method="post">
                    <input type="hidden" name="intent" value="join_sequence" />
                    <input type="hidden" name="sequenceId" value={sequence.id} />
                    <button
                      type="submit"
                      className={`w-full px-4 py-2 rounded-lg font-medium transition-all ${
                        isFeatured 
                          ? 'bg-gradient-to-r from-brand-500 to-brand-400 hover:from-brand-400 hover:to-brand-300 text-white shadow-md' 
                          : 'bg-brand-500 hover:bg-brand-400 text-brand-900'
                      } ${
                        fetcher.state !== "idle" && 
                        fetcher.formData?.get("intent") === "join_sequence" && 
                        fetcher.formData?.get("sequenceId") === sequence.id 
                          ? 'opacity-50 cursor-not-allowed' 
                          : ''
                      }`}
                      disabled={
                        fetcher.state !== "idle" && 
                        fetcher.formData?.get("intent") === "join_sequence" && 
                        fetcher.formData?.get("sequenceId") === sequence.id
                      }
                    >
                      {fetcher.state !== "idle" && 
                       fetcher.formData?.get("intent") === "join_sequence" && 
                       fetcher.formData?.get("sequenceId") === sequence.id 
                        ? "Uniéndose..." 
                        : isFeatured ? "🚀 Unirse Ahora" : "Unirse"}
                    </button>
                  </fetcher.Form>
                )
              ) : (
                <div className="text-center">
                  <button
                    type="button"
                    className="w-full px-4 py-2 rounded-lg font-medium border border-brand-500/50 text-brand-300 opacity-60 cursor-not-allowed"
                    disabled={true}
                  >
                    Inicia sesión para unirte
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SettingsTab({ 
  subscriber, 
  fetcher,
  isLoggedIn 
}: { 
  subscriber: any;
  fetcher: any;
  isLoggedIn: boolean;
}) {
  // Extract current preferences from tags
  const preferencesTag = subscriber?.tags?.find((tag: string) => tag.startsWith('pref:'));
  const currentPrefs = preferencesTag 
    ? JSON.parse(preferencesTag.replace('pref:', ''))
    : { frequency: 'weekly', notifications: true, digest: false };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">
          Configuración de Newsletters
        </h2>
        <p className="text-brand-100">
          Personaliza cómo y cuándo recibes nuestros newsletters
        </p>
      </div>

      <fetcher.Form method="post" className="space-y-8">
        <input type="hidden" name="intent" value="update_settings" />
        
        {!isLoggedIn && (
          <div className="bg-brand-900/60 border border-brand-100/20 rounded-lg p-6 text-center">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Inicia sesión para personalizar tu experiencia
            </h3>
            <p className="text-brand-100 text-sm">
              Accede a configuraciones personalizadas y administra tus preferencias de email.
            </p>
          </div>
        )}
        
        {/* Frequency Settings - Only for logged in users */}
        {isLoggedIn && (
        <div className="bg-brand-900/40 border border-brand-100/10 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Prefiero recibir newsletters:
          </h3>
          <div className="space-y-3">
            {[
              { value: 'daily', label: 'No me molesta recibir varios al día', desc: 'Estoy súper interesado en el contenido', disabled: true, reason: 'Muy intenso para empezar 😅' },
              { value: 'weekly', label: 'No me molesta recibir varios a la semana', desc: 'Me gusta mantenerme actualizado regularmente' },
              { value: 'biweekly', label: 'Prefiero recibir menos de 6 al mes', desc: 'Un balance entre estar informado y no saturarme' },
              { value: 'monthly', label: 'Prefiero recibir solo 1 al mes', desc: 'Solo lo esencial, por favor' },
            ].map((option) => (
              <label key={option.value} className={`flex items-start gap-3 ${option.disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                <input
                  type="radio"
                  name="frequency"
                  value={option.value}
                  disabled={option.disabled}
                  defaultChecked={!option.disabled && currentPrefs.frequency === option.value}
                  className={`mt-1 text-brand-500 bg-transparent border-brand-100/30 focus:ring-brand-500 ${option.disabled ? 'cursor-not-allowed' : ''}`}
                />
                <div>
                  <div className="text-white font-medium">{option.label}</div>
                  <div className="text-sm text-brand-100">{option.desc}</div>
                  {option.reason && (
                    <div className="text-xs text-brand-100 mt-1 italic">
                      {option.reason}
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>
        )}

        {/* Notification Settings - Only for logged in users */}
        {isLoggedIn && (
        <div className="bg-brand-900/40 border border-brand-100/10 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Preferencias de Notificación
          </h3>
          <div className="space-y-4">
            <label className="flex items-center justify-between opacity-60">
              <div>
                <div className="text-white font-medium">Notificaciones Instantáneas</div>
                <div className="text-sm text-brand-100">
                  Recibe notificación inmediata cuando publiquemos contenido nuevo
                </div>
                <div className="text-xs text-brand-100 mt-1 italic">
                  Por ahora estamos experimentando y podríamos resultar muy ruidosos 😅
                </div>
              </div>
              <input
                type="checkbox"
                name="notifications"
                disabled
                defaultChecked={false}
                className="text-brand-500 bg-transparent border-brand-100/30 focus:ring-brand-500 rounded cursor-not-allowed"
              />
            </label>
            
            <label className="flex items-center justify-between">
              <div>
                <div className="text-white font-medium">Resumen Semanal</div>
                <div className="text-sm text-brand-100">
                  Recibe un resumen de todo el contenido de la semana
                </div>
              </div>
              <input
                type="checkbox"
                name="digest"
                defaultChecked={currentPrefs.digest}
                className="text-brand-500 bg-transparent border-brand-100/30 focus:ring-brand-500 rounded"
              />
            </label>
          </div>
        </div>
        )}

        {/* Save Button - Only for logged in users */}
        {isLoggedIn && (
        <div className="text-center">
          <PrimaryButton
            type="submit"
            variant="fill"
            isDisabled={fetcher.state !== "idle" && fetcher.formData?.get("intent") === "update_settings"}
          >
            {fetcher.state !== "idle" && fetcher.formData?.get("intent") === "update_settings" ? "Guardando..." : "Guardar Configuración"}
          </PrimaryButton>
        </div>
        )}
      </fetcher.Form>

      {/* Unsubscribe Option - Only for logged in users */}
      {isLoggedIn && (
        <div className="border-t border-brand-100/10 pt-8">
          <div className="text-center">
            <p className="text-sm text-white mb-4">
              ¿Ya no quieres recibir nuestros newsletters?
            </p>
            <fetcher.Form method="post" className="inline-block">
              <input type="hidden" name="intent" value="delete_account" />
              <button
                type="submit"
                className="text-red-400 hover:text-red-300 text-sm underline transition-colors"
                disabled={fetcher.state !== "idle" && fetcher.formData?.get("intent") === "delete_account"}
                onClick={(e) => {
                  if (!confirm('¿Estás seguro? Esto eliminará tu suscripción permanentemente.')) {
                    e.preventDefault();
                  }
                }}
              >
                {fetcher.state !== "idle" && fetcher.formData?.get("intent") === "delete_account" ? "Eliminando..." : "Eliminar mi suscripción"}
              </button>
            </fetcher.Form>
          </div>
        </div>
      )}

      {/* Future Features Preview */}
      <div className="bg-gradient-to-r from-brand-700/20 to-brand-500/20 border-2 border-brand-500/40 rounded-xl p-8 shadow-lg">
        <h3 className="text-xl font-bold text-brand-500 mb-4 flex items-center gap-3">
          🚀 Próximamente en FixterGeek
        </h3>
        <div className="text-sm text-brand-100 space-y-3">
          <div className="flex items-start gap-2">
            <span className="text-brand-500 font-bold">•</span>
            <span>Crea tu propio newsletter desde esta plataforma</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-brand-500 font-bold">•</span>
            <span>Descubre newsletters por categorías y tags</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-brand-500 font-bold">•</span>
            <span>Sistema de recomendaciones personalizado</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-brand-500 font-bold">•</span>
            <span>Estadísticas de lectura y engagement</span>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-brand-500/20">
          <p className="text-xs text-brand-100 italic text-center">
            Estamos construyendo el futuro de los newsletters tech en español 🇲🇽
          </p>
        </div>
      </div>
    </div>
  );
}