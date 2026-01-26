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

  // Redirecciones de contenido antiguo
  const redirects: Record<string, string> = {
    "/guias/custom-hooks": "/blog/custom-hooks-react-guia-completa",
    "/meetup": "/",
    "/books": "/libros",
    "/cursos/pong-vanilla-js/": "/cursos/pong-vanilla-js",
    "/cursos-en-vivo/desarrollo-web-para-principiantes-en-vivo": "/cursos",
    "/blog/aprende-en-5-minutos-que-es-html-y-cuando-utilizar-cada-una-de-sus-etiquetas/blog":
      "/blog",
    "/cursos/aprende-desarrollo-web-full-stack-con-react-y-remix/viewer/blog":
      "/blog",
    // Redirecciones de blog posts con tráfico (auditoría Enero 2026)
    "/blog/las-5-mejores-herramientas-para-diseno-de-interfaces-2022":
      "/blog/5-herramientas-para-Diseno-de-Interfaces-en-2025",
    "/blog/Como-anadir-una-llave-SSH-a-Github_7X8":
      "/blog/como-configurar-ssh-keys-github",
    // Posts recreados (alta prioridad - >50 visitas)
    "/blog/OpenCode:-5-Razones-por-las-que-este-Repositorio":
      "/blog/OpenCode-5-Razones-por-las-que-este-Repositorio-te-Interesa",
    "/blog/Claude-Code-vs-GitHub-Copilot-vs-Cursor":
      "/blog/Claude-Code-vs-GitHub-Copilot-vs-Cursor-Cual-Elegir",
    // Posts recreados (media prioridad - 20-50 visitas)
    "/blog/Mis-7-Hacks-para-Claude-Code_8gk":
      "/blog/Mis-7-Hacks-para-Claude-Code",
    "/blog/Los-3-Subagentes-Esenciales-de-Claude-Code":
      "/blog/Los-3-Subagentes-Esenciales-de-Claude-Code",
    "/blog/Agent-Workflow-Patterns":
      "/blog/Agent-Workflow-Patterns-Patrones-para-Agentes-IA",
    "/blog/por-que-estudiar-minimo-3-horas-a-la-semana":
      "/blog/por-que-estudiar-3-horas-a-la-semana",
  };

  if (redirects[pathname]) {
    throw redirect(redirects[pathname]);
  }

  // Ignorar la página 404 misma y assets
  if (pathname === "/404") {
    return null;
  }

  const assetExtensions = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|webp|mp4|webm|json)$/i;
  if (assetExtensions.test(pathname)) {
    return null;
  }

  // Ignorar rutas de scanners de seguridad (WordPress, PHP, etc.)
  const securityScannerPatterns = /\/(wp-content|wp-admin|wp-includes|\.env|phpinfo|\.php$|xmlrpc)/i;
  if (securityScannerPatterns.test(pathname)) {
    return null;
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
