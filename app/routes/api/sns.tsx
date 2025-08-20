import { db } from "~/.server/db";

// Añadir soporte para GET (para verificación de endpoint)
export const loader = async () => {
  return new Response("SNS Endpoint Active", { status: 200 });
};

export const action = async ({ request }) => {
  const body = await request.json();
  
  // Log para debug
  console.log("📨 SNS Event received:", {
    Type: body.Type,
    TopicArn: body.TopicArn,
    Timestamp: body.Timestamp
  });
  
  // Manejar confirmación de suscripción SNS
  if (body.Type === "SubscriptionConfirmation") {
    console.log("🔔 SNS Subscription Confirmation received");
    console.log("Subscribe URL:", body.SubscribeURL);
    // En producción, deberías hacer un fetch a body.SubscribeURL para confirmar
    // Por ahora solo lo logueamos
    return new Response("OK", { status: 200 });
  }
  
  // @todo add identity coincidence?
  if (
    body.Type === "Notification" &&
    body.TopicArn === "arn:aws:sns:us-east-2:476114113638:envios"
  ) {
    body.Message = JSON.parse(body.Message);
    console.info("📧 SES Event Type:", body.Message.eventType);
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
      console.log("🔍 Open event detected for newsletter:", newsletter.id);
      console.log("📧 Recipients who opened:", body.Message.mail.destination);
      
      const opened = [
        ...new Set([...newsletter.opened, ...body.Message.mail.destination]),
      ];
      
      await db.newsletter.update({
        where: {
          id: newsletter.id,
        },
        data: { opened },
      });
      
      console.log("✅ Updated opened list, total opens:", opened.length);
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
