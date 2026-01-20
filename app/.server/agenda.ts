import type { Newsletter } from "@prisma/client";
import { sendSESTEST } from "~/mailSenders/sendSESTEST";
import { getSesTransport, getSesRemitent } from "~/utils/sendGridTransport";
import { db } from "./db";
import Agenda from "agenda";
import { Effect } from "effect";
import { videoProcessorService } from "./services/video-processor";
import { s3VideoService, fixBucketDuplication } from "./services/s3-video";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { sendBackupNotification } from "~/mailSenders/sendBackupNotification";

const execPromise = promisify(exec);

let agenda: Agenda;
export const getAgenda = () => {
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

// Initialize Agenda with all job definitions
export const initializeAgenda = async () => {
  const agenda = getAgenda();

  console.info("🔄 Initializing Agenda with all job definitions...");

  // Start agenda to load all job definitions
  await agenda.start();

  // Start sequence processor
  await startSequenceProcessor();

  // Start video cleanup job (cada 15 min)
  await agenda.cancel({ name: "cleanup_stuck_videos" });
  await agenda.every("15 minutes", "cleanup_stuck_videos");
  console.info("🧹 Video cleanup job scheduled (every 15 min)");

  // Start backup scheduler (Domingos 3:00 AM)
  await startBackupScheduler();

  console.info("✅ Agenda initialized with all processors running");
  return agenda;
};

// ═══════════════════════════════════════════════════════════════
// Job para procesar videos a HLS
// ═══════════════════════════════════════════════════════════════

export const scheduleVideoProcessing = async ({
  courseId,
  videoId,
  videoS3Key,
  force = false,
}: {
  courseId: string;
  videoId: string;
  videoS3Key: string;
  force?: boolean;
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
      if (force) {
        console.info(`🔥 [AGENDA] Force=true - Canceling ${existingJobs.length} existing jobs for video ${videoId}...`);
        await Promise.all(existingJobs.map(job => job.remove()));
        console.info(`✅ [AGENDA] Existing jobs canceled for video ${videoId}`);
      } else {
        console.info(`⏭️ [AGENDA] Job already exists for video ${videoId}, skipping...`);
        return;
      }
    }
    
    console.info(`📤 [AGENDA] Scheduling HLS job for video ${videoId}${force ? ' (FORCED)' : ''}...`);
    const job = await agenda.now("process_video_hls", { courseId, videoId, videoS3Key });
    console.info(`🎬 Job encolado: procesamiento HLS para video ${videoId}`, { jobId: job.attrs._id });
  } catch (error) {
    console.error(`❌ [AGENDA] Error scheduling video processing:`, error);
    throw error;
  }
};

// Job de limpieza: detecta videos stuck en "processing" por más de 15 min
getAgenda().define("cleanup_stuck_videos", async () => {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

  const stuckVideos = await db.video.findMany({
    where: {
      processingStatus: "processing",
      processingStartedAt: { lt: fifteenMinutesAgo }
    },
    select: { id: true, title: true }
  });

  for (const video of stuckVideos) {
    console.warn(`⚠️ [CLEANUP] Video stuck detectado: ${video.title} (${video.id})`);
    await db.video.update({
      where: { id: video.id },
      data: {
        processingStatus: "failed",
        processingError: "Timeout: el procesamiento excedió 15 minutos",
        processingFailedAt: new Date()
      }
    });
  }

  if (stuckVideos.length > 0) {
    console.info(`🧹 [CLEANUP] ${stuckVideos.length} videos marcados como failed`);
  }
});

getAgenda().define(
  "process_video_hls",
  { lockLifetime: 10 * 60 * 1000 }, // 10 min - si excede, Agenda lo considera stuck
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
      // Fix potential bucket name duplication in HLS URL using helper function
      const hlsUrl = fixBucketDuplication(result.masterPlaylistUrl);

      await db.video.update({
        where: { id: videoId },
        data: {
          m3u8: hlsUrl,
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

// ═══════════════════════════════════════════════════════════════
// BACKUP SEMANAL - MongoDB a S3/Tigris
// ═══════════════════════════════════════════════════════════════

const BACKUP_BUCKET = process.env.BUCKET_NAME || "fixtergeek";
const BACKUP_PREFIX = "backups/fixtergeek/";
const BACKUP_NOTIFICATION_EMAILS = ["brenda@fixter.org", "contacto@fixter.org"];

// Cliente S3 específico para backups
function getBackupS3Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: "https://fly.storage.tigris.dev",
  });
}

// Subir archivo a S3
async function uploadBackupToS3(localPath: string, s3Key: string): Promise<void> {
  const s3Client = getBackupS3Client();
  const fileBuffer = fs.readFileSync(localPath);

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BACKUP_BUCKET,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: "application/gzip",
    })
  );
}

// Generar presigned URL para descarga (7 días)
async function generateBackupDownloadUrl(s3Key: string): Promise<string> {
  const s3Client = getBackupS3Client();
  return getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: BACKUP_BUCKET,
      Key: s3Key,
    }),
    { expiresIn: 604800 } // 7 días
  );
}

// Formatear bytes a humano
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Programar backup manual
export const scheduleBackupNow = async () => {
  const agenda = getAgenda();
  await agenda.start();
  await agenda.now("weekly-backup", {});
  console.info("💾 [BACKUP] Job encolado: backup manual");
};

// Definición del job de backup semanal
getAgenda().define(
  "weekly-backup",
  { priority: 20, lockLifetime: 30 * 60 * 1000 }, // 30 min timeout, priority 20 = high
  async (job: { attrs: { name: string } }) => {
    const now = new Date();
    const date = now.toISOString().split("T")[0];
    const time = now.toTimeString().slice(0, 5).replace(":", "");
    const filename = `backup_${date}_${time}.gz`;
    const localPath = `/tmp/${filename}`;
    const s3Key = `${BACKUP_PREFIX}${filename}`;

    console.info(`💾 [BACKUP] Iniciando backup: ${filename}`);

    // Crear registro como RUNNING
    const backupRecord = await db.backup.create({
      data: {
        filename,
        s3Key,
        sizeBytes: 0,
        status: "RUNNING",
      },
    });

    try {
      // 1. Ejecutar mongodump
      const mongoUri = process.env.DATABASE_URL;
      if (!mongoUri) {
        throw new Error("DATABASE_URL no configurada");
      }

      console.info(`💾 [BACKUP] Ejecutando mongodump...`);
      const startTime = Date.now();

      await execPromise(
        `mongodump --uri="${mongoUri}" --archive=${localPath} --gzip`,
        { maxBuffer: 100 * 1024 * 1024 } // 100MB buffer
      );

      const dumpTime = ((Date.now() - startTime) / 1000).toFixed(1);
      console.info(`💾 [BACKUP] mongodump completado en ${dumpTime}s`);

      // 2. Verificar archivo
      if (!fs.existsSync(localPath)) {
        throw new Error("El archivo de backup no se creó");
      }
      const stats = fs.statSync(localPath);
      console.info(`💾 [BACKUP] Tamaño: ${formatBytes(stats.size)}`);

      // 3. Subir a S3
      console.info(`💾 [BACKUP] Subiendo a S3: ${s3Key}`);
      await uploadBackupToS3(localPath, s3Key);
      console.info(`💾 [BACKUP] Upload completado`);

      // 4. Actualizar registro
      await db.backup.update({
        where: { id: backupRecord.id },
        data: {
          sizeBytes: stats.size,
          status: "COMPLETED",
        },
      });

      // 5. Limpiar archivo local
      fs.unlinkSync(localPath);

      // 6. Enviar notificación con link de descarga
      const downloadUrl = await generateBackupDownloadUrl(s3Key);

      for (const email of BACKUP_NOTIFICATION_EMAILS) {
        await sendBackupNotification({
          to: email,
          status: "success",
          filename,
          s3Key,
          sizeBytes: stats.size,
          downloadUrl,
        });
      }

      console.info(`✅ [BACKUP] Backup completado exitosamente: ${filename}`);
      console.info(`  - Tamaño: ${formatBytes(stats.size)}`);
      console.info(`  - S3 Key: ${s3Key}`);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ [BACKUP] Error en backup: ${errorMsg}`);

      // Actualizar registro como FAILED
      await db.backup.update({
        where: { id: backupRecord.id },
        data: {
          status: "FAILED",
          error: errorMsg,
        },
      });

      // Limpiar archivo local si existe
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }

      // Notificar error
      for (const email of BACKUP_NOTIFICATION_EMAILS) {
        await sendBackupNotification({
          to: email,
          status: "failed",
          filename,
          s3Key,
          errorMessage: errorMsg,
        });
      }

      throw error; // Re-throw para marcar job como failed
    }
  }
);

// Registrar backup semanal (Domingos 3:00 AM)
export const startBackupScheduler = async () => {
  const agenda = getAgenda();
  await agenda.start();

  // Cancelar jobs existentes para evitar duplicados
  await agenda.cancel({ name: "weekly-backup" });

  // Programar: Domingos 3:00 AM (cron: minuto hora día-mes mes día-semana)
  await agenda.every("0 3 * * 0", "weekly-backup");
  console.info("💾 [BACKUP] Scheduler iniciado - Domingos 3:00 AM");
};
