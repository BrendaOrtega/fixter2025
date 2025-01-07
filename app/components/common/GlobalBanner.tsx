import { useEffect, useState, type ReactNode } from "react";
import { cn } from "~/utils/cn";
import { PrimaryButton } from "./PrimaryButton";
import { AnimatePresence, motion } from "motion/react";

export const GlobalBanner = ({
  children,
  className,
  variant,
}: {
  children?: ReactNode;
  className?: string;
  variant?: string;
}) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setShow(true);
    }, 1000 * 60 * 0.1);
    setTimeout(() => {
      setShow(false);
    }, 1000 * 60 * 1.5);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0.6, x: -300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -160 }}
          transition={{ type: "spring", bounce: 0.4 }}
          className="fixed bottom-8 left-8 w-[480px] z-[999] rounded-xl overflow-hidden h-[240px] hidden md:flex "
        >
          <div
            className={cn(
              "bg-animationsBanner bg-bottom bg-cover bg-no-repeat h-full  px-6  items-center justify-between ",
              {
                "bg-bannerHome ": variant === "home",
              }
            )}
          >
            <div className="flex items-center justify-start relative">
              <button
                onClick={() => {
                  setShow(false);
                }}
              >
                <img
                  alt="close"
                  src="/closeDark.png"
                  className="absolute right-0 -top-4 w-8 h-8"
                />{" "}
              </button>
              <img
                className="h-[120px] animate-rotate absolute right-0 -bottom-8"
                src="https://i.imgur.com/aThPBNV.png"
                alt="badge"
              />
              <div className="pr-3">
                <h2 className="font-bold text-xl text-brand-100">
                  Compra el curso de Animaciones con React + Motion a precio
                  especial 🔥🔥🔥
                </h2>
                <p className="text-white/60 mt-1 font-light">
                  Aprevecha el{" "}
                  <span className="font-bold text-brand-500">
                    30% y 40% de descuento
                  </span>{" "}
                  <br />
                  durante el mes de Enero 🎟️
                </p>{" "}
                <PrimaryButton
                  as="Link"
                  to="https://animaciones.fixtergeek.com/"
                  variant="fill"
                  className="bg-white text-sm border-none h-8 mt-6"
                >
                  <span>Ver curso</span>
                </PrimaryButton>
              </div>{" "}
            </div>
          </div>{" "}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
