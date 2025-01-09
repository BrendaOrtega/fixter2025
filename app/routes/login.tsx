import { Form, Link, redirect, useFetchers, useLoaderData } from "react-router";
import { twMerge } from "tailwind-merge";
import { EmojiConfetti } from "~/components/common/EmojiConfetti";
// import { validateUserToken } from "~/utils/tokens";
// import {
//   getOrCreateUser,
//   placeSession,
//   updateOrCreateSuscription,
// } from "~/.server/dbGetters";
import { commitSession } from "~/sessions";
import { useGoogleLogin } from "~/hooks/useGoogleLogin";
import { FcGoogle } from "react-icons/fc";
import { GiMagicBroom } from "react-icons/gi";
import Spinner from "~/components/common/Spinner";
import { BsMailboxFlag } from "react-icons/bs";
import type { Route } from "./+types/login";

export const loader = async ({ request }: Route.LoaderArgs) => {
  const url = new URL(request.url);
  const { searchParams } = url;
  // @todo make this a function
  // if (searchParams.has("token")) {
  //   const token = searchParams.get("token") as string;
  //   const { isValid, decoded } = await validateUserToken(token);
  //   if (!isValid || !decoded?.email) {
  //     // for ui
  //     return {
  //       success: false,
  //       status: 403,
  //       message: "El token no es valido ⛓️‍💥",
  //     };
  //   }
  //   // user =>
  //   await getOrCreateUser(decoded.email, {
  //     confirmed: true, // because of token
  //     tags: decoded.tags || [],
  //   }); // update confirm
  //   // @TODO remove this using sendgrid api
  //   if (decoded.tags) {
  //     await updateOrCreateSuscription(decoded.email, {
  //       confirmed: true,
  //       tags: decoded.tags,
  //     });
  //   }
  //   const session = await placeSession(request, decoded.email);
  //   // @todo where is best?
  //   throw redirect("/mis-cursos", {
  //     headers: { "Set-Cookie": await commitSession(session) },
  //   });
  // }
  return {
    success: searchParams.has("success"),
    status: 200,
    message: "ok ⛓️",
  };
};

export default function Page() {
  const { success, message, status } = useLoaderData(); // WTF?
  const { googleLoginHandler } = useGoogleLogin();
  const fetchers = useFetchers(); // hack for Form (not working very well 😡)

  if (String(status).includes("4")) {
    return <BadToken message={message} />;
  }

  const isLoading = fetchers[0] && fetchers[0].state !== "idle";

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
        <button
          type="button"
          onClick={googleLoginHandler}
          className={twMerge(
            "cursor-pointer py-3 px-4 text-white  to-brand-200 text-base w-full shadow flex items-center gap-3 justify-center font-semibold  bg-brand-900 rounded-full disabled:text-gray-100 mx-auto my-8"
          )}
        >
          <span className="text-xl">
            <FcGoogle />
          </span>
          <span> Inicia con Google</span>
        </button>
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
            className={twMerge(
              "py-3 px-4 rounded-full text-brand-900 font-semibold text-base flex  items-center justify-center gap-4 bg-brand-500 active:bg-brand-800"
            )}
          >
            <span className="">
              {isLoading ? <Spinner /> : <GiMagicBroom />}
            </span>
            <span>Solicitar Link Mágico</span>
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
