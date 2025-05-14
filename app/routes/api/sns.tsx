import { db } from "~/.server/db";

export const action = async ({ request }) => {
  const body = await request.json();
  // @todo add identity coincidence?
  if (
    body.Type === "Notification" &&
    body.TopicArn === "arn:aws:sns:us-east-2:476114113638:envios"
  ) {
    body.Message = JSON.parse(body.Message);
    console.info("MESSAGE", body.Message);

    // @todo do this in background
    const newsletter = await db.newsletter.findFirst({
      where: {
        messageIds: {
          has: body.Message.mail.messageId,
        }, // the id of the email not the notification
      },
    });
    if (!newsletter) return new Response(null);

    // @todo bounces?

    if (body.Message.eventType === "Delivery") {
      const delivered = [
        ...new Set([...newsletter.delivered, ...body.Message.mail.destination]),
      ];
      await db.newsletter.update({
        where: {
          id: newsletter.id,
        },
        data: { delivered },
      });
    }

    if (body.Message.eventType === "Open") {
      const opened = [
        ...new Set([...newsletter.opened, ...body.Message.mail.destination]),
      ];
      await db.newsletter.update({
        where: {
          id: newsletter.id,
        },
        data: { opened },
      });
    }

    if (body.Message.eventType === "Click") {
      // @todo save who clicked?
      console.info("Link clicked", body.Message.link);
      const clicked = [...newsletter.clicked, body.Message.click.link];
      await db.newsletter.update({
        where: {
          id: newsletter.id,
        },
        data: { clicked },
      });
    }
  }
  return new Response(null);
};
