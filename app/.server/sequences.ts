import { db } from "~/.server/db";
import { sendSESTEST } from "~/mailSenders/sendSESTEST";
import { emailButton, emailVideoCard } from "~/utils/emailShell";
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

// Nadie lee secuencias@, así que las respuestas se desvían a un buzón real.
export const SEQUENCE_REPLY_TO = "fixtergeek@gmail.com";

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
 * Cuándo se abrirá cada correo de la secuencia para una inscripción concreta.
 * Los ya enviados devuelven null (no hay nada que esperar).
 *
 * Los delays son relativos al correo ANTERIOR, así que hay que acumularlos
 * desde `nextEmailAt`; los de fecha fija se toman tal cual.
 */
export function estimateUnlockDates(
  emails: {
    schedulingType: string;
    delayDays: number | null;
    specificDate: Date | null;
  }[],
  enrollment: { currentEmailIndex: number; nextEmailAt: Date | null }
): (Date | null)[] {
  let cursor = enrollment.nextEmailAt
    ? new Date(enrollment.nextEmailAt)
    : new Date();

  return emails.map((email, i) => {
    if (i < enrollment.currentEmailIndex) return null; // ya enviado
    if (email.schedulingType === "specific_date" && email.specificDate) {
      return new Date(email.specificDate);
    }
    if (i > enrollment.currentEmailIndex) {
      cursor = new Date(cursor.getTime() + (email.delayDays || 0) * DAY_MS);
    }
    return new Date(cursor);
  });
}

export type RenderableSequenceEmail = {
  subject: string;
  content: string;
  videoSlug?: string | null;
};

/**
 * Arma el HTML final de un email de secuencia: card de video con su link
 * tokenizado y link de baja del suscriptor.
 *
 * Es el ÚNICO lugar que sabe hacer esto. Antes el envío real y el botón de
 * prueba del editor lo hacían por separado y ya habían divergido: la prueba
 * dejaba el literal {{video}} visible y apuntaba a otra URL, así que validaba
 * un correo que nunca se enviaba.
 */
export async function renderSequenceEmail({
  email,
  enrollmentId,
  baseUrl: base = baseUrl,
}: {
  email: RenderableSequenceEmail;
  enrollmentId: string;
  baseUrl?: string;
}): Promise<{
  subject: string;
  html: string;
  unsubscribeUrl: string;
  videoUrl: string | null;
}> {
  let html = email.content;
  let videoUrl: string | null = null;

  if (email.videoSlug) {
    videoUrl = `${base}/s/video?token=${generateSequenceVideoToken(
      enrollmentId
    )}`;

    const video = await db.video.findUnique({
      where: { slug: email.videoSlug },
      select: { title: true, duration: true, poster: true, posterWide: true },
    });

    // posterWide primero: el poster normal suele ser vertical y en un correo
    // de 600px se come la pantalla. Sin ninguno, el botón de siempre.
    const posterUrl = video?.posterWide || video?.poster;
    const block = posterUrl
      ? emailVideoCard({
          posterUrl,
          href: videoUrl,
          title: video?.title || "Ver el video",
          duration: video?.duration,
        })
      : emailButton("▶ Ver el video", videoUrl);

    html = html.includes("{{video}}")
      ? html.replace(/\{\{video\}\}/g, block)
      : `${html}\n<div style="text-align:center;margin:16px 0">${block}</div>`;
  }

  const unsubscribeUrl = `${base}/s/baja?token=${generateSequenceUnsubscribeToken(
    enrollmentId
  )}`;
  html = html.replace(/\{\{unsubscribe\}\}/g, unsubscribeUrl);

  return { subject: email.subject, html, unsubscribeUrl, videoUrl };
}

/**
 * Envía un email de secuencia. Concentra remitente, headers y tags para que no
 * exista forma de mandar uno sin List-Unsubscribe o sin tracking.
 *
 * Lanza si SES no devuelve messageId: sendSESTEST se traga los errores y
 * devuelve undefined, y un envío fallido silencioso se ve igual que uno bueno.
 */
export async function sendSequenceEmail({
  to,
  email,
  enrollmentId,
  sequenceId,
  emailId,
}: {
  to: string;
  email: RenderableSequenceEmail;
  enrollmentId: string;
  sequenceId: string;
  emailId?: string;
}): Promise<{ messageId: string }> {
  const { subject, html, unsubscribeUrl } = await renderSequenceEmail({
    email,
    enrollmentId,
  });

  const result = await sendSESTEST(to, {
    subject,
    html,
    from: SEQUENCE_FROM,
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      "Reply-To": SEQUENCE_REPLY_TO,
    },
    trackOpens: true,
    to: true,
    tags: [
      { Name: "sequence_id", Value: sequenceId },
      { Name: "enrollment_id", Value: enrollmentId },
      { Name: "sequence_email_id", Value: emailId || "draft" },
    ],
  });

  if (!result?.messageId) {
    throw new Error("SES did not return a messageId");
  }
  return { messageId: result.messageId };
}

/**
 * Inscripción de prueba para que un admin se mande el correo por el camino real.
 *
 * Nace `paused` con `nextEmailAt: null` (doble candado: el motor filtra por
 * ambos) y con el índice al final, porque /s/video desbloquea con
 * `i < currentEmailIndex` — en 0 el video saldría bloqueado y parecería un
 * error del correo.
 */
export async function getOrCreateTestEnrollment(
  sequenceId: string,
  user: { email: string; displayName?: string | null; username?: string | null }
): Promise<{ id: string }> {
  const subscriber = await getOrCreateSubscriberForUser(user);

  const existing = await db.sequenceEnrollment.findUnique({
    where: {
      sequenceId_subscriberId: { sequenceId, subscriberId: subscriber.id },
    },
  });

  // Si ya recibió correos es una inscripción real: no degradarla a pausada.
  if (existing?.emailsSent) return { id: existing.id };

  const emailCount = await db.sequenceEmail.count({ where: { sequenceId } });
  const testState = {
    status: "paused",
    nextEmailAt: null,
    currentEmailIndex: emailCount,
  };

  const enrollment = await db.sequenceEnrollment.upsert({
    where: {
      sequenceId_subscriberId: { sequenceId, subscriberId: subscriber.id },
    },
    create: { sequenceId, subscriberId: subscriber.id, ...testState },
    update: testState,
  });
  return { id: enrollment.id };
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

    // Un email sin cuerpo es un borrador: existe para que se vea en el camino,
    // pero mandarlo sería peor que no mandar nada. Se pospone un día en vez de
    // saltarlo, para que no se pierda cuando alguien lo escriba.
    if (!nextEmail.content?.trim()) {
      await db.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: { nextEmailAt: new Date(Date.now() + DAY_MS) },
      });
      results.push(
        `${subscriber.email}: email ${nextEmail.order} sin contenido, pospuesto`
      );
      continue;
    }

    try {
      const { messageId } = await sendSequenceEmail({
        to: subscriber.email,
        email: nextEmail,
        enrollmentId: enrollment.id,
        sequenceId: sequence.id,
        emailId: nextEmail.id,
      });

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
