import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IoClose } from "react-icons/io5";
import { cn } from "~/utils/cn";
import { LAYER } from "~/utils/layers";
import { useScrollLock } from "~/hooks/useScrollLock";

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
  noHeader,
}: {
  mode?: string;
  noOverlay?: boolean;
  header?: ReactNode;
  cta?: ReactNode;
  /** Sin Aceptar/Cancelar: hay cajones donde no hay nada que aceptar. */
  noActions?: boolean;
  /** Sin ✕: cuando cerrar no lleva a ningún lado (el contenido sigue bloqueado). */
  noClose?: boolean;
  /**
   * Sin encabezado propio: el título va dentro del contenido.
   *
   * El encabezado vive fuera del bloque centrado, así que en un cajón corto el
   * título queda solo hasta arriba y el resto flotando a media pantalla, como
   * dos piezas distintas. Cuando el título es parte del mensaje —el nombre del
   * video que se está pidiendo abrir— entra al bloque y se centra con él.
   * `title` se sigue pasando: es el `aria-label` del diálogo.
   */
  noHeader?: boolean;
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
  // Escape solo cuando ESTE cajón está abierto y es cerrable. El listener se
  // registraba siempre, montado o no: con varios cajones en el árbol, un solo
  // Escape disparaba el `onClose` de todos.
  useEffect(() => {
    if (!isOpen || noClose) return;
    const handleKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose?.();
    };
    addEventListener("keydown", handleKeys);
    return () => removeEventListener("keydown", handleKeys);
  }, [isOpen, noClose, onClose]);

  useScrollLock(isOpen);

  useEffect(() => {
    if (document.body) body.current = document.body;
  }, []);

  const jsx = (
    /* Sin `relative` ni z-index aquí. Este contenedor los tenía, y como cada
       consumidor pasaba su propia clase `z-[300]`/`z-[100]` por `className`, se
       creaba un stacking context que encerraba al overlay y al panel: por más
       que se subiera su z interno, el cajón nunca podía salir por encima del
       menú. Esa fue la causa de tres rondas de parches que no servían. */
    <article>
      {/* LA REGLA: hay fondo sólo si hacer clic en él HACE algo.

          El fondo existe para cerrar al tocar afuera. Cuando no puede cerrar
          —un cajón de bloqueo (`noClose`), o uno montado sin `onClose`, como
          el de éxito— se quedaba igual a pantalla completa por encima de todo,
          tragándose cada clic para no hacer nada con él. De ahí "el botón
          gigante invisible": el menú de videos no se podía abrir, y al abrirlo
          cualquier clic dentro lo cerraba, porque el clic caía en el fondo y
          nunca llegaba al menú.

          Sin fondo, el panel bloquea lo suyo y el resto de la pantalla queda
          vivo — que además es lo útil: poder irse a otro video. */}
      {!noOverlay && !noClose && !!onClose && (
        <motion.button
          onClick={onClose}
          id="overlay"
          aria-label="Cerrar"
          style={{ zIndex: LAYER.overlay }}
          // Sin `backdrop-filter`: un elemento con blur se vuelve backdrop root
          // y Chrome lo compone por encima de sus hermanos aunque tengan mayor
          // z-index, así que el propio cajón salía atenuado detrás de su fondo.
          className="fixed inset-0 bg-dark/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-label={title}
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
          "bg-background fixed inset-0 flex flex-col justify-center text-white overflow-y-auto scrollbar-sutil p-6",
          // Con encabezado propio el contenido cuelga de arriba; sin él, el
          // bloque entero se centra también en pantalla grande.
          !noHeader && "lg:justify-start",
          // Cajón lateral SOLO desde lg. En tablet el menú de videos ocupa
          // ~420px fijos a la izquierda y se encimaba con un cajón del 60%,
          // dejando su contenido cortado por debajo del menú.
          "lg:inset-auto lg:right-0 lg:top-20 lg:h-[calc(100vh-5rem)] lg:border lg:border-white/10 lg:shadow-xl lg:rounded-tl-3xl lg:rounded-bl-3xl lg:py-8 lg:px-12",
          mode === "big" ? "lg:w-[85%]" : "lg:w-[40%]"
        )}
      >
        {noHeader ? (
          !noClose && (
            <button
              tabIndex={0}
              onClick={onClose}
              aria-label="Cerrar"
              className="round-full absolute right-5 top-5 p-1 text-2xl active:scale-95"
            >
              <IoClose />
            </button>
          )
        ) : header ? (
          header
        ) : (
          <header className="mx-auto mb-3 flex w-full max-w-lg items-start justify-between gap-3 md:mb-6 lg:max-w-none">
            <div className="min-w-0 flex-1 text-center lg:text-left">
              <h4 className="text-balance text-xl font-semibold text-white sm:text-2xl lg:text-4xl">
                {title}
              </h4>
              <p className="text-brand_gray">{subtitle}</p>
            </div>
            {!noClose && (
              <button
                tabIndex={0}
                onClick={onClose}
                aria-label="Cerrar"
                className="round-full absolute right-5 top-5 p-1 text-2xl active:scale-95 lg:static"
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
          // En móvil el cajón ocupa la pantalla completa y el contenido se
          // apelmazaba arriba con media pantalla vacía debajo. Centrado vertical
          // mientras quepa; si crece, el `justify-center` cede y vuelve el scroll.
          // `my-auto` en el hijo y NO `justify-center` en el padre: centrado
          // mientras quepa, pero si el contenido desborda cede en vez de
          // recortarse por arriba, que es el defecto clásico de centrar con
          // flex dentro de un contenedor con scroll.
          className={cn(
            "scrollbar-sutil flex flex-1 flex-col overflow-y-auto",
            !noHeader && "lg:block"
          )}
        >
          {/* Medida de lectura: a pantalla completa en tablet las líneas se
              estiraban a 800px y se leen mal. El cajón puede ser ancho; el
              texto no. */}
          <div
            className={cn(
              "mx-auto my-auto w-full max-w-lg",
              !noHeader && "lg:my-0 lg:max-w-none"
            )}
          >
            {children}
          </div>
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
