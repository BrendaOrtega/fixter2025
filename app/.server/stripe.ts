import Stripe from "stripe";
import { db } from "./db";

const isDev = process.env.NODE_ENV === "development";

export const PRICE_1499 = "price_1QKLfhJ7Zwl77LqnZw5iaY1V";
export const PRICE_999 = "price_1QKRbEJ7Zwl77Lqn0O8rRwrN";

export const DEV_PRICE = "price_1KBnlPJ7Zwl77LqnixoYRahN"; // 1200
export const DEV_COUPON = "rXOpoqJe"; // -25%
export const COUPON_40 = "EphZ17Lv"; // -40%
export const COUPON_50 = "yYMKDuTC"; // -50%

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
      ? process.env.STRIPE_SECRET_KEY || ""
      : (process.env.STRIPE_SECRET_KEY as string),
    {}
  );
  const location = isDev
    ? "http://localhost:3000"
    : "https://fixter2025.fly.dev"; // @todo move to prod
  const successURL = `${location}/cursos/${courseSlug}/viewer`;
  const session = await stripe.checkout.sessions.create({
    metadata: {
      courseId, // others?
      courseSlug, // yes!
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
    cancel_url: `${successURL}?videoIndex=10`, // @todo no me acuerdo pa que es el 10
    discounts: options.coupon ? [{ coupon: options.coupon }] : undefined,
    allow_promotion_codes: options.coupon ? undefined : true,
    // <= @todo multi moneda?
  });
  return session.url || "/";
};
