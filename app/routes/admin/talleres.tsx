import { cn } from "~/utils/cn";
import { getAdminOrRedirect } from "~/.server/dbGetters";
import type { Route } from "./+types/talleres";

export const loader = async ({ request }: Route.LoaderArgs) => {
  await getAdminOrRedirect(request);
  return null;
};

export default function Page() {
  return (
    <article className="flex flex-col pt-20 text-white max-w-3xl mx-auto px-4 min-h-screen">
      <header>
        <h1 className="text-4xl mb-4">Talleres</h1>
        <p className="text-gray-400">
          El taller es una forma de trabajar en comunidad.
        </p>
      </header>
      <nav>
        <button
          className={cn(
            "py-3 px-6 rounded-full border-2 block ml-auto my-4",
            "transition-all",
            "enabled:hover:scale-105",
            "enabled:active:scale-100"
          )}
        >
          Nuevo taller +
        </button>
      </nav>
      {/* Tabla */}
      <section className="border rounded-2xl flex-1 my-2"></section>
      {/* Footer */}
      <footer className="mt-auto flex py-3">
        <span className="text-gray-600 mx-auto block">
          Made with 🚬 by blissito
        </span>
      </footer>
    </article>
  );
}
