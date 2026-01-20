import { PrimaryButton } from "~/components/common/PrimaryButton";
import type { Route } from "./+types/404";
import { redirect } from "react-router";
import getMetaTags from "~/utils/getMetaTags";
import { db } from "~/.server/db";

export const meta = () =>
  getMetaTags({
    title: "404",
    description: "Página no encontrada",
  });

export const loader = async ({ request }: Route.LoaderArgs) => {
  const url = new URL(request.url);
  const pathname = url.pathname;
  if (pathname.includes("react-router")) {
    throw redirect(
      "/cursos/Introduccion-al-desarrollo-web-full-stack-con-React-Router/detalle"
    );
  }

  // Capturar todos los 404s para identificar contenido perdido
  try {
    await db.notFoundLog.upsert({
      where: { path: pathname },
      update: {
        count: { increment: 1 },
        lastSeenAt: new Date(),
      },
      create: {
        path: pathname,
        count: 1,
      },
    });
  } catch (e) {
    // Silenciar errores - no queremos que un error de logging rompa la página 404
    console.error("Error logging 404:", e);
  }

  return null;
};

export default function Route() {
  return (
    <main className="pt-16 p-4 min-h-screen container mx-auto text-white flex items-center justify-center">
      <div className="flex flex-col items-center">
        <h1 className="text-[110px] md:text-[140px] font-bold text-brand-500 text-center mb-0 pb-0">
          Oops!
        </h1>
        <p className="text-colorParagraph font-light text-xl text-center -mt-6">
          404 - ¡Vaya vaya! Esta página no existe 👷🏻‍♀️
        </p>
        <PrimaryButton
          as="Link"
          to="/"
          className="mx-auto mt-8 z-10 relative"
          title="Volver al inicio"
          variant="fill"
        />
        <img className="mt-0 md:-mt-16" alt="cover" src="/404.png" />
      </div>
    </main>
  );
}
