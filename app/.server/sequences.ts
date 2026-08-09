import { db } from "~/.server/db";
import { sendSESTEST } from "~/mailSenders/sendSESTEST";
import { emailButton } from "~/utils/emailShell";
import {
  generateSequenceVideoToken,
  generateSequenceUnsubscribeToken,
} from "~/utils/tokens";

const baseUrl =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://www.fixtergeek.com";

// Remitente de las secuencias (dominio verificado en SES → buena entregabilidad,
// a diferencia de enviar como @gmail.com que rompe DMARC).
export const SEQUENCE_FROM = "FixterGeek <secuencias@fixtergeek.com>";

const DAY_MS = 24 * 60 * 60 * 1000;

type SchedulableEmail = {
  schedulingType: string;
  delayDays: number | null;
  specificDate: Date | null;
};

/**
 * Cuándo debe enviarse un email de la secuencia.
 * "delay" → ahora + delayDays; "specific_date" → la fecha fija.
 */
export function calculateNextEmailDate(email: SchedulableEmail): Date | null {
  if (email.schedulingType === "delay") {
    return new Date(Date.now() + (email.delayDays || 0) * DAY_MS);
  }
  if (email.specificDate) {
    return new Date(email.specificDate);
  }
  return null;
}

/**
 * Resuelve el Subscriber de un user logueado (por email), creándolo si no existe.
 * Para users autenticados la cuenta ya es la verificación → confirmed:true.
 */
export async function getOrCreateSubscriberForUser(user: {
  email: string;
  displayName?: string | null;
  username?: string | null;
}) {
  const existing = await db.subscriber.findUnique({
    where: { email: user.email },
  });
  if (existing) return existing;

  return db.subscriber.create({
    data: {
      email: user.email,
      name: user.displayName || user.username || undefined,
      confirmed: true,
      tags: [],
    },
  });
}

/**
 * Inscribe un subscriber a una secuencia. Idempotente: si ya existe la
 * inscripción la devuelve sin tocarla. `immediate` fuerza el primer email al
 * siguiente ciclo del cron en vez de respetar su scheduling (delay/fecha).
 * Con specific_date en el pasado, el cron manda los correos vencidos en
 * ráfaga de catch-up — deseable para compradores tardíos, pero indeseable
 * cuando el correo ya no aplica ("mañana es el webinar" el mismo día): para
 * eso está `startAtIndex`, que arranca la secuencia más adelante.
 */
export async function enrollSubscriberInSequence(
  sequenceId: string,
  subscriberId: string,
  opts?: { immediate?: boolean; startAtIndex?: number }
) {
  const existing = await db.sequenceEnrollment.findUnique({
    where: { sequenceId_subscriberId: { sequenceId, subscriberId } },
  });
  if (existing) return existing;

  const sequence = await db.sequence.findUnique({
    where: { id: sequenceId },
    include: { emails: { orderBy: { order: "asc" } } },
  });
  if (!sequence) return null;

  const startIndex = Math.min(
    Math.max(opts?.startAtIndex ?? 0, 0),
    Math.max(sequence.emails.length - 1, 0)
  );
  const startEmail = sequence.emails[startIndex];

  // Ya no queda ningún email por enviar: se marca completada de una vez.
  if (!startEmail) {
    return db.sequenceEnrollment.create({
      data: {
        sequenceId,
        subscriberId,
        status: "completed",
        currentEmailIndex: startIndex,
        nextEmailAt: null,
        enrolledAt: new Date(),
        completedAt: new Date(),
        emailsSent: 0,
      },
    });
  }

  return db.sequenceEnrollment.create({
    data: {
      sequenceId,
      subscriberId,
      status: "active",
      currentEmailIndex: startIndex,
      nextEmailAt: opts?.immediate
        ? new Date()
        : calculateNextEmailDate(startEmail),
      enrolledAt: new Date(),
      emailsSent: 0,
    },
  });
}

/**
 * Motor de envío: procesa todas las inscripciones activas cuyo próximo email
 * ya vence. Usado por el cron (agenda) y por el endpoint manual de admin.
 * Devuelve un resumen para reportar.
 */
export async function processDueEnrollments(): Promise<{
  processed: number;
  results: string[];
}> {
  const readyEnrollments = await db.sequenceEnrollment.findMany({
    where: {
      status: "active",
      nextEmailAt: { lte: new Date() },
    },
    include: {
      sequence: { include: { emails: { orderBy: { order: "asc" } } } },
      subscriber: true,
    },
  });

  const results: string[] = [];

  for (const enrollment of readyEnrollments) {
    const { sequence, subscriber } = enrollment;
    const nextEmail = sequence.emails[enrollment.currentEmailIndex];

    if (!nextEmail) {
      await db.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: { status: "completed", completedAt: new Date() },
      });
      results.push(`${subscriber.email}: secuencia completada`);
      continue;
    }

    // Si el email tiene un video, inyecta el botón con link tokenizado por
    // suscriptor (reemplaza {{video}} si existe, o lo agrega al final).
    let html = nextEmail.content;
    if (nextEmail.videoSlug) {
      const link = `${baseUrl}/s/video?token=${generateSequenceVideoToken(
        enrollment.id
      )}`;
      const button = emailButton("▶ Ver el video", link);
      html = html.includes("{{video}}")
        ? html.replace(/\{\{video\}\}/g, button)
        : `${html}\n<div style="text-align:center;margin:16px 0">${button}</div>`;
    }

    // Link de baja tokenizado por suscriptor (footer + header List-Unsubscribe).
    const unsubscribeUrl = `${baseUrl}/s/baja?token=${generateSequenceUnsubscribeToken(
      enrollment.id
    )}`;
    html = html.replace(/\{\{unsubscribe\}\}/g, unsubscribeUrl);

    try {
      const sendResult = await sendSESTEST(subscriber.email, {
        subject: nextEmail.subject,
        html,
        from: SEQUENCE_FROM,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
        trackOpens: true,
        to: true,
        tags: [
          { Name: "sequence_id", Value: sequence.id },
          { Name: "enrollment_id", Value: enrollment.id },
          { Name: "sequence_email_id", Value: nextEmail.id },
        ],
      });

      const messageId = sendResult?.messageId;
      if (!messageId) {
        throw new Error("SES did not return a messageId");
      }

      const nextIndex = enrollment.currentEmailIndex + 1;
      const hasMoreEmails = nextIndex < sequence.emails.length;
      const nextEmailAt = hasMoreEmails
        ? calculateNextEmailDate(sequence.emails[nextIndex])
        : null;

      await db.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: {
          currentEmailIndex: nextIndex,
          emailsSent: enrollment.emailsSent + 1,
          nextEmailAt,
          status: hasMoreEmails ? "active" : "completed",
          completedAt: hasMoreEmails ? null : new Date(),
          messageIds: { push: messageId },
        },
      });

      results.push(
        `${subscriber.email}: enviado email ${nextEmail.order} de ${sequence.name}`
      );
    } catch (error) {
      console.error(`Failed to send email to ${subscriber.email}:`, error);
      results.push(`${subscriber.email}: error al enviar - ${error}`);
    }

    // Rate limiting entre envíos
    await new Promise((r) => setTimeout(r, 500));
  }

  return { processed: readyEnrollments.length, results };
}
