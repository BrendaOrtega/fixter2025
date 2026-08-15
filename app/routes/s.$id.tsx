import { useRef, useState } from "react";
import {
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  data,
  useFetcher,
} from "react-router";
import type { Route } from "./+types/s.$id";
import { db } from "~/.server/db";
import { calculateNextEmailDate } from "~/.server/sequences";
import { checkSignupEmail } from "~/.server/anti-bot";
import { normalizePhone } from "~/.server/phone";
import { sendSequenceConfirmation } from "~/mailSenders/sendSequenceConfirmation";
import getMetaTags from "~/utils/getMetaTags";
import useRecaptcha from "~/lib/useRecaptcha";
import { EmojiConfetti } from "~/components/common/EmojiConfetti";

const isValidId = (id?: string) => !!id && /^[0-9a-fA-F]{24}$/.test(id);

export const meta = ({ data: d }: Route.MetaArgs) => {
  if (!d?.sequence) {
    return getMetaTags({ title: "Secuencia no disponible | FixterGeek" });
  }
  return getMetaTags({
    title: `Suscríbete a ${d.sequence.name} | FixterGeek`,
    description:
      d.sequence.description ||
      "Suscríbete a esta secuencia de emails en FixterGeek.",
    url: `https://www.fixtergeek.com/s/${d.sequence.id}`,
  });
};

export const loader = async ({ params }: LoaderFunctionArgs) => {
  if (!isValidId(params.id)) return { sequence: null };
  const sequence = await db.sequence.findUnique({
    where: { id: params.id as string },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      isPrivate: true,
      owner: { select: { displayName: true, username: true } },
      _count: { select: { emails: true } },
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

  if (!isValidId(params.id)) {
    return data({ error: "Secuencia no disponible" }, { status: 404 });
  }
  const sequence = await db.sequence.findUnique({
    where: { id: params.id as string },
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

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-20 bg-brand-900">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <img
            src="/full-logo.svg"
            alt="FixterGeek"
            className="h-10 mx-auto opacity-90 mb-8"
          />
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 text-balance">
            {sequence.name}
          </h1>
          {sequence.description && (
            <p className="text-lg text-brand-100 text-balance">
              {sequence.description}
            </p>
          )}
          <p className="text-brand-100 text-sm mt-4">
            por {author} · {sequence._count.emails}{" "}
            {sequence._count.emails === 1 ? "email" : "emails"}
          </p>
        </div>

        <div className="bg-brand-800/40 border border-brand-100/10 rounded-2xl p-8">
          {done ? (
            <div className="text-center">
              <EmojiConfetti />
              <div className="text-4xl mb-4">{enrolled ? "✅" : "📬"}</div>
              <h2 className="text-xl font-bold text-white mb-2">
                {enrolled ? "¡Listo, estás dentro!" : "Revisa tu correo"}
              </h2>
              <p className="text-brand-100">
                {enrolled ? (
                  <>
                    Ya quedaste suscrito a esta secuencia.
                    <br />
                    Pronto recibirás el primer email.
                  </>
                ) : (
                  "Te enviamos un enlace para confirmar tu suscripción. Haz clic en él para empezar a recibir los emails."
                )}
              </p>
            </div>
          ) : (
            <fetcher.Form onSubmit={handleSubmit} className="space-y-4">
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
              <input
                ref={nameRef}
                type="text"
                name="name"
                placeholder="Tu nombre (opcional)"
                className="w-full px-4 py-3 rounded-lg bg-brand-900/60 border border-brand-100/20 text-white placeholder-brand-300 focus:outline-none focus:border-brand-500"
              />
              <input
                ref={emailRef}
                type="email"
                name="email"
                required
                placeholder="tu@correo.com"
                className="w-full px-4 py-3 rounded-lg bg-brand-900/60 border border-brand-100/20 text-white placeholder-brand-300 focus:outline-none focus:border-brand-500"
              />
              {/* WhatsApp opcional: la casilla revela el campo. Pedir el
                  celular de entrada baja las altas; escondido detrás de un
                  sí explícito, solo lo llena quien de verdad lo quiere. */}
              <label className="flex items-start gap-3 cursor-pointer text-brand-100 text-sm">
                <input
                  type="checkbox"
                  checked={wantsWhatsapp}
                  onChange={(e) => setWantsWhatsapp(e.target.checked)}
                  className="mt-1 w-4 h-4 shrink-0 accent-brand-500"
                />
                <span>También quiero recibirlo por WhatsApp 💬</span>
              </label>
              {wantsWhatsapp && (
                <div>
                  <input
                    ref={phoneRef}
                    type="tel"
                    name="phone"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="55 1234 5678"
                    className="w-full px-4 py-3 rounded-lg bg-brand-900/60 border border-brand-100/20 text-white placeholder-brand-300 focus:outline-none focus:border-brand-500"
                  />
                  <p className="text-brand-300 text-xs mt-2">
                    Con lada del país si no estás en México (+34, +54…).
                  </p>
                </div>
              )}
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-6 rounded-lg font-bold text-lg bg-brand-500 text-brand-900 hover:bg-brand-400 disabled:opacity-50 transition-colors"
              >
                {isLoading ? "Procesando…" : "Suscribirme"}
              </button>
              <p className="text-brand-100 text-xs text-center">
                Te pediremos confirmar tu correo. Puedes cancelar cuando quieras.
              </p>
            </fetcher.Form>
          )}
        </div>
      </div>
    </main>
  );
}
