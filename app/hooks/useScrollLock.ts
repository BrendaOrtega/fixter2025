import { useEffect } from "react";

/**
 * Bloquea el scroll del fondo mientras algo está abierto.
 *
 * Lleva CONTADOR a propósito. Había seis copias de esto a mano, todas con el
 * mismo defecto: al cerrarse una capa ponía `overflow = ""` aunque siguiera
 * abierta otra, y el fondo volvía a moverse por debajo. Pasa de verdad — un
 * `?subscribed=1` monta el cajón de éxito mientras el muro de suscripción sigue
 * ahí, y el primero que se desmonta desbloquea al otro.
 *
 * Guarda y restaura el valor previo en vez de asumir que era vacío.
 */
let abiertos = 0;
let previo = "";

export function useScrollLock(activo: boolean) {
  useEffect(() => {
    if (!activo) return;

    if (abiertos === 0) {
      previo = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    abiertos += 1;

    return () => {
      abiertos = Math.max(0, abiertos - 1);
      if (abiertos === 0) document.body.style.overflow = previo;
    };
  }, [activo]);
}
