import { useRef, useState } from "react";
import { useFetcher } from "react-router";
import { Drawer } from "./SimpleDrawer";
import { PrimaryButton } from "../common/PrimaryButton";
import { formatUnlock } from "~/utils/formatUnlock";
import { EnvelopeIllustration } from "~/components/community/EnvelopeIllustration";

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
  order,
  sequenceId,
  sequenceName,
  sequenceUrl,
  userEmail,
  conSesion,
  courseSlug,
}: {
  isOpen: boolean;
  title: string;
  unlocksAt?: string | null;
  enrolled?: boolean;
  /** Qué número de entrega es. La 1 se abre al instante; la 4 tarda días. */
  order?: number | null;
  sequenceId?: string | null;
  sequenceName?: string | null;
  sequenceUrl?: string | null;
  userEmail?: string | null;
  /** Hay sesión abierta: el correo ya está verificado, no se vuelve a pedir. */
  conSesion?: boolean;
  courseSlug: string;
}) {
  const fetcher = useFetcher<{
    codeSent?: boolean;
    email?: string;
    error?: string;
  }>();
  const emailRef = useRef<HTMLInputElement>(null);
  const [wantsWhatsapp, setWantsWhatsapp] = useState(false);
  const [correo, setCorreo] = useState(userEmail || "");

  // El código llegó: se pasa al paso dos sin cambiar de pantalla.
  const enCodigo = !!fetcher.data?.codeSent;

  const cuando = formatUnlock(unlocksAt ?? null);
  const enviando = fetcher.state !== "idle";

  // --- Ya suscrito, esta entrega todavía no le toca ----------------------
  if (enrolled) {
    return (
      <Drawer isOpen={isOpen} onClose={() => {}} noActions noClose noHeader title="Esta entrega aún no llega">
        <div className="text-center">
          <EnvelopeIllustration className="mx-auto h-auto w-[150px] sm:w-[180px]" />
          <p className="mt-4 text-xs font-medium uppercase tracking-wider text-brand-500">
            Esta entrega aún no llega
          </p>
          <h3 className="mt-1 text-balance text-xl font-bold leading-tight text-white sm:text-2xl">
            {title}
          </h3>
          <p className="mt-2 text-pretty text-sm text-brand-100 sm:text-base">
            {cuando ? (
              <>
                Se abre <strong className="text-brand-500">{cuando}</strong>,
                cuando te llegue por correo.
              </>
            ) : (
              "Se abre en cuanto te llegue la entrega por correo."
            )}
          </p>
          <p className="mt-3 text-pretty text-sm text-brand-100/70">
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
    <Drawer isOpen={isOpen} onClose={() => {}} noActions noClose noHeader title={title}>
      <div className="text-center">
        <EnvelopeIllustration className="mx-auto h-auto w-[150px] sm:w-[180px]" />
        <p className="mt-4 text-xs font-medium uppercase tracking-wider text-brand-500">
          Parte de una secuencia de emails
        </p>
        {/* El título es el nombre del video que están pidiendo abrir: va aquí,
            dentro del bloque, y no en un encabezado suelto hasta arriba. */}
        <h3 className="mt-1 text-balance text-xl font-bold leading-tight text-white sm:text-2xl">
          {title}
        </h3>

        {/* Prometer "se abre de inmediato" solo es verdad en la primera
            entrega. En la cuarta, suscribirse empieza por la primera y esta
            llega días después: decirlo de frente evita que se sienta engaño. */}
        <p className="mt-2 text-pretty text-sm text-brand-100 sm:text-base">
          {order && order > 1 ? (
            <>
              Es la entrega {order} de{" "}
              <strong className="text-white">
                {sequenceName || "una serie gratuita"}
              </strong>
              . Al suscribirte empiezas por la primera y las demás van llegando
              cada pocos días.
            </>
          ) : (
            <>
              Es la primera entrega de{" "}
              <strong className="text-white">
                {sequenceName || "una serie gratuita"}
              </strong>
              {/* Con sesión no se pide nada: pedir el correo aquí y mostrarlo
                  dos líneas abajo se contradice solo. */}
              {conSesion ? "." : ". Déjanos tu correo y se abre de inmediato."}
            </>
          )}
        </p>

        {conSesion ? (
          /* Con sesión no hay nada que preguntar: el correo con el que entró ya
             quedó verificado cuando abrió sesión. Volver a pedirlo —y encima
             mandarle un código al buzón desde el que ya está identificado— es
             cobrarle dos veces la misma prueba. */
          <fetcher.Form method="post" className="mt-4">
            <input type="hidden" name="intent" value="subscribe-sequence" />
            <input type="hidden" name="sequenceId" value={sequenceId || ""} />
            <input type="hidden" name="email" value={userEmail || ""} />
            <input type="hidden" name="courseSlug" value={courseSlug} />
            <p className="mb-3 text-pretty text-sm text-brand-100">
              Te subes a la serie con{" "}
              <strong className="text-white">{userEmail}</strong> 📬
            </p>
            {/* El botón dice lo que pasa AL INSTANTE, no el trámite: nadie hace
                clic con ganas de "suscribirse", hace clic para ver el video. */}
            <PrimaryButton type="submit" isDisabled={enviando} variant="fill" className="mt-6 w-full font-semibold">
              {enviando ? "Abriendo…" : "Ábreme este video 🍿"}
            </PrimaryButton>
            {fetcher.data?.error && (
              <p className="mt-2 text-sm text-red-400">{fetcher.data.error}</p>
            )}
          </fetcher.Form>
        ) : enCodigo ? (
          /* Paso dos: el código. Se queda en el mismo cajón —mandar a otra
             pantalla a alguien que ya escribió su correo es perderlo. */
          <fetcher.Form method="post" className="mt-4 text-left">
            <input type="hidden" name="intent" value="verify-code" />
            <input type="hidden" name="email" value={fetcher.data?.email || correo} />
            <input type="hidden" name="courseSlug" value={courseSlug} />
            <input type="hidden" name="sequenceId" value={sequenceId || ""} />
            <p className="mb-3 text-pretty text-center text-sm text-brand-100">
              Te mandamos un código de 6 dígitos a{" "}
              <strong className="text-white">{fetcher.data?.email || correo}</strong>
            </p>
            <label className="text-sm text-colorParagraph">
              Código de verificación
            </label>
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              autoFocus
              placeholder="000000"
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-center font-mono text-2xl tracking-[0.5em] text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            {fetcher.data?.error && (
              <p className="mt-2 text-sm text-red-400">{fetcher.data.error}</p>
            )}
            <PrimaryButton type="submit" isDisabled={enviando} variant="fill" className="mt-6 w-full font-semibold">
              {enviando ? "Verificando…" : "Ábreme este video 🍿"}
            </PrimaryButton>
          </fetcher.Form>
        ) : (
          <fetcher.Form method="post" className="mt-4 text-left">
            {/* El mismo OTP del resto del sitio: el código prueba que el buzón
                es suyo sin sacarlo de aquí, y esa prueba es la que permite
                inscribirlo de una vez en vez de mandarle un link. */}
            <input type="hidden" name="intent" value="send-code" />
            <input type="hidden" name="courseSlug" value={courseSlug} />
            <input type="hidden" name="sequenceId" value={sequenceId || ""} />
            <label className="text-sm text-colorParagraph">Tu email</label>
            <input
              ref={emailRef}
              type="email"
              name="email"
              required
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="tu@correo.com"
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            {/* Mismo trato que en la landing de la serie: el celular vive detrás
                de un sí explícito, y es para avisos, no para las entregas. */}
            <button
              type="button"
              role="switch"
              aria-checked={wantsWhatsapp}
              onClick={() => setWantsWhatsapp((v) => !v)}
              className="mt-2 flex w-full items-center gap-3 rounded-xl border border-brand-100/20 bg-brand-900/60 px-4 py-3 text-left transition-colors hover:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            >
              <span
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  wantsWhatsapp ? "bg-brand-500" : "bg-brand-100/25"
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    wantsWhatsapp ? "translate-x-5" : ""
                  }`}
                />
              </span>
              <span className="text-sm font-medium text-white">
                Quiero enterarme de lo nuevo por WhatsApp 💬
              </span>
            </button>
            {wantsWhatsapp && (
              <input
                type="tel"
                name="phone"
                inputMode="tel"
                autoComplete="tel"
                placeholder="55 1234 5678"
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            )}
            {wantsWhatsapp && <input type="hidden" name="wantsWhatsapp" value="on" />}
            {fetcher.data?.error && (
              <p className="mt-2 text-sm text-red-400">{fetcher.data.error}</p>
            )}
            <PrimaryButton type="submit" isDisabled={enviando} variant="fill" className="mt-6 w-full font-semibold">
              {enviando ? "Un momento…" : "Ábreme este video 🍿"}
            </PrimaryButton>
          </fetcher.Form>
        )}

        <p className="mt-4 text-center text-xs leading-relaxed text-colorCaption">
          Gratis, una entrega cada pocos días.
          <br />
          Puedes bajarte en un clic.
        </p>
      </div>
    </Drawer>
  );
}
