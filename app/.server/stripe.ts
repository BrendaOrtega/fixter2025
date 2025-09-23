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
  console.log("Buscando curso con slug:", courseSlug);
  
  const course = await db.course.findUnique({
    where: { slug: courseSlug },
    select: { stripeId: true, basePrice: true, title: true, isFree: true },
  });
  
  console.log("Curso encontrado:", course);
  
  if (!course) {
    console.error("Curso no encontrado con slug:", courseSlug);
    throw new Error(`Course not found: ${courseSlug}`);
  }
  
  if (course.isFree) {
    console.error("El curso es gratuito, no se puede comprar:", courseSlug);
    throw new Error("Cannot checkout free course");
  }
  
  const stripe = new Stripe(
    isDev
      ? (process.env.STRIPE_SECRET_KEY as string)
      : (process.env.STRIPE_SECRET_KEY as string),
    {}
  );
  
  const location = isDev
    ? (process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`)
    : (process.env.BASE_URL || "https://www.fixtergeek.com");
  const successURL = `${location}/mis-cursos`;
  const cancelURL = `${location}/cursos/${courseSlug}/detalle`;
  
  console.log('URLs de retorno configuradas:', {
    location,
    successURL,
    cancelURL,
    isDev
  });
  
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
      stripeId: course.stripeId || '',
      ...options.metadata,
    },
    customer_email,
    mode: "payment",
    line_items: lineItems,
    success_url: `${successURL}?success=1&course=${courseSlug}`,
    cancel_url: `${cancelURL}?cancel=1`,
    discounts: options.coupon ? [{ coupon: options.coupon }] : undefined,
    allow_promotion_codes: options.coupon ? undefined : true,
  });
  
  console.log('Sesión de Stripe creada exitosamente:', session.id);
  console.log('URL de checkout:', session.url);
  
  if (!session.url) {
    throw new Error('Stripe no devolvió URL de checkout');
  }
  
  return session.url;
};
