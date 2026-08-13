import { useRef } from "react";
import {
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  data,
  useFetcher,
  useNavigate,
  useSearchParams,
} from "react-router";
import { motion } from "motion/react";
import type { Route } from "./+types/c.$slug";
import { db } from "~/.server/db";
import {
  getCommunityBySlug,
  getCommunityMemberCount,
  getCommunitySequences,
  getWelcomeSequence,
  isMember,
  joinCommunity,
} from "~/.server/community";
import { getMemberEmail, setMemberCookie } from "~/.server/memberCookie";
import { enrollSubscriberInSequence } from "~/.server/sequences";
import { checkSignupEmail } from "~/.server/anti-bot";
import { sendCommunityConfirmation } from "~/mailSenders/sendCommunityConfirmation";
import getMetaTags from "~/utils/getMetaTags";
import useRecaptcha from "~/lib/useRecaptcha";
import { EmojiConfetti } from "~/components/common/EmojiConfetti";
import { EnvelopeIllustration } from "~/components/community/EnvelopeIllustration";

export const meta = ({ data: d }: Route.MetaArgs) => {
  if (!d?.community) {
    return getMetaTags({ title: "Comunidad no disponible | FixterGeek" });
  }
  return getMetaTags({
    title: `${d.community.name} | FixterGeek`,
    description:
      d.community.tagline ||
      d.community.description ||
      "Únete a la comunidad y recibe las secuencias conforme salen.",
    url: `https://www.fixtergeek.com/c/${d.community.slug}`,
  });
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const community = await getCommunityBySlug(params.slug as string);
  if (!community) {
    return {
      community: null,
      welcome: null,
      memberCount: 0,
      sequences: [],
      member: false,
    };
  }

  // Quien ya se unió trae la cookie de miembro: entonces ve su panel, no el
  // formulario de alta.
  const email = await getMemberEmail(request);
  const member = await isMember(community.tag, email);

  const [welcome, memberCount, sequences] = await Promise.all([
    getWelcomeSequence(community.welcomeSequenceId),
    getCommunityMemberCount(community.tag),
    getCommunitySequences(community.id, member ? email : null),
  ]);

  return {
    community: {
      id: community.id,
      slug: community.slug,
      name: community.name,
      tagline: community.tagline,
      description: community.description,
    },
    welcome,
    memberCount,
    sequences,
    member,
  };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent");

  // Acciones del panel del miembro: suscribirse o pausar una secuencia de la
  // comunidad. La identidad sale de la cookie, no de una sesión.
  if (intent === "toggle_sequence") {
    const community = await getCommunityBySlug(params.slug as string);
    const email = await getMemberEmail(request);
    if (!community || !(await isMember(community.tag, email))) {
      return data(
        { error: "No eres miembro de esta comunidad" },
        { status: 403 },
      );
    }

    const sequenceId = String(formData.get("sequenceId") || "");
    const sequence = await db.sequence.findUnique({
      where: { id: sequenceId },
      select: { id: true, communityId: true, isActive: true, isPrivate: true },
    });
    // Solo secuencias de esta comunidad: el POST puede venir a mano.
    if (
      !sequence ||
      sequence.communityId !== community.id ||
      !sequence.isActive ||
      sequence.isPrivate
    ) {
      return data({ error: "Secuencia no disponible" }, { status: 404 });
    }

    const subscriber = await db.subscriber.findUnique({
      where: { email: email as string },
      select: { id: true },
    });
    if (!subscriber) return data({ error: "No encontrado" }, { status: 404 });

    const existing = await db.sequenceEnrollment.findUnique({
      where: {
        sequenceId_subscriberId: {
          sequenceId: sequence.id,
          subscriberId: subscriber.id,
        },
      },
    });

    if (!existing) {
      await enrollSubscriberInSequence(sequence.id, subscriber.id);
    } else if (existing.status === "active") {
      await db.sequenceEnrollment.update({
        where: { id: existing.id },
        data: { status: "paused" },
      });
    } else if (existing.status === "paused") {
      // Al reanudar, el siguiente correo sale en el próximo ciclo del motor.
      await db.sequenceEnrollment.update({
        where: { id: existing.id },
        data: { status: "active", nextEmailAt: new Date() },
      });
    }

    return data({ success: true, toggled: true });
  }

  if (intent !== "join_community") {
    return data({ error: "Acción no reconocida" }, { status: 400 });
  }

  // Honeypot: si un bot llenó el campo oculto, fingimos éxito y no hacemos nada.
  if (formData.get("website")) {
    return data({ success: true, needsConfirmation: true });
  }

  const email = String(formData.get("email") || "")
    .toLowerCase()
    .trim();
  const name = (formData.get("name") as string)?.trim() || undefined;

  if (!email || !email.includes("@")) {
    return data({ error: "Email inválido" }, { status: 400 });
  }

  // Dominio desechable o truco de puntos en gmail → fingir éxito y no crear.
  if (checkSignupEmail(email).blocked) {
    return data({ success: true, needsConfirmation: true });
  }

  const blocked = await db.emailBlacklist.findUnique({ where: { email } });
  if (blocked) {
    return data(
      { error: "Este correo no puede suscribirse en este momento." },
      { status: 400 },
    );
  }

  // El gate que de verdad cuenta: ocultar el formulario en el loader no impide
  // un POST directo a esta ruta.
  const community = await getCommunityBySlug(params.slug as string);
  if (!community) {
    return data({ error: "Comunidad no disponible" }, { status: 404 });
  }

  // Quien ya confirmó su correo antes no tiene que volver a probarlo: entra
  // directo y aterriza en el catálogo.
  const subscriber = await db.subscriber.findUnique({ where: { email } });
  if (subscriber?.confirmed) {
    await joinCommunity({ communityId: community.id, email, name });
    // Queda reconocido como miembro y la misma página se convierte en su panel.
    return data(
      { success: true, joined: true },
      { headers: { "Set-Cookie": await setMemberCookie(email) } },
    );
  }

  const welcome = await getWelcomeSequence(community.welcomeSequenceId);
  await sendCommunityConfirmation({
    email,
    name,
    communityId: community.id,
    communityName: community.name,
    sequenceName: welcome?.name,
  });
  return data({ success: true, needsConfirmation: true });
};

export default function CommunityLanding({ loaderData }: Route.ComponentProps) {
  const { community, welcome, memberCount, sequences, member } = loaderData;
  const fetcher = useFetcher<{
    success?: boolean;
    needsConfirmation?: boolean;
    joined?: boolean;
    error?: string;
  }>();
  const emailRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const honeyRef = useRef<HTMLInputElement>(null);

  const onSubmit = () => {
    const fd = new FormData();
    fd.append("intent", "join_community");
    fd.append("email", emailRef.current?.value || "");
    fd.append("name", nameRef.current?.value || "");
    fd.append("website", honeyRef.current?.value || "");
    fetcher.submit(fd, { method: "POST" });
  };

  const { handleSubmit } = useRecaptcha(onSubmit);

  const isLoading = fetcher.state !== "idle";
  // Al unirse directo (correo ya confirmado) el loader revalida y la página
  // se convierte en el panel: no hay que enseñar "revisa tu correo".
  const done = fetcher.data?.success && !fetcher.data?.joined;
  const error = fetcher.data?.error;
  // Llega de confirmar el correo (/c/confirmar redirige con ?bienvenida=1) o
  // acaba de unirse con un correo ya confirmado: en ambos casos, confeti.
  const [searchParams] = useSearchParams();
  const justJoined =
    searchParams.get("bienvenida") === "1" || !!fetcher.data?.joined;

  if (!community) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 bg-brand-900">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">📭</div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Esta comunidad no está disponible
          </h1>
          <p className="text-brand-100">
            Es posible que el enlace sea incorrecto o que ya no esté activa.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0E1317] pb-24 pt-28 text-zinc-100">
      {done && <EmojiConfetti emojis={["📬", "✨", "🚀"]} />}
      {justJoined && (
        <EmojiConfetti
          emojiSize={70}
          emojis={["🥳", "🪅", "🎊", "🪩", "🍾", "🎈", "🌈", "🦜", "🍭", "🫶"]}
        />
      )}

      {/* grid de fondo con drift animado */}
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-[0.11]"
        style={{
          backgroundImage:
            "linear-gradient(#85DDCB 1px, transparent 1px), linear-gradient(90deg, #85DDCB 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 30%, black 30%, transparent 75%)",
        }}
        animate={{ backgroundPosition: ["0px 0px", "44px 44px"] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="pointer-events-none absolute -top-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-brand-500/25 blur-[120px]"
        animate={{
          x: [0, 80, -30, 0],
          y: [0, 50, -40, 0],
          scale: [1, 1.2, 0.92, 1],
        }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-40 -right-32 h-[26rem] w-[26rem] rounded-full bg-brand-700/25 blur-[120px]"
        animate={{
          x: [0, -70, 40, 0],
          y: [0, -50, 40, 0],
          scale: [1, 0.88, 1.25, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-4xl px-6">
        {/* Hero: texto y buzón conviven en una fila, no en columnas sueltas */}
        <div className="flex flex-col-reverse gap-6 sm:flex-row sm:items-center sm:gap-10">
          <div className="min-w-0 flex-1">
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2.5 rounded-full border border-brand-500/30 bg-brand-500/10 px-5 py-2 text-sm font-medium text-brand-500"
            >
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-brand-500" />
              Comunidad
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="mt-6 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
            >
              {community.name}
            </motion.h1>

            {community.tagline && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="mt-5 text-lg font-light leading-relaxed text-brand-100 sm:text-xl"
              >
                {community.tagline}
              </motion.p>
            )}
          </div>

          {/* El buzón: dice de qué va esto sin explicarlo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="pointer-events-none flex shrink-0 justify-center"
          >
            <EnvelopeIllustration className="h-auto w-[260px] sm:w-[320px]" />
          </motion.div>
        </div>

        {/* Miembro: su panel de la comunidad, no el formulario de alta */}
        {member ? (
          <div className="mt-10">
            <div className="rounded-2xl border border-brand-500/40 bg-brand-500/10 px-5 py-4 text-center sm:px-6">
              <p className="font-bold text-white">
                {justJoined ? "¡Ya estás dentro! 🎉" : "Ya eres miembro ✅"}
              </p>
              <p className="mt-1 text-sm text-brand-100">
                Elige a qué secuencias quieres estar suscrito. Cada entrega te
                llega directo al correo.
              </p>
            </div>

            <h2 className="mt-10 text-2xl font-bold text-white">
              Secuencias de la comunidad
            </h2>
            <div className="mt-5 space-y-4">
              {sequences.map((s) => {
                const active = s.status === "active";
                const paused = s.status === "paused";
                const completed = s.status === "completed";
                return (
                  <div
                    key={s.id}
                    className="rounded-lg border border-brand-100/10 bg-brand-900/40 p-5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-white">{s.name}</h3>
                      {active && (
                        <span className="rounded-full bg-green-900/60 px-3 py-0.5 text-xs font-medium text-green-400">
                          Suscrito
                        </span>
                      )}
                      {paused && (
                        <span className="rounded-full bg-yellow-900/60 px-3 py-0.5 text-xs font-medium text-yellow-400">
                          Pausada
                        </span>
                      )}
                      {completed && (
                        <span className="rounded-full bg-gray-900/60 px-3 py-0.5 text-xs font-medium text-gray-400">
                          Terminada
                        </span>
                      )}
                    </div>
                    {s.description && (
                      <p className="mt-2 text-sm leading-relaxed text-brand-100">
                        {s.description}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-brand-100/70">
                      {s._count.emails}{" "}
                      {s._count.emails === 1 ? "entrega" : "entregas"}
                      {completed
                        ? " · las recibiste todas"
                        : s.status
                          ? ` · vas en la ${Math.min(
                              s.progress + 1,
                              s._count.emails,
                            )}`
                          : ""}
                    </p>

                    {!completed && (
                      <fetcher.Form method="post" className="mt-4">
                        <input
                          type="hidden"
                          name="intent"
                          value="toggle_sequence"
                        />
                        <input type="hidden" name="sequenceId" value={s.id} />
                        {/* Pausar no es una acción que queramos motivar:
                            va como enlace discreto, no como botón */}
                        <button
                          type="submit"
                          className={
                            active
                              ? "text-xs text-brand-100/50 underline underline-offset-4 transition hover:text-brand-100"
                              : "h-11 w-full rounded-xl bg-brand-500 text-sm font-bold text-brand-900 transition hover:brightness-110 sm:w-auto sm:px-6"
                          }
                        >
                          {active
                            ? "Pausar entregas"
                            : paused
                              ? "Reanudar"
                              : "Suscribirme"}
                        </button>
                      </fetcher.Form>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="mt-8 text-sm text-brand-100/70">
              ¿Quieres ver todo lo que hay en FixterGeek?{" "}
              <a
                href="/secuencias"
                target="_blank"
                rel="noopener"
                className="text-brand-500 underline"
              >
                El catálogo completo
              </a>
              .
            </p>
          </div>
        ) : (
          <>
            {/* Formulario, arriba: es lo que la persona vino a hacer */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="mt-10 rounded-2xl border border-brand-100/10 bg-brand-900/60 p-6 backdrop-blur-sm sm:p-8"
            >
              {done ? (
                <div className="text-center">
                  <div className="text-4xl">📬</div>
                  <h2 className="mt-3 text-xl font-bold text-white">
                    Revisa tu correo
                  </h2>
                  <p className="mt-2 text-brand-100">
                    Te mandamos un link para confirmar. Un clic y estás dentro.
                  </p>
                </div>
              ) : (
                <fetcher.Form onSubmit={handleSubmit}>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      ref={nameRef}
                      name="name"
                      type="text"
                      placeholder="Tu nombre"
                      className="h-12 w-full rounded-xl border border-brand-100/20 bg-brand-900/60 px-4 text-white placeholder-brand-100/40 focus:border-brand-500 focus:outline-none"
                    />
                    <input
                      ref={emailRef}
                      name="email"
                      type="email"
                      required
                      placeholder="tu@correo.com"
                      className="h-12 w-full rounded-xl border border-brand-100/20 bg-brand-900/60 px-4 text-white placeholder-brand-100/40 focus:border-brand-500 focus:outline-none"
                    />
                  </div>

                  {/* honeypot */}
                  <input
                    ref={honeyRef}
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    className="hidden"
                    aria-hidden
                  />

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="mt-3 h-12 w-full rounded-xl bg-brand-500 font-bold text-brand-900 transition hover:brightness-110 disabled:opacity-50"
                  >
                    {isLoading ? "Un momento…" : "Unirme a la comunidad"}
                  </button>

                  {error && (
                    <p className="mt-3 text-center text-sm text-danger">
                      {error}
                    </p>
                  )}

                  <p className="mt-4 text-center text-xs text-brand-100/70">
                    Te pedimos confirmar tu correo. Cero spam, baja en un clic.
                  </p>
                </fetcher.Form>
              )}
            </motion.div>

            {/* Números reales */}
            <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-brand-100">
              <span className="rounded-full border border-brand-100/10 bg-brand-900/40 px-4 py-1.5">
                {memberCount} {memberCount === 1 ? "miembro" : "miembros"}
              </span>
              {welcome && (
                <span className="rounded-full border border-brand-100/10 bg-brand-900/40 px-4 py-1.5">
                  {welcome._count.emails}{" "}
                  {welcome._count.emails === 1 ? "entrega" : "entregas"} de
                  arranque
                </span>
              )}
              <span className="rounded-full border border-brand-100/10 bg-brand-900/40 px-4 py-1.5">
                Sin costo
              </span>
            </div>

            {/* Qué pasa cuando entras */}
            <h2 className="mt-16 text-2xl font-bold text-white">
              Qué pasa cuando entras
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: "📨",
                  title: "Arrancas con una secuencia",
                  body: "Nada de esperar. En cuanto confirmas te llega la primera entrega.",
                },
                {
                  icon: "🗂",
                  title: "Te invitamos a las nuevas",
                  body: "Cada secuencia que publicamos te llega como invitación. Entras a la que te interese.",
                },
                {
                  icon: "🎚",
                  title: "Tú mandas",
                  body: "Pausas, te bajas o te vuelves a subir cuando quieras, desde tu panel.",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="rounded-lg border border-brand-100/10 bg-brand-900/40 p-6 transition-colors hover:border-brand-500/40"
                >
                  <div className="text-2xl">{card.icon}</div>
                  <h3 className="mt-3 font-bold text-white">{card.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-brand-100">
                    {card.body}
                  </p>
                </div>
              ))}
            </div>

            {/* La secuencia con la que arrancas */}
            {welcome && (
              <div className="mt-10 rounded-2xl border border-brand-500/40 bg-gradient-to-br from-brand-900/60 to-brand-800/40 p-6 shadow-lg shadow-brand-500/10 sm:p-8">
                <span className="text-xs font-medium uppercase tracking-wider text-brand-500">
                  Arrancas con
                </span>
                <h3 className="mt-2 text-xl font-bold text-white sm:text-2xl">
                  {welcome.name}
                </h3>
                {welcome.description && (
                  <p className="mt-2 text-brand-100">{welcome.description}</p>
                )}
                {welcome.emails[0] && (
                  <p className="mt-4 rounded-lg border border-brand-100/10 bg-brand-900/60 px-4 py-3 text-sm text-brand-100">
                    <span className="text-brand-500">Entrega 1 ·</span>{" "}
                    {welcome.emails[0].subject}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* Preguntas */}
        <h2 className="mt-16 text-2xl font-bold text-white">
          {member ? "Dudas frecuentes" : "Antes de entrar"}
        </h2>
        <div className="mt-6 space-y-3">
          {[
            {
              q: "¿Cada cuándo me escriben?",
              a: "La secuencia de arranque tiene su propio ritmo, y después solo te escribimos cuando hay una secuencia nueva. No es un correo diario.",
            },
            {
              q: "¿Cómo me doy de baja?",
              a: "Cada correo trae el link de baja al pie, y desde /secuencias puedes pausar o cancelar cualquier suscripción cuando quieras.",
            },
            {
              q: "¿Qué hacen con mi correo?",
              a: "Se queda en FixterGeek. No lo vendemos ni lo compartimos con nadie.",
            },
          ].map((item) => (
            <details
              key={item.q}
              className="group rounded-lg border border-brand-100/10 bg-brand-900/40 px-5 py-4"
            >
              <summary className="cursor-pointer list-none font-medium text-white marker:hidden">
                <span className="text-brand-500 group-open:hidden">+ </span>
                <span className="hidden text-brand-500 group-open:inline">
                  −{" "}
                </span>
                {item.q}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-brand-100">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </main>
  );
}
