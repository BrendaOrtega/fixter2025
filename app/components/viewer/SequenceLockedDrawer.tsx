import { Drawer } from "./SimpleDrawer";
import { PrimaryButton } from "../common/PrimaryButton";
import { formatUnlock } from "~/utils/formatUnlock";

/**
 * Lo que ve quien llega a un video que todavía no le toca.
 *
 * La fecha va al frente a propósito: un candado sin fecha se lee como error del
 * sitio y la persona se va. Con "se abre el jue 18" la espera es parte del
 * trato, y quien no está inscrito entiende de una que esto llega por correo.
 */
export function SequenceLockedDrawer({
  isOpen,
  title,
  unlocksAt,
  sequenceUrl,
}: {
  isOpen: boolean;
  title: string;
  unlocksAt?: string | null;
  sequenceUrl?: string | null;
}) {
  const cuando = formatUnlock(unlocksAt ?? null);

  return (
    <Drawer isOpen={isOpen} onClose={() => {}} title="Esta entrega aún no llega">
      <div className="text-center">
        <div className="text-5xl">📬</div>

        <h3 className="mt-4 text-xl font-bold text-white">{title}</h3>

        {cuando ? (
          <p className="mt-3 text-brand-100">
            Se abre <strong className="text-brand-500">{cuando}</strong>, cuando
            te llegue por correo.
          </p>
        ) : (
          <p className="mt-3 text-brand-100">
            Las entregas de esta serie se abren conforme te van llegando por
            correo.
          </p>
        )}

        <p className="mt-3 text-sm text-brand-100/70">
          Vas al día — no tienes que hacer nada, nosotros te avisamos.
        </p>

        {sequenceUrl && (
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
