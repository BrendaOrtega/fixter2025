import { FaGoogle, FaMailBulk } from "react-icons/fa";
import {
  Form,
  Link,
  redirect,
  useLoaderData,
  type LoaderFunctionArgs,
} from "react-router";
import { twMerge } from "tailwind-merge";
import { EmojiConfetti } from "~/components/common/EmojiConfetti";
import { validateUserToken } from "~/utils/tokens";
import invariant from "tiny-invariant";
import {
  getOrCreateUser,
  ifUserRedirect,
  placeSession,
} from "~/.server/dbGetters";
import { commitSession } from "~/sessions";
import type { Route } from "./+types/login";
import { useGoogleLogin } from "~/hooks/useGoogleLogin";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await ifUserRedirect(request);

  const url = new URL(request.url);
  const { searchParams } = url;

  if (searchParams.has("token")) {
    const token = searchParams.get("token");
    invariant(token !== null);
    const { isValid, decoded } = await validateUserToken(token);
    if (!isValid)
      // ui
      return {
        success: false,
        status: 403,
        message: "El token no es valido ⛓️‍💥",
      };

    invariant(decoded?.email);
    await getOrCreateUser(decoded.email);
    const session = await placeSession(request, decoded.email);
    throw redirect("/mis-cursos", {
      headers: { "Set-Cookie": await commitSession(session) },
    });
  }

  return {
    success: searchParams.has("success"),
  };
};

export default function Route() {
  const { success, status, message } = useLoaderData<typeof loader>();

  if (String(status).includes("4")) {
    return <BadToken message={message} />;
  }

  const { googleLoginHandler } = useGoogleLogin();

  return (
    <section className="flex flex-col gap-4 pt-40 max-w-sm mx-auto">
      <div>
        <img className="mx-auto mb-8" src="/full-logo.svg" alt="robot" />
        <h2 className="text-2xl font-bold text-white text-center">
          Inicia sesión o crea una cuenta
        </h2>
        <button
          type="button"
          onClick={googleLoginHandler}
          className={twMerge(
            "cursor-pointer py-3 px-4 text-white  to-brand-200 rounded-lg shadow flex items-center gap-3 justify-center font-bold text-lg bg-gray-700 disabled:text-gray-100 mx-auto my-8"
          )}
        >
          <span className="text-xl">
            <FaGoogle />
          </span>
          <span> Inicia con Google</span>
        </button>
      </div>
      <hr className="border-slate-800" />
      <p className="text-gray-400 text-center">
        Puedes iniciar sesión solo con tu correo
      </p>
      {success ? (
        <div className="text-center text-white">
          <span className="flex justify-center text-4xl">
            <FaMailBulk />
          </span>
          <p className="text-xl">
            Checa tu correo <br /> y tu bandeja de spam
          </p>

          <p className="text-gray-400 text-sm">
            Agreganos a tus contactos y abre el link
          </p>
          <a
            className="underline text-brand-300"
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
            className="px-4 py-3 rounded-lg"
            name="email"
            placeholder="tuemail@tucorreo.com"
          />
          <button
            name="intent"
            value="magic_link"
            type="submit"
            className={twMerge(
              "py-3 px-4 font-bold flex rounded-lg items-center justify-center gap-4 bg-brand-700 active:bg-brand-800"
            )}
          >
            <span className="">
              <FaMailBulk />
            </span>
            Solicitar Link Mágico
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
