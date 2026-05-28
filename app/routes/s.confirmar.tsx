import { type LoaderFunctionArgs } from "react-router";
import type { Route } from "./+types/s.confirmar";
import { db } from "~/.server/db";
import { calculateNextEmailDate } from "~/.server/sequences";
import { validateSequenceSubscribeToken } from "~/utils/tokens";
import getMetaTags from "~/utils/getMetaTags";

export const meta = () =>
  getMetaTags({ title: "Confirmar suscripción | FixterGeek" });

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return { ok: false, error: "Enlace inválido" };

  const { isValid, decoded, error } = validateSequenceSubscribeToken(token);
  if (!isValid || !decoded) {
    return { ok: false, error: error || "Enlace inválido" };
  }

  const sequence = await db.sequence.findUnique({
    where: { id: decoded.sequenceId },
    include: { emails: { orderBy: { order: "asc" }, take: 1 } },
  });
  if (!sequence || !sequence.isActive) {
    return { ok: false, error: "La secuencia ya no está disponible." };
  }

  const subscriber = await db.subscriber.upsert({
    where: { email: decoded.email },
    create: {
      email: decoded.email,
      name: decoded.name,
      confirmed: true,
      confirmedAt: new Date(),
      tags: [],
    },
    update: { confirmed: true, confirmedAt: new Date() },
  });

  const existing = await db.sequenceEnrollment.findUnique({
    where: {
      sequenceId_subscriberId: {
        sequenceId: sequence.id,
        subscriberId: subscriber.id,
      },
    },
  });
  if (!existing) {
    const firstEmail = sequence.emails[0];
    await db.sequenceEnrollment.create({
      data: {
        sequenceId: sequence.id,
        subscriberId: subscriber.id,
        status: "active",
        currentEmailIndex: 0,
        nextEmailAt: firstEmail ? calculateNextEmailDate(firstEmail) : null,
        enrolledAt: new Date(),
        emailsSent: 0,
      },
    });
  }

  return { ok: true, sequenceName: sequence.name };
};

export default function ConfirmSubscription({
  loaderData,
}: Route.ComponentProps) {
  const { ok } = loaderData;
  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-brand-900">
      <div className="text-center max-w-md">
        {ok ? (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-white mb-2">
              ¡Suscripción confirmada!
            </h1>
            <p className="text-brand-100">
              Ya estás suscrito a{" "}
              <strong className="text-white">{loaderData.sequenceName}</strong>.
              Pronto recibirás el primer email.
            </p>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">⛓️‍💥</div>
            <h1 className="text-2xl font-bold text-white mb-2">
              No pudimos confirmar
            </h1>
            <p className="text-brand-100">{loaderData.error}</p>
          </>
        )}
      </div>
    </main>
  );
}
