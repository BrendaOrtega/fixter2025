import { db } from "~/.server/db";

// Helper para hacer $addToSet atómico en MongoDB
async function addToArrayAtomic(
  newsletterId: string,
  field: "delivered" | "opened" | "clicked",
  emails: string[]
) {
  // Usar raw MongoDB para operación atómica
  await db.$runCommandRaw({
    update: "Newsletter",
    updates: [
      {
        q: { _id: { $oid: newsletterId } },
        u: { $addToSet: { [field]: { $each: emails } } },
      },
    ],
  });
}

export const loader = async () => {
  return new Response("SNS Endpoint Active", { status: 200 });
};

export const action = async ({ request }) => {
  try {
    const body = await request.json();

    // Manejar confirmación de suscripción SNS
    if (body.Type === "SubscriptionConfirmation") {
      console.log("🔔 SNS Subscription Confirmation - URL:", body.SubscribeURL);
      return new Response("OK", { status: 200 });
    }

    // Solo procesar notificaciones del topic correcto
    if (
      body.Type !== "Notification" ||
      body.TopicArn !== "arn:aws:sns:us-east-2:476114113638:envios"
    ) {
      return new Response(null);
    }

    const message = JSON.parse(body.Message);
    const eventType = message.eventType;
    const messageId = message.mail.messageId;
    const destination = message.mail.destination || [];

    console.log(
      `📧 [${eventType}] messageId: ${messageId.slice(-12)}, to: ${destination.join(", ")}`
    );

    // Buscar newsletter por tag primero (más rápido)
    let newsletterId: string | null = null;

    if (message.mail.tags?.newsletter_id?.[0]) {
      newsletterId = message.mail.tags.newsletter_id[0];
      // Verificar que existe
      const exists = await db.newsletter.findUnique({
        where: { id: newsletterId },
        select: { id: true },
      });
      if (!exists) newsletterId = null;
    }

    // Fallback: buscar por messageId
    if (!newsletterId) {
      const newsletter = await db.newsletter.findFirst({
        where: { messageIds: { has: messageId } },
        select: { id: true },
      });
      newsletterId = newsletter?.id || null;
    }

    if (!newsletterId) {
      console.warn(`⚠️ Newsletter not found for: ${messageId.slice(-12)}`);
      return new Response(null);
    }

    // Procesar según tipo de evento - OPERACIONES ATÓMICAS
    switch (eventType) {
      case "Delivery": {
        await addToArrayAtomic(newsletterId, "delivered", destination);
        console.log(`✅ Delivery: +${destination.length}`);
        break;
      }

      case "Open": {
        await addToArrayAtomic(newsletterId, "opened", destination);
        console.log(`✅ Open: ${destination.join(", ")}`);
        break;
      }

      case "Click": {
        await addToArrayAtomic(newsletterId, "clicked", destination);
        console.log(
          `✅ Click: ${destination.join(", ")} - ${message.click?.link?.slice(0, 50)}`
        );
        break;
      }

      case "Bounce": {
        console.warn(
          `⚠️ Bounce [${message.bounce?.bounceType}]: ${destination.join(", ")}`
        );
        break;
      }

      case "Complaint": {
        console.warn(`🚨 Complaint: ${destination.join(", ")}`);
        break;
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("❌ SNS Webhook Error:", error);
    return new Response("Error", { status: 500 });
  }
};
