import { useFetcher } from "react-router";
import { useState, useEffect, useRef } from "react";
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
    console.log("🔐 Fetcher data:", fetcher.data, "state:", fetcher.state);
    if (fetcher.data?.codeSent) {
      console.log("✅ Code sent, switching to OTP step");
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
    <Drawer
      noOverlay
      header={<></>}
      cta={<></>}
      
      title="Desbloquea más contenido"
      isOpen={show}
    >
      <div className="pt-20 px-0 md:px-8 relative pb-8">
        <button onClick={() => setShow(false)}>
          <img
            className="h-12 w-12 absolute right-0 top-0"
            alt="close"
            src="/closeDark.png"
          />
        </button>
        <img alt="spaceman" className="w-64 mx-auto" src="/spaceman.svg" />

        {step === "email" ? (
          <>
            {/* No es una suscripción: se entra con el correo y llega un código.
                Y el drawer sale en dos momentos muy distintos —quien cae frío
                desde un enlace y quien ya lleva rato viendo—, así que el título
                cambia según de dónde venga. */}
            <h3 className="text-2xl md:text-3xl text-white mt-16">
              {hasWatchedBefore
                ? "Para las que siguen, deja tu correo"
                : "Entra con tu correo y sigue viendo"}
            </h3>
            <p className="text-lg md:text-xl font-light mt-4 text-colorParagraph">
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
            <fetcher.Form method="POST">
              <input type="hidden" name="intent" value="send-code" />
              <input type="hidden" name="courseSlug" value={courseSlug} />
              <div className="mt-8">
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
              {fetcher.data?.error && step === "email" && (
                <p className="text-red-400 mt-2 text-sm">{fetcher.data.error}</p>
              )}
              <PrimaryButton
                isLoading={isLoading}
                type="submit"
                variant="fill"
                className="font-semibold w-full mt-8"
              >
                Enviar código
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
            <h3 className="text-2xl md:text-3xl text-white mt-16">
              Ingresa el código
            </h3>
            <p className="text-lg md:text-xl font-light mt-4 text-colorParagraph">
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
