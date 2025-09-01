import type { ActionFunctionArgs } from "react-router";
import { db } from "~/.server/db";
import { sendSESTEST } from "~/mailSenders/sendSESTEST";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    console.info("Manual sequence processing triggered");
    
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
    const results = [];

    for (const enrollment of readyEnrollments) {
      const { sequence, subscriber } = enrollment;
      const nextEmail = sequence.emails[enrollment.currentEmailIndex];
      
      if (!nextEmail) {
        // No more emails, mark as completed
        await db.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { status: 'completed', completedAt: new Date() }
        });
        results.push(`${subscriber.email}: Sequence completed`);
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

        results.push(`${subscriber.email}: Sent email ${nextEmail.order} for ${sequence.name}`);
        
      } catch (error) {
        console.error(`Failed to send email to ${subscriber.email}:`, error);
        results.push(`${subscriber.email}: Failed to send email - ${error}`);
      }
    }

    return Response.json({ 
      success: true, 
      message: `Processed ${readyEnrollments.length} enrollments`,
      results
    });
    
  } catch (error) {
    console.error("Failed to process sequences:", error);
    return Response.json({ error: "Failed to process sequences" }, { status: 500 });
  }
};