import { useState, useEffect, useRef } from "react";
import { useFetcher } from "react-router";
import { motion } from "motion/react";
import { IoMdClose } from "react-icons/io";
import { PrimaryButton } from "~/components/common/PrimaryButton";

interface BookSubscriptionDrawerProps {
  bookSlug: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

/**
 * Drawer modal para suscripción con verificación por email OTP
 * Reutilizable para cualquier libro
 */
export function BookSubscriptionDrawer({
  bookSlug,
  onSuccess,
  onClose,
}: BookSubscriptionDrawerProps) {
  const [show, setShow] = useState(true);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const fetcher = useFetcher();
  const isLoading = fetcher.state !== "idle";
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (fetcher.data?.success && fetcher.data?.step === "verify") {
      setStep("code");
      setTimeout(() => codeInputRef.current?.focus(), 100);
    }
    if (fetcher.data?.verified) {
      onSuccess?.();
      window.location.reload();
    }
  }, [fetcher.data, onSuccess]);

  const handleClose = () => {
    setShow(false);
    onClose?.();
  };

  if (!show) return null;

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

        {step === "email" ? (
          <>
            <h3 className="text-2xl font-bold text-white text-center">
              Suscríbete para continuar leyendo
            </h3>
            <p className="text-gray-400 text-center mt-3">
              Ingresa tu email para desbloquear este capítulo gratis.
            </p>

            <fetcher.Form method="POST" className="mt-6 space-y-4">
              <input type="hidden" name="intent" value="subscribe" />
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#3178C6]"
                required
              />
              <PrimaryButton
                type="submit"
                isLoading={isLoading}
                className="w-full"
              >
                Continuar
              </PrimaryButton>
            </fetcher.Form>
          </>
        ) : (
          <>
            <h3 className="text-2xl font-bold text-white text-center">
              Ingresa el código
            </h3>
            <p className="text-gray-400 text-center mt-3">
              Enviamos un código de 6 dígitos a{" "}
              <strong className="text-white">{email}</strong>
            </p>

            <fetcher.Form method="POST" className="mt-6 space-y-4">
              <input type="hidden" name="intent" value="verify" />
              <input type="hidden" name="email" value={email} />
              <input
                ref={codeInputRef}
                type="text"
                name="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                maxLength={6}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#3178C6] text-center text-2xl tracking-widest"
                required
              />
              {fetcher.data?.error && (
                <p className="text-red-400 text-sm text-center">
                  {fetcher.data.error}
                </p>
              )}
              <PrimaryButton
                type="submit"
                isLoading={isLoading}
                className="w-full"
              >
                Verificar
              </PrimaryButton>
            </fetcher.Form>

            <button
              onClick={() => setStep("email")}
              className="text-gray-400 hover:text-white text-sm mt-4 block mx-auto"
            >
              Usar otro email
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
