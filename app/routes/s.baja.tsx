import {
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  data,
} from "react-router";
import type { Route } from "./+types/s.baja";
import { db } from "~/.server/db";
import { validateSequenceUnsubscribeToken } from "~/utils/tokens";
import getMetaTags from "~/utils/getMetaTags";

export const meta = () =>
  getMetaTags({ title: "Cancelar suscripción | FixterGeek" });

async function unsubscribe(token: string | null) {
  if (!token) return { ok: false as const, error: "Enlace inválido" };
  const { isValid, decoded } = validateSequenceUnsubscribeToken(token);
  if (!isValid || !decoded) {
    return { ok: false as const, error: "Enlace inválido o expirado" };
  }
  const enr = await db.sequenceEnrollment.findUnique({
    where: { id: decoded.enrollmentId },
    include: { sequence: { select: { name: true } } },
  });
  if (!enr) {
    return { ok: false as const, error: "No encontramos tu suscripción." };
  }
  if (enr.status !== "paused") {
    await db.sequenceEnrollment.update({
      where: { id: enr.id },
      data: { status: "paused" },
    });
  }
  return { ok: true as const, sequenceName: enr.sequence?.name };
}

// One-click unsubscribe (header List-Unsubscribe-Post de Gmail/Yahoo).
export const action = async ({ request }: ActionFunctionArgs) => {
  const token = new URL(request.url).searchParams.get("token");
  return data(await unsubscribe(token));
};

// Click del link "Cancelar suscripción" del footer.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const token = new URL(request.url).searchParams.get("token");
  return await unsubscribe(token);
};

export default function Baja({ loaderData }: Route.ComponentProps) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-brand-900">
      <div className="text-center max-w-md">
        {loaderData.ok ? (
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
