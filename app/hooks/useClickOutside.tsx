import { useEffect, useRef } from "react";

/**
 * Cierra algo cuando se hace clic fuera de él.
 *
 * Escucha `pointerdown` y NO `click`, a propósito. Con `click` el listener corre
 * hasta que el evento burbujea al documento, y para entonces React ya reaccionó:
 * si el clic fue en un elemento de una lista que se re-renderiza —el menú de
 * videos, donde elegir uno cambia cuál está activo— ese nodo ya no es el mismo y
 * `contains` responde que está fuera. Resultado: cada clic dentro del menú lo
 * cerraba, justo los clics para los que el menú existe.
 *
 * `pointerdown` ocurre antes de cualquier re-render, así que el nodo que se
 * consulta sigue siendo el que se tocó.
 */
export const useClickOutside = <T extends HTMLDivElement>({
  isActive,
  onOutsideClick,
  includeEscape,
}: {
  includeEscape?: boolean;
  isActive: boolean;
  onOutsideClick?: (e: MouseEvent | KeyboardEvent) => void;
}) => {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!isActive) return;

    const handlePointer = (e: PointerEvent) => {
      const target = e.target as Node | null;
      // Un nodo que ya salió del documento no dice nada útil sobre dónde se
      // hizo clic: se ignora en vez de contarlo como "fuera".
      if (!target || !target.isConnected) return;
      if (!ref.current?.contains(target)) {
        onOutsideClick?.(e as unknown as MouseEvent);
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOutsideClick?.(e);
    };

    document.addEventListener("pointerdown", handlePointer);
    if (includeEscape) addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      removeEventListener("keydown", handleKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  return ref;
};
