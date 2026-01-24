import Stripe from "stripe";
import { db } from "~/.server/db";
import invariant from "tiny-invariant";
import { data, type ActionFunctionArgs } from "react-router";
import { successPurchase } from "~/mailSenders/successPurchase";
import { purchaseCongrats } from "~/mailSenders/purchaseCongrats";
import { sendAisdkWelcome } from "~/mailSenders/sendAisdkWelcome";
import { sendAisdkWebinarConfirmation } from "~/mailSenders/sendAisdkWebinarConfirmation";
import { sendAisdkTaller1Welcome } from "~/mailSenders/sendAisdkTaller1Welcome";
import { sendBookDownloadLink } from "~/mailSenders/sendBookDownloadLink";
import type { BookSlug } from "~/.server/services/book-access.server";

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

      // ============================================================
      // CURSOS ON-DEMAND - El único flujo de compra activo
      // Talleres/webinars van a lista de espera (manejado en landing pages)
      // ============================================================

      // Handle AI SDK Curso On-Demand - crea User con acceso al curso de videos
      if (session.metadata.type === "aisdk-curso-ondemand") {
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
            tags: ["newsletter", "aisdk-curso-ondemand"],
            metadata: {
              purchase: {
                type: "aisdk-curso-ondemand",
                totalPrice: Number(session.metadata.totalPrice || 999),
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
            tags: { push: ["aisdk-curso-ondemand"] },
            ...(aisdkCourse && { courses: { push: aisdkCourse.id } }),
          },
        });

        await sendAisdkWelcome({ to: email, userName });
        await successPurchase({
          userName: userName || "Sin nombre",
          userMail: email,
          title: "Curso AI SDK (on-demand)",
          slug: "ai-sdk",
        });

        console.info("WEBHOOK: AI SDK curso on-demand success");
        return new Response(null);
      }

      // LEGACY: Handle AI SDK workshop (mantener compatibilidad con compras anteriores)
      // Usuarios que compraron con aisdk-workshop MANTIENEN acceso al curso
      if (session.metadata.type === "aisdk-workshop") {
        const userName =
          session.customer_details?.name || session.metadata.name;

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
                totalPrice: Number(session.metadata.totalPrice || 1490),
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
            ...(aisdkCourse && { courses: { push: aisdkCourse.id } }),
          },
        });

        await sendAisdkWelcome({ to: email, userName });
        await successPurchase({
          userName: userName || "Sin nombre",
          userMail: email,
          title: "Taller AI SDK (legacy)",
          slug: "ai-sdk",
        });

        console.info("WEBHOOK: AI SDK workshop (legacy) success");
        return new Response(null);
      }

      // LEGACY: Handle AI SDK Webinar - ahora se usa lista de espera en landing
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

      // LEGACY: Handle AI SDK Taller 1 - ahora se usa lista de espera en landing
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

      // Handle book purchases - adds book slug to user.books array
      if (session.metadata.type === "book-purchase") {
        const bookSlug = session.metadata.bookSlug;
        const userName = session.customer_details?.name || "Lector";
        const paidTag = `book-${bookSlug}-paid`;

        if (!bookSlug) {
          console.error("WEBHOOK: book-purchase missing bookSlug");
          return new Response("Missing bookSlug", { status: 400 });
        }

        // Check if user exists to avoid duplicates
        const existingUser = await db.user.findUnique({ where: { email } });

        if (existingUser) {
          // Only add book/tag if not already present
          const newBooks = existingUser.books?.includes(bookSlug)
            ? existingUser.books
            : [...(existingUser.books || []), bookSlug];
          const newTags = existingUser.tags?.includes(paidTag)
            ? existingUser.tags
            : [...(existingUser.tags || []), paidTag];

          await db.user.update({
            where: { email },
            data: {
              displayName: userName || undefined,
              books: newBooks,
              tags: newTags,
            },
          });
        } else {
          await db.user.create({
            data: {
              email,
              username: email,
              displayName: userName,
              books: [bookSlug],
              tags: ["newsletter", paidTag],
              confirmed: true,
              role: "STUDENT",
            },
          });
        }

        // Also confirm subscriber if exists (buyer gets full access)
        const subscriberTag = `${bookSlug}-free-access`;
        const existingSubscriber = await db.subscriber.findUnique({ where: { email } });

        if (existingSubscriber) {
          const newSubTags = existingSubscriber.tags.includes(subscriberTag)
            ? existingSubscriber.tags
            : [...existingSubscriber.tags, subscriberTag];

          await db.subscriber.update({
            where: { email },
            data: {
              confirmed: true,
              tags: newSubTags,
            },
          });
        } else {
          await db.subscriber.create({
            data: {
              email,
              confirmed: true,
              tags: [subscriberTag],
            },
          });
        }

        await successPurchase({
          userName,
          userMail: email,
          title: `Libro: ${bookSlug}`,
          slug: bookSlug,
        });

        // Enviar email con magic link para descarga del EPUB
        try {
          await sendBookDownloadLink({
            to: email,
            bookSlug: bookSlug as BookSlug,
            userName,
          });
          console.info(`WEBHOOK: Book download email sent to ${email}`);
        } catch (emailError) {
          console.error(`WEBHOOK: Error sending book download email:`, emailError);
          // No fallar el webhook por error de email
        }

        console.info(`WEBHOOK: Book purchase success - ${bookSlug}`);
        return new Response(null);
      }

      // Si llegamos aquí sin courseSlug, es un evento de otra app Stripe
      if (!session.metadata.courseSlug) {
        console.info("WEBHOOK: Evento sin courseSlug, ignorando (otra app)");
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
