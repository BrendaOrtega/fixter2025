import { db } from "~/.server/db";

export type SequenceEventType =
  | "sent"
  | "delivered"
  | "open"
  | "click"
  | "bounce"
  | "complaint";

// Qué contador de SequenceEmail mueve cada tipo de evento.
const COUNTER: Record<SequenceEventType, string | null> = {
  sent: "sentCount",
  delivered: "deliveredCount",
  open: "openedCount",
  click: "clickedCount",
  bounce: "bouncedCount",
  complaint: null, // sin contador propio: son pocas y se ven en los eventos
};

/**
 * Registra un evento de SES contra el correo que lo provocó.
 *
 * Idempotente porque SES reintenta las notificaciones: existe una sola fila
 * por (correo, inscripción, tipo), y `lastEventAt` decide si lo que llega es
 * nuevo o una repetición de lo mismo. Es el papel que en los arrays del
 * enrollment cumplía `$addToSet`.
 *
 * Devuelve `created: true` solo la primera vez que esa persona genera ese
 * evento para ese correo — que es cuando se mueve el contador. Así la tasa de
 * apertura cuenta personas y no aperturas: quien abre cinco veces suma uno.
 */
export async function recordSequenceEmailEvent({
  sequenceId,
  sequenceEmailId,
  enrollmentId,
  recipient,
  type,
  messageId,
  eventAt,
  meta,
}: {
  sequenceId: string;
  sequenceEmailId: string;
  enrollmentId: string;
  recipient: string;
  type: SequenceEventType;
  messageId: string;
  eventAt: Date;
  meta?: Record<string, unknown>;
}): Promise<{ created: boolean }> {
  const where = { sequenceEmailId, enrollmentId, type };

  // ¿Ya existe y este evento es posterior? Entonces es una repetición real.
  const bumped = await db.sequenceEmailEvent.updateMany({
    where: { ...where, lastEventAt: { lt: eventAt } },
    data: { count: { increment: 1 }, lastAt: new Date(), lastEventAt: eventAt },
  });
  if (bumped.count > 0) return { created: false };

  try {
    await db.sequenceEmailEvent.create({
      data: {
        sequenceId,
        sequenceEmailId,
        enrollmentId,
        recipient,
        type,
        messageId,
        lastEventAt: eventAt,
        meta: meta as never,
      },
    });
  } catch (error) {
    // P2002: otra notificación creó la fila entre el updateMany y el create.
    // No es un duplicado que debamos contar: la carrera ya quedó registrada.
    if ((error as { code?: string })?.code === "P2002") return { created: false };
    throw error;
  }

  const counter = COUNTER[type];
  if (counter) {
    await db.sequenceEmail.update({
      where: { id: sequenceEmailId },
      data: { [counter]: { increment: 1 } },
    });
  }
  return { created: true };
}

/**
 * Recalcula los contadores de un correo desde sus eventos.
 * Para cuando se sospeche de los desnormalizados; no se usa en el render.
 */
export async function recountSequenceEmail(sequenceEmailId: string) {
  const grouped = await db.sequenceEmailEvent.groupBy({
    by: ["type"],
    where: { sequenceEmailId },
    _count: { _all: true },
  });

  const counts = Object.fromEntries(
    grouped.map((row) => [row.type, row._count._all])
  );
  return db.sequenceEmail.update({
    where: { id: sequenceEmailId },
    data: {
      sentCount: counts.sent || 0,
      deliveredCount: counts.delivered || 0,
      openedCount: counts.open || 0,
      clickedCount: counts.click || 0,
      bouncedCount: counts.bounce || 0,
    },
  });
}
