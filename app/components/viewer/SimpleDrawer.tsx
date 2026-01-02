import { AnimatePresence, motion } from "framer-motion";
import { type ReactNode, useEffect, useRef } from "react";
// import { createPortal } from "react-dom";
import { IoClose } from "react-icons/io5";
import { cn } from "~/utils/cn";

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
}: {
  mode?: string;
  noOverlay?: boolean;
  header?: ReactNode;
  cta?: ReactNode;
  title?: string;
  subtitle?: string;
  onClose?: () => void;
  isOpen?: boolean;
  children: ReactNode;
  className?: string;
}) => {
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
    <article className={cn("relative ", className)}>
      {!noOverlay && (
        <motion.button
          onClick={onClose}
          id="overlay"
          className="fixed inset-0 bg-dark/60  z-10"
          animate={{ backdropFilter: "blur(4px)" }}
          exit={{ backdropFilter: "blur(0)", opacity: 0 }}
        />
      )}
      <motion.section
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "120%" }}
        transition={{ type: "spring", bounce: 0, duration: 0.2 }}
        className={cn(
          "bg-background border border-white/10 z-10 h-screen fixed top-0 right-0 shadow-xl rounded-tl-3xl rounded-bl-3xl p-6 md:py-8 md:px-12 flex flex-col text-white",
          mode === "big"
            ? "w-[95%] md:w-[90%] lg:w-[85%]"
            : "w-[90%] md:w-[60%] lg:w-[40%]"
        )}
      >
        {header ? (
          header
        ) : (
          <header className="flex items-center justify-between mb-6 ">
            <div>
              <h4 className="text-2xl font-semibold md:text-4xl text-white">
                {title}
              </h4>
              <p className="text-brand_gray">{subtitle}</p>
            </div>
            <button
              tabIndex={0}
              onClick={onClose}
              className="text-2xl round-full p-1 active:scale-95"
            >
              <IoClose />
            </button>
          </header>
        )}
        <section
          style={{
            scrollbarWidth: "none",
          }}
          className="overflow-y-scroll h-[95%]"
        >
          {children}
        </section>
        <nav className="flex justify-end gap-4  mt-auto">
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

  /* <>{body.current && createPortal(jsx, body.current)}</> */
  return <AnimatePresence mode="popLayout">{isOpen && jsx}</AnimatePresence>;
};
