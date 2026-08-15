import { Drawer } from "./SimpleDrawer";
import { PrimaryButton } from "../common/PrimaryButton";
import { formatUnlock } from "~/utils/formatUnlock";

/**
 * Lo que ve quien llega a un video que todavía no le toca.
 *
 * Son DOS situaciones distintas y merecen dos mensajes distintos:
 *
 * - **Ya está suscrito** y solo falta que le llegue: la fecha al frente. Un
 *   candado sin fecha se lee como error del sitio; "se abre el jue 18" se lee
 *   como una cita.
 * - **No está suscrito**: la fecha no le dice nada porque no hay reloj corriendo
 *   para él. Lo que necesita es entender que esto llega por correo y cómo
 *   entrarle, con el botón visible sin tener que adivinar.
 */
export function SequenceLockedDrawer({
  isOpen,
  title,
  unlocksAt,
  enrolled,
  sequenceUrl,
}: {
  isOpen: boolean;
  title: string;
  unlocksAt?: string | null;
  enrolled?: boolean;
  sequenceUrl?: string | null;
}) {
  const cuando = formatUnlock(unlocksAt ?? null);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={() => {}}
      title={enrolled ? "Esta entrega aún no llega" : "Esta serie llega por correo"}
    >
      <div className="text-center">
        <div className="text-5xl">📬</div>

        <h3 className="mt-4 text-xl font-bold text-white">{title}</h3>

        {enrolled ? (
          <>
            {cuando ? (
              <p className="mt-3 text-brand-100">
                Se abre <strong className="text-brand-500">{cuando}</strong>,
                cuando te llegue por correo.
              </p>
            ) : (
              <p className="mt-3 text-brand-100">
                Se abre en cuanto te llegue la entrega por correo.
              </p>
            )}
            <p className="mt-3 text-sm text-brand-100/70">
              Vas al día — no tienes que hacer nada, nosotros te avisamos.
            </p>
          </>
        ) : (
          <>
            <p className="mt-3 text-brand-100">
              Es parte de una serie gratuita que se entrega por correo. Te
              suscribes y las entregas se van abriendo aquí mismo, una por una.
            </p>
            {sequenceUrl && (
              <a href={sequenceUrl} target="_blank" rel="noopener">
                <PrimaryButton className="mt-6">
                  Suscribirme y desbloquear
                </PrimaryButton>
              </a>
            )}
            <p className="mt-4 text-xs text-brand-100/60">
              Gratis. Cero spam, bájate en un clic.
            </p>
          </>
        )}

        {enrolled && sequenceUrl && (
          <a href={sequenceUrl} target="_blank" rel="noopener">
            <PrimaryButton className="mt-6">
              Ver de qué va la serie
            </PrimaryButton>
          </a>
        )}
      </div>
    </Drawer>
  );
}
