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
