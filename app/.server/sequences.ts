import { db } from "~/.server/db";
import { sendSESTEST } from "~/mailSenders/sendSESTEST";
import { emailButton } from "~/utils/emailShell";
import { generateSequenceVideoToken } from "~/utils/tokens";

const baseUrl =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://www.fixtergeek.com";

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

    try {
      const sendResult = await sendSESTEST(subscriber.email, {
        subject: nextEmail.subject,
        html,
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
