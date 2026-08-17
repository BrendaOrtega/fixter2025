import { useEffect, useState } from "react";
import { Link } from "react-router";
import { proximoWebinar } from "~/utils/webinarDates";

const CERRADO_KEY = "webinar_bar_closed";
/** Tres días: lo bastante para no ser molesto, poco para volver antes del jueves. */
const OLVIDO_SEGS = 60 * 60 * 24 * 3;

/**
 * La banda del webinar gratuito, arriba de la home.
 *
 * Existe porque los shorts cierran diciendo "regístrate en fixtergeek.com" y la
 * home no mencionaba la palabra "webinar" en ningún lado: el único botón del
 * hero llevaba al taller de paga. Quien llegaba buscando algo gratis no lo
 * encontraba.
 *
 * La fecha y el tema salen de los datos, y cuando ya no hay webinar próximo la
 * banda **devuelve null**: se quita sola, sin que nadie tenga que acordarse.
 */
export const WebinarBar = () => {
  const proximo = proximoWebinar();
  // Arranca oculta y aparece tras leer localStorage: pintarla y esconderla
  // después haría que parpadeara en cada carga.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const guardado = localStorage.getItem(CERRADO_KEY);
    if (!guardado) return setVisible(true);
    try {
      const { expiry } = JSON.parse(guardado) as { expiry: number };
      if (Date.now() / 1000 > expiry) {
        localStorage.removeItem(CERRADO_KEY);
        setVisible(true);
      }
    } catch {
      // Valor corrupto: se tira y se muestra.
      localStorage.removeItem(CERRADO_KEY);
      setVisible(true);
    }
  }, []);

  const cerrar = () => {
    setVisible(false);
    localStorage.setItem(
      CERRADO_KEY,
      JSON.stringify({ expiry: Date.now() / 1000 + OLVIDO_SEGS })
    );
  };

  if (!proximo || !visible) return null;

  // Sin animación de altura: `height: auto` con Motion se quedaba midiendo mal
  // y la banda salía de 23px, con el texto cortado. Aquí no hace falta.
  // Cinta sólida, no un tinte: en `bg-brand-500/10` sobre el fondo oscuro se leía
  // como un segundo renglón de la navbar. Menta llena y texto casi negro es lo
  // único que se despega de un sitio que es oscuro de arriba a abajo.
  //
  // El margen deja pasar a la navbar, que es `fixed` en top:0 y con
  // `backdrop-blur`: lo que le quede debajo no se tapa, se enturbia. Su altura
  // medida es 44px, 60px a partir de `md` y 78px a partir de `lg`; aquí van esos
  // números más ~8px de aire.
  return (
    <aside className="mt-[52px] w-full bg-brand-500 text-brand-900 md:mt-[68px] lg:mt-[86px]">
      <div className="relative mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6 sm:py-2.5">
        <p className="flex items-center gap-2.5 pr-8 text-sm font-medium sm:pr-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-900/60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-900" />
          </span>
          <span>
            <span className="font-black uppercase tracking-wide">
              Webinar gratis
            </span>
            <span className="mx-1.5 opacity-40">·</span>
            <span className="font-bold">{proximo.short}</span>
            {/* El tema solo en pantallas anchas: en móvil se lleva tres renglones
                de lo que está sobre el doblez, y el gancho es «gratis» y la
                fecha. El tema se lee al aterrizar en la landing. */}
            <span className="hidden opacity-70 lg:inline">
              <span className="mx-1.5 opacity-60">·</span>
              {proximo.title}
            </span>
          </span>
        </p>

        <div className="flex shrink-0 items-center gap-1">
          <Link
            to="/sistemas-agenticos#webinar"
            className="w-full rounded-full bg-brand-900 px-5 py-2.5 text-center text-sm font-bold text-brand-500 transition hover:bg-black sm:w-auto sm:py-2"
          >
            Apartar mi lugar →
          </Link>
          {/* En móvil el botón se lleva el ancho, así que la ✕ se va a la
              esquina en vez de robarle espacio. */}
          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar aviso del webinar"
            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-brand-900/50 transition hover:bg-brand-900/10 hover:text-brand-900 sm:static sm:ml-1"
          >
            ✕
          </button>
        </div>
      </div>
    </aside>
  );
};
