import { Form, Link, redirect, useFetchers, useLoaderData } from "react-router";
import { twMerge } from "tailwind-merge";
import { EmojiConfetti } from "~/components/common/EmojiConfetti";
import { GoogleLoginLink } from "~/components/GoogleLoginLink";
import { GiMagicBroom } from "react-icons/gi";
import Spinner from "~/components/common/Spinner";
import { BsMailboxFlag } from "react-icons/bs";
import { useState } from "react";
import { IoMdClose } from "react-icons/io";
import type { Route } from "./+types/login";
import {
  getOrCreateUser,
  placeSession,
  updateOrCreateSuscription,
} from "~/.server/dbGetters";
import { commitSession } from "~/sessions";
import { validateUserToken } from "~/utils/tokens";
import { googleHandler } from "~/.server/google";

export const loader = async ({ request }: Route.LoaderArgs) => {
  const url = new URL(request.url);

  // Manejar Google OAuth
  const googleResponse = await googleHandler(request, "/mis-cursos");
  if (googleResponse) {
    return googleResponse; // Retornar el redirect si Google lo maneja
  }

  // @todo remove?
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
    console.log("Decoded: ,", decoded);
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
  }
  return {
    success: url.searchParams.has("success"),
    error: url.searchParams.get("error"),
    status: 200,
    message: "ok ⛓️",
  };
};

export default function Page() {
  const { success, message, status, error } = useLoaderData(); 
  const fetchers = useFetchers(); // hack for Form (not working very well 😡)
  const [showWarning, setShowWarning] = useState(true);

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
        
        {/* Aviso temporal sobre servicio de Google - posicionado a la izquierda */}
        <div 
          className={twMerge(
            "fixed left-4 top-24 z-40 max-w-sm transition-all duration-500 ease-in-out",
            showWarning 
              ? "translate-x-0 opacity-60 hover:opacity-90" 
              : "-translate-x-full opacity-0 pointer-events-none"
          )}
        >
          <div className="bg-yellow-900/90 backdrop-blur-sm border border-yellow-500/30 text-yellow-200 px-4 py-3 rounded-lg relative shadow-lg">
            <button
              onClick={() => setShowWarning(false)}
              className="absolute top-2 right-2 text-yellow-400 hover:text-yellow-300 transition-colors"
              aria-label="Cerrar aviso"
            >
              <IoMdClose size={18} />
            </button>
            <div className="flex items-start gap-2 pr-6">
              <span className="text-yellow-400 mt-0.5">⚠️</span>
              <div className="text-xs">
                <p className="font-semibold mb-1">Aviso del sistema</p>
                <p className="text-yellow-100/90 leading-relaxed">
                  El servicio de Google está experimentando latencias. 
                  Usa el magic link si tienes problemas.
                </p>
              </div>
            </div>
          </div>
        </div>
        
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
