import Stripe from "stripe";
import { db } from "~/.server/db";
import invariant from "tiny-invariant";
import { data, type ActionFunctionArgs } from "react-router";
import { successPurchase } from "~/mailSenders/successPurchase";
import { purchaseCongrats } from "~/mailSenders/purchaseCongrats";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export const action = async ({ request }: ActionFunctionArgs) => {
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
    console.error(`Stripe construct event error: ${error}`);
    return data(error, { status: 500 });
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
      const user = await db.user.upsert({
        where: {
          email,
        },
        create: {
          email,
          username: email,
          displayName: session.customer_details?.name,
          courses: [course.id],
        },
        update: {
          courses: { push: course.id },
          displayName: session.customer_details?.name || undefined, // @todo remove?
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
      return null;
    default:
      return null;
  }
};
