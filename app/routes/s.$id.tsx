import { useRef, useState } from "react";
import {
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  data,
  redirect,
  useFetcher,
} from "react-router";
import { motion } from "motion/react";
import type { Route } from "./+types/s.$id";
import { db } from "~/.server/db";
import { getUserOrNull } from "~/.server/dbGetters";
import { formatUnlock } from "~/utils/formatUnlock";
import { checkSignupEmail } from "~/.server/anti-bot";
import { normalizePhone } from "~/.server/phone";
import { sendSequenceConfirmation } from "~/mailSenders/sendSequenceConfirmation";
import getMetaTags from "~/utils/getMetaTags";
import useRecaptcha from "~/lib/useRecaptcha";
import { EmojiConfetti } from "~/components/common/EmojiConfetti";
import { cn } from "~/utils/cn";
import { SequenceIllustration } from "~/components/sequences/illustrations";

const isValidId = (id?: string) => !!id && /^[0-9a-fA-F]{24}$/.test(id);

/// El link público acepta slug o id: los correos que ya salieron traen el id y
/// no se pueden romper.
const sequenceWhereFromParam = (param?: string) =>
  isValidId(param) ? { id: param as string } : { slug: param as string };

export const meta = ({ data: d }: Route.MetaArgs) => {
  if (!d?.sequence) {
    return getMetaTags({ title: "Secuencia no disponible | FixterGeek" });
  }
  return getMetaTags({
    title: `Suscríbete a ${d.sequence.name} | FixterGeek`,
    description:
      d.sequence.description ||
      "Suscríbete a esta secuencia de emails en FixterGeek.",
    url: `https://www.fixtergeek.com/secuencias/${d.sequence.slug || d.sequence.id}`,
  });
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  if (!params.id) return { sequence: null, user: null };
  const sequence = await db.sequence.findUnique({
    where: sequenceWhereFromParam(params.id),
    select: {
      id: true,
      slug: true,
      illustration: true,
      name: true,
      description: true,
      isActive: true,
      isPrivate: true,
      owner: { select: { displayName: true, username: true } },
      _count: { select: { emails: true } },
      // El temario real: la landing enseña qué llega y cuándo con los datos
      // de la secuencia, no con promesas genéricas.
      emails: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          subject: true,
          delayDays: true,
          videoSlug: true,
        },
      },
    },
  });

  // Una secuencia privada no tiene alta pública: se entra por código (compra,
  // script). Sin esto, cualquiera con el link recibe gratis un perk pagado.
  if (!sequence || !sequence.isActive || sequence.isPrivate) {
    return { sequence: null, user: null };
  }

  // La URL canónica es la del slug. El id sigue resolviendo —los correos que ya
  // salieron lo traen— pero manda a la bonita en vez de servir la misma página
  // en dos direcciones, que parte las métricas y confunde a los buscadores.
  if (isValidId(params.id) && sequence.slug) {
    const url = new URL(request.url);
    url.pathname = `/secuencias/${sequence.slug}`;
    throw redirect(url.toString(), 301);
  }

  // Quien ya tiene cuenta no vuelve a escribir su correo. Es la misma regla del
  // cajón del visor: la sesión ya probó que ese buzón es suyo.
  const user = await getUserOrNull(request);

  // No basta con saber si está dentro: hay que decirle POR DÓNDE va. "Ya estás
  // suscrito" a secas no informa de nada a quien lleva tres entregas received
  // y espera la cuarta.
  const enrollment = user
    ? await db.sequenceEnrollment.findFirst({
        where: {
          sequenceId: sequence.id,
          subscriber: { is: { email: user.email } },
        },
        select: { status: true, currentEmailIndex: true, nextEmailAt: true },
      })
    : null;

  const total = sequence._count.emails;
  const received = Math.min(enrollment?.currentEmailIndex ?? 0, total);

  // A qué video mandarlo: el de la última entrega que YA recibió — no el de la
  // primera, que después de tres entregas es volver al principio. Necesita el
  // curso porque la URL del visor es /cursos/:curso/:video.
  const withVideo = sequence.emails.filter((e) => !!e.videoSlug);
  const lastReceived = withVideo
    .filter((e) => e.order <= received)
    .slice(-1)[0];
  let resumeVideo: { slug: string; course: string } | null = null;
  // Quien acaba de inscribirse lleva 0 received, así que `lastReceived` no
  // existe: para él, la primera con video es su entrega.
  const target = lastReceived ?? withVideo[0];
  if (target?.videoSlug) {
    const v = await db.video.findUnique({
      where: { slug: target.videoSlug },
      select: { slug: true, courseIds: true },
    });
    const course = v?.courseIds.length
      ? await db.course.findUnique({
          where: { id: v.courseIds[0] },
          select: { slug: true },
        })
      : null;
    if (v && course?.slug) resumeVideo = { slug: v.slug, course: course.slug };
  }

  return {
    sequence,
    resumeVideo,
    user: user
      ? {
          email: user.email,
          // Una inscripción paused NO cuenta como estar dentro: es justo a
          // quien hay que ofrecerle volver.
          enrolled: !!enrollment && enrollment.status !== "paused",
          // Se dio de baja: hay que decírselo, no fingir que llega de nuevo.
          paused: enrollment?.status === "paused",
          received,
          total,
          // Null cuando ya recibió todo lo que hay publicado.
          nextAt:
            enrollment?.status === "active" && enrollment.nextEmailAt
              ? enrollment.nextEmailAt.toISOString()
              : null,
        }
      : null,
  };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const formData = await request.formData();
  if (formData.get("intent") !== "public_subscribe") {
    return data({ error: "Acción no reconocida" }, { status: 400 });
  }

  // Honeypot: si un bot llenó el campo oculto, fingimos éxito y no hacemos nada.
  if (formData.get("website")) {
    return data({ success: true, needsConfirmation: true });
  }

  // Con sesión el correo lo pone el servidor: además de ahorrarle el trámite a
  // quien ya tiene cuenta, impide que se suscriba a un tercero escribiendo su
  // dirección. Sin sesión sigue mandando el formulario, como siempre.
  const session = await getUserOrNull(request);
  const email =
    session?.email?.toLowerCase().trim() ||
    String(formData.get("email") || "").toLowerCase().trim();
  const name = (formData.get("name") as string)?.trim() || undefined;
  const wantsWhatsapp = formData.get("wantsWhatsapp") === "on";
  const rawPhone = String(formData.get("phone") || "").trim();

  if (!email || !email.includes("@")) {
    return data({ error: "Email inválido" }, { status: 400 });
  }

  // El celular solo se guarda si la persona pidió WhatsApp. Sin esa casilla no
  // hay consentimiento, y un número sin permiso no sirve de nada.
  let phone: string | undefined;
  if (wantsWhatsapp && rawPhone) {
    const parsed = normalizePhone(rawPhone);
    if (!parsed.ok) return data({ error: parsed.error }, { status: 400 });
    phone = parsed.phone;
  }

  // Anti-bot: nombre generado, dominio desechable o truco de puntos en gmail →
  // fingir éxito y no crear.
  if (checkSignupEmail(email, name).blocked) {
    return data({ success: true, needsConfirmation: true });
  }

  const blocked = await db.emailBlacklist.findUnique({ where: { email } });
  if (blocked) {
    return data(
      { error: "Este correo no puede suscribirse en este momento." },
      { status: 400 }
    );
  }

  if (!params.id) {
    return data({ error: "Secuencia no disponible" }, { status: 404 });
  }
  const sequence = await db.sequence.findUnique({
    where: sequenceWhereFromParam(params.id),
    include: { emails: { orderBy: { order: "asc" }, take: 1 } },
  });
  // El gate que de verdad cuenta: ocultar el formulario en el loader no
  // impide un POST directo a esta ruta.
  if (!sequence || !sequence.isActive || sequence.isPrivate) {
    return data({ error: "Secuencia no disponible" }, { status: 404 });
  }

  let subscriber = await db.subscriber.findUnique({ where: { email } });
  if (!subscriber) {
    subscriber = await db.subscriber.create({
      data: {
        email,
        name,
        confirmed: false,
        tags: [],
        phone,
        whatsappOptIn: !!phone,
      },
    });
  } else if (phone) {
    // Quien ya existía y ahora sí quiere WhatsApp: se actualiza. Nunca al
    // revés — no dar el número esta vez no revoca un permiso anterior.
    subscriber = await db.subscriber.update({
      where: { id: subscriber.id },
      data: { phone, whatsappOptIn: true },
    });
  }

  // Subscriber ya confirmado → enrolar directo (sin doble opt-in de nuevo).
  //
  // Delega en `enrollSubscriberInSequence` en vez de crear la inscripción a
  // mano. Hacerlo a mano era `if (!existe) crear`, y a quien ya se había dado
  // de baja no le hacía NADA: la fila seguía en `paused`, la pantalla decía
  // "¡listo, estás dentro!" y no volvía a llegarle un solo correo. Esa función
  // ya sabe reactivar donde se quedó — es la misma que usa el visor.
  // Ya confirmó su correo antes: entra sin fricción, con o sin sesión. Es lo
  // que hace la industria y la razón es buena — la prueba de que el buzón es
  // suyo ya se dio, y volver a pedirla por cada lista del MISMO remitente se
  // siente burocrático.
  //
  // El riesgo que queda: sin sesión, alguien podría escribir el correo de un
  // tercero y suscribirlo. Se acepta a cambio de la fricción que ahorra, y lo
  // acota el "bájate en un clic" que va en cada correo (List-Unsubscribe
  // incluido). Si algún día llegan quejas de spam, aquí es donde se aprieta.
  if (subscriber.confirmed) {
    // Dinámico: importado arriba, el bundler arrastra el módulo de servidor al
    // cliente porque esta ruta también exporta componente.
    const { enrollSubscriberInSequence } = await import("~/.server/sequences");
    await enrollSubscriberInSequence(sequence.id, subscriber.id);
    return data({ success: true, enrolled: true });
  }

  // No confirmado → doble opt-in.
  await sendSequenceConfirmation({
    email,
    name,
    sequenceId: sequence.id,
    sequenceName: sequence.name,
  });
  return data({ success: true, needsConfirmation: true });
};

/**
 * Título a dos colores: la última palabra —o las dos últimas si el título es
 * largo— se pinta con el verde de la marca. Es el mismo recurso del deck de los
 * webinars, y le da un punto de color a un hero que si no es un bloque blanco.
 *
 * El corte se calcula, no se escribe a mano: los nombres de las secuencias los
 * teclea quien la crea y nadie va a andar marcando dónde va el color.
 */
function BicolorTitle({ text }: { text: string }) {
  const words = text.trim().split(/\s+/);
  if (words.length < 3) {
    return <span className="text-brand-500">{text}</span>;
  }
  const accentCount = words.length > 6 ? 2 : 1;
  const plain = words.slice(0, -accentCount).join(" ");
  const accent = words.slice(-accentCount).join(" ");
  return (
    <>
      {plain} <span className="text-brand-500">{accent}</span>
    </>
  );
}

export default function PublicSubscribe({ loaderData }: Route.ComponentProps) {
  const { sequence, user, resumeVideo } = loaderData;
  const fetcher = useFetcher<{
    success?: boolean;
    needsConfirmation?: boolean;
    enrolled?: boolean;
    error?: string;
  }>();
  const emailRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const honeyRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const [wantsWhatsapp, setWantsWhatsapp] = useState(false);

  const onSubmit = () => {
    const fd = new FormData();
    fd.append("intent", "public_subscribe");
    fd.append("email", emailRef.current?.value || "");
    fd.append("name", nameRef.current?.value || "");
    fd.append("website", honeyRef.current?.value || "");
    if (wantsWhatsapp) {
      fd.append("wantsWhatsapp", "on");
      fd.append("phone", phoneRef.current?.value || "");
    }
    fetcher.submit(fd, { method: "POST" });
  };

  const { handleSubmit } = useRecaptcha(onSubmit);

  const isLoading = fetcher.state !== "idle";
  const done = fetcher.data?.success;
  const enrolled = fetcher.data?.enrolled;
  const error = fetcher.data?.error;

  if (!sequence) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 bg-brand-900">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">📭</div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Esta secuencia no está disponible
          </h1>
          <p className="text-brand-100">
            Es posible que el enlace sea incorrecto o que ya no esté activa.
          </p>
        </div>
      </main>
    );
  }

  const author =
    sequence.owner?.displayName || sequence.owner?.username || "FixterGeek";
  const emails = sequence.emails ?? [];
  const total = sequence._count.emails;
  const withVideo = emails.filter((e) => !!e.videoSlug).length;

  // La cadencia NO se promete con un número: los delays se ajustan sobre la
  // marcha —una entrega pesada pide más aire que un recordatorio— y decir
  // "cada 3 días" es una promesa que después se rompe sola.
  const gaps = emails.slice(1).map((e) => e.delayDays ?? 0);
  const span = gaps.reduce((acc, g) => acc + g, 0);
  const cadence = span > 0 ? "Cada ciertos días" : "A tu ritmo";

  return (
    /* Una sola pantalla: la ilustración a un lado y la acción del otro. Nada
       de scroll — lo que no cabe aquí no hacía falta para decidirse. */
    <main className="relative flex min-h-[100svh] flex-col overflow-hidden bg-[#0E1317] px-5 py-6 text-zinc-100 sm:px-6 lg:h-[100svh] lg:py-8">
      {done && <EmojiConfetti emojis={["📬", "✨", "🚀"]} />}

      {/* grid de fondo con drift animado */}
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-[0.11]"
        style={{
          backgroundImage:
            "linear-gradient(#85DDCB 1px, transparent 1px), linear-gradient(90deg, #85DDCB 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 25%, black 30%, transparent 75%)",
        }}
        animate={{ backgroundPosition: ["0px 0px", "44px 44px"] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="pointer-events-none absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-brand-500/25 blur-[120px]"
        animate={{ x: [0, 70, -20, 0], y: [0, 40, -30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-40 -right-32 h-[26rem] w-[26rem] rounded-full bg-brand-700/25 blur-[120px]"
        animate={{ x: [0, -60, 30, 0], y: [0, -40, 30, 0] }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />

      <a href="/" className="relative z-10 mx-auto w-full max-w-6xl shrink-0">
        <img
          src="/full-logo.svg"
          alt="FixterGeek"
          className="h-7 opacity-90 transition-opacity hover:opacity-100"
        />
      </a>

      <div className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-8 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:gap-12 lg:py-0">
        {/* Columna izquierda: quién eres y qué doy */}
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          {sequence.illustration && (
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7 }}
            >
              <SequenceIllustration
                illustration={sequence.illustration}
                className="w-32 sm:w-40 lg:w-56"
              />
            </motion.div>
          )}

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mt-4 inline-flex items-center gap-2.5 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-xs font-medium text-brand-500 sm:text-sm"
        >
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-brand-500" />
          Secuencia por correo
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mt-4 text-balance text-3xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-[3.4rem]"
        >
          <BicolorTitle text={sequence.name} />
        </motion.h1>

        {sequence.description && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-4 max-w-xl text-balance text-base font-light leading-relaxed text-brand-100 sm:text-lg"
          >
            {sequence.description}
          </motion.p>
        )}

        {/* Qué recibes, de un vistazo */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-brand-100 sm:text-sm lg:justify-start"
        >
          <span className="rounded-full border border-brand-100/10 bg-brand-900/40 px-3 py-1">
            {total} {total === 1 ? "entrega" : "entregas"}
          </span>
          <span className="rounded-full border border-brand-100/10 bg-brand-900/40 px-3 py-1">
            {cadence}
          </span>
          {withVideo > 0 && (
            <span className="rounded-full border border-brand-100/10 bg-brand-900/40 px-3 py-1">
              🎬 Incluye acceso a videos
            </span>
          )}
          <span className="rounded-full border border-brand-100/10 bg-brand-900/40 px-3 py-1">
            Gratuito
          </span>
          <span className="rounded-full border border-brand-100/10 bg-brand-900/40 px-3 py-1">
            Te escribe {author}
          </span>
        </motion.div>

        </div>

        {/* Columna derecha: la acción */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="w-full rounded-2xl border border-brand-500/30 bg-gradient-to-br from-brand-900/80 to-brand-800/40 p-6 shadow-xl shadow-brand-500/10 backdrop-blur-sm sm:p-9"
        >
          {done ? (
            <div className="text-center">
              <div className="text-4xl">{enrolled ? "✅" : "📬"}</div>
              <h2 className="mt-3 text-xl font-bold text-white">
                {enrolled ? "¡Listo, estás dentro!" : "Revisa tu correo"}
              </h2>
              <p className="mt-2 text-pretty text-brand-100">
                {enrolled ? (
                  <>
                    {user?.email ? (
                      <>
                        La primera entrega sale a{" "}
                        <strong className="text-white">{user.email}</strong> en
                        los próximos minutos.
                      </>
                    ) : (
                      "La primera entrega sale a tu correo en los próximos minutos."
                    )}
                  </>
                ) : (
                  "Te enviamos un enlace para confirmar tu suscripción. Haz clic en él para empezar a recibir las entregas."
                )}
              </p>
              {/* Y no un callejón sin salida: la primera entrega ya está
                  desbloqueada, así que se puede ver sin esperar el correo. */}
              {enrolled && resumeVideo && (
                <a
                  href={`/cursos/${resumeVideo.course}/${resumeVideo.slug}`}
                  className="mt-6 flex h-14 w-full items-center justify-center rounded-xl bg-brand-500 text-lg font-bold text-brand-900 transition hover:brightness-110"
                >
                  Ver la primera entrega 🍿
                </a>
              )}
            </div>
          ) : (
            <fetcher.Form onSubmit={handleSubmit}>
              <h2 className="text-2xl font-bold text-white sm:text-[1.75rem]">
                {user?.enrolled
                  ? user.received >= user.total
                    ? "Vas al día"
                    : `Vas en la entrega ${user.received} de ${user.total}`
                  : user?.paused
                    ? "Te habías dado de baja"
                    : "Recibe la primera entrega hoy"}
              </h2>
              <p className="mt-1.5 text-sm text-brand-100">
                {user?.enrolled ? (
                  user.nextAt ? (
                    <>
                      La siguiente te llega{" "}
                      <strong className="text-white">
                        {formatUnlock(user.nextAt)}
                      </strong>
                      . No tienes que hacer nada.
                    </>
                  ) : (
                    "Ya recibiste todo lo publicado. Te avisamos cuando salga la siguiente."
                  )
                ) : user?.paused ? (
                  <>
                    Dejaste de recibir esta serie. Si quieres, retomas justo
                    donde te quedaste —
                    {user.received > 0
                      ? ` llevabas ${user.received} de ${user.total}.`
                      : " desde la primera entrega."}
                  </>
                ) : user ? (
                  <>
                    Te subes con{" "}
                    <strong className="text-white">{user.email}</strong> 📬
                  </>
                ) : (
                  "Déjanos tu correo y la secuencia arranca en cuanto confirmes."
                )}
              </p>

              {/* Honeypot anti-bot (oculto para humanos) */}
              <input
                ref={honeyRef}
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                className="hidden"
                aria-hidden="true"
              />

              {/* Con sesión no se piden ni nombre ni correo: la cuenta ya los
                  tiene y ya probó que el buzón es suyo. Pedirlos otra vez es
                  cobrar dos veces el mismo trámite. */}
              {!user && (
              <div className="mt-5 flex flex-col gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-sm text-brand-100">
                    Tu nombre <span className="text-brand-100/50">(opcional)</span>
                  </span>
                  <input
                    ref={nameRef}
                    type="text"
                    name="name"
                    autoComplete="given-name"
                    placeholder="Cómo te llamamos"
                    className="h-14 w-full rounded-xl border border-brand-100/20 bg-brand-900/60 px-4 text-base text-white placeholder-brand-100/40 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm text-brand-100">
                    Tu correo
                  </span>
                  <input
                    ref={emailRef}
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    placeholder="tu@correo.com"
                    className="h-14 w-full rounded-xl border border-brand-100/20 bg-brand-900/60 px-4 text-base text-white placeholder-brand-100/40 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                  />
                </label>
              </div>
              )}

              {/* WhatsApp opcional: el switch revela el campo. Pedir el celular
                  de entrada baja las altas; detrás de un sí explícito, solo lo
                  deja quien de verdad lo quiere. La secuencia se manda por
                  correo — esto es para avisar de lo nuevo, nada más. */}
              <button
                type="button"
                role="switch"
                aria-checked={wantsWhatsapp}
                onClick={() => setWantsWhatsapp((v) => !v)}
                className="mt-4 flex w-full items-center gap-3 rounded-xl border border-brand-100/20 bg-brand-900/60 px-4 py-4 text-left transition-colors hover:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              >
                <span
                  className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                    wantsWhatsapp ? "bg-brand-500" : "bg-brand-100/25"
                  )}
                >
                  <span
                    className={cn(
                      "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                      wantsWhatsapp && "translate-x-5"
                    )}
                  />
                </span>
                <span className="text-sm font-medium text-white">
                  Quiero enterarme de lo nuevo por WhatsApp 💬
                </span>
              </button>
              {wantsWhatsapp && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="mt-3"
                >
                  <input
                    ref={phoneRef}
                    type="tel"
                    name="phone"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="55 1234 5678"
                    className="h-14 w-full rounded-xl border border-brand-100/20 bg-brand-900/60 px-4 text-white placeholder-brand-100/40 focus:border-brand-500 focus:outline-none"
                  />
                  <p className="mt-2 text-xs text-brand-100/70">
                    Con lada del país si no estás en México (+34, +54…).
                  </p>
                </motion.div>
              )}

              {/* Estar dentro no es el final del camino: un botón muerto que
                  dice "ya estás suscrito" no deja hacer nada. Quien ya está
                  quiere VER lo que le tocó; quien se dio de baja, volver. */}
              {user?.enrolled ? (
                <div className="mt-6 flex flex-col gap-2">
                  {resumeVideo && (
                    <a
                      href={`/cursos/${resumeVideo.course}/${resumeVideo.slug}`}
                      className="flex h-14 w-full items-center justify-center rounded-xl bg-brand-500 text-lg font-bold text-brand-900 transition hover:brightness-110"
                    >
                      Ver mis entregas 🍿
                    </a>
                  )}
                  <a
                    href="/perfil"
                    className="flex h-12 w-full items-center justify-center rounded-xl border border-brand-100/20 text-sm font-medium text-brand-100 transition-colors hover:border-brand-100/40 hover:text-white"
                  >
                    Administrar mi suscripción
                  </a>
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-6 h-14 w-full rounded-xl bg-brand-500 text-lg font-bold text-brand-900 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:ring-offset-2 focus:ring-offset-brand-900 disabled:opacity-50"
                >
                  {isLoading
                    ? "Procesando…"
                    : user?.paused
                      ? "Retomar donde me quedé 🍿"
                      : user
                        ? "Súbeme a la secuencia 🍿"
                        : "Quiero la secuencia"}
                </button>
              )}

              {error && (
                <p className="mt-3 text-center text-sm text-red-400">{error}</p>
              )}

              {/* En dos renglones a propósito: en una sola línea el texto se
                  parte donde le toca y se lee cortado. */}
              {/* Con sesión no hay confirmación que pedir: la cuenta ya la dio.
                  Prometerla igual haría esperar un correo que nunca llega. */}
              <p className="mt-4 text-center text-xs leading-relaxed text-brand-100/70">
                {!user && (
                  <>
                    Te pediremos confirmar tu correo.
                    <br />
                  </>
                )}
                Cero spam, bájate en un clic.
              </p>
            </fetcher.Form>
          )}
        </motion.div>

      </div>

      {/* Pie mínimo: sin secciones que empujen la página fuera de la pantalla. */}
      <p className="relative z-10 mx-auto w-full max-w-6xl shrink-0 text-center text-xs text-brand-100/60 lg:text-left">
        Cero spam, bájate en un clic ·{" "}
        <a
          href="/secuencias"
          target="_blank"
          rel="noopener"
          className="text-brand-500 underline underline-offset-4"
        >
          Ver el catálogo completo
        </a>
      </p>
    </main>
  );
}
