import { useRef, useState } from "react";
import {
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  data,
  useFetcher,
} from "react-router";
import { motion } from "motion/react";
import type { Route } from "./+types/s.$id";
import { db } from "~/.server/db";
import { calculateNextEmailDate } from "~/.server/sequences";
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
    url: `https://www.fixtergeek.com/s/${d.sequence.slug || d.sequence.id}`,
  });
};

export const loader = async ({ params }: LoaderFunctionArgs) => {
  if (!params.id) return { sequence: null };
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
    return { sequence: null };
  }
  return { sequence };
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

  const email = String(formData.get("email") || "").toLowerCase().trim();
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

  // Anti-bot: dominio desechable o truco de puntos en gmail → fingir éxito y no crear.
  if (checkSignupEmail(email).blocked) {
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
  if (subscriber.confirmed) {
    const existing = await db.sequenceEnrollment.findUnique({
      where: {
        sequenceId_subscriberId: {
          sequenceId: sequence.id,
          subscriberId: subscriber.id,
        },
      },
    });
    if (!existing) {
      const firstEmail = sequence.emails[0];
      await db.sequenceEnrollment.create({
        data: {
          sequenceId: sequence.id,
          subscriberId: subscriber.id,
          status: "active",
          currentEmailIndex: 0,
          nextEmailAt: firstEmail ? calculateNextEmailDate(firstEmail) : null,
          enrolledAt: new Date(),
          emailsSent: 0,
        },
      });
    }
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
  const { sequence } = loaderData;
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

  // Cadencia real, leída de los delays: si todas las entregas van al mismo
  // ritmo lo decimos con número; si no, hablamos de la duración total.
  const gaps = emails.slice(1).map((e) => e.delayDays ?? 0);
  const uniformGap = gaps.length && gaps.every((g) => g === gaps[0]) ? gaps[0] : null;
  const span = gaps.reduce((acc, g) => acc + g, 0);
  const cadence =
    uniformGap === 1
      ? "Una entrega diaria"
      : uniformGap && uniformGap > 1
        ? `Una entrega cada ${uniformGap} días`
        : span > 0
          ? `Repartidas en ${span} días`
          : "A tu ritmo";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0E1317] pb-24 pt-20 text-zinc-100 sm:pt-28">
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

      <div className="relative z-10 mx-auto w-full max-w-4xl px-5 sm:px-6">
        <a href="/" className="inline-block">
          <img
            src="/full-logo.svg"
            alt="FixterGeek"
            className="h-8 opacity-90 transition-opacity hover:opacity-100"
          />
        </a>

        {/* La ilustración manda en el hero; el logo se queda arriba, chico. */}
        {sequence.illustration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7 }}
            className="mt-8 flex justify-center sm:justify-start"
          >
            <SequenceIllustration
              illustration={sequence.illustration}
              className="w-52 sm:w-64"
            />
          </motion.div>
        )}

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mt-10 inline-flex items-center gap-2.5 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-sm font-medium text-brand-500"
        >
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-brand-500" />
          Secuencia por correo
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mt-5 text-balance text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl"
        >
          <BicolorTitle text={sequence.name} />
        </motion.h1>

        {sequence.description && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-5 max-w-2xl text-balance text-lg font-light leading-relaxed text-brand-100 sm:text-xl"
          >
            {sequence.description}
          </motion.p>
        )}

        {/* Qué recibes, de un vistazo */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-7 flex flex-wrap items-center gap-2 text-sm text-brand-100"
        >
          <span className="rounded-full border border-brand-100/10 bg-brand-900/40 px-4 py-1.5">
            {total} {total === 1 ? "entrega" : "entregas"}
          </span>
          <span className="rounded-full border border-brand-100/10 bg-brand-900/40 px-4 py-1.5">
            {cadence}
          </span>
          {withVideo > 0 && (
            <span className="rounded-full border border-brand-100/10 bg-brand-900/40 px-4 py-1.5">
              🎬 {withVideo} con video
            </span>
          )}
          <span className="rounded-full border border-brand-100/10 bg-brand-900/40 px-4 py-1.5">
            Sin costo
          </span>
          <span className="rounded-full border border-brand-100/10 bg-brand-900/40 px-4 py-1.5">
            Escribe {author}
          </span>
        </motion.div>

        {/* El formulario: la acción, no una caja perdida */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="mt-10 rounded-2xl border border-brand-500/30 bg-gradient-to-br from-brand-900/80 to-brand-800/40 p-6 shadow-lg shadow-brand-500/10 backdrop-blur-sm sm:p-8"
        >
          {done ? (
            <div className="text-center">
              <div className="text-4xl">{enrolled ? "✅" : "📬"}</div>
              <h2 className="mt-3 text-xl font-bold text-white">
                {enrolled ? "¡Listo, estás dentro!" : "Revisa tu correo"}
              </h2>
              <p className="mt-2 text-brand-100">
                {enrolled ? (
                  <>
                    Ya quedaste suscrito a esta secuencia.
                    <br />
                    Pronto recibirás la primera entrega.
                  </>
                ) : (
                  "Te enviamos un enlace para confirmar tu suscripción. Haz clic en él para empezar a recibir las entregas."
                )}
              </p>
            </div>
          ) : (
            <fetcher.Form onSubmit={handleSubmit}>
              <h2 className="text-xl font-bold text-white sm:text-2xl">
                Recibe la primera entrega hoy
              </h2>
              <p className="mt-1.5 text-sm text-brand-100">
                Déjanos tu correo y la secuencia arranca en cuanto confirmes.
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

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <input
                  ref={nameRef}
                  type="text"
                  name="name"
                  placeholder="Tu nombre (opcional)"
                  className="h-12 w-full rounded-xl border border-brand-100/20 bg-brand-900/60 px-4 text-white placeholder-brand-100/40 focus:border-brand-500 focus:outline-none"
                />
                <input
                  ref={emailRef}
                  type="email"
                  name="email"
                  required
                  placeholder="tu@correo.com"
                  className="h-12 w-full rounded-xl border border-brand-100/20 bg-brand-900/60 px-4 text-white placeholder-brand-100/40 focus:border-brand-500 focus:outline-none"
                />
              </div>

              {/* WhatsApp opcional: el switch revela el campo. Pedir el celular
                  de entrada baja las altas; detrás de un sí explícito, solo lo
                  deja quien de verdad lo quiere. La secuencia se manda por
                  correo — esto es para avisar de lo nuevo, nada más. */}
              <button
                type="button"
                role="switch"
                aria-checked={wantsWhatsapp}
                onClick={() => setWantsWhatsapp((v) => !v)}
                className="mt-4 flex w-full items-center gap-3 rounded-xl border border-brand-100/20 bg-brand-900/60 px-4 py-3 text-left transition-colors hover:border-brand-500/50"
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
                    className="h-12 w-full rounded-xl border border-brand-100/20 bg-brand-900/60 px-4 text-white placeholder-brand-100/40 focus:border-brand-500 focus:outline-none"
                  />
                  <p className="mt-2 text-xs text-brand-100/70">
                    Con lada del país si no estás en México (+34, +54…).
                  </p>
                </motion.div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="mt-5 h-12 w-full rounded-xl bg-brand-500 text-lg font-bold text-brand-900 transition hover:brightness-110 disabled:opacity-50"
              >
                {isLoading ? "Procesando…" : "Quiero la secuencia"}
              </button>

              {error && (
                <p className="mt-3 text-center text-sm text-red-400">{error}</p>
              )}

              <p className="mt-4 text-center text-xs text-brand-100/70">
                Te pediremos confirmar tu correo. Cero spam, baja en un clic.
              </p>
            </fetcher.Form>
          )}
        </motion.div>

        {/* Qué llega, entrega por entrega */}
        {emails.length > 0 && (
          <>
            <h2 className="mt-16 text-2xl font-bold text-white">
              Qué vas a recibir
            </h2>
            <ol className="mt-6 space-y-3">
              {emails.map((email, i) => (
                <motion.li
                  key={email.id}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.45, delay: Math.min(i, 5) * 0.05 }}
                  className="flex items-start gap-4 rounded-lg border border-brand-100/10 bg-brand-900/40 p-5 transition-colors hover:border-brand-500/40"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand-500/40 bg-brand-500/10 text-sm font-bold text-brand-500">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium leading-snug text-white">
                      {email.subject}
                    </p>
                    <p className="mt-1 text-xs text-brand-100/70">
                      {i === 0
                        ? "En cuanto confirmes"
                        : email.delayDays === 1
                          ? "Un día después"
                          : email.delayDays
                            ? `${email.delayDays} días después`
                            : "Siguiente entrega"}
                      {email.videoSlug ? " · incluye video" : ""}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </>
        )}

        {/* Antes de entrar */}
        <h2 className="mt-16 text-2xl font-bold text-white">Antes de entrar</h2>
        <div className="mt-6 space-y-3">
          {[
            {
              q: "¿Cada cuándo me escriben?",
              a: `${cadence.toLowerCase().replace(/^u/, "U")}, y nada más. Cuando termina la secuencia dejamos de escribirte.`,
            },
            {
              q: "¿Cómo me doy de baja?",
              a: "Cada correo trae el link de baja al pie. Un clic y listo, sin trámites.",
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

        <p className="mt-10 text-sm text-brand-100/70">
          ¿Quieres ver todo lo que publicamos?{" "}
          <a
            href="/secuencias"
            target="_blank"
            rel="noopener"
            className="text-brand-500 underline underline-offset-4"
          >
            El catálogo completo
          </a>
          .
        </p>
      </div>
    </main>
  );
}
