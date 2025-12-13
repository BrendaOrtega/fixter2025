import { db } from "~/.server/db";
import crypto from "crypto";

// Cache de certificados para no descargarlos en cada petición
const certCache = new Map<string, string>();

// Verificar que la URL del certificado es de AWS
function isValidCertUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Debe ser HTTPS y de amazonaws.com
    return (
      parsed.protocol === "https:" &&
      parsed.hostname.endsWith(".amazonaws.com") &&
      parsed.pathname.endsWith(".pem")
    );
  } catch {
    return false;
  }
}

// Obtener certificado (con cache)
async function getCertificate(url: string): Promise<string | null> {
  if (certCache.has(url)) {
    return certCache.get(url)!;
  }

  if (!isValidCertUrl(url)) {
    console.error("❌ URL de certificado inválida:", url);
    return null;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const cert = await response.text();
    certCache.set(url, cert);
    return cert;
  } catch {
    return null;
  }
}

// Construir la cadena canónica para verificar firma SNS
function buildSignatureString(body: Record<string, unknown>): string {
  const type = body.Type as string;

  if (type === "Notification") {
    let str = `Message\n${body.Message}\n`;
    str += `MessageId\n${body.MessageId}\n`;
    if (body.Subject) str += `Subject\n${body.Subject}\n`;
    str += `Timestamp\n${body.Timestamp}\n`;
    str += `TopicArn\n${body.TopicArn}\n`;
    str += `Type\n${body.Type}\n`;
    return str;
  }

  if (type === "SubscriptionConfirmation" || type === "UnsubscribeConfirmation") {
    let str = `Message\n${body.Message}\n`;
    str += `MessageId\n${body.MessageId}\n`;
    str += `SubscribeURL\n${body.SubscribeURL}\n`;
    str += `Timestamp\n${body.Timestamp}\n`;
    str += `Token\n${body.Token}\n`;
    str += `TopicArn\n${body.TopicArn}\n`;
    str += `Type\n${body.Type}\n`;
    return str;
  }

  return "";
}

// Verificar firma del mensaje SNS
async function verifySnsSignature(body: Record<string, unknown>): Promise<boolean> {
  const signature = body.Signature as string;
  const certUrl = body.SigningCertURL as string;

  if (!signature || !certUrl) {
    console.error("❌ Mensaje sin firma o certificado");
    return false;
  }

  const cert = await getCertificate(certUrl);
  if (!cert) {
    console.error("❌ No se pudo obtener certificado");
    return false;
  }

  const stringToSign = buildSignatureString(body);
  if (!stringToSign) {
    console.error("❌ Tipo de mensaje desconocido:", body.Type);
    return false;
  }

  try {
    const verifier = crypto.createVerify("SHA1");
    verifier.update(stringToSign);
    return verifier.verify(cert, signature, "base64");
  } catch (error) {
    console.error("❌ Error verificando firma:", error);
    return false;
  }
}

// Helper para hacer $addToSet atómico en MongoDB
async function addToArrayAtomic(
  newsletterId: string,
  field: "delivered" | "opened" | "clicked",
  emails: string[]
) {
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

// Helper para manejar hard bounces y complaints
// SOLO se ejecuta después de verificar firma SNS
async function handleBadEmail(
  email: string,
  reason: "hard_bounce" | "complaint",
  details?: string
) {
  // 1. Agregar a blacklist
  await db.emailBlacklist.upsert({
    where: { email },
    create: { email, reason, details },
    update: { reason, details },
  });

  // 2. Eliminar Subscriber (seguro porque ya verificamos firma SNS)
  const deleted = await db.subscriber.deleteMany({
    where: { email },
  });

  console.log(
    `🗑️ ${email} → blacklist (${reason})${deleted.count ? " + subscriber eliminado" : ""}`
  );
}

export const loader = async () => {
  return new Response("SNS Endpoint Active", { status: 200 });
};

export const action = async ({ request }: { request: Request }) => {
  try {
    const body = await request.json();

    // Manejar confirmación de suscripción SNS (no requiere verificación estricta)
    if (body.Type === "SubscriptionConfirmation") {
      console.log("🔔 SNS Subscription Confirmation - URL:", body.SubscribeURL);
      // Opcional: verificar firma antes de loguear
      const valid = await verifySnsSignature(body);
      if (!valid) {
        console.warn("⚠️ Firma de SubscriptionConfirmation no válida");
      }
      return new Response("OK", { status: 200 });
    }

    // Solo procesar notificaciones del topic correcto
    if (
      body.Type !== "Notification" ||
      body.TopicArn !== "arn:aws:sns:us-east-2:476114113638:envios"
    ) {
      return new Response(null);
    }

    // ═══════════════════════════════════════════════════════════════
    // VERIFICACIÓN DE FIRMA SNS - Crítico para operaciones destructivas
    // ═══════════════════════════════════════════════════════════════
    const isValidSignature = await verifySnsSignature(body);
    if (!isValidSignature) {
      console.error("🚫 RECHAZADO: Mensaje con firma inválida");
      return new Response("Invalid signature", { status: 403 });
    }
    // ═══════════════════════════════════════════════════════════════

    const message = JSON.parse(body.Message);
    const eventType = message.eventType;
    const messageId = message.mail?.messageId;
    const destination = message.mail?.destination || [];

    if (!messageId) {
      console.warn("⚠️ Mensaje sin messageId");
      return new Response(null);
    }

    console.log(
      `📧 [${eventType}] ✓firma | messageId: ${messageId.slice(-12)}, to: ${destination.slice(0, 3).join(", ")}${destination.length > 3 ? `... +${destination.length - 3}` : ""}`
    );

    // Buscar newsletter por tag primero (más rápido)
    let newsletterId: string | undefined;

    if (message.mail.tags?.newsletter_id?.[0]) {
      newsletterId = message.mail.tags.newsletter_id[0];
      const exists = await db.newsletter.findUnique({
        where: { id: newsletterId },
        select: { id: true },
      });
      if (!exists) newsletterId = undefined;
    }

    // Fallback: buscar por messageId
    if (!newsletterId) {
      const newsletter = await db.newsletter.findFirst({
        where: { messageIds: { has: messageId } },
        select: { id: true },
      });
      newsletterId = newsletter?.id;
    }

    if (!newsletterId) {
      console.warn(`⚠️ Newsletter not found for: ${messageId.slice(-12)}`);
      return new Response(null);
    }

    // Procesar según tipo de evento
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
        const bounceType = message.bounce?.bounceType;
        const details = message.bounce?.bouncedRecipients?.[0]?.diagnosticCode;

        console.warn(`⚠️ Bounce [${bounceType}]: ${destination.join(", ")}`);

        // Solo eliminar en hard bounces (Permanent)
        if (bounceType === "Permanent") {
          for (const email of destination) {
            await handleBadEmail(email, "hard_bounce", details);
          }
        }
        break;
      }

      case "Complaint": {
        const complaintType =
          message.complaint?.complaintFeedbackType || "abuse";
        console.warn(`🚨 Complaint [${complaintType}]: ${destination.join(", ")}`);

        for (const email of destination) {
          await handleBadEmail(email, "complaint", complaintType);
        }
        break;
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("❌ SNS Webhook Error:", error);
    return new Response("Error", { status: 500 });
  }
};
