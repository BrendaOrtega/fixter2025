import { Link } from "react-router";
import type { Route } from "./+types/programas";
import { AdminNav } from "~/components/admin/AdminNav";
import { getAdminOrRedirect } from "~/.server/dbGetters";
import { getProgramas } from "~/.server/programas";

export const loader = async ({ request }: Route.LoaderArgs) => {
  await getAdminOrRedirect(request);
  return { programas: await getProgramas() };
};

const STAGE = {
  promocion: { label: "Promoción", className: "bg-amber-500/15 text-amber-300" },
  "en-vivo": { label: "En vivo", className: "bg-red-500/15 text-red-300" },
  "on-demand": { label: "On-demand", className: "bg-emerald-500/15 text-emerald-300" },
} as const;

export default function Programas({ loaderData }: Route.ComponentProps) {
  const { programas } = loaderData;

  return (
    <article className="min-h-screen bg-gray-950 pt-8 ml-48">
      <AdminNav />
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <h1 className="text-2xl font-bold text-white">Programas</h1>
        <p className="text-sm text-gray-400 mt-1 mb-6">
          Cada programa junta sus webinars, sus sesiones y sus shorts. Entra a
          uno para ver sus piezas, sus materiales y su audiencia.
        </p>

        <div className="flex flex-col gap-2">
          {programas.map((programa) => {
            const stage = programa.stage
              ? STAGE[programa.stage as keyof typeof STAGE]
              : null;
            return (
              <Link
                key={programa.id}
                to={`/admin/programas/${programa.slug}`}
                className="flex items-center gap-4 p-4 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors"
              >
                {programa.icon && (
                  <img
                    src={programa.icon}
                    alt=""
                    className="w-10 h-10 rounded-lg object-cover shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="text-white font-medium truncate">
                    {programa.title}
                  </h2>
                  <p className="text-xs text-gray-500 truncate">
                    {programa.slug}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs">
                  <span className="text-gray-400">
                    {programa.piezas}{" "}
                    {programa.piezas === 1 ? "pieza" : "piezas"}
                  </span>
                  <span className="text-gray-400">
                    {programa.audiencia} registrados
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full ${
                      stage?.className || "bg-gray-800 text-gray-500"
                    }`}
                  >
                    {stage?.label || "sin fase"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </article>
  );
}
