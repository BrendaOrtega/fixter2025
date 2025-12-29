import Stripe from "stripe";
import { db } from "~/.server/db";
import invariant from "tiny-invariant";
import { data, type ActionFunctionArgs } from "react-router";
import { successPurchase } from "~/mailSenders/successPurchase";
import { purchaseCongrats } from "~/mailSenders/purchaseCongrats";
import { sendAisdkWelcome } from "~/mailSenders/sendAisdkWelcome";
import { sendAisdkWebinarConfirmation } from "~/mailSenders/sendAisdkWebinarConfirmation";
import { sendAisdkTaller1Welcome } from "~/mailSenders/sendAisdkTaller1Welcome";

// Inicialización lazy para evitar error durante build
const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY as string);

export const action = async ({ request }: ActionFunctionArgs) => {
  const stripe = getStripe();
  if (request.method !== "POST") return;

  const webhookSecret = process.env.STRIPE_SIGN as string;
  const webhookStripeSignatureHeader = request.headers.get(
    "stripe-signature"
  ) as string;
  const payload = await request.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      payload,
      webhookStripeSignatureHeader,
      webhookSecret
    );
  } catch (error) {
    console.error(`::Stripe construct failed:: ${error}`);
    return new Response("::Stripe construct failed::", { status: 500 });
  }
  switch (event.type) {
    case "checkout.session.async_payment_failed":
      await successPurchase({
        userName: "Error en la compra (stripe error)",
        userMail: "async_payment_failed",
      });
      return null; // @todo notify?
    case "checkout.session.async_payment_succeeded":
    case "checkout.session.completed":
      const session = event.data.object;
      invariant(session.metadata);
      const email = session.customer_email || session.customer_details?.email;
      if (!email) return data("No email received", { status: 404 });

      // Handle AI SDK workshop - assigns ai-sdk course
      if (session.metadata.type === "aisdk-workshop") {
        const userName =
          session.customer_details?.name || session.metadata.name;

        // Buscar el curso ai-sdk para asignarlo
        const aisdkCourse = await db.course.findUnique({
          where: { slug: "ai-sdk" },
        });

        await db.user.upsert({
          where: { email },
          create: {
            email,
            username: email,
            displayName: userName,
            phoneNumber: session.customer_details?.phone,
            courses: aisdkCourse ? [aisdkCourse.id] : [],
            tags: ["newsletter", "aisdk-workshop-paid"],
            metadata: {
              purchase: {
                type: "aisdk-workshop",
                totalPrice: Number(session.metadata.totalPrice || 4990),
                paidAt: new Date().toISOString(),
                sessionId: session.id,
              },
            },
            confirmed: true,
            role: "STUDENT",
          },
          update: {
            displayName: userName || undefined,
            phoneNumber: session.customer_details?.phone || undefined,
            tags: { push: ["aisdk-workshop-paid"] },
            ...(aisdkCourse && { courses: { push: aisdkCourse.id } }), // 🤔😵‍💫
          },
        });

        await sendAisdkWelcome({ to: email, userName });
        await successPurchase({
          userName: userName || "Sin nombre",
          userMail: email,
          title: "Taller AI SDK",
          slug: "ai-sdk",
        });

        console.info("WEBHOOK: AI SDK workshop success");
        return new Response(null);
      }

      // Handle AI SDK Webinar (gratuito) - solo registra subscriber
      if (session.metadata.type === "aisdk-webinar") {
        const userName =
          session.customer_details?.name || session.metadata.name;

        // Registrar en Subscriber (no User) con patrón getOrCreate
        await db.subscriber.upsert({
          where: { email },
          create: {
            email,
            name: userName,
            tags: ["aisdk-webinar-registered"],
            confirmed: true,
          },
          update: {
            name: userName || undefined,
            tags: { push: ["aisdk-webinar-registered"] },
          },
        });

        await sendAisdkWebinarConfirmation({ to: email, userName });

        console.info("WEBHOOK: AI SDK webinar registration success");
        return new Response(null);
      }

      // Handle AI SDK Taller 1 - registra subscriber y envía bienvenida
      if (session.metadata.type === "aisdk-taller-1") {
        const userName =
          session.customer_details?.name || session.metadata.name;

        // Registrar en Subscriber con tag de compra
        await db.subscriber.upsert({
          where: { email },
          create: {
            email,
            name: userName,
            tags: ["aisdk-taller-1-paid"],
            confirmed: true,
          },
          update: {
            name: userName || undefined,
            tags: { push: ["aisdk-taller-1-paid"] },
          },
        });

        await sendAisdkTaller1Welcome({ to: email, userName });
        await successPurchase({
          userName: userName || "Sin nombre",
          userMail: email,
          title: "Taller 1: IA aplicada con TypeScript",
          slug: "ai-sdk",
        });

        console.info("WEBHOOK: AI SDK Taller 1 success");
        return new Response(null);
      }

      // Handle ALL course purchases - unified logic
      const course = await db.course.findUnique({
        where: {
          slug: session.metadata.courseSlug,
        },
      });
      if (!course) {
        await successPurchase({
          userName:
            "Error. El curso no se pudo asignar al usuario (curso no encontrado)",
          userMail: email,
          slug: session.metadata.courseSlug,
          meta: session.metadata,
        });
        return null;
      }
      // Build tags based on metadata
      const tags = ["newsletter"];

      // Add purchase-specific tags
      if (
        session.metadata.type === "claude-workshop" ||
        session.metadata.type === "claude-workshop-direct"
      ) {
        tags.push("claude-course-paid");
        if (session.metadata.type === "claude-workshop-direct") {
          tags.push("direct-purchase");
        } else {
          if (session.metadata.experienceLevel)
            tags.push(`level-${session.metadata.experienceLevel}`);
          if (session.metadata.contextObjective)
            tags.push(`context-${session.metadata.contextObjective}`);
        }
      }

      // Store any additional purchase metadata
      let purchaseMetadata = {};
      if (session.metadata.selectedModules) {
        purchaseMetadata = {
          selectedModules: JSON.parse(session.metadata.selectedModules || "[]"),
          totalPrice: Number(session.metadata.totalPrice || 0),
          paidAt: new Date().toISOString(),
          sessionId: session.id,
          purchaseType: session.metadata.type || "standard",
        };
      }

      const user = await db.user.upsert({
        where: {
          email,
        },
        create: {
          email,
          username: email,
          displayName: session.metadata.name || session.customer_details?.name,
          phoneNumber:
            session.metadata.phone || session.customer_details?.phone,
          courses: [course.id],
          tags,
          metadata:
            Object.keys(purchaseMetadata).length > 0
              ? { purchase: purchaseMetadata }
              : {},
          confirmed: true,
          role: "STUDENT",
        },
        update: {
          courses: { push: course.id },
          displayName:
            session.metadata.name ||
            session.customer_details?.name ||
            undefined,
          phoneNumber: session.metadata.phone || undefined,
          tags: { push: tags },
          metadata:
            Object.keys(purchaseMetadata).length > 0
              ? {
                  ...(
                    await db.user.findUnique({
                      where: { email },
                      select: { metadata: true },
                    })
                  )?.metadata,
                  purchase: purchaseMetadata,
                }
              : undefined,
        },
      });
      await successPurchase({
        userName:
          user.displayName || session.customer_details?.name || "Sin nombre",
        userMail: user.email,
        slug: session.metadata.courseSlug,
      });
      await purchaseCongrats({
        to: user.email,
        courseTitle: course.title,
        courseSlug: course.slug,
      });
      console.info("WEBHOOK: success");
      return new Response(null);
    default:
      return null;
  }
};
