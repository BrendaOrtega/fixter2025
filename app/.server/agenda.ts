import type { Newsletter } from "@prisma/client";
import { sendSESTEST } from "~/mailSenders/sendSESTEST";
import { getSesTransport, getSesRemitent } from "~/utils/sendGridTransport";
import { db } from "./db";
import Agenda from "agenda";
import { Effect } from "effect";
import { videoProcessorService } from "./services/video-processor";
import { s3VideoService } from "./services/s3-video";

let agenda: Agenda;
const getAgenda = () => {
  agenda ??= new Agenda({ db: { address: process.env.DATABASE_URL! } });
  return agenda as typeof agenda;
};

// Actions
export const scheduleNewsletterSend = async ({
  newsletter,
  when = "in 1 second", // change time span here
}: {
  when?: string | Date;
  newsletter: Newsletter;
}) => {
  const agenda = getAgenda();
  await agenda.start();
  agenda.schedule(when, "send_newsletter_test", {
    newsletter,
  });
};

//  Definitions

getAgenda().define(
  "send_newsletter_test",
  async (job: {
    attrs: { name: string; data: { newsletter: Newsletter } };
  }) => {
    console.info("::JOB_WORKING::", job.attrs.name);
    const messageIds = [];
    const { newsletter } = job.attrs?.data || {};
    for await (let email of newsletter.recipients) {
      const sendResult = (await sendSESTEST(email, {
        html: newsletter.content,
        subject: newsletter.title,
      })) as { response: string };
      if (sendResult) {
        messageIds.push(sendResult.response);
      } else {
        console.error("No se pudo enviar a::", email);
      }
      // @todo tasa máxima de envío?
      await new Promise((r) => setTimeout(r, 300));
    }
    // just one update at the end @todo bounces?
    await db.newsletter.update({
      where: { id: newsletter.id },
      data: {
        messageIds,
        status: "SENT",
        sent: new Date(),
      },
    });
    console.info("::JOB_FINISHED_SUCCESSFULLY::", job.attrs.name);
  }
);

// ═══════════════════════════════════════════════════════════════
// Job para reenviar newsletter a pendientes (resiliente)
// ═══════════════════════════════════════════════════════════════

export const scheduleResend = async (newsletterId: string) => {
  const agenda = getAgenda();
  await agenda.start();
  await agenda.now("send_newsletter_resend", { newsletterId });
  console.info(`📧 Job encolado: reenvío de ${newsletterId}`);
};

getAgenda().define(
  "send_newsletter_resend",
  async (job: { attrs: { name: string; data: { newsletterId: string } } }) => {
    const { newsletterId } = job.attrs.data;
    console.info(`📧 [RESEND] Iniciando job para newsletter ${newsletterId}`);

    // Obtener newsletter
    const newsletter = await db.newsletter.findUnique({
      where: { id: newsletterId },
      select: {
        id: true,
        recipients: true,
        delivered: true,
        content: true,
        title: true,
      },
    });

    if (!newsletter || !newsletter.content) {
      console.error(`❌ Newsletter ${newsletterId} no encontrado o sin contenido`);
      return;
    }

    // Calcular pendientes
    const deliveredSet = new Set(newsletter.delivered || []);
    const pending = (newsletter.recipients || []).filter(
      (e) => !deliveredSet.has(e)
    );

    // Filtrar blacklist
    const blacklist = await db.emailBlacklist.findMany({
      select: { email: true },
    });
    const blacklistSet = new Set(blacklist.map((b) => b.email));

    // Filtrar patrones sospechosos (bots)
    const suspicious = [".q@", "rightbliss", "silesia"];
    const toSend = pending.filter(
      (e) =>
        !blacklistSet.has(e) && !suspicious.some((pattern) => e.includes(pattern))
    );

    const excluded = pending.length - toSend.length;
    console.info(
      `📧 [RESEND] ${toSend.length} emails a enviar (${excluded} excluidos: blacklist/bots)`
    );

    if (toSend.length === 0) {
      console.info("📧 [RESEND] No hay emails para enviar");
      return;
    }

    // Preparar transporte
    const transporter = getSesTransport();
    const from = getSesRemitent();
    const configurationSet = process.env.SES_CONFIGURATION_SET;

    // Preparar HTML con tracking
    let html = newsletter.content;
    if (!html.includes("{{ses:openTracker}}")) {
      if (html.includes("<body")) {
        html = html.replace(/<body[^>]*>/i, "$&\n{{ses:openTracker}}");
      } else {
        html = "{{ses:openTracker}}\n" + html;
      }
    }

    // Enviar en lotes de 14 (SES default rate limit)
    const batchSize = 14;
    const totalBatches = Math.ceil(toSend.length / batchSize);

    for (let i = 0; i < toSend.length; i += batchSize) {
      const batchNum = Math.floor(i / batchSize) + 1;
      const batch = toSend.slice(i, i + batchSize);

      // Retry con backoff para rate limits
      let retries = 0;
      const maxRetries = 3;

      while (retries <= maxRetries) {
        try {
          const result = await transporter.sendMail({
            from,
            subject: newsletter.title,
            bcc: batch,
            html,
            ses: {
              ConfigurationSetName: configurationSet || undefined,
              Tags: [{ Name: "newsletter_id", Value: newsletter.id }],
            },
          });

          // Actualizar delivered después de cada lote
          await db.newsletter.update({
            where: { id: newsletterId },
            data: {
              delivered: { push: batch },
              messageIds: { push: result.messageId || "" },
            },
          });

          console.info(
            `✅ [RESEND] Lote ${batchNum}/${totalBatches}: ${batch.length} enviados`
          );
          break; // Éxito, salir del while
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);

          if (errMsg.includes("rate exceeded") && retries < maxRetries) {
            retries++;
            const waitTime = Math.pow(2, retries) * 2000; // 4s, 8s, 16s
            console.warn(
              `⏳ [RESEND] Rate limit lote ${batchNum}, retry ${retries}/${maxRetries} en ${waitTime / 1000}s`
            );
            await new Promise((r) => setTimeout(r, waitTime));
          } else {
            console.error(`❌ [RESEND] Error lote ${batchNum}: ${errMsg}`);
            break; // Error no recuperable o max retries
          }
        }
      }

      // Rate limiting: 2 segundos entre lotes
      if (i + batchSize < toSend.length) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    console.info(`🎉 [RESEND] Job completado para newsletter ${newsletterId}`);
  }
);

// Process sequences - simple version
getAgenda().define(
  "process_sequences",
  async (job: { attrs: { name: string } }) => {
    console.info("::SEQUENCE_JOB_WORKING::", job.attrs.name);
    
    // Find enrollments ready to receive next email
    const readyEnrollments = await db.sequenceEnrollment.findMany({
      where: {
        status: 'active',
        nextEmailAt: { lte: new Date() }
      },
      include: {
        sequence: {
          include: {
            emails: { orderBy: { order: 'asc' } }
          }
        },
        subscriber: true
      }
    });

    console.info(`Found ${readyEnrollments.length} ready enrollments`);

    for (const enrollment of readyEnrollments) {
      const { sequence, subscriber } = enrollment;
      const nextEmail = sequence.emails[enrollment.currentEmailIndex];
      
      if (!nextEmail) {
        // No more emails, mark as completed
        await db.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { status: 'completed', completedAt: new Date() }
        });
        continue;
      }

      try {
        // Send email
        await sendSESTEST(subscriber.email, {
          subject: nextEmail.subject,
          html: nextEmail.content,
        });

        // Update enrollment
        const nextIndex = enrollment.currentEmailIndex + 1;
        const hasMoreEmails = nextIndex < sequence.emails.length;
        
        let nextEmailAt = null;
        if (hasMoreEmails) {
          const nextEmailInSequence = sequence.emails[nextIndex];
          if (nextEmailInSequence.schedulingType === 'delay') {
            nextEmailAt = new Date(Date.now() + (nextEmailInSequence.delayDays || 0) * 24 * 60 * 60 * 1000);
          } else if (nextEmailInSequence.specificDate) {
            nextEmailAt = new Date(nextEmailInSequence.specificDate);
          }
        }

        await db.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: {
            currentEmailIndex: nextIndex,
            emailsSent: enrollment.emailsSent + 1,
            nextEmailAt,
            status: hasMoreEmails ? 'active' : 'completed',
            completedAt: hasMoreEmails ? null : new Date()
          }
        });

        console.info(`Sent email ${nextEmail.order} to ${subscriber.email} for sequence ${sequence.name}`);
        
      } catch (error) {
        console.error(`Failed to send email to ${subscriber.email}:`, error);
      }

      // Rate limiting
      await new Promise(r => setTimeout(r, 500));
    }

    console.info("::SEQUENCE_JOB_FINISHED::", job.attrs.name);
  }
);

// Schedule sequence processing - optimized frequency for development
export const startSequenceProcessor = async () => {
  const agenda = getAgenda();
  await agenda.start();
  
  // Clear any existing job to avoid duplicates
  await agenda.cancel({ name: 'process_sequences' });
  
  // Use different intervals based on environment
  const interval = process.env.NODE_ENV === 'development' ? '15 minutes' : '5 minutes';
  await agenda.every(interval, 'process_sequences');
  console.info(`Sequence processor started - runs every ${interval}`);
};

// ═══════════════════════════════════════════════════════════════
// Job para procesar videos a HLS
// ═══════════════════════════════════════════════════════════════

export const scheduleVideoProcessing = async ({
  courseId,
  videoId,
  videoS3Key,
}: {
  courseId: string;
  videoId: string;
  videoS3Key: string;
}) => {
  try {
    const agenda = getAgenda();
    console.info(`🔄 [AGENDA] Starting agenda for video processing...`);
    await agenda.start();
    
    // Check if there's already a running job for this video
    const existingJobs = await agenda.jobs({ 
      name: "process_video_hls",
      "data.videoId": videoId,
      nextRunAt: { $exists: true },
      $or: [
        { lockedAt: { $exists: true } },
        { lastFinishedAt: { $exists: false } }
      ]
    });
    
    if (existingJobs.length > 0) {
      console.info(`⏭️ [AGENDA] Job already exists for video ${videoId}, skipping...`);
      return;
    }
    
    console.info(`📤 [AGENDA] Scheduling HLS job for video ${videoId}...`);
    const job = await agenda.now("process_video_hls", { courseId, videoId, videoS3Key });
    console.info(`🎬 Job encolado: procesamiento HLS para video ${videoId}`, { jobId: job.attrs._id });
  } catch (error) {
    console.error(`❌ [AGENDA] Error scheduling video processing:`, error);
    throw error;
  }
};

getAgenda().define(
  "process_video_hls",
  async (job: {
    attrs: { 
      name: string; 
      data: { 
        courseId: string;
        videoId: string;
        videoS3Key: string;
      } 
    };
  }) => {
    const { courseId, videoId, videoS3Key } = job.attrs.data;
    console.info(`🎬 [HLS] Iniciando procesamiento para video ${videoId}`);
    console.info(`📋 [HLS] Datos: courseId=${courseId}, videoS3Key=${videoS3Key}`);

    // Sequential operations without transactions to avoid deadlock
    try {
      // 1. Update video status to processing
      await db.video.update({
        where: { id: videoId },
        data: { 
          processingStatus: "processing",
          processingStartedAt: new Date()
        }
      });

      // 2. Process video to HLS (this is the heavy operation)
      const result = await Effect.runPromise(
        videoProcessorService.processVideoToHLS(courseId, videoId, videoS3Key)
      );

      // 3. Update video with final results
      await db.video.update({
        where: { id: videoId },
        data: {
          m3u8: result.masterPlaylistUrl,
          storageLink: s3VideoService.getVideoUrl(videoS3Key),
          duration: result.duration.toString(),
          processingStatus: "ready",
          processingCompletedAt: new Date(),
          processingMetadata: {
            qualities: result.qualities,
            processingTime: result.processingTime,
            processedAt: new Date().toISOString(),
          }
        }
      });

      console.info(`✅ [HLS] Procesamiento completado para video ${videoId}`);
      console.info(`  - Master playlist: ${result.masterPlaylistUrl}`);
      console.info(`  - Calidades: ${result.qualities.map(q => q.resolution).join(", ")}`);
      console.info(`  - Duración: ${result.duration}s`);
      console.info(`  - Tiempo de procesamiento: ${result.processingTime}s`);

    } catch (error) {
      console.error(`❌ [HLS] Error procesando video ${videoId}:`, error);
      
      // Update video status to failed (simple operation without transaction)
      try {
        await db.video.update({
          where: { id: videoId },
          data: {
            processingStatus: "failed",
            processingError: error instanceof Error ? error.message : String(error),
            processingFailedAt: new Date()
          }
        });
      } catch (updateError) {
        console.error(`❌ [HLS] Failed to update error status for video ${videoId}:`, updateError);
      }

      throw error; // Re-throw to mark job as failed
    }
  }
  // Remove concurrency/lockLifetime options for now to debug
);
