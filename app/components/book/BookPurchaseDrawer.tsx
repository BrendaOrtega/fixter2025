import { useState } from "react";
import { Form } from "react-router";
import { motion } from "motion/react";
import { IoMdClose } from "react-icons/io";
import { PrimaryButton } from "~/components/common/PrimaryButton";

interface BookPurchaseDrawerProps {
  bookSlug: string;
  bookTitle: string;
  bookPrice: number; // en centavos
  chaptersCount: number;
  onClose?: () => void;
  forEpub?: boolean;
  currency?: "USD" | "MXN";
}

/**
 * Drawer modal para comprar un libro
 * Reutilizable para cualquier libro
 */
export function BookPurchaseDrawer({
  bookSlug,
  bookTitle,
  bookPrice,
  chaptersCount,
  onClose,
  forEpub = false,
  currency = "USD",
}: BookPurchaseDrawerProps) {
  const [show, setShow] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    setShow(false);
    onClose?.();
  };

  if (!show) return null;

  const priceFormatted = new Intl.NumberFormat(currency === "USD" ? "en-US" : "es-MX", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
  }).format(bookPrice / 100);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-gray-900 rounded-2xl max-w-md w-full p-8 relative shadow-2xl"
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <IoMdClose size={24} />
        </button>

        <img alt="book" className="w-32 mx-auto mb-6" src="/spaceman.svg" />

        <h3 className="text-2xl font-bold text-white">
          {forEpub ? "Desbloquea el EPUB" : "Compra el libro para leer este capítulo"}
        </h3>
        <p className="text-gray-400 mt-3">
          {forEpub
            ? "Compra el libro completo para descargar el EPUB y acceder a todos los capítulos."
            : "Este capítulo solo está disponible comprando el libro. Incluye todos los capítulos y el EPUB descargable."}
        </p>

        <div className="mt-6 p-4 bg-gray-800 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-white font-medium">
              {bookTitle}
            </span>
            <span className="text-[#3178C6] font-bold text-xl">
              {priceFormatted} {currency}
            </span>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-gray-400">
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span> {chaptersCount} capítulos
              completos
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span> EPUB descargable
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span> Actualizaciones futuras
            </li>
          </ul>
        </div>

        <Form method="POST" className="mt-6 space-y-3">
          <input type="hidden" name="intent" value="checkout" />
          <PrimaryButton
            type="submit"
            onClick={() => setIsLoading(true)}
            isLoading={isLoading}
            className="w-full"
          >
            Comprar ahora
          </PrimaryButton>
        </Form>

        {currency === "USD" && (
          <Form method="POST">
            <input type="hidden" name="intent" value="checkout" />
            <input type="hidden" name="currency" value="mxn" />
            <button
              type="submit"
              className="w-full text-center text-sm text-gray-400 hover:text-white transition-colors py-2"
            >
              Comprar en MXN ($249)
            </button>
          </Form>
        )}
      </motion.div>
    </motion.div>
  );
}
