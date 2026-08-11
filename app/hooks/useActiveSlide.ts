import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Qué slide del feed está en pantalla, y cómo moverse entre ellas.
 *
 * Un solo IntersectionObserver con `root` en el scroller, no uno por slide:
 * hay que COMPARAR cuál se ve más para elegir ganador, y para eso los ratios
 * tienen que llegar juntos. (Por eso tampoco sirve `useInView` de motion, que
 * monta un observer por elemento y no expone el ratio.)
 */
export function useActiveSlide({
  scrollerRef,
  count,
  initialIndex = 0,
  enabled = true,
}: {
  scrollerRef: React.RefObject<HTMLElement | null>;
  count: number;
  initialIndex?: number;
  enabled?: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const slidesRef = useRef(new Map<number, HTMLElement>());

  // Destino de un salto programático. Mientras viaja, el observer va viendo
  // las slides intermedias y avisaría de cada una: quien pinte el estado
  // (barras, camino) parpadearía con dos o tres valores antes del bueno. Se
  // ignoran hasta llegar, con un plazo de gracia por si el snap deja el scroll
  // a medio pixel y el destino nunca cruza el umbral.
  const jumpTo = useRef<number | null>(null);
  const jumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const registerSlide = useCallback((index: number, el: HTMLElement | null) => {
    if (el) slidesRef.current.set(index, el);
    else slidesRef.current.delete(index);
  }, []);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root || !enabled || count === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Gana la más visible de las que cruzan el umbral. Con snap solo hay
        // una candidata salvo durante el propio scroll, que es cuando importa.
        let best: { index: number; ratio: number } | null = null;
        for (const entry of entries) {
          if (entry.intersectionRatio < 0.6) continue;
          const index = Number((entry.target as HTMLElement).dataset.index);
          if (!best || entry.intersectionRatio > best.ratio) {
            best = { index, ratio: entry.intersectionRatio };
          }
        }
        if (!best) return;
        if (jumpTo.current !== null) {
          if (best.index !== jumpTo.current) return;
          jumpTo.current = null;
        }
        setActiveIndex(best.index);
      },
      { root, threshold: [0.6, 0.9] }
    );

    slidesRef.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [scrollerRef, count, enabled]);

  /**
   * Un solo camino para teclado, barras, chevrons y auto-avance.
   *
   * Se scrollea el contenedor a mano en vez de `scrollIntoView`: con
   * `snap-mandatory`, Chrome deshace el scroll programático y devuelve la
   * vista a la slide anterior. Como todas miden lo mismo que el scroller, el
   * destino es exacto.
   */
  const goTo = useCallback(
    (index: number, smooth = true) => {
      const scroller = scrollerRef.current;
      if (!scroller) return;
      scroller.scrollTo({
        top: index * scroller.clientHeight,
        behavior: smooth ? "smooth" : "auto",
      });
      jumpTo.current = index;
      if (jumpTimer.current) clearTimeout(jumpTimer.current);
      jumpTimer.current = setTimeout(() => (jumpTo.current = null), 900);
      // Optimista: el observer confirma, pero la UI no espera al scroll.
      setActiveIndex(index);
    },
    [scrollerRef]
  );

  // Posicionar en la slide pedida, sin animación.
  //
  // Se repite cada vez que llega un índice distinto, no sólo al montar: entrar
  // desde el camino es una navegación cliente que revalida el loader pero NO
  // remonta el feed, así que con un flag de "ya posicioné" la URL cambiaba y el
  // video se quedaba en el anterior. Se compara contra el último índice
  // aplicado —y no contra un booleano— para que el 0 también cuente.
  const positionedFor = useRef<number | null>(null);
  useEffect(() => {
    if (positionedFor.current === initialIndex) return;
    const scroller = scrollerRef.current;
    if (!scroller || !scroller.clientHeight) return;
    positionedFor.current = initialIndex;
    scroller.scrollTo({ top: initialIndex * scroller.clientHeight });
    setActiveIndex(initialIndex);
  }, [initialIndex, scrollerRef]);

  useEffect(
    () => () => {
      if (jumpTimer.current) clearTimeout(jumpTimer.current);
    },
    []
  );

  return { activeIndex, goTo, registerSlide };
}
