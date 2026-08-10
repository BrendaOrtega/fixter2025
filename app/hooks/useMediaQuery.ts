import { useEffect, useState } from "react";

/**
 * Media query en JS, SSR-safe.
 *
 * Siempre `false` en el servidor y en el primer render del cliente: leer
 * `window` durante el render produce mismatch de hidratación. Para bifurcar
 * LAYOUT usa clases de Tailwind (`md:`); esto es para decidir comportamiento
 * (arrancar observers, reproducir), donde un frame de retraso no se nota.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const list = window.matchMedia(query);
    setMatches(list.matches);

    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
