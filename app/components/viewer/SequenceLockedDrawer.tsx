import { useRef } from "react";
import { useFetcher } from "react-router";
import { Drawer } from "./SimpleDrawer";
import { PrimaryButton } from "../common/PrimaryButton";
import { formatUnlock } from "~/utils/formatUnlock";

/**
 * Lo que ve quien llega a un video que todavía no le toca.
 *
 * Tres situaciones distintas y tres mensajes distintos, porque tratarlas igual
 * es lo que hacía sentir esto un muro:
 *
 * 1. **No está suscrito** → el alta ocurre AQUÍ, con un campo de correo. Antes
 *    lo mandábamos a otra pestaña a llenar otro formulario, y quien ya estaba
 *    viendo este video tenía que volver a encontrarlo después.
 * 2. **Se acaba de dar de alta** → se le dice exactamente qué va a pasar.
 * 3. **Ya está suscrito y le falta esta entrega** → la fecha al frente. Un
 *    candado sin fecha se lee como error del sitio.
 */
export function SequenceLockedDrawer({
  isOpen,
  title,
  unlocksAt,
  enrolled,
  sequenceId,
  sequenceName,
  sequenceUrl,
  userEmail,
}: {
  isOpen: boolean;
  title: string;
  unlocksAt?: string | null;
  enrolled?: boolean;
  sequenceId?: string | null;
  sequenceName?: string | null;
  sequenceUrl?: string | null;
  userEmail?: string | null;
}) {
  const fetcher = useFetcher<{
    sequenceEnrolled?: boolean;
    sequenceNeedsConfirmation?: boolean;
    error?: string;
  }>();
  const emailRef = useRef<HTMLInputElement>(null);

  const cuando = formatUnlock(unlocksAt ?? null);
  const enviando = fetcher.state !== "idle";
  const listo = fetcher.data?.sequenceEnrolled;
  const porConfirmar = fetcher.data?.sequenceNeedsConfirmation;

  // --- Acaba de darse de alta -------------------------------------------
  if (listo || porConfirmar) {
    return (
      <Drawer isOpen={isOpen} onClose={() => {}} title="¡Listo!">
        <div className="text-center">
          <div className="text-5xl">{listo ? "✅" : "📬"}</div>
          <h3 className="mt-4 text-xl font-bold text-white">
            {listo ? "Ya estás dentro" : "Revisa tu correo"}
          </h3>
          <p className="mt-3 text-brand-100">
            {listo
              ? "La primera entrega sale en unos minutos y trae este video. En cuanto llegue, se abre aquí."
              : "Te mandamos un enlace para confirmar. Al confirmarlo recibes la primera entrega, que es justo este video."}
          </p>
        </div>
      </Drawer>
    );
  }

  // --- Ya suscrito, esta entrega todavía no le toca ----------------------
  if (enrolled) {
    return (
      <Drawer isOpen={isOpen} onClose={() => {}} title="Esta entrega aún no llega">
        <div className="text-center">
          <div className="text-5xl">📬</div>
          <h3 className="mt-4 text-xl font-bold text-white">{title}</h3>
          <p className="mt-3 text-brand-100">
            {cuando ? (
              <>
                Se abre <strong className="text-brand-500">{cuando}</strong>,
                cuando te llegue por correo.
              </>
            ) : (
              "Se abre en cuanto te llegue la entrega por correo."
            )}
          </p>
          <p className="mt-3 text-sm text-brand-100/70">
            Vas al día — no tienes que hacer nada, nosotros te avisamos.
          </p>
          {sequenceUrl && (
            <a href={sequenceUrl} target="_blank" rel="noopener">
              <PrimaryButton className="mt-6">
                Ver todas las entregas
              </PrimaryButton>
            </a>
          )}
        </div>
      </Drawer>
    );
  }

  // --- Todavía no se suscribe: el alta pasa aquí mismo -------------------
  return (
    <Drawer isOpen={isOpen} onClose={() => {}} title="Este video llega por correo">
      <div className="text-center">
        <div className="text-5xl">📬</div>
        <h3 className="mt-4 text-xl font-bold text-white">{title}</h3>

        <p className="mt-3 text-brand-100">
          Es la primera entrega de{" "}
          <strong className="text-white">
            {sequenceName || "una serie gratuita"}
          </strong>
          . Déjanos tu correo y se abre de inmediato.
        </p>

        <fetcher.Form method="post" className="mt-6 text-left">
          <input type="hidden" name="intent" value="subscribe-sequence" />
          <input type="hidden" name="sequenceId" value={sequenceId || ""} />
          <input
            ref={emailRef}
            type="email"
            name="email"
            required
            defaultValue={userEmail || ""}
            placeholder="tu@correo.com"
            className="h-14 w-full rounded-xl border border-brand-100/20 bg-brand-900/60 px-4 text-base text-white placeholder-brand-100/40 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
          {fetcher.data?.error && (
            <p className="mt-2 text-sm text-red-400">{fetcher.data.error}</p>
          )}
          <PrimaryButton
            type="submit"
            isDisabled={enviando}
            className="mt-4 w-full"
          >
            {enviando ? "Un momento…" : "Desbloquear este video"}
          </PrimaryButton>
        </fetcher.Form>

        <p className="mt-4 text-xs text-brand-100/60">
          Gratis. Solo se abre esta entrega; las siguientes llegan cada pocos
          días. Bájate en un clic.
        </p>
      </div>
    </Drawer>
  );
}
