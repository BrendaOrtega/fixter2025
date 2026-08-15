import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IoClose } from "react-icons/io5";
import { cn } from "~/utils/cn";
import { LAYER } from "~/utils/layers";

export const Drawer = ({
  mode,
  children,
  noOverlay,
  isOpen = false,
  onClose,
  title = "Título",
  subtitle,
  cta,
  className,
  header,
  noActions,
  noClose,
}: {
  mode?: string;
  noOverlay?: boolean;
  header?: ReactNode;
  cta?: ReactNode;
  /** Sin Aceptar/Cancelar: hay cajones donde no hay nada que aceptar. */
  noActions?: boolean;
  /** Sin ✕: cuando cerrar no lleva a ningún lado (el contenido sigue bloqueado). */
  noClose?: boolean;
  title?: string;
  subtitle?: string;
  onClose?: () => void;
  isOpen?: boolean;
  children: ReactNode;
  className?: string;
}) => {
  // El portal solo existe en el navegador: en SSR no hay `document`.
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  const body = useRef<HTMLElement>(null);

  // listeners
  const handleKeys = (event: unknown) => {
    if (event.key === "Escape") {
      onClose?.();
    }
  };

  useEffect(() => {
    if (document.body) {
      body.current = document.body;
    }
    // listers
    addEventListener("keydown", handleKeys);

    // block scroll
    if (document.body && isOpen) {
      document.body.style.overflow = "hidden";
    } else if (document.body && !isOpen) {
      document.body.style.overflow = "";
    }
    // clean up
    return () => {
      removeEventListener("keydown", handleKeys);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const jsx = (
    /* Sin `relative` ni z-index aquí. Este contenedor los tenía, y como cada
       consumidor pasaba su propia clase `z-[300]`/`z-[100]` por `className`, se
       creaba un stacking context que encerraba al overlay y al panel: por más
       que se subiera su z interno, el cajón nunca podía salir por encima del
       menú. Esa fue la causa de tres rondas de parches que no servían. */
    <article>
      {!noOverlay && (
        <motion.button
          onClick={onClose}
          id="overlay"
          style={{ zIndex: LAYER.overlay }}
          className="fixed inset-0 bg-dark/60"
          animate={{ backdropFilter: "blur(4px)" }}
          exit={{ backdropFilter: "blur(0)", opacity: 0 }}
        />
      )}
      <motion.section
        style={{ zIndex: LAYER.drawer }}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "120%" }}
        transition={{ type: "spring", bounce: 0, duration: 0.2 }}
        className={cn(
          // En móvil ocupa la pantalla completa: una tarjeta flotante en 375px
          // deja el contenido apretado y el fondo a medio ver, que es peor que
          // no tener fondo. De `md` en adelante vuelve a ser cajón lateral, y
          // arranca DEBAJO de la navbar para que el menú no le cruce el título.
          "bg-background fixed inset-0 flex flex-col text-white overflow-y-auto scrollbar-sutil p-6",
          // Cajón lateral SOLO desde lg. En tablet el menú de videos ocupa
          // ~420px fijos a la izquierda y se encimaba con un cajón del 60%,
          // dejando su contenido cortado por debajo del menú.
          "lg:inset-auto lg:right-0 lg:top-20 lg:h-[calc(100vh-5rem)] lg:border lg:border-white/10 lg:shadow-xl lg:rounded-tl-3xl lg:rounded-bl-3xl lg:py-8 lg:px-12",
          mode === "big" ? "lg:w-[85%]" : "lg:w-[40%]"
        )}
      >
        {header ? (
          header
        ) : (
          <header className="flex items-center justify-between mb-3 md:mb-6">
            <div>
              <h4 className="text-lg font-semibold sm:text-2xl md:text-4xl text-white">
                {title}
              </h4>
              <p className="text-brand_gray">{subtitle}</p>
            </div>
            {!noClose && (
              <button
                tabIndex={0}
                onClick={onClose}
                className="text-2xl round-full p-1 active:scale-95"
              >
                <IoClose />
              </button>
            )}
          </header>
        )}
        <section
          style={{
            scrollbarWidth: "none",
          }}
          className="scrollbar-sutil overflow-y-auto flex-1"
        >
          {children}
        </section>
        <nav className={cn("flex justify-end gap-4 mt-auto", noActions && "hidden")}>
          {cta ? (
            cta
          ) : (
            <>
              <button
                onClick={onClose}
                className="bg-brand_blue text-white hover:scale-95 rounded-full px-8 py-2 transition-all"
              >
                Aceptar
              </button>
              <button
                onClick={onClose}
                className="text-red-500 bg-transparent px-8 py-2 hover:scale-95 transition-all"
              >
                Cancelar
              </button>
            </>
          )}
        </nav>
      </motion.section>
    </article>
  );

  // Al portal: montado dentro del árbol, cualquier ancestro con `transform` o
  // `filter` —los tiene el visor, por las animaciones— vuelve a encerrarlo.
  const contenido = (
    <AnimatePresence mode="popLayout">{isOpen && jsx}</AnimatePresence>
  );

  if (!montado) return null;
  return createPortal(contenido, document.body);
};
