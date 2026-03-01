import Stripe from "stripe";
import type { ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { getUserOrNull } from "~/.server/dbGetters";
import { PACKAGES, type PackageKey } from "~/.server/services/coach-credits.server";

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY as string);

export const action = async ({ request }: ActionFunctionArgs) => {
  const user = await getUserOrNull(request);
  if (!user) {
    return redirect("/login?redirect=/coach");
  }

  const body = await request.json();
  const packageKey = body.package as PackageKey;

  if (!PACKAGES[packageKey]) {
    return Response.json({ error: "Paquete inválido" }, { status: 400 });
  }

  const pkg = PACKAGES[packageKey];
  const stripe = getStripe();

  const isDev = process.env.NODE_ENV === "development";
  const location = isDev
    ? (process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`)
    : (process.env.BASE_URL || "https://www.fixtergeek.com");

  const session = await stripe.checkout.sessions.create({
    customer_email: user.email,
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "mxn",
          product_data: {
            name: `MentorIA — ${pkg.sessions} sesiones`,
            description: `Paquete de ${pkg.sessions} sesiones de coaching con IA`,
          },
          unit_amount: pkg.priceCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      type: "coach-sessions",
      package: packageKey,
      userId: user.id,
    },
    success_url: `${location}/coach?success=1&sessions=${packageKey}`,
    cancel_url: `${location}/coach?cancel=1`,
  });

  return Response.json({ url: session.url });
};
