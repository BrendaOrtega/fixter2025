import { useState } from "react";
import { useFetcher } from "react-router";
import { EmojiConfetti } from "../common/EmojiConfetti";
import { PrimaryButton } from "../common/PrimaryButton";
import { Drawer } from "./SimpleDrawer";

type SubscriberVideo = {
  title: string;
  slug: string;
};

/**
 * El "ya entraste" del visor. Dos altas distintas terminan aquí y NO son lo
 * mismo, así que no pueden decir lo mismo:
 *
 * - `webinar`: se desbloquearon N lecciones que ya están ahí para ver.
 * - `secuencia`: te subiste a una serie por correo; lo que se abrió es ESTA
 *   entrega, y las demás van llegando. Antes salía el texto de webinars —"has
 *   desbloqueado 2 lecciones gratuitas"— a quien se acababa de suscribir a una
 *   secuencia: le prometía dos videos que no eran los suyos.
 */
export const SubscriptionSuccessDrawer = ({
  isOpen,
  onClose,
  subscriberVideos = [],
  variant = "webinar",
  sequenceName,
  askName = false,
  courseSlug,
}: {
  isOpen?: boolean;
  onClose?: () => void;
  subscriberVideos?: SubscriberVideo[];
  courseSlug?: string;
  variant?: "webinar" | "secuencia";
  sequenceName?: string | null;
  /** Todavía no sabemos cómo se llama. */
  askName?: boolean;
}) => {
  const esSecuencia = variant === "secuencia";
  const fetcher = useFetcher<{ nameSaved?: boolean; error?: string }>();
  const [nombre, setNombre] = useState("");
  const guardado = fetcher.data?.nameSaved;
  // Solo cerrar el drawer - el onClose ya maneja la navegación limpia
  const handleViewNow = () => {
    onClose?.();
  };

  return (
    <>
      <EmojiConfetti emojis={["📬", "✉️", "🧰", "🛠️", "🤖", "👾", "💾", "📼", "🧠", "🪄"]} small />
      <Drawer
        header={<></>}
        cta={<></>}
        title="¡Bienvenido!"
        isOpen={isOpen}
        onClose={onClose}
      >
        <div className="h-full flex items-center px-[5%]">
          <div className="w-full">
            <img
              src="/spaceman.svg"
              alt="Astronauta celebrando"
              className="mx-auto w-[200px] md:w-[260px]"
            />
            <h2 className="text-balance text-2xl text-dark dark:text-white font-semibold md:text-4xl text-center pt-12">
              {esSecuencia ? "¡Listo, ya estás dentro! 🎉" : "¡Bienvenido a bordo! 🚀"}
            </h2>
            <p className="text-pretty text-lg dark:text-metal text-center text-iron font-light mt-6">
              {esSecuencia ? (
                <>
                  Este video ya está abierto. Las siguientes entregas de{" "}
                  <span className="font-medium text-brand-500">
                    {sequenceName || "la serie"}
                  </span>{" "}
                  te llegan por correo.
                </>
              ) : (
                <>
                  Has desbloqueado{" "}
                  <span className="text-brand-500 font-medium">
                    {subscriberVideos.length} lecciones gratuitas
                  </span>{" "}
                  de este curso.
                </>
              )}
            </p>
            {/* Ya tiene sesión abierta; decirlo aquí evita que vea "Iniciar sesión"
                en el encabezado y crea que algo salió mal. */}
            <p className="text-sm dark:text-metal text-center text-iron font-light mt-3">
              Tu sesión quedó abierta: puedes volver desde cualquier dispositivo
              y seguir donde te quedaste.
            </p>

            {/* Se pregunta aquí y no en el muro: allá cada campo cuesta gente
                que abandona; aquí ya entró. Opcional de verdad — quien no
                quiera, cierra y ya está dentro igual. */}
            {askName && !guardado && (
              <fetcher.Form method="POST" className="mt-8">
                <input type="hidden" name="intent" value="save-name" />
                <input type="hidden" name="courseSlug" value={courseSlug || ""} />
                <label className="block text-sm text-colorParagraph">
                  ¿Cómo te llamamos?{" "}
                  <span className="opacity-60">(opcional)</span>
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    name="name"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Tu nombre"
                    maxLength={60}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                  <button
                    type="submit"
                    disabled={!nombre.trim() || fetcher.state !== "idle"}
                    className="shrink-0 rounded-lg bg-brand-500 px-5 font-semibold text-brand-900 transition hover:brightness-110 disabled:opacity-40"
                  >
                    Guardar
                  </button>
                </div>
              </fetcher.Form>
            )}
            {guardado && (
              <p className="mt-8 text-center text-sm text-brand-500">
                Listo, te llamamos {nombre.trim()} 👋
              </p>
            )}

            {!esSecuencia && subscriberVideos.length > 0 && (
              <div className="mt-8 bg-white/5 rounded-xl p-4 max-h-[200px] overflow-y-auto">
                <p className="text-sm text-gray-400 mb-3">
                  Lecciones desbloqueadas:
                </p>
                <ul className="space-y-2">
                  {subscriberVideos.map((video, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="text-green-400">✓</span>
                      <span className="text-gray-200">{video.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-base dark:text-metal text-center text-iron font-light mt-6">
              Disfruta el contenido y aprende a tu ritmo.
            </p>

            <div className="w-full flex mt-10">
              <PrimaryButton
                variant="fill"
                onClick={handleViewNow}
                className="mx-auto"
              >
                Ver ahora
              </PrimaryButton>
            </div>
          </div>
        </div>
      </Drawer>
    </>
  );
};
