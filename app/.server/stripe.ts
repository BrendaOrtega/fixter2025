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

/**
 * Crea un checkout a partir de un Product.
 *
 * Lanza si el producto no existe o está inactivo, y ese es el punto: hasta hoy
 * cada landing inventaba su `metadata.type` a mano y nadie verificaba que
 * alguien supiera cumplirlo. Cinco compras de talleres se ignoraron por eso.
 * Ahora el error aparece al programar, no en producción y en silencio.
 */
export const createProductCheckout = async (
  key: string,
  options: {
    customer_email?: string;
    coupon?: string;
    metadata?: Record<string, string>;
    successURL?: string;
    cancelURL?: string;
  } = {}
): Promise<string> => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {});
  const product = await db.product.findUnique({ where: { key } });

  if (!product) {
    throw new Error(
      `No existe el producto "${key}". Créalo en /admin/productos antes de vender.`
    );
  }
  if (!product.active) {
    throw new Error(`El producto "${key}" está inactivo.`);
  }
  if (!product.priceMxn) {
    throw new Error(`El producto "${key}" no tiene precio.`);
  }

  const base = process.env.CO_URL || "https://www.fixtergeek.com";
  const session = await stripe.checkout.sessions.create({
    metadata: {
      // `app` marca el origen: la cuenta de Stripe se comparte con otro
      // proyecto, y sin esta marca no hay forma de distinguir una compra
      // nuestra sin cumplir de una ajena que no nos toca.
      app: "fixtergeek",
      fulfillmentKey: product.key,
      type: product.key, // compatibilidad con lo que ya lee el webhook
      ...options.metadata,
    },
    customer_email: options.customer_email,
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "mxn",
          product_data: { name: product.title },
          unit_amount: product.priceMxn * 100,
        },
        quantity: 1,
      },
    ],
    success_url: `${base}${product.successPath || options.successURL || "/mis-cursos"}?success=1`,
    cancel_url: `${options.cancelURL || base}?cancel=1`,
    discounts: options.coupon ? [{ coupon: options.coupon }] : undefined,
    allow_promotion_codes: options.coupon ? undefined : true,
  });

  if (!session.url) throw new Error("Stripe no devolvió URL de checkout");
  return session.url;
};
