#!/usr/bin/env npx tsx
/**
 * Escribe a /tmp el correo de bienvenida del taller como queda con el
 * WelcomeSpec del Product, para revisarlo en el navegador antes de que lo
 * reciba un comprador. No manda nada.
 *
 *   npx tsx --env-file=.env scripts/preview-sistemas-welcome.ts
 */
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";
import {
  renderProductWelcome,
  type WelcomeSpec,
} from "~/mailSenders/sendProductWelcome";

const db = new PrismaClient();

async function main() {
  const product = await db.product.findUnique({
    where: { key: "sistemas-agenticos-workshop" },
  });
  if (!product?.welcome) throw new Error("El producto no tiene welcome spec");

  const { subject, html } = renderProductWelcome(
    product.welcome as unknown as WelcomeSpec,
    {
      to: "fixtergeek@gmail.com",
      userName: "Martín",
      courseSlug: product.courseSlugs[0],
    }
  );

  const out = "/tmp/welcome-sistemas-nuevo.html";
  writeFileSync(out, html);
  console.log(`asunto: ${subject}`);
  console.log(`archivo: ${out}`);

  const cals = (html.match(/calendar\.google\.com/g) || []).length;
  console.log(`enlaces a Google Calendar: ${cals} (deben ser 4)`);
}

main();
