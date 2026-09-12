import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { getAdminOrRedirect } from "~/.server/dbGetters";
import { db } from "~/.server/db";
import { AdminNav } from "~/components/admin/AdminNav";

/// El motor de secuencias visto por dentro: cada corrida del cron y cada envío
/// que SES rechazó. Antes esto solo vivía en el log del contenedor.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  await getAdminOrRedirect(request);
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [runs, failures, pausedByFailure, sequences] = await Promise.all([
    db.sequenceRun.findMany({ orderBy: { startedAt: "desc" }, take: 60 }),
    db.sequenceSendFailure.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.sequenceEnrollment.findMany({
      where: { status: "paused", pausedReason: "send-failed" },
      select: {
        id: true,
        lastError: true,
        lastErrorAt: true,
        failedAttempts: true,
        subscriber: { select: { email: true } },
        sequence: { select: { name: true } },
      },
    }),
    db.sequence.findMany({ select: { id: true, name: true } }),
  ]);

  const names = Object.fromEntries(sequences.map((s) => [s.id, s.name]));
  const week = runs.filter((r) => r.startedAt >= since);
  const summary = {
    runs: week.length,
    sent: week.reduce((n, r) => n + r.sent, 0),
    failed: week.reduce((n, r) => n + r.failed, 0),
    crashed: week.filter((r) => r.error).length,
    lastRun: runs[0]?.startedAt ?? null,
    // Con el cron cada 5 min, más de 20 min sin corrida es que algo se cayó.
    stale: runs[0]
      ? Date.now() - runs[0].startedAt.getTime() > 20 * 60 * 1000
      : true,
  };

  return {
    summary,
    runs,
    failures: failures.map((f) => ({
      ...f,
      sequenceName: names[f.sequenceId] ?? f.sequenceId,
    })),
    pausedByFailure,
  };
};

const fmt = (d: Date | string | null) =>
  d
    ? new Date(d).toLocaleString("es-MX", {
        timeZone: "America/Mexico_City",
        hour12: false,
      })
    : "—";

export default function AdminMotor() {
  const { summary, runs, failures, pausedByFailure } =
    useLoaderData<typeof loader>();

  return (
    <main className="min-h-screen bg-gray-50 ml-48">
      <AdminNav />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Motor de secuencias
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Corridas del cron y envíos rechazados. Cada 5 minutos debe haber una
          corrida.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          {[
            ["Corridas · 7 días", summary.runs, ""],
            ["Enviados · 7 días", summary.sent, ""],
            [
              "Fallidos · 7 días",
              summary.failed,
              summary.failed ? "text-red-600" : "",
            ],
            [
              "Última corrida",
              fmt(summary.lastRun),
              summary.stale ? "text-red-600" : "text-green-700",
            ],
          ].map(([label, value, color]) => (
            <div
              key={String(label)}
              className="rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="text-xs uppercase tracking-wide text-gray-500">
                {label}
              </div>
              <div
                className={`mt-1 text-xl font-bold ${color || "text-gray-900"}`}
              >
                {value}
              </div>
            </div>
          ))}
        </div>
        {summary.stale && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            ✗ Más de 20 minutos sin corrida: el cron no está corriendo.
          </p>
        )}
        {summary.crashed > 0 && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            ✗ {summary.crashed} corrida(s) reventaron a medias esta semana; ver
            la columna Error.
          </p>
        )}

        {pausedByFailure.length > 0 && (
          <section className="mt-8">
            <h2 className="font-bold text-gray-900">
              Pausadas por envío fallido ({pausedByFailure.length})
            </h2>
            <ul className="mt-2 divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white">
              {pausedByFailure.map((p) => (
                <li key={p.id} className="px-4 py-3 text-sm">
                  <span className="font-medium text-gray-900">
                    {p.subscriber.email}
                  </span>{" "}
                  <span className="text-gray-500">
                    · {p.sequence.name} · {p.failedAttempts} intentos ·{" "}
                    {fmt(p.lastErrorAt)}
                  </span>
                  <div className="mt-1 font-mono text-xs text-red-700">
                    {p.lastError}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-8">
          <h2 className="font-bold text-gray-900">
            Envíos fallidos (últimos 50)
          </h2>
          {failures.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">✓ Ninguno registrado.</p>
          ) : (
            <div className="mt-2 overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2">Cuándo</th>
                    <th className="px-3 py-2">Correo</th>
                    <th className="px-3 py-2">Secuencia</th>
                    <th className="px-3 py-2">Intento</th>
                    <th className="px-3 py-2">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {failures.map((f) => (
                    <tr key={f.id}>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                        {fmt(f.createdAt)}
                      </td>
                      <td className="px-3 py-2 text-gray-900">{f.email}</td>
                      <td className="px-3 py-2 text-gray-600">
                        {f.sequenceName}
                      </td>
                      <td className="px-3 py-2 text-gray-600">{f.attempt}</td>
                      <td className="px-3 py-2 font-mono text-xs text-red-700">
                        {f.error}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-8">
          <h2 className="font-bold text-gray-900">Corridas (últimas 60)</h2>
          <div className="mt-2 overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Inicio</th>
                  <th className="px-3 py-2">Fuente</th>
                  <th className="px-3 py-2">Duración</th>
                  <th className="px-3 py-2">Vencidas</th>
                  <th className="px-3 py-2">Enviados</th>
                  <th className="px-3 py-2">Saltados</th>
                  <th className="px-3 py-2">Fallidos</th>
                  <th className="px-3 py-2">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {runs.map((r) => (
                  <tr key={r.id} className={r.error ? "bg-red-50" : ""}>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                      {fmt(r.startedAt)}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{r.source}</td>
                    <td className="px-3 py-2 text-gray-600">
                      {r.durationMs != null ? `${r.durationMs} ms` : "en curso"}
                    </td>
                    <td className="px-3 py-2">{r.due}</td>
                    <td className="px-3 py-2 text-green-700">{r.sent}</td>
                    <td className="px-3 py-2 text-gray-500">{r.skipped}</td>
                    <td
                      className={`px-3 py-2 ${r.failed ? "text-red-700 font-bold" : ""}`}
                    >
                      {r.failed}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-red-700">
                      {r.error ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
