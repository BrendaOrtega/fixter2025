import { useEffect } from "react";

/**
 * Guarda de dónde llegó quien está navegando, antes de que deje su correo.
 *
 * Vive en una cookie y no en localStorage porque el servidor tiene que poder
 * leerla en el momento del alta, que es cuando por fin hay un correo al cual
 * pegarle el origen.
 *
 * El primer toque se escribe una sola vez y no se vuelve a tocar: es el que dice
 * qué trajo a la persona. El último se actualiza cuando llega con UTMs nuevos,
 * para saber qué la hizo volver.
 */

const COOKIE = "fx_origen";
const YEAR = 60 * 60 * 24 * 365;

type Origin = {
  source?: string;
  medium?: string;
  campaign?: string;
  referrer?: string;
  landingPath?: string;
  at?: string;
};

const read = (): { first?: Origin; last?: Origin } => {
  const match = document.cookie.match(new RegExp(`${COOKIE}=([^;]+)`));
  if (!match) return {};
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return {};
  }
};

const write = (value: { first?: Origin; last?: Origin }) => {
  const encoded = encodeURIComponent(JSON.stringify(value));
  document.cookie = `${COOKIE}=${encoded}; Path=/; Max-Age=${YEAR}; SameSite=Lax`;
};

const currentOrigin = (): Origin => {
  const params = new URLSearchParams(window.location.search);
  const referrer = document.referrer || undefined;
  // Navegar dentro del sitio no es una fuente; si lo fuera, todo el mundo
  // acabaría atribuido a fixtergeek.com.
  const external =
    referrer && !referrer.includes(window.location.host) ? referrer : undefined;

  return {
    source: params.get("utm_source") ?? undefined,
    medium: params.get("utm_medium") ?? undefined,
    campaign: params.get("utm_campaign") ?? undefined,
    referrer: external,
    landingPath: window.location.pathname,
    at: new Date().toISOString(),
  };
};

export default function useOriginCapture() {
  useEffect(() => {
    try {
      const stored = read();
      const now = currentOrigin();
      const hasSignal = Boolean(now.source || now.referrer);

      // Sin señal y con primer toque ya guardado no hay nada que hacer: una
      // visita directa de alguien que ya conocemos no cambia su origen.
      if (!hasSignal && stored.first) return;

      write({
        first: stored.first ?? now,
        last: hasSignal ? now : stored.last,
      });
    } catch {
      // Cookies bloqueadas: se pierde la atribución, no la navegación.
    }
  }, []);
}
