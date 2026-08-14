import { useState } from "react";
import { Link, data, useFetcher } from "react-router";
import type { Route } from "./+types/programas.$courseSlug";
import { AdminNav } from "~/components/admin/AdminNav";
import { getAdminOrRedirect } from "~/.server/dbGetters";
import { getPrograma } from "~/.server/programas";
import { db } from "~/.server/db";

export const loader = async ({ request, params }: Route.LoaderArgs) => {
  await getAdminOrRedirect(request);
  const programa = await getPrograma(params.courseSlug as string);
  if (!programa) throw data("Programa no encontrado", { status: 404 });
  return programa;
};

export const action = async ({ request, params }: Route.ActionArgs) => {
  await getAdminOrRedirect(request);
  const formData = await request.formData();

  if (formData.get("intent") === "set_stage") {
    await db.course.update({
      where: { slug: params.courseSlug as string },
      data: { stage: String(formData.get("stage")) },
    });
    return { ok: true };
  }
  return data({ error: "Intent desconocido" }, { status: 400 });
};

// Vive aquí y no en `~/.server/programas` porque el componente corre en el
// cliente: importar del server desde el render arrastra Prisma al bundle.
const KIND_LABEL: Record<string, string> = {
  webinar: "Webinar",
  sesion: "Sesión",
  short: "Short",
  leccion: "Lección",
};
const kindLabel = (kind?: string | null) =>
  kind ? KIND_LABEL[kind] || kind : "Sin clasificar";

const STAGES = [
  { value: "promocion", label: "Promoción" },
  { value: "en-vivo", label: "En vivo" },
  { value: "on-demand", label: "On-demand" },
];

const Stat = ({ label, value }: { label: string; value: number | string }) => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
    <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
    <div className="text-2xl font-bold text-white mt-1">{value}</div>
  </div>
);

const fecha = (value: string | Date | null) =>
  value
    ? new Date(value).toLocaleDateString("es-MX", {
        day: "numeric",
        month: "short",
        timeZone: "America/Mexico_City",
      })
    : null;

export default function Programa({ loaderData }: Route.ComponentProps) {
  const { course, tag, piezas, materialesDelCurso, audiencia, stats } =
    loaderData;
  const fetcher = useFetcher();
  const [tab, setTab] = useState<"piezas" | "audiencia">("piezas");

  return (
    <article className="min-h-screen bg-gray-950 pt-8 ml-48">
      <AdminNav />
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <Link
          to="/admin/programas"
          className="text-xs text-gray-500 hover:text-gray-300"
        >
          ← Programas
        </Link>

        <header className="mt-2 mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white">{course.title}</h1>
            <p className="text-sm text-gray-500">
              tag de audiencia:{" "}
              <code className="text-gray-400">{tag}</code>
            </p>
          </div>
          <fetcher.Form method="post" className="flex items-center gap-2">
            <input type="hidden" name="intent" value="set_stage" />
            <label className="text-xs text-gray-500">Fase</label>
            <select
              name="stage"
              defaultValue={course.stage || ""}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              className="px-3 py-1.5 text-sm bg-gray-900 border border-gray-800 text-white rounded-lg"
            >
              <option value="">sin fase</option>
              {STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </fetcher.Form>
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Stat label="Registrados" value={stats.registrados} />
          <Stat label="Confirmados" value={stats.confirmados} />
          <Stat label="Vieron algo" value={stats.vieron} />
          <Stat label="Comprometidos" value={stats.comprometidos} />
        </div>

        <div className="flex gap-1 mb-4">
          {(["piezas", "audiencia"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-sm rounded-lg capitalize ${
                tab === t
                  ? "bg-gray-800 text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "piezas" ? (
          <div className="flex flex-col gap-2">
            {piezas.length === 0 && (
              <p className="text-sm text-gray-500">
                Este programa todavía no tiene piezas publicadas.
              </p>
            )}
            {piezas.map((pieza) => (
              <div
                key={pieza.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-800 text-gray-300">
                        {kindLabel(pieza.kind)}
                      </span>
                      {fecha(pieza.eventDate) && (
                        <span className="text-xs text-gray-500">
                          {fecha(pieza.eventDate)}
                        </span>
                      )}
                    </div>
                    <h3 className="text-white font-medium mt-1.5">
                      {pieza.title}
                    </h3>
                    <a
                      href={`/cursos/${course.slug}/${pieza.slug}`}
                      target="_blank"
                      rel="noopener"
                      className="text-xs text-gray-500 hover:text-gray-300 break-all"
                    >
                      /cursos/{course.slug}/{pieza.slug}
                    </a>
                  </div>
                  <div
                    className="text-xs text-gray-400 shrink-0 text-right"
                    title="Navegadores distintos que abrieron el reproductor. Las reproducciones cuentan cada sentada; recargar dentro de media hora no suma otra."
                  >
                    {pieza.espectadores}
                    <br />
                    <span className="text-gray-600">
                      {pieza.espectadores === 1 ? "persona" : "personas"}
                    </span>
                    <br />
                    <span className="text-gray-700">
                      {pieza.reproducciones}{" "}
                      {pieza.reproducciones === 1
                        ? "reproducción"
                        : "reproducciones"}
                    </span>
                  </div>
                </div>

                {pieza.materiales.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-800 flex flex-wrap gap-2">
                    {pieza.materiales.map((material) => (
                      <a
                        key={material.id}
                        href={`/cursos/${course.slug}/${pieza.slug}/${material.slug}`}
                        target="_blank"
                        rel="noopener"
                        className="px-2.5 py-1 text-xs rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700"
                      >
                        {material.kind === "pdf" ? "📄" : "🖥"} {material.title}
                        {material.legacyPath && (
                          <span className="text-gray-500">
                            {" "}
                            · {material.legacyPath}
                          </span>
                        )}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {materialesDelCurso.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <h3 className="text-white font-medium mb-2">
                  Material del programa
                </h3>
                <div className="flex flex-wrap gap-2">
                  {materialesDelCurso.map((material) => (
                    <span
                      key={material.id}
                      className="px-2.5 py-1 text-xs rounded-lg bg-gray-800 text-gray-300"
                    >
                      {material.title}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-950/60 border-b border-gray-800">
                <tr className="text-xs uppercase text-gray-500">
                  <th className="px-4 py-3 text-left font-medium">Correo</th>
                  <th className="px-4 py-3 text-left font-medium">Registro</th>
                  <th className="px-4 py-3 text-center font-medium">Minutos</th>
                  <th className="px-4 py-3 text-center font-medium">
                    Materiales
                  </th>
                  <th className="px-4 py-3 text-center font-medium">
                    Compromiso
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {audiencia.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      Nadie con el tag <code>{tag}</code> todavía.
                    </td>
                  </tr>
                ) : (
                  audiencia.map((persona) => (
                    <tr key={persona.id} className="hover:bg-gray-800/40">
                      <td className="px-4 py-2 text-gray-200">
                        {persona.email}
                        {!persona.confirmed && (
                          <span className="ml-2 text-xs text-amber-500">
                            sin confirmar
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-gray-500">
                        {fecha(persona.createdAt)}
                      </td>
                      <td className="px-4 py-2 text-center text-gray-300">
                        {persona.minutosVistos || "—"}
                      </td>
                      <td className="px-4 py-2 text-center text-gray-300">
                        {persona.materiales || "—"}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span
                          className="tracking-widest"
                          title={`${persona.compromiso}/3`}
                        >
                          {"●".repeat(persona.compromiso)}
                          <span className="text-gray-700">
                            {"●".repeat(3 - persona.compromiso)}
                          </span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-gray-600 mt-4">
          El compromiso se arma con lo que ya se registra: el tag de registro,
          los minutos vistos (VideoView) y los materiales abiertos
          (ResourceAccess). La asistencia real en vivo no está aquí: la sala es
          Ghosty Teams y no reporta a este sitio.
        </p>
      </div>
    </article>
  );
}
