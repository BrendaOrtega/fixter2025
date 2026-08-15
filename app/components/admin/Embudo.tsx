/**
 * El embudo del programa y el corte por canal.
 *
 * Las barras son proporcionales al primer paso, no cada una a sí misma: lo que
 * hay que ver de un vistazo es el angostamiento, y una barra que siempre llega
 * al borde lo esconde.
 */

type Paso = { paso: string; personas: number; respectoAlAnterior: number | null };
type Canal = { canal: string; registrados: number; vieron: number; compraron: number };

export const Embudo = ({
  embudo,
  canales,
  ventas,
}: {
  embudo: Paso[];
  canales: { medido: Canal[]; preguntado: Canal[] };
  ventas: { total: number; ingreso: number; queVieron: number };
}) => {
  const tope = embudo[0]?.personas || 1;
  const dinero = (centavos: number) =>
    (centavos / 100).toLocaleString("es-MX", { style: "currency", currency: "MXN" });

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-medium text-gray-300">De la grabación</h3>
        <p className="mt-1 text-xs text-gray-500">
          Cada paso solo cuenta a quien pasó el anterior. El porcentaje es contra
          el paso de arriba: ahí se ve la fuga.
        </p>

        <div className="mt-4 flex flex-col gap-2">
          {embudo.map((paso) => (
            <div key={paso.paso} className="flex items-center gap-3">
              <div className="w-52 shrink-0 text-sm text-gray-300">{paso.paso}</div>
              <div className="flex-1 h-7 rounded-lg bg-gray-950 overflow-hidden">
                <div
                  className="h-full bg-purple-500/40 border-r border-purple-400/60"
                  style={{ width: `${Math.max(2, (paso.personas / tope) * 100)}%` }}
                />
              </div>
              <div className="w-14 shrink-0 text-right text-sm font-medium text-white">
                {paso.personas}
              </div>
              <div className="w-16 shrink-0 text-right text-xs text-gray-500">
                {paso.respectoAlAnterior === null ? "" : `${paso.respectoAlAnterior}%`}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-medium text-gray-300">Ventas</h3>
        <div className="mt-3 flex flex-wrap gap-8">
          <div>
            <div className="text-2xl font-semibold text-white">{ventas.total}</div>
            <div className="text-xs text-gray-500">compras</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-white">{dinero(ventas.ingreso)}</div>
            <div className="text-xs text-gray-500">ingreso</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-white">{ventas.queVieron}</div>
            <div className="text-xs text-gray-500">de ellas habían visto la grabación</div>
          </div>
        </div>
        {/* La venta va aparte del embudo a propósito: a este programa se entra
            también por la landing, sin pasar por el video. */}
        <p className="mt-3 text-xs text-gray-500">
          La compra no cuelga del embudo porque a la landing se llega sin pasar
          por la grabación. El tercer número es el que dice si el webinar vende.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[
          { titulo: "Por dónde llegó (medido)", datos: canales.medido, nota: "utm_source o el sitio de origen" },
          { titulo: "Por dónde dice que llegó", datos: canales.preguntado, nota: "lo que contestó al entrar" },
        ].map((bloque) => (
          <div key={bloque.titulo} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-medium text-gray-300">{bloque.titulo}</h3>
            <p className="mt-1 text-xs text-gray-500">{bloque.nota}</p>
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="text-xs uppercase text-gray-500">
                  <th className="py-2 text-left font-medium">Canal</th>
                  <th className="py-2 text-right font-medium">Correos</th>
                  <th className="py-2 text-right font-medium">Vieron</th>
                  <th className="py-2 text-right font-medium">Compraron</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {bloque.datos.map((c) => (
                  <tr key={c.canal}>
                    <td className="py-2 text-gray-300">{c.canal}</td>
                    <td className="py-2 text-right text-gray-400">{c.registrados}</td>
                    <td className="py-2 text-right text-gray-400">{c.vieron}</td>
                    <td className="py-2 text-right text-gray-400">{c.compraron}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500">
        «Sin dato» es todo lo anterior al 15 de agosto de 2026, cuando se empezó a
        guardar el origen. No se puede reconstruir hacia atrás.
      </p>
    </div>
  );
};
