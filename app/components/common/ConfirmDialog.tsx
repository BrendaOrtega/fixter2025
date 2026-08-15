import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "~/utils/cn";
import { LAYER } from "~/utils/layers";

/**
 * Confirmación para acciones que no se pueden deshacer solas.
 *
 * REGLA DEL PROYECTO: toda acción destructiva pregunta antes. Darse de baja de
 * todo, borrar una entrega, cancelar una suscripción, eliminar un video — nada
 * de eso ocurre con un solo clic. Un `window.confirm` no cuenta: se ve ajeno al
 * sitio, no se puede redactar bien y en móvil aparece descolgado del contexto.
 *
 * Lo que hace que una confirmación sirva:
 * - el título dice qué va a pasar, no "¿Estás seguro?"
 * - el botón repite la acción ("Sí, darme de baja"), no dice "Aceptar"
 * - la salida es la opción tranquila y tiene el foco por defecto
 * - Escape cancela, nunca confirma
 */
export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Sí, continuar",
  cancelLabel = "Mejor no",
  destructive = true,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Pinta el botón en rojo. Falso para confirmaciones que no destruyen nada. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // El foco arranca en cancelar: un Enter distraído no debe destruir nada.
  useEffect(() => {
    if (isOpen) cancelRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onCancel]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            style={{ zIndex: LAYER.dialog }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />
          {/* El centrado va por flex y NO por `-translate-x-1/2`: Motion escribe
              su propio `transform` para animar y se lleva por delante el de
              Tailwind, dejando el diálogo colgado de su esquina. */}
          <div style={{ zIndex: LAYER.dialog }}
          className="pointer-events-none fixed inset-0 flex items-center justify-center p-4">
          <motion.div
            role="alertdialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-auto w-full max-w-md rounded-2xl border border-brand-100/10 bg-brand-900 p-6 shadow-2xl"
          >
            <h2 className="text-balance text-lg font-bold text-white">{title}</h2>
            {description && (
              <p className="mt-2 text-sm leading-relaxed text-brand-100">
                {description}
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                ref={cancelRef}
                type="button"
                onClick={onCancel}
                className="rounded-full border border-brand-100/20 px-5 py-2 text-sm font-medium text-brand-100 transition-colors hover:border-brand-100/40 hover:text-white"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={cn(
                  "rounded-full px-5 py-2 text-sm font-bold transition-colors",
                  destructive
                    ? "bg-red-500/90 text-white hover:bg-red-500"
                    : "bg-brand-500 text-brand-900 hover:brightness-110"
                )}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
