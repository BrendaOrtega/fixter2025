#!/usr/bin/env npx tsx
/**
 * Script para crear links de pago de Stripe sin producto en dashboard
 * Uso: npx tsx scripts/create-payment-link.ts <monto> <descripcion>
 * Ejemplo: npx tsx scripts/create-payment-link.ts 3000 "Pago FixterGeek"
 */

import Stripe from "stripe";
import "dotenv/config";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

async function createPaymentLink(amount: number, description: string) {
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "mxn",
          product_data: {
            name: description,
          },
          unit_amount: amount * 100, // Convertir a centavos
        },
        quantity: 1,
      },
    ],
    success_url: "https://www.fixtergeek.com?pago=exitoso",
    cancel_url: "https://www.fixtergeek.com",
  });

  return session.url;
}

// Ejecutar desde CLI
const args = process.argv.slice(2);
const amount = parseInt(args[0]) || 100;
const description = args.slice(1).join(" ") || "Pago FixterGeek";

console.log(`\nCreando link de pago...`);
console.log(`   Monto: $${amount} MXN`);
console.log(`   Descripcion: ${description}\n`);

createPaymentLink(amount, description)
  .then((url) => {
    console.log(`Link de pago creado:\n`);
    console.log(`   ${url}\n`);
  })
  .catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
