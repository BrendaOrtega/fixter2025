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
  const course = await db.course.findUnique({
    where: { slug: courseSlug },
    select: { stripeId: true, basePrice: true, title: true },
  });
  
  if (!course) throw new Error("Course not found");
  
  const stripe = new Stripe(
    isDev
      ? (process.env.STRIPE_SECRET_KEY as string)
      : (process.env.STRIPE_SECRET_KEY as string),
    {}
  );
  
  const location = isDev
    ? "http://localhost:3000"
    : "https://www.fixtergeek.com"; // @todo move to prod
  const successURL = `${location}/cursos/${courseSlug}/viewer`;
  
  // Determinar si usar price ID existente o crear precio dinámico
  const hasValidPriceId = price || course.stripeId;
  
  const lineItems = hasValidPriceId ? 
    [{ price: price || course.stripeId, quantity: 1 }] :
    [{
      price_data: {
        currency: 'mxn',
        product_data: {
          name: course.title,
        },
        unit_amount: (course.basePrice || 499) * 100, // Convertir a centavos
      },
      quantity: 1,
    }];
    
  console.log('Stripe checkout logic:', {
    courseSlug,
    stripeId: course.stripeId,
    basePrice: course.basePrice,
    hasValidPriceId,
    usingPriceData: !hasValidPriceId
  });
  
  const session = await stripe.checkout.sessions.create({
    metadata: {
      courseId,
      courseSlug,
      stripeId: course.stripeId,
      ...options.metadata,
    },
    customer_email,
    mode: "payment",
    line_items: lineItems,
    success_url: `${successURL}?success=1`,
    cancel_url: `${successURL}?cancel=1`,
    discounts: options.coupon ? [{ coupon: options.coupon }] : undefined,
    allow_promotion_codes: options.coupon ? undefined : true,
  });
  return session.url || "/";
};
