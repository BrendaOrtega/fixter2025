import Stripe from "stripe";
import { db } from "./db";

const isDev = process.env.NODE_ENV === "development";

export const getStripeCheckout = async (options: {
  coupon?: string;
  customer_email?: string;
  metadata?: Record<string, string>;
  price?: string;
  courseId?: string;
  courseSlug: string;
}) => {
  const { courseSlug, courseId, customer_email, price } = options || {};
  const { stripeId } =
    (await db.course.findUnique({
      where: { slug: courseSlug },
      select: { stripeId: true },
    })) || {};
  const stripe = new Stripe(
    isDev
      ? (process.env.STRIPE_SECRET_KEY as string)
      : (process.env.STRIPE_SECRET_KEY as string),
    {}
  );
  const location = isDev
    ? "http://localhost:3000"
    : "https://fixter2025.fly.dev"; // @todo move to prod
  const successURL = `${location}/cursos/${courseSlug}/viewer`;
  const session = await stripe.checkout.sessions.create({
    metadata: {
      courseId,
      courseSlug,
      stripeId,
      ...options.metadata,
    },
    customer_email,
    mode: "payment",
    line_items: [
      {
        price: price || stripeId,
        quantity: 1,
      },
    ],
    success_url: `${successURL}?success=1`,
    cancel_url: `${successURL}?cancel=1`, // @todo no me acuerdo pa que es el 10
    discounts: options.coupon ? [{ coupon: options.coupon }] : undefined,
    allow_promotion_codes: options.coupon ? undefined : true,
    // <= @todo multi moneda?
  });
  return session.url || "/";
};
