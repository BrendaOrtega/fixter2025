import type { Newsletter } from "@prisma/client";
import { sendSESTEST } from "~/mailSenders/sendSESTEST";
import { db } from "./db";
import Agenda from "agenda";

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

// Schedule sequence processing every 5 minutes
export const startSequenceProcessor = async () => {
  const agenda = getAgenda();
  await agenda.start();
  
  // Clear any existing job to avoid duplicates
  await agenda.cancel({ name: 'process_sequences' });
  
  await agenda.every('5 minutes', 'process_sequences');
  console.info('Sequence processor started - runs every 5 minutes');
};
