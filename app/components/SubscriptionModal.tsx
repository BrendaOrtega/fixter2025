import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
} from "motion/react";
import { useEffect, useState, type FormEvent } from "react";
import { cn } from "~/utils/cn";
import { useFetcher, useNavigate } from "react-router";
import { useRemember } from "~/hooks/useRemember";
import { IoClose } from "react-icons/io5";
import Spinner from "./common/Spinner";

export const SubscriptionModal = () => {
  const { scrollYProgress } = useScroll();
  const [isOpen, setIsOpen] = useState(false);
  const fetcher = useFetcher();

  const { avoidForDays, shouldAvoid } = useRemember();

  const pauseScroll = () => (document.body.style.overflow = "hidden");
  const resumeScroll = () => (document.body.style.overflow = "inherit");
  const onClose = () => {
    setIsOpen(false);
    resumeScroll();
    // avoidForSecs(10);
    avoidForDays(7);
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
  const navigate = useNavigate();
  const handleSubmit = (ev: FormEvent<HTMLFormElement>) => {
    avoidForDays(180);
    const formData = new FormData(ev.currentTarget);
    fetcher.submit(formData, { method: "post", action: "/api/user" });
    navigate("/subscribe?success=1");
  };

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
            className="bg-black text-white rounded-2xl w-[90%] md:w-[480px] p-8 md:p-12 relative"
          >
            <button
              onClick={onClose}
              className="hover:scale-110 active:scale-105 absolute top-3 right-3 text-2xl"
            >
              <IoClose />
            </button>{" "}
            <h1 className="text-2xl font-bold mb-8 text-center">
              ¡No te pierdas las próximas publicaciones!
            </h1>
            <img
              className="w-[80%] mx-auto"
              src="/thumbnails/invite.webp"
              alt="thumbnail"
            />
            <fetcher.Form
              className="flex flex-col gap-4 py-2 mt-4 "
              onSubmit={handleSubmit}
            >
              <input
                required
                name="name"
                className="bg-transparent placeholder:text-white/20 font-light rounded-xl border-white/20 border focus:border-none focus:ring-brand-500 focus:ring-2"
                placeholder="Escribe tu nombre"
              />
              <input
                required
                name="email"
                className="bg-transparent placeholder:text-white/20 font-light rounded-xl border-white/20 border focus:border-none focus:ring-brand-500 focus:ring-2 mb-2 "
                placeholder="tucorreo@gmail.com"
              />
              <button
                disabled={isLoading}
                name="intent"
                value="suscription"
                className="cursor-pointer bg-gradient-to-r  from-brand-800 to-brand-700 py-3 px-8 rounded-xl transition-all active:to-brand-700 hover:-translate-y-1"
                type="submit"
              >
                {isLoading ? (
                  <Spinner />
                ) : (
                  "¡Quiero ser parte de la comunidad! 🧑🏻‍💻"
                )}
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
