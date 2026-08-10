import { FaLock, FaFlagCheckered } from "react-icons/fa";
import { formatUnlock } from "~/utils/formatUnlock";

/**
 * Slide de una pieza que todavía no se desbloquea.
 *
 * Muestra su poster desenfocado: ver lo que viene es la mitad del valor del
 * camino. La FUENTE del video nunca sale del servidor para una pieza
 * bloqueada — aquí solo llega la imagen de portada.
 */
export function StoryLockedCard({
  title,
  poster,
  unlocksAt,
}: {
  title: string;
  poster?: string | null;
  unlocksAt: string | null;
}) {
  const when = formatUnlock(unlocksAt);

  return (
    <div className="relative w-full h-full overflow-hidden bg-brand-900">
      {poster && (
        <img
          src={poster}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-40"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-brand-900/70 via-brand-900/40 to-brand-900/90" />

      <div className="relative h-full flex flex-col items-center justify-center text-center px-8">
        <span className="w-14 h-14 rounded-full border border-brand-100/20 bg-brand-900/70 flex items-center justify-center text-brand-100/70 text-xl mb-5">
          <FaLock />
        </span>
        <h3 className="text-white text-xl font-bold mb-2 text-balance">
          {title}
        </h3>
        <p className="text-brand-500 text-sm font-bold">
          {when ? `Se abre ${when}` : "Te llega por correo"}
        </p>
        <p className="text-brand-100/40 text-xs mt-1">
          Te avisamos en cuanto esté
        </p>
      </div>
    </div>
  );
}

/** Última slide: el destino de todo el camino. */
export function StoryOutroCard() {
  return (
    <div className="relative w-full h-full bg-brand-900 flex flex-col items-center justify-center text-center px-8">
      <span className="w-14 h-14 rounded-full bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-500 text-xl mb-5">
        <FaFlagCheckered />
      </span>
      <p className="text-brand-500 text-xs font-bold uppercase tracking-widest mb-3">
        Aquí llegamos
      </p>
      <h3 className="text-white text-2xl font-bold mb-3 text-balance">
        Taller: Diseño de sistemas agénticos
      </h3>
      <p className="text-brand-100/70 text-sm">
        Martes 1 de septiembre · 8:00 PM CDMX
      </p>
      <p className="text-brand-100/40 text-xs mt-6 max-w-xs">
        Cuatro sesiones en vivo. Todo lo de estas piezas, construido desde cero.
      </p>
    </div>
  );
}
