import { useFetcher } from "react-router";
import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { PrimaryButton } from "../common/PrimaryButton";
import { Drawer } from "./SimpleDrawer";

/// Las fuentes que un UTM no ve. El orden se baraja en cada montaje: dejar una
/// fija arriba se la lleva casi la mitad de las respuestas por inercia.
const ORIGINS = [
  "LinkedIn",
  "YouTube",
  "WhatsApp",
  "Un correo de FixterGeek",
  "Me lo pasó alguien",
  // "La comunidad" era ambiguo: quien llega de un Discord ajeno también la
  // escogía. La señal útil es "alguien lo compartió en un grupo donde estoy",
  // que es distinta de "me lo pasó alguien" uno a uno.
  "En un grupo o comunidad",
  "Buscando en Google",
];

const shuffled = (items: string[]) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

type SubscriberVideo = {
  title: string;
  slug: string;
};

export const SubscriptionDrawer = ({
  courseSlug,
  subscriberVideos = [],
  hasWatchedBefore = false,
  userEmail,
}: {
  courseSlug: string;
  subscriberVideos?: SubscriberVideo[];
  /** Ya vio alguna lección de este programa: el drawer le habla distinto. */
  hasWatchedBefore?: boolean;
  userEmail?: string;
}) => {
  const [show, setShow] = useState(true);
  const [email, setEmail] = useState(userEmail || "");
  const [code, setCode] = useState("");
  const [origins] = useState(() => shuffled(ORIGINS));
  const [otroOrigen, setOtroOrigen] = useState(false);
  const [step, setStep] = useState<"email" | "code">("email");
  const fetcher = useFetcher();
  const isLoading = fetcher.state !== "idle";
  const codeInputRef = useRef<HTMLInputElement>(null);

  // Detectar respuesta del server
  useEffect(() => {
    if (fetcher.data?.codeSent) {
      setStep("code");
      // Focus en el input de código
      setTimeout(() => codeInputRef.current?.focus(), 100);
    }
  }, [fetcher.data, fetcher.state]);

  const handleResendCode = () => {
    setCode("");
    fetcher.submit(
      { intent: "send-code", email, courseSlug },
      { method: "POST" }
    );
  };

  return (
    /* El chasis es el del resto de los cajones. Este se había hecho el suyo
       —encabezado vacío, su propia ✕ en una imagen, `pt-20` y `mt-16`— y en un
       panel lateral eso empuja el formulario debajo del pliegue: se veía el
       título y la lista, y el correo y el botón quedaban fuera de pantalla.
       Parecía un cajón sin CTA. */
    <Drawer
      noOverlay
      noActions
      onClose={() => setShow(false)}
      title="Desbloquea más contenido"
      isOpen={show}
    >
      <div className="pb-4">
        {/* Flota. Sutil y en bucle: un astronauta quieto en un panel oscuro se
            lee como una imagen que no cargó del todo. */}
        <motion.img
          alt="spaceman"
          src="/spaceman.svg"
          className="mx-auto w-40 sm:w-48"
          animate={{ y: [0, -10, 0], rotate: [0, -2.5, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />

        {step === "email" ? (
          <>
            {/* No es una suscripción: se entra con el correo y llega un código.
                Y el drawer sale en dos momentos muy distintos —quien cae frío
                desde un enlace y quien ya lleva rato viendo—, así que el título
                cambia según de dónde venga. */}
            <h3 className="text-balance mt-6 text-2xl font-bold leading-tight text-white sm:text-3xl">
              {hasWatchedBefore
                ? "Para las que siguen, deja tu correo"
                : "Entra con tu correo y sigue viendo"}
            </h3>
            <p className="mt-3 text-base font-light text-colorParagraph sm:text-lg">
              Te mandamos un código de 6 dígitos.{" "}
              {subscriberVideos.length > 0 ? (
                <>{hasWatchedBefore ? "Con él se te abren también:" : "Con él se te abren, gratis:"}</>
              ) : (
                <>Con él se te abren las siguientes lecciones, gratis.</>
              )}
            </p>
            {subscriberVideos.length > 0 && (
              <ul className="mt-4 space-y-2">
                {subscriberVideos.map((video, i) => (
                  <li key={i} className="flex items-center gap-2 text-brand-400">
                    <span className="text-green-400">✓</span>
                    <span className="text-gray-200">{video.title}</span>
                  </li>
                ))}
              </ul>
            )}
            {/* Con sesión no se pide nada: la cuenta ya verificó ese buzón, que
                es exactamente lo que prueba el código. */}
            <fetcher.Form method="POST">
              <input
                type="hidden"
                name="intent"
                value={userEmail ? "unlock-session" : "send-code"}
              />
              <input type="hidden" name="courseSlug" value={courseSlug} />
              {userEmail ? (
                <p className="mt-6 text-sm text-colorParagraph">
                  Se abren con{" "}
                  <strong className="text-white">{userEmail}</strong> 📬
                </p>
              ) : (
                <div className="mt-6">
                  <label className="text-colorParagraph text-sm">Tu email</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full mt-2 px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
              )}
              {fetcher.data?.error && step === "email" && (
                <p className="text-red-400 mt-2 text-sm">{fetcher.data.error}</p>
              )}
              <PrimaryButton
                isLoading={isLoading}
                type="submit"
                variant="fill"
                className="mt-6 w-full font-semibold"
              >
                {userEmail ? "Ábreme estos videos 🍿" : "Enviar código"}
              </PrimaryButton>
            </fetcher.Form>
            {/* El código abre sesión, no solo desbloquea el video: hay que decirlo
                antes, no después. Una línea; el detalle sobra en este momento. */}
            <p className="text-colorCaption text-xs mt-4 text-center">
              Quedas dentro y tu avance se guarda. Sin spam.
            </p>
          </>
        ) : (
          <>
            <h3 className="text-balance mt-6 text-2xl font-bold text-white sm:text-3xl">
              Ingresa el código
            </h3>
            <p className="mt-3 text-base font-light text-colorParagraph sm:text-lg">
              Te enviamos un código de 6 dígitos a{" "}
              <span className="text-brand-400 font-medium">{email}</span>
            </p>
            <fetcher.Form method="POST">
              <input type="hidden" name="intent" value="verify-code" />
              <input type="hidden" name="email" value={email} />
              <input type="hidden" name="courseSlug" value={courseSlug} />
              {/* Opcional y hasta aquí: en la primera pantalla estorbaría el
                  desbloqueo, que es lo único que la persona vino a hacer. */}
              <div className="mt-8">
                <label className="text-colorParagraph text-sm">
                  ¿Cómo llegaste? <span className="opacity-50">(opcional)</span>
                </label>
                <select
                  name="origen"
                  defaultValue=""
                  onChange={(e) => setOtroOrigen(e.target.value === "Otro")}
                  className="w-full mt-2 px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="" disabled>
                    Elige una
                  </option>
                  {origins.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                  <option value="Otro">Otro</option>
                  {/* Hasta el final: arriba se lleva por inercia las respuestas
                      que sí servían. */}
                  <option value="">Prefiero no decir</option>
                </select>
                {otroOrigen && (
                  <input
                    name="origenOtro"
                    placeholder="¿De dónde?"
                    maxLength={60}
                    className="w-full mt-2 px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                )}
              </div>
              <div className="mt-6">
                <label className="text-colorParagraph text-sm">
                  Código de verificación
                </label>
                <input
                  ref={codeInputRef}
                  type="text"
                  name="code"
                  required
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="w-full mt-2 px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-center text-2xl tracking-[0.5em] font-mono"
                />
              </div>
              {fetcher.data?.error && step === "code" && (
                <p className="text-red-400 mt-2 text-sm">{fetcher.data.error}</p>
              )}
              <PrimaryButton
                isLoading={isLoading}
                type="submit"
                variant="fill"
                className="font-semibold w-full mt-8"
                disabled={code.length !== 6}
              >
                Verificar y desbloquear
              </PrimaryButton>
            </fetcher.Form>
            <div className="flex items-center justify-between mt-4">
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setCode("");
                }}
                className="text-colorCaption text-sm hover:text-white transition-colors"
              >
                Cambiar email
              </button>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={isLoading}
                className="text-brand-400 text-sm hover:text-brand-300 transition-colors disabled:opacity-50"
              >
                Reenviar código
              </button>
            </div>
          </>
        )}
      </div>
    </Drawer>
  );
};
