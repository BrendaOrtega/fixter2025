import { EmojiConfetti } from "../common/EmojiConfetti";
import { PrimaryButton } from "../common/PrimaryButton";
import { Drawer } from "./SimpleDrawer";

type SubscriberVideo = {
  title: string;
  slug: string;
};

export const SubscriptionSuccessDrawer = ({
  isOpen,
  onClose,
  subscriberVideos = [],
}: {
  isOpen?: boolean;
  onClose?: () => void;
  subscriberVideos?: SubscriberVideo[];
  courseSlug?: string;
}) => {
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
              ¡Bienvenido a bordo! 🚀
            </h2>
            <p className="text-lg dark:text-metal text-center text-iron font-light mt-6">
              Has desbloqueado{" "}
              <span className="text-brand-500 font-medium">
                {subscriberVideos.length} lecciones gratuitas
              </span>{" "}
              de este curso.
            </p>
            {/* Ya tiene sesión abierta; decirlo aquí evita que vea "Iniciar sesión"
                en el encabezado y crea que algo salió mal. */}
            <p className="text-sm dark:text-metal text-center text-iron font-light mt-3">
              Tu sesión quedó abierta: puedes volver desde cualquier dispositivo
              y seguir donde te quedaste.
            </p>

            {subscriberVideos.length > 0 && (
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
