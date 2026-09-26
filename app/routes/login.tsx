import { Form, Link, redirect, useActionData, useFetchers, useLoaderData, useNavigation } from "react-router";
import { twMerge } from "tailwind-merge";
import { EmojiConfetti } from "~/components/common/EmojiConfetti";
import { GoogleLoginLink } from "~/components/GoogleLoginLink";
import { GiMagicBroom } from "react-icons/gi";
import Spinner from "~/components/common/Spinner";
import { BsMailboxFlag } from "react-icons/bs";
import type { Route } from "./+types/login";
import getMetaTags from "~/utils/getMetaTags";
import { useBotTrap } from "~/hooks/useBotTrap";

/**
 * Metadatos propios.
 *
 * Aquí cae el scraper de WhatsApp, Slack o Twitter cada vez que alguien
 * comparte un enlace protegido —su perfil, sus cursos, una lección— porque el
 * bot no trae sesión y la ruta lo redirige. Sin metas propias, la miniatura de
 * todos esos links sale con el título de otra página.
 */
export const meta = () =>
  getMetaTags({
    title: "Entra a FixterGeek",
    description:
      "Cursos y talleres de programación con IA en español. Entra con tu correo, sin contraseña.",
  });

// Configuración de UI por tipo de confirmación
const CONFIRMATION_CONFIG: Record<string, {
  title: string;
  subtitle: string;
  details?: string;
  emoji: string;
  cta: { text: string; href: string };
}> = {
  "aisdk-webinar": {
    title: "¡Tu lugar está confirmado!",
    subtitle: "Webinar: Introducción a la IA aplicada",
    details: "Viernes 17 de Enero · 7:00 PM CDMX",
    emoji: "🎉",
    cta: { text: "Ver detalles del webinar", href: "/ai-sdk" },
  },
  "aisdk-taller-1": {
    title: "¡Inscripción confirmada!",
    subtitle: "Taller 1: IA aplicada con TypeScript",
    details: "Sábado 24 de Enero · 10:00 AM CDMX",
    emoji: "🚀",
    cta: { text: "Ver temario", href: "/ai-sdk" },
  },
  newsletter: {
    title: "¡Suscripción confirmada!",
    subtitle: "Ya eres parte de la comunidad FixterGeek",
    emoji: "✨",
    cta: { text: "Explorar cursos", href: "/cursos" },
  },
  default: {
    title: "¡Confirmación exitosa!",
    subtitle: "Gracias por confirmar tu email",
    emoji: "✅",
    cta: { text: "Ir al inicio", href: "/" },
  },
};
import {
  getOrCreateUser,
  placeSession,
  updateOrCreateSuscription,
} from "~/.server/dbGetters";
import { commitSession } from "~/sessions";
import { validateUserToken } from "~/utils/tokens";
import { googleHandler } from "~/.server/google";
import { db } from "~/.server/db";
import { sendWelcomeEmail } from "~/mailSenders/sendWelcomeEmail";

export const loader = async ({ request }: Route.LoaderArgs) => {
  const url = new URL(request.url);

  // Manejar Google OAuth
  const googleResponse = await googleHandler(request, "/mis-cursos");
  if (googleResponse) {
    return googleResponse; // Retornar el redirect si Google lo maneja
  }

  // El link del correo sólo muestra el botón: los escáneres de correo corporativo abren
  // cada link (GET) y antes eso confirmaba y creaba la cuenta sin que nadie diera clic.
  if (url.searchParams.has("token")) {
    const token = url.searchParams.get("token") as string;
    const { isValid, decoded } = await validateUserToken(token);
    if (!isValid || !decoded?.email) {
      // for ui
      return {
        success: false,
        status: 403,
        message: "El token no es valido ⛓️‍💥",
      };
    }
    return {
      pendingToken: token,
      pendingEmail: decoded.email as string,
      isSubscriberConfirmation: decoded.action === "confirm-subscriber",
      status: 200,
    };
  }
  return {
    success: url.searchParams.has("success"),
    error: url.searchParams.get("error"),
    status: 200,
    message: "ok ⛓️",
  };
};

export const action = async ({ request }: Route.ActionArgs) => {
  const formData = await request.formData();
  const token = String(formData.get("token") ?? "");
  const { isValid, decoded } = await validateUserToken(token);
  if (!isValid || !decoded?.email) {
    return { success: false, status: 403, message: "El token no es valido ⛓️‍💥" };
  }

  // Acción: confirmar subscriber (genérico para cualquier evento)
  if (decoded.action === "confirm-subscriber") {
    // Actualizar subscriber a confirmado
    const subscriber = await db.subscriber.upsert({
      where: { email: decoded.email },
      create: {
        email: decoded.email,
        tags: decoded.tags || [],
        confirmed: true,
        confirmedAt: new Date(),
      },
      update: {
        confirmed: true,
        confirmedAt: new Date(),
        tags: decoded.tags ? { push: decoded.tags } : undefined,
      },
    });

    // Enviar email de bienvenida si se especificó tipo
    if (decoded.welcomeType) {
      await sendWelcomeEmail({
        type: decoded.welcomeType,
        to: decoded.email,
        userName: subscriber.name || undefined,
      });
    }

    // Devolver datos para mostrar UI de confirmación (sin redirect)
    return {
      confirmed: true,
      confirmationType: decoded.welcomeType || "default",
      subscriberName: subscriber.name,
      status: 200,
    };
  }

  // user => //@todo maybe this is not necessary?
  await getOrCreateUser(decoded.email, {
    confirmed: true, // because of token
    tags: decoded.tags || [],
  }); // update confirm
  // @TODO remove this using sendgrid api
  if (decoded.tags) {
    await updateOrCreateSuscription(decoded.email, {
      confirmed: true,
      tags: decoded.tags,
    });
  }
  const session = await placeSession(request, decoded.email);
  // @todo where is best?
  throw redirect("/mis-cursos", {
    headers: { "Set-Cookie": await commitSession(session) },
  });
};

export default function Page() {
  const data = useLoaderData();
  const actionData = useActionData<typeof action>();
  const fetchers = useFetchers(); // hack for Form (not working very well 😡)
  const { trap } = useBotTrap();

  // Si es confirmación de subscriber, mostrar UI especial
  if (actionData && "confirmed" in actionData) {
    return (
      <ConfirmedSubscriber
        type={actionData.confirmationType ?? "default"}
        name={actionData.subscriberName}
      />
    );
  }
  if (actionData && "message" in actionData) {
    return <BadToken message={actionData.message} />;
  }
  if (data.pendingToken) {
    return (
      <ConfirmToken
        token={data.pendingToken}
        email={data.pendingEmail ?? ""}
        isSubscriberConfirmation={!!data.isSubscriberConfirmation}
      />
    );
  }

  const { success, message, status, error } = data;

  if (String(status).includes("4")) {
    return <BadToken message={message} />;
  }

  // Solo el loading del magic link form
  const isMagicLinkLoading = fetchers.some(f => f.formAction === "/api/user" && f.formData?.get("intent") === "magic_link" && f.state !== "idle");

  return (
    <section className="flex flex-col gap-4 pt-28 md:pt-40 max-w-lg px-4 md:px-[5%] xl:px-0 mx-auto">
      <div>
        <img
          className="mx-auto w-40 md:w-64 mb-12"
          src="/robot.svg"
          alt="robot"
        />
        <h2 className="text-xl md:text-2xl font-bold text-white text-center">
          Inicia sesión o crea una cuenta
        </h2>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mt-4">
            <p className="text-sm text-center">
              {error === 'google_auth_failed' && '❌ Error al iniciar sesión con Google. Inténtalo de nuevo.'}
              {error === 'google_oauth_denied' && '⚠️ Acceso denegado. Necesitas permitir el acceso para continuar.'}
              {!['google_auth_failed', 'google_oauth_denied'].includes(error) && `❌ Error: ${error}`}
            </p>
          </div>
        )}
        
        
        <GoogleLoginLink />
      </div>
      <hr className="border-slate-800" />
      <p className="text-colorParagraph text-center">
        O inicia sesión solo con tu correo
      </p>
      {success ? (
        <div className="text-center text-white">
          <span className="flex  justify-center text-4xl">
            <BsMailboxFlag />
          </span>
          <p className="text-xl">Ya te enviamos tu Magic link</p>
          <p className="text-gray-400 text-sm mt-3">
            Checa bien tu correo, ya ves que luego se esconden en spam. 😬
          </p>
          <p className="text-gray-400 text-sm mb-4">
            No olvides agregarnos a tus contactos.
          </p>
          <a
            className="underline text-brand-500"
            rel="noreferrer"
            target="_blank"
            href="https://gmail.com"
          >
            Ir a gmail
          </a>
          <EmojiConfetti />
        </div>
      ) : (
        <Form method="POST" action="/api/user" className="grid gap-2">
          {trap}
          <input
            required
            type="email"
            className="px-4 py-3 text-brand-900  placeholder:text-brand-900/40 rounded-full focus:outline-none  focus:border-brand-500 focus:ring-brand-500"
            name="email"
            placeholder="tuemail@tucorreo.com"
          />
          <button
            name="intent"
            value="magic_link"
            type="submit"
            disabled={isMagicLinkLoading}
            className={twMerge(
              "py-3 px-4 rounded-full text-brand-900 font-semibold text-base flex  items-center justify-center gap-4 bg-brand-500 active:bg-brand-800 disabled:opacity-75 disabled:cursor-not-allowed"
            )}
          >
            <span className="">
              {isMagicLinkLoading ? <Spinner /> : <GiMagicBroom />}
            </span>
            <span>{isMagicLinkLoading ? "Enviando..." : "Solicitar magic link"}</span>
          </button>
        </Form>
      )}
    </section>
  );
}

function ConfirmToken({
  token,
  email,
  isSubscriberConfirmation,
}: {
  token: string;
  email: string;
  isSubscriberConfirmation: boolean;
}) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state !== "idle";
  return (
    <section className="flex flex-col items-center justify-center min-h-screen px-4">
      <Form method="POST" className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-8 max-w-md w-full text-center grid gap-4">
        <span className="text-6xl block">{isSubscriberConfirmation ? "📬" : "🔑"}</span>
        <h1 className="text-2xl font-bold text-white">
          {isSubscriberConfirmation ? "Confirma tu correo" : "Entra a FixterGeek"}
        </h1>
        <p className="text-zinc-400 break-all">{email}</p>
        <input type="hidden" name="token" value={token} />
        <button
          type="submit"
          disabled={isSubmitting}
          className="py-3 px-4 rounded-full text-brand-900 font-semibold bg-brand-500 active:bg-brand-800 disabled:opacity-75"
        >
          {isSubmitting ? "Un momento..." : isSubscriberConfirmation ? "Confirmar mi correo" : "Entrar"}
        </button>
      </Form>
    </section>
  );
}

function BadToken({ message = "Bad Token" }: { message?: string }) {
  return (
    <section className="flex flex-col items-center justify-center h-screen gap-2">
      <h1 className="text-2xl">{message}</h1>
      <Link className="border rounded-xl bg-gray-300 px-4 py-2" to="/login">
        Solicita otro aquí
      </Link>
    </section>
  );
}

function ConfirmedSubscriber({
  type,
  name,
}: {
  type: string;
  name?: string | null;
}) {
  const config = CONFIRMATION_CONFIG[type] || CONFIRMATION_CONFIG.default;

  return (
    <section className="flex flex-col items-center justify-center min-h-screen px-4 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black">
      <EmojiConfetti emojis={["🎉", "✨", "🚀", "💫"]} />

      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-8 max-w-md text-center">
        <span className="text-6xl mb-4 block">{config.emoji}</span>
        <h1 className="text-3xl font-bold text-white mb-2">{config.title}</h1>
        <p className="text-xl text-zinc-300 mb-2">{config.subtitle}</p>
        {config.details && (
          <p className="text-zinc-400 mb-6">{config.details}</p>
        )}
        {name && (
          <p className="text-emerald-400 mb-4">¡Gracias, {name}!</p>
        )}
        <Link
          to={config.cta.href}
          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors"
        >
          {config.cta.text}
        </Link>
      </div>
    </section>
  );
}
