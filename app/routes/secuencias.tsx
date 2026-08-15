import { useState, useEffect } from "react";
import {
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  redirect,
  Link,
} from "react-router";
import type { Route } from "./+types/secuencias";
import { getUserOrRedirect, getUserOrNull } from "~/.server/dbGetters";
import { db } from "~/.server/db";
import { getOrCreateSubscriberForUser, calculateNextEmailDate } from "~/.server/sequences";
import { generateUniqueSequenceSlug } from "~/.server/slug";
import getMetaTags from "~/utils/getMetaTags";
import { cn } from "~/utils/cn";
import { PrimaryButton } from "~/components/common/PrimaryButton";
import { useFetcher, useSearchParams } from "react-router";
import { FaPause, FaPlay, FaPlus, FaUsers, FaEnvelope, FaChartBar } from "react-icons/fa";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await getUserOrNull(request);

  let subscriber = null;
  let enrolledSequences: any[] = [];
  let pausedSequences: any[] = [];
  let mySequences: any[] = [];

  if (user) {
    subscriber = await db.subscriber.findUnique({
      where: { email: user.email },
      include: {
        sequenceEnrollments: {
          include: {
            sequence: { include: { emails: { select: { id: true } } } },
          },
          where: { status: { in: ["active", "paused"] } },
          orderBy: { enrolledAt: "desc" },
        },
      },
    });

    const allEnrollments = subscriber?.sequenceEnrollments || [];
    enrolledSequences = allEnrollments.filter((e) => e.status === "active");
    pausedSequences = allEnrollments.filter((e) => e.status === "paused");

    // Secuencias que el user creó (lado creador)
    mySequences = await db.sequence.findMany({
      where: { ownerId: user.id },
      include: { _count: { select: { emails: true, enrollments: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  const enrolledSequenceIds = enrolledSequences.map((e) => e.sequenceId) || [];

  // Descubrir: secuencias activas que NO son mías (oficiales + de otros users)
  const allSequences = await db.sequence.findMany({
    where: {
      isActive: true,
      // Las privadas son perks de pago: no se anuncian en el catálogo.
      isPrivate: false,
    },
    select: {
      id: true,
      name: true,
      description: true,
      trigger: true,
      triggerTag: true,
      isFeatured: true,
      ownerId: true,
      owner: { select: { username: true, displayName: true } },
    },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: 12,
  });

  return {
    user,
    subscriber,
    enrolledSequences,
    pausedSequences,
    mySequences,
    allSequences,
    enrolledSequenceIds,
    isSubscribed: !!subscriber?.confirmed,
    isLoggedIn: !!user,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const user = await getUserOrRedirect(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "create_sequence") {
    const name = (formData.get("name") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() || null;

    if (!name) {
      return { error: "Ponle un nombre a tu secuencia" };
    }

    const slug = await generateUniqueSequenceSlug(name);
    const created = await db.sequence.create({
      data: {
        name,
        slug,
        description,
        ownerId: user.id,
        trigger: "MANUAL",
        isActive: false,
      },
    });

    throw redirect(`/secuencias/${created.id}`);
  }

  if (intent === "pause_sequence") {
    const sequenceId = formData.get("sequenceId") as string;
    const subscriber = await db.subscriber.findUnique({
      where: { email: user.email },
    });
    if (subscriber) {
      await db.sequenceEnrollment.updateMany({
        where: { subscriberId: subscriber.id, sequenceId },
        data: { status: "paused" },
      });
    }
    return { success: true };
  }

  if (intent === "resume_sequence") {
    const sequenceId = formData.get("sequenceId") as string;
    const subscriber = await db.subscriber.findUnique({
      where: { email: user.email },
    });
    if (subscriber) {
      const enrollment = await db.sequenceEnrollment.findUnique({
        where: {
          sequenceId_subscriberId: { sequenceId, subscriberId: subscriber.id },
        },
      });
      if (enrollment && enrollment.status === "paused") {
        const sequence = await db.sequence.findUnique({
          where: { id: sequenceId },
          include: {
            emails: {
              where: { order: { gte: enrollment.currentEmailIndex } },
              orderBy: { order: "asc" },
              take: 1,
            },
          },
        });
        const nextEmail = sequence?.emails[0];
        const nextEmailAt = nextEmail ? calculateNextEmailDate(nextEmail) : null;
        await db.sequenceEnrollment.update({
          where: {
            sequenceId_subscriberId: { sequenceId, subscriberId: subscriber.id },
          },
          data: { status: "active", nextEmailAt },
        });
      }
    }
    return { success: true };
  }

  if (intent === "join_sequence") {
    const sequenceId = formData.get("sequenceId") as string;

    // Ocultar la card no basta: el POST puede venir a mano. Una secuencia
    // privada es un perk pagado y solo se entra por código (compra, script).
    const target = await db.sequence.findUnique({
      where: { id: sequenceId },
      select: { isActive: true, isPrivate: true },
    });
    if (!target || !target.isActive || target.isPrivate) {
      return { error: "Secuencia no disponible" };
    }

    const subscriber = await getOrCreateSubscriberForUser(user);

    const existingEnrollment = await db.sequenceEnrollment.findUnique({
      where: {
        sequenceId_subscriberId: { sequenceId, subscriberId: subscriber.id },
      },
    });

    if (!existingEnrollment) {
      const sequence = await db.sequence.findUnique({
        where: { id: sequenceId },
        include: { emails: { orderBy: { order: "asc" }, take: 1 } },
      });
      const firstEmail = sequence?.emails[0];
      const nextEmailAt = firstEmail ? calculateNextEmailDate(firstEmail) : null;

      await db.sequenceEnrollment.create({
        data: {
          sequenceId,
          subscriberId: subscriber.id,
          status: "active",
          currentEmailIndex: 0,
          nextEmailAt,
          enrolledAt: new Date(),
          emailsSent: 0,
        },
      });
    }
    return { success: true };
  }

  if (intent === "delete_account") {
    const subscriber = await db.subscriber.findUnique({
      where: { email: user.email },
    });
    if (subscriber) {
      await db.sequenceEnrollment.updateMany({
        where: { subscriberId: subscriber.id, status: "active" },
        data: { status: "paused" },
      });
      await db.subscriber.delete({ where: { email: user.email } });
    }
    return { deleted: true };
  }

  return { error: "Invalid intent" };
};

export const meta = () =>
  getMetaTags({
    title: "Secuencias — Administra tus newsletters",
    description:
      "Crea y administra tus propias secuencias de email, y suscríbete a las de otros. Administra tus newsletters con Secuencias.",
  });

export default function Route({
  loaderData: {
    user,
    subscriber,
    enrolledSequences,
    pausedSequences,
    mySequences,
    allSequences,
    enrolledSequenceIds,
    isSubscribed,
    isLoggedIn,
  },
}: Route.ComponentProps) {
  // Quien llega de confirmar el alta en una comunidad trae la pestaña y la
  // secuencia en la URL; eso gana sobre lo que quedó guardado en localStorage.
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const preselectedId = searchParams.get("pre");
  const isWelcome = searchParams.get("welcome") === "1";

  const [activeTab, setActiveTab] = useState<
    "creator" | "subscriptions" | "discover" | "settings"
  >(() => {
    if (
      tabFromUrl === "creator" ||
      tabFromUrl === "subscriptions" ||
      tabFromUrl === "discover" ||
      tabFromUrl === "settings"
    ) {
      return tabFromUrl;
    }
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("secuencias-active-tab");
      if (
        saved === "creator" ||
        saved === "subscriptions" ||
        saved === "discover" ||
        saved === "settings"
      ) {
        return saved as any;
      }
    }
    return isLoggedIn ? "creator" : "discover";
  });

  const fetcher = useFetcher();

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("secuencias-active-tab", activeTab);
    }
  }, [activeTab]);

  if (fetcher.data?.deleted) {
    return (
      <article className="min-h-screen pt-40">
        <section className="max-w-4xl mx-auto px-4 md:px-[5%] xl:px-0">
          <div className="text-center py-16">
            <div className="text-6xl mb-6">✅</div>
            <h1 className="text-3xl font-bold text-white mb-4">
              Suscripción eliminada
            </h1>
            <p className="text-brand-100 mb-8">
              Has sido desuscrito exitosamente de todas tus secuencias.
            </p>
          </div>
        </section>
      </article>
    );
  }

  const tabs: { id: typeof activeTab; label: string }[] = [
    { id: "creator", label: "Mis Secuencias" },
    { id: "subscriptions", label: "Suscripciones" },
    { id: "discover", label: "Descubrir" },
    { id: "settings", label: "Configuración" },
  ];

  return (
    <>
      <article className="min-h-screen pt-40 pb-32">
        <section className="max-w-4xl mx-auto px-4 md:px-[5%] xl:px-0">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Secuencias
            </h1>
            <p className="text-xl text-brand-100 font-light">
              Administra tus newsletters con Secuencias
            </p>
          </div>

          {isWelcome && (
            <div className="mb-8 rounded-2xl border border-brand-500/40 bg-brand-500/10 px-6 py-5 text-center">
              <div className="text-3xl">✅</div>
              <h2 className="mt-2 text-xl font-bold text-white">
                Ya estás dentro
              </h2>
              <p className="mt-1 text-brand-100">
                {preselectedId
                  ? "Tu primera entrega sale en unos minutos. Mientras, mira qué más hay aquí."
                  : "Te avisamos en cuanto haya una secuencia nueva."}
              </p>
            </div>
          )}

          {/* Mobile first: en pantalla chica las pestañas se deslizan en una
              sola fila; a partir de sm caben centradas. */}
          <div className="mb-8 -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="mx-auto flex w-max gap-1 rounded-full bg-brand-900/60 p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all sm:px-6",
                    activeTab === tab.id
                      ? "bg-brand-500 text-brand-900"
                      : "text-brand-100 hover:text-white"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === "creator" ? (
            <CreatorTab
              mySequences={mySequences}
              fetcher={fetcher}
              isLoggedIn={isLoggedIn}
            />
          ) : activeTab === "subscriptions" ? (
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
              currentUserId={user?.id}
              preselectedId={preselectedId}
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

      {!isLoggedIn && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-brand-700/95 to-brand-500/95 backdrop-blur-md border-t border-brand-100/20 shadow-2xl z-50">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="text-2xl">📧</div>
                <div>
                  <h3 className="text-white font-semibold text-lg">
                    Crea y administra tus newsletters con Secuencias
                  </h3>
                  <p className="text-brand-100 text-sm">
                    Inicia sesión para crear tus propias secuencias de email y
                    suscribirte a las de otros creadores.
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
                Crear cuenta gratis
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CreatorTab({
  mySequences,
  fetcher,
  isLoggedIn,
}: {
  mySequences: any[];
  fetcher: any;
  isLoggedIn: boolean;
}) {
  const [showCreate, setShowCreate] = useState(false);

  if (!isLoggedIn) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-6">✍️</div>
        <h2 className="text-2xl font-bold text-white mb-4">
          Crea tus propias secuencias
        </h2>
        <p className="text-brand-100 mb-8">
          Inicia sesión para crear secuencias de email y conseguir suscriptores.
        </p>
        <a
          href="/login"
          className="bg-brand-500 text-brand-900 px-6 py-2 rounded-full font-medium hover:bg-brand-400 transition-colors"
        >
          Iniciar sesión
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-brand-100 text-sm">
          Las secuencias que tú creas. Súbete suscriptores y mide su engagement.
        </p>
        <button
          onClick={() => setShowCreate((s) => !s)}
          className="flex items-center gap-2 bg-brand-500 text-brand-900 px-4 py-2 rounded-full text-sm font-medium hover:bg-brand-400 transition-colors"
        >
          <FaPlus className="w-3 h-3" />
          Nueva secuencia
        </button>
      </div>

      {showCreate && (
        <fetcher.Form
          method="post"
          className="bg-brand-900/40 border border-brand-100/10 rounded-lg p-6 space-y-4"
        >
          <input type="hidden" name="intent" value="create_sequence" />
          <div>
            <label className="block text-sm text-brand-100 mb-1">Nombre</label>
            <input
              type="text"
              name="name"
              required
              placeholder="Ej. Bienvenida a mi newsletter"
              className="w-full px-3 py-2 bg-brand-900/60 border border-brand-100/20 rounded-lg text-white placeholder-brand-300 focus:outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm text-brand-100 mb-1">
              Descripción (opcional)
            </label>
            <textarea
              name="description"
              rows={2}
              placeholder="De qué trata tu secuencia"
              className="w-full px-3 py-2 bg-brand-900/60 border border-brand-100/20 rounded-lg text-white placeholder-brand-300 focus:outline-none focus:border-brand-500"
            />
          </div>
          {fetcher.data?.error && (
            <p className="text-red-400 text-sm">{fetcher.data.error}</p>
          )}
          <div className="flex justify-end">
            <PrimaryButton
              type="submit"
              variant="fill"
              isDisabled={
                fetcher.state !== "idle" &&
                fetcher.formData?.get("intent") === "create_sequence"
              }
            >
              {fetcher.state !== "idle" &&
              fetcher.formData?.get("intent") === "create_sequence"
                ? "Creando..."
                : "Crear secuencia"}
            </PrimaryButton>
          </div>
        </fetcher.Form>
      )}

      {mySequences.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-6">📝</div>
          <h2 className="text-2xl font-bold text-white mb-4">
            Aún no tienes secuencias
          </h2>
          <p className="text-brand-100">
            Crea tu primera secuencia y empieza a sumar suscriptores.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {mySequences.map((seq) => (
            <Link
              key={seq.id}
              to={`/secuencias/${seq.id}`}
              className="block bg-brand-900/40 border border-brand-100/10 rounded-lg p-6 hover:border-brand-500/40 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-white leading-tight">
                  {seq.name}
                </h3>
                <span
                  className={cn(
                    "text-xs px-3 py-1 rounded-full font-medium",
                    seq.isActive
                      ? "text-green-400 bg-green-900/60"
                      : "text-yellow-400 bg-yellow-900/60"
                  )}
                >
                  {seq.isActive ? "Activa" : "Borrador"}
                </span>
              </div>
              <p className="text-brand-100 text-sm mb-6 line-clamp-2">
                {seq.description || "Sin descripción"}
              </p>
              <div className="flex items-center gap-6 text-sm text-brand-100">
                <span className="flex items-center gap-2">
                  <FaEnvelope className="w-3 h-3" />
                  {seq._count.emails} emails
                </span>
                <span className="flex items-center gap-2">
                  <FaUsers className="w-3 h-3" />
                  {seq._count.enrollments} suscriptores
                </span>
                <span className="flex items-center gap-2 ml-auto text-brand-500">
                  <FaChartBar className="w-3 h-3" />
                  Gestionar
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function SequencesTab({
  enrolledSequences,
  pausedSequences,
  isSubscribed,
  fetcher,
  isLoggedIn,
}: {
  enrolledSequences: any[];
  pausedSequences: any[];
  isSubscribed: boolean;
  fetcher: any;
  isLoggedIn: boolean;
}) {
  if (
    !isSubscribed ||
    (!enrolledSequences?.length && !pausedSequences?.length)
  ) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-6">🤖</div>
        <h2 className="text-2xl font-bold text-white mb-4">
          No tienes suscripciones activas
        </h2>
        <p className="text-brand-100 mb-8">
          Explora "Descubrir" para encontrar secuencias interesantes
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
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-white leading-tight">
                {enrollment.sequence.name}
              </h3>
              <span
                className={`text-xs px-3 py-1 rounded-full font-medium ${
                  enrollment.status === "active"
                    ? "text-green-400 bg-green-900/60"
                    : "text-yellow-400 bg-yellow-900/60"
                }`}
              >
                {enrollment.status === "active" ? "Activa" : "Pausada"}
              </span>
            </div>
            <p className="text-brand-100 mb-6 text-sm leading-relaxed">
              {enrollment.sequence.description ||
                "Secuencia de emails automatizada"}
            </p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-brand-800/30 rounded-lg p-3">
                <div className="text-brand-100 text-xs font-medium mb-1">
                  Progreso
                </div>
                <div className="text-white text-lg font-semibold">
                  {enrollment.sequence.emails?.length > 0
                    ? Math.round(
                        (enrollment.emailsSent /
                          enrollment.sequence.emails.length) *
                          100
                      )
                    : 0}
                  %
                </div>
              </div>
              {enrollment.nextEmailAt && (
                <div className="bg-brand-800/30 rounded-lg p-3">
                  <div className="text-brand-100 text-xs font-medium mb-1">
                    Próximo email
                  </div>
                  <div className="text-white text-sm font-medium">
                    {new Date(enrollment.nextEmailAt).toLocaleDateString(
                      "es-MX",
                      { day: "numeric", month: "short" }
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <fetcher.Form method="post">
                <input type="hidden" name="intent" value="pause_sequence" />
                <input
                  type="hidden"
                  name="sequenceId"
                  value={enrollment.sequenceId}
                />
                <button
                  type="submit"
                  className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 text-sm font-medium transition-colors"
                >
                  <FaPause className="w-3 h-3" />
                  Pausar
                </button>
              </fetcher.Form>
            </div>
          </div>
        ))}
      </div>

      {pausedSequences && pausedSequences.length > 0 && (
        <>
          <div className="mt-12 mb-6">
            <h3 className="text-xl font-semibold text-white">
              Suscripciones pausadas
            </h3>
            <p className="text-brand-100 text-sm mt-1">
              Puedes reanudarlas para continuar donde lo dejaste
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pausedSequences.map((enrollment: any) => (
              <div
                key={enrollment.id}
                className="bg-brand-900/30 border border-brand-100/5 rounded-lg p-6 opacity-80 hover:opacity-100 transition-opacity"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white/80 leading-tight">
                    {enrollment.sequence.name}
                  </h3>
                  <span className="text-xs px-3 py-1 rounded-full font-medium text-gray-400 bg-gray-900/60">
                    ⏸️ Pausada
                  </span>
                </div>
                <p className="text-brand-100/70 mb-6 text-sm leading-relaxed">
                  {enrollment.sequence.description ||
                    "Secuencia de emails automatizada"}
                </p>
                <div className="flex justify-end">
                  <fetcher.Form method="post">
                    <input type="hidden" name="intent" value="resume_sequence" />
                    <input
                      type="hidden"
                      name="sequenceId"
                      value={enrollment.sequenceId}
                    />
                    <button
                      type="submit"
                      className="flex items-center gap-2 text-green-400 hover:text-green-300 text-sm font-medium transition-colors"
                    >
                      <FaPlay className="w-3 h-3" />
                      Reanudar
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
  currentUserId,
  preselectedId,
  fetcher,
  isLoggedIn,
}: {
  sequences: any[];
  enrolledSequenceIds: string[];
  currentUserId?: string | null;
  preselectedId?: string | null;
  fetcher: any;
  isLoggedIn: boolean;
}) {
  if (!sequences.length) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-6">🎯</div>
        <h2 className="text-2xl font-bold text-white mb-4">
          No hay secuencias disponibles
        </h2>
        <p className="text-brand-100">Pronto habrá más contenido para ti</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <p className="text-brand-100">
          Suscríbete a las secuencias de otros creadores
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sequences.map((sequence) => {
          // Quien acaba de confirmar su alta en una comunidad llega sin sesión
          // pero ya enrolado: el id viene en la URL, así que la card lo refleja.
          const isPreselected = sequence.id === preselectedId;
          const isEnrolled =
            enrolledSequenceIds.includes(sequence.id) || isPreselected;
          const isFeatured = sequence.isFeatured;
          const authorName =
            sequence.owner?.displayName ||
            sequence.owner?.username ||
            "FixterGeek";

          return (
            <div
              key={sequence.id}
              className={`relative bg-brand-900/40 border rounded-lg p-6 transition-all ${
                isPreselected ? "ring-2 ring-brand-500 ring-offset-2 ring-offset-[#0E1317] " : ""
              }${
                isFeatured
                  ? "border-brand-500/40 bg-gradient-to-br from-brand-900/60 to-brand-800/40 shadow-lg shadow-brand-500/10"
                  : isEnrolled
                  ? "border-brand-500/60 bg-brand-500/5"
                  : "border-brand-100/10 hover:border-brand-500/30"
              }`}
            >
              {isFeatured && (
                <div className="absolute -top-3 -right-3">
                  <span className="relative bg-gradient-to-r from-brand-500 to-brand-400 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg">
                    ⭐ Destacada
                  </span>
                </div>
              )}
              <div className="flex items-start justify-between mb-2">
                <h3
                  className={`text-xl font-semibold ${
                    isFeatured ? "text-brand-100" : "text-white"
                  }`}
                >
                  {sequence.name}
                </h3>
              </div>
              <p className="text-brand-100 text-xs mb-3">por {authorName}</p>
              <p className="text-brand-100 mb-6 text-sm">
                {sequence.description || "Secuencia de emails automatizada"}
              </p>

              {sequence.ownerId && sequence.ownerId === currentUserId ? (
                <Link
                  to={`/secuencias/${sequence.id}`}
                  className="block w-full rounded-lg border border-brand-100/20 px-4 py-2 text-center font-medium text-brand-100 transition-colors hover:border-brand-500/40 hover:text-white"
                >
                  Es tuya · Gestionar
                </Link>
              ) : isEnrolled ? (
                <div className="w-full text-green-400 bg-green-900/20 cursor-default px-4 py-2 rounded-lg text-center font-medium">
                  ✅ Suscrito
                </div>
              ) : isLoggedIn ? (
                  <fetcher.Form method="post">
                    <input type="hidden" name="intent" value="join_sequence" />
                    <input
                      type="hidden"
                      name="sequenceId"
                      value={sequence.id}
                    />
                    <button
                      type="submit"
                      className={`w-full px-4 py-2 rounded-lg font-medium transition-all ${
                        isFeatured
                          ? "bg-gradient-to-r from-brand-500 to-brand-400 hover:from-brand-400 hover:to-brand-300 text-white shadow-md"
                          : "bg-brand-500 hover:bg-brand-400 text-brand-900"
                      }`}
                    >
                      Suscribirme
                    </button>
                  </fetcher.Form>
              ) : (
                <a
                  href={`/series/${sequence.id}`}
                  className="block w-full px-4 py-2 rounded-lg font-medium text-center bg-brand-500 text-brand-900 hover:bg-brand-400 transition-colors"
                >
                  Suscribirme
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SettingsTab({
  fetcher,
  isLoggedIn,
}: {
  subscriber: any;
  fetcher: any;
  isLoggedIn: boolean;
}) {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">
          Configuración de Secuencias
        </h2>
        <p className="text-brand-100">Administra tu cuenta y suscripciones</p>
      </div>

      {!isLoggedIn && (
        <div className="bg-brand-900/60 border border-brand-100/20 rounded-lg p-6 text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Inicia sesión para administrar tu cuenta
          </h3>
        </div>
      )}

      {isLoggedIn && (
        <div className="border-t border-brand-100/10 pt-8">
          <div className="text-center">
            <p className="text-sm text-white mb-4">
              ¿Ya no quieres recibir tus secuencias?
            </p>
            <fetcher.Form method="post" className="inline-block">
              <input type="hidden" name="intent" value="delete_account" />
              <button
                type="submit"
                className="text-red-400 hover:text-red-300 text-sm underline transition-colors"
                onClick={(e) => {
                  if (
                    !confirm(
                      "¿Estás seguro? Esto eliminará tus suscripciones permanentemente."
                    )
                  ) {
                    e.preventDefault();
                  }
                }}
              >
                Eliminar mis suscripciones
              </button>
            </fetcher.Form>
          </div>
        </div>
      )}
    </div>
  );
}
