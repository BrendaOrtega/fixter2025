import {
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  data,
  useFetcher,
} from "react-router";
import type { Route } from "./+types/s.baja";
import { db } from "~/.server/db";
import { validateSequenceUnsubscribeToken } from "~/utils/tokens";
import getMetaTags from "~/utils/getMetaTags";
import { PrimaryButton } from "~/components/common/PrimaryButton";

export const meta = () =>
  getMetaTags({ title: "Cancelar suscripción | FixterGeek" });

/**
 * Encuentra la inscripción del token.
 *
 * Acepta el `enrollmentId` y, si esa fila ya no existe, el par
 * (sequenceId, subscriberId) que el token también firma. Las filas sí
 * desaparecen: un hard bounce borra al `Subscriber` y arrastra sus
 * inscripciones en cascada. Sin este respaldo, el link de baja de todos los
 * correos ya enviados quedaría muerto, y a la persona solo le quedaría marcar
 * spam — que es peor para todos.
 */
async function findEnrollment(decoded: {
  enrollmentId: string;
  sequenceId?: string;
  subscriberId?: string;
}) {
  const porId = await db.sequenceEnrollment.findUnique({
    where: { id: decoded.enrollmentId },
    include: { sequence: { select: { name: true } } },
  });
  if (porId) return porId;

  if (decoded.sequenceId && decoded.subscriberId) {
    return db.sequenceEnrollment.findUnique({
      where: {
        sequenceId_subscriberId: {
          sequenceId: decoded.sequenceId,
          subscriberId: decoded.subscriberId,
        },
      },
      include: { sequence: { select: { name: true } } },
    });
  }
  return null;
}

async function unsubscribe(token: string | null) {
  if (!token) return { ok: false as const, error: "Enlace inválido" };
  const { isValid, decoded } = validateSequenceUnsubscribeToken(token);
  if (!isValid || !decoded) {
    return { ok: false as const, error: "Enlace inválido o expirado" };
  }
  const enr = await findEnrollment(decoded);
  if (!enr) {
    return { ok: false as const, error: "No encontramos tu suscripción." };
  }
  if (enr.status !== "paused") {
    await db.sequenceEnrollment.update({
      where: { id: enr.id },
      data: { status: "paused" },
    });
  }
  return { ok: true as const, sequenceName: enr.sequence?.name, token };
}

/**
 * Deshacer la baja. Un usuario nos escribió que canceló sin querer y no
 * encontró cómo volver: buscó en su perfil y no había nada. Cancelar es un clic;
 * volver tiene que costar lo mismo, y el momento en que se dan cuenta del error
 * es justo este, con la pantalla enfrente.
 */
async function resubscribe(token: string | null) {
  if (!token) return { error: "Enlace inválido" };
  const { isValid, decoded } = validateSequenceUnsubscribeToken(token);
  if (!isValid || !decoded) return { error: "Enlace inválido o expirado" };

  const enr = await findEnrollment(decoded);
  if (!enr) return { error: "No encontramos tu suscripción." };

  const emails = await db.sequenceEmail.findMany({
    where: { sequenceId: enr.sequenceId },
    orderBy: { order: "asc" },
    select: { schedulingType: true, delayDays: true, specificDate: true },
  });
  const siguiente = emails[enr.currentEmailIndex];

  const { calculateNextEmailDate } = await import("~/.server/sequences");
  await db.sequenceEnrollment.update({
    where: { id: enr.id },
    data: {
      // Retoma donde se quedó, no desde el principio: ya recibió lo anterior.
      status: siguiente ? "active" : "completed",
      nextEmailAt: siguiente ? calculateNextEmailDate(siguiente) : null,
      completedAt: siguiente ? null : new Date(),
    },
  });

  return { resubscribed: true as const, sequenceName: enr.sequence?.name };
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const token = new URL(request.url).searchParams.get("token");
  const form = await request.formData().catch(() => null);

  // One-click unsubscribe de Gmail/Yahoo: llega como POST sin formulario.
  if (form?.get("intent") === "resubscribe") {
    return data(await resubscribe(token));
  }
  return data(await unsubscribe(token));
};

/**
 * El clic del footer NO da de baja: pregunta.
 *
 * Dos razones. Una, un usuario nos escribió que canceló sin querer — el enlace
 * ejecutaba al instante, sin advertencia. Dos, y más grave: Gmail y Outlook
 * hacen prefetch de los enlaces de un correo para escanearlos, así que un GET
 * que ejecuta puede dar de baja a alguien que nunca hizo clic.
 *
 * Quien sí quiere irse lo confirma con un botón, que es un POST. El one-click
 * de Gmail (`List-Unsubscribe-Post`) también es POST, así que sigue funcionando
 * sin pantalla de por medio, como exige la especificación.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return { ok: false as const, error: "Enlace inválido" };

  const { isValid, decoded } = validateSequenceUnsubscribeToken(token);
  if (!isValid || !decoded) {
    return { ok: false as const, error: "Enlace inválido o expirado" };
  }
  const enr = await findEnrollment(decoded);
  if (!enr) {
    return { ok: false as const, error: "No encontramos tu suscripción." };
  }

  return {
    ok: true as const,
    confirmar: enr.status !== "paused",
    sequenceName: enr.sequence?.name,
  };
};

export default function Baja({ loaderData }: Route.ComponentProps) {
  const fetcher = useFetcher<{
    ok?: boolean;
    resubscribed?: boolean;
    error?: string;
  }>();
  const vuelto = fetcher.data?.resubscribed;
  // La baja ya ocurrió si la confirmó aquí, o si llegó por el one-click.
  const dadoDeBaja = fetcher.data?.ok || !(loaderData as any).confirmar;
  const enviando = fetcher.state !== "idle";

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-brand-900">
      <div className="text-center max-w-md">
        {vuelto ? (
          <>
            <div className="text-5xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Listo, sigues dentro
            </h1>
            <p className="text-brand-100">
              Retomamos donde te quedaste. La siguiente entrega te llega como
              siempre.
            </p>
          </>
        ) : loaderData.ok && !dadoDeBaja ? (
          /* Confirmación: el clic del correo trae aquí, no ejecuta. */
          <>
            <div className="text-5xl mb-4">✋</div>
            <h1 className="text-2xl font-bold text-white mb-2">
              ¿Cancelar tu suscripción?
            </h1>
            <p className="text-brand-100">
              Dejarías de recibir{" "}
              <strong className="text-white">
                {loaderData.sequenceName || "esta secuencia"}
              </strong>
              . Puedes volver cuando quieras.
            </p>
            <fetcher.Form method="post" className="mt-8">
              <PrimaryButton type="submit" isDisabled={enviando}>
                {enviando ? "Un momento…" : "Sí, cancelar"}
              </PrimaryButton>
            </fetcher.Form>
            <a
              href="/secuencias"
              className="mt-4 inline-block text-sm text-brand-100/70 underline underline-offset-4 hover:text-white"
            >
              Mejor no, sigo dentro
            </a>
          </>
        ) : loaderData.ok ? (
          <>
            <div className="text-5xl mb-4">👋</div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Suscripción cancelada
            </h1>
            <p className="text-brand-100">
              Ya no recibirás más correos de{" "}
              <strong className="text-white">
                {loaderData.sequenceName || "esta secuencia"}
              </strong>
              .
            </p>

            <fetcher.Form method="post" className="mt-8">
              <input type="hidden" name="intent" value="resubscribe" />
              <p className="mb-3 text-sm text-brand-100/70">¿Fue sin querer?</p>
              <PrimaryButton type="submit" isDisabled={fetcher.state !== "idle"}>
                {fetcher.state !== "idle"
                  ? "Un momento…"
                  : "Volver a suscribirme"}
              </PrimaryButton>
              {fetcher.data?.error && (
                <p className="mt-3 text-sm text-red-400">{fetcher.data.error}</p>
              )}
            </fetcher.Form>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">⛓️‍💥</div>
            <h1 className="text-2xl font-bold text-white mb-2">
              No pudimos procesar
            </h1>
            <p className="text-brand-100">{loaderData.error}</p>
          </>
        )}
      </div>
    </main>
  );
}
