import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useFetcher } from "react-router";
import { IoClose } from "react-icons/io5";
import { StarRating } from "~/components/common/StarRating";
import { cn } from "~/utils/cn";

interface RatingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseTitle: string;
  userEmail: string;
  userName?: string;
}

export function RatingDrawer({
  isOpen,
  onClose,
  courseId,
  courseTitle,
  userEmail,
  userName,
}: RatingDrawerProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [displayName, setDisplayName] = useState(userName || "");
  const fetcher = useFetcher();

  const isSubmitting = fetcher.state === "submitting";
  const isSuccess = fetcher.data?.success;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    fetcher.submit(
      {
        intent: "submit_rating",
        courseId,
        rating: rating.toString(),
        comment,
        displayName,
        email: userEmail,
      },
      { method: "POST", action: "/api/ratings" }
    );
  };

  const handleClose = () => {
    setRating(0);
    setComment("");
    setDisplayName(userName || "");
    onClose();
  };

  const jsx = (
    <article className="relative">
      <motion.button
        onClick={handleClose}
        id="overlay"
        className="fixed inset-0 bg-dark/60 z-10"
        animate={{ backdropFilter: "blur(4px)" }}
        exit={{ backdropFilter: "blur(0)", opacity: 0 }}
      />
      <motion.section
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "120%" }}
        transition={{ type: "spring", bounce: 0.1, duration: 0.3 }}
        className={cn(
          "bg-background border border-white/10 z-10",
          "fixed bottom-0 left-0 right-0 md:left-auto md:right-4 md:bottom-4",
          "md:w-[450px] md:rounded-2xl rounded-t-2xl",
          "p-6 md:p-8 flex flex-col text-white shadow-2xl"
        )}
      >
        {isSuccess ? (
          <SuccessState onClose={handleClose} />
        ) : (
          <>
            <header className="flex items-center justify-between mb-6">
              <div>
                <h4 className="text-xl font-semibold md:text-2xl text-white">
                  ¿Qué te pareció el curso?
                </h4>
                <p className="text-brand_gray text-sm mt-1">{courseTitle}</p>
              </div>
              <button
                onClick={handleClose}
                className="text-2xl p-1 active:scale-95 hover:bg-white/10 rounded-full transition-colors"
              >
                <IoClose />
              </button>
            </header>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex flex-col items-center py-4">
                <p className="text-sm text-gray-400 mb-3">
                  Selecciona tu calificación
                </p>
                <StarRating
                  rating={rating}
                  interactive
                  onChange={setRating}
                  size={40}
                />
                {rating > 0 && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm mt-2 text-yellow-400"
                  >
                    {getRatingText(rating)}
                  </motion.p>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  ¿Quieres añadir un comentario? (opcional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Cuéntanos tu experiencia..."
                  rows={3}
                  maxLength={1000}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-brand_blue resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Tu nombre (como aparecerá públicamente)
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ej: Juan P."
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-brand_blue"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-3 px-4 rounded-lg border border-white/20 text-white hover:bg-white/5 transition-colors"
                >
                  Después
                </button>
                <button
                  type="submit"
                  disabled={rating === 0 || isSubmitting}
                  className="flex-1 py-3 px-4 rounded-lg bg-brand_blue text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand_blue/90 transition-colors"
                >
                  {isSubmitting ? "Enviando..." : "Enviar"}
                </button>
              </div>
            </form>
          </>
        )}
      </motion.section>
    </article>
  );

  return <AnimatePresence mode="popLayout">{isOpen && jsx}</AnimatePresence>;
}

function SuccessState({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-8"
    >
      <div className="text-6xl mb-4">🎉</div>
      <h4 className="text-xl font-semibold text-white mb-2">
        ¡Gracias por tu opinión!
      </h4>
      <p className="text-gray-400 text-sm mb-6">
        Tu calificación será revisada y publicada pronto.
      </p>
      <button
        onClick={onClose}
        className="py-3 px-8 rounded-lg bg-brand_blue text-white font-medium hover:bg-brand_blue/90 transition-colors"
      >
        Continuar
      </button>
    </motion.div>
  );
}

function getRatingText(rating: number): string {
  const texts: Record<number, string> = {
    1: "Necesita mejorar",
    2: "Regular",
    3: "Bueno",
    4: "Muy bueno",
    5: "¡Excelente!",
  };
  return texts[rating] || "";
}
