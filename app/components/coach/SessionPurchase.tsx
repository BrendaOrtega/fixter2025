import { useState } from "react";
import { motion } from "motion/react";

const PACKAGES = [
  { key: "5", sessions: 5, price: "$149", tagline: "pruébalo" },
  { key: "15", sessions: 15, price: "$399", tagline: "un tema al mes" },
  { key: "50", sessions: 50, price: "$999", tagline: "entrena a diario" },
] as const;

export function SessionPurchase({ onClose }: { onClose?: () => void }) {
  const [selected, setSelected] = useState<string>("15");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePurchase = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/coach/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: selected }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("No se pudo iniciar el checkout. Intenta de nuevo.");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md w-full mx-auto space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-zinc-100">
          ¿Cuántas sesiones quieres?
        </h2>
        <p className="text-sm text-zinc-500">
          Cada sesión incluye coaching adaptativo por texto y voz
        </p>
      </div>

      <div className="space-y-3">
        {PACKAGES.map((pkg) => (
          <button
            key={pkg.key}
            onClick={() => setSelected(pkg.key)}
            className={`w-full rounded-xl border p-4 text-left transition flex items-center justify-between ${
              selected === pkg.key
                ? "border-[#CA9B77] bg-[#CA9B77]/10"
                : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  selected === pkg.key
                    ? "border-[#CA9B77]"
                    : "border-zinc-600"
                }`}
              >
                {selected === pkg.key && (
                  <div className="w-2 h-2 rounded-full bg-[#CA9B77]" />
                )}
              </div>
              <div>
                <span className="text-zinc-200 font-medium">
                  {pkg.sessions} sesiones
                </span>
                <span className="text-zinc-500 ml-2">·</span>
                <span className="text-[#CA9B77] font-semibold ml-2">
                  {pkg.price}
                </span>
              </div>
            </div>
            <span className="text-xs text-zinc-500">{pkg.tagline}</span>
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-400 text-center">{error}</p>
      )}

      <button
        onClick={handlePurchase}
        disabled={loading}
        className="w-full rounded-xl bg-[#CA9B77] py-3 text-sm font-medium text-zinc-900 hover:bg-[#b8895f] transition disabled:opacity-50"
      >
        {loading ? "Procesando..." : "Comprar"}
      </button>

      {onClose && (
        <button
          onClick={onClose}
          className="w-full text-sm text-zinc-500 hover:text-zinc-300 transition"
        >
          Volver
        </button>
      )}
    </motion.div>
  );
}
