import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
} from "motion/react";
import { useEffect, useState } from "react";
import { cn } from "~/utils/cn";
import { useFetcher } from "react-router";
import { useRemember } from "~/hooks/useRemember";
import { IoClose } from "react-icons/io5";
import Spinner from "./common/Spinner";

export const SubscriptionModal = () => {
  const { scrollYProgress } = useScroll();
  const [isOpen, setIsOpen] = useState(false);
  const fetcher = useFetcher();

  const { avoidForSecs, shouldAvoid } = useRemember();

  const pauseScroll = () => (document.body.style.overflow = "hidden");
  const resumeScroll = () => (document.body.style.overflow = "inherit");
  const onClose = () => {
    setIsOpen(false);
    resumeScroll();
    avoidForSecs(30);
  };

  useMotionValueEvent(scrollYProgress, "change", (last) => {
    if (!isOpen && last > 0.5 && !shouldAvoid()) {
      setIsOpen(true);
      pauseScroll();
    }
  });

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    addEventListener("keydown", handler);
    return () => {
      resumeScroll();
      removeEventListener("keydown", handler);
    };
  }, []);

  const isLoading = fetcher.state !== "idle";

  return (
    <AnimatePresence>
      {isOpen && (
        <main className="grid place-items-center fixed inset-0 z-10">
          {/* Overlay */}
          <motion.section
            onClick={onClose}
            initial={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn("bg-black/10 fixed inset-0 backdrop-blur-sm")}
          />
          {/* Main card */}
          <motion.section
            initial={{ x: 10, opacity: 0, filter: "blur(4px)" }}
            exit={{ x: -10, opacity: 0, filter: "blur(4px)" }}
            animate={{ x: 0, opacity: 1, filter: "blur(0px)" }}
            className="bg-black text-white rounded-2xl w-[420px] p-8 relative"
          >
            <button
              onClick={onClose}
              className="hover:scale-110 active:scale-105 absolute top-3 right-3 text-2xl"
            >
              <IoClose />
            </button>{" "}
            <h1 className="text-2xl font-bold mb-4 text-center">
              ¡No te pierdas todo lo nuevo!
            </h1>
            <img
              className="w-full rounded-xl"
              src="/thumbnails/subscription_0.png"
              alt="thumbnail"
            />
            <fetcher.Form
              className="flex flex-col gap-2 py-2"
              method="post"
              action="/api/user"
            >
              <input
                className="rounded-xl focus:border-none ring-transparent ring-4 focus:ring-brand-500 focus:ring-4 transition-all text-black"
                name="name"
                placeholder="Escribe tu nombre"
              />
              <input
                required
                className="rounded-xl focus:border-none ring-transparent ring-4 focus:ring-brand-500 focus:ring-4 transition-all text-black"
                name="email"
                type="email"
                placeholder="Escribe tu correo"
              />
              <button
                disabled={isLoading}
                name="intent"
                value="suscription"
                className="cursor-pointer bg-gradient-to-r from-brand-800 to-brand-500 py-3 px-8 rounded-xl transition-all active:to-brand-700"
                type="submit"
              >
                {isLoading ? <Spinner /> : "¡Quiero ser parte de la comunidad!"}
              </button>
              <p className="text-xs text-gray-500">
                Te puedes desuscribir en cualquier momento.
              </p>
            </fetcher.Form>
          </motion.section>
        </main>
      )}
    </AnimatePresence>
  );
};
