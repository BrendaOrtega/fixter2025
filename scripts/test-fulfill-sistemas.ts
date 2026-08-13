#!/usr/bin/env npx tsx
/**
 * Simula una compra del taller de punta a punta: resuelve el Product y corre
 * `fulfillPurchase` igual que lo haría el webhook. Manda correos de verdad a la
 * dirección que se le pase, por eso exige --confirm.
 *
 * Al terminar imprime los pasos y las inscripciones que quedaron, y ofrece
 * limpiarlas con --cleanup.
 *
 *   npx tsx --env-file=.env scripts/test-fulfill-sistemas.ts --email x@y.com --confirm
 *   npx tsx --env-file=.env scripts/test-fulfill-sistemas.ts --email x@y.com --cleanup
 */
import { PrismaClient } from "@prisma/client";
import {
  resolveProduct,
  fulfillPurchase,
} from "~/.server/services/fulfillment.server";

const db = new PrismaClient();

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};

const SESSION_ID = "cs_test_fulfill_sistemas";

async function report(email: string) {
  const sub = await db.subscriber.findUnique({ where: { email } });
  if (!sub) return console.log("   (sin subscriber)");
  const enrollments = await db.sequenceEnrollment.findMany({
    where: { subscriberId: sub.id },
  });
  for (const e of enrollments) {
    const seq = await db.sequence.findUnique({ where: { id: e.sequenceId } });
    console.log(
      `   · ${seq?.name} — ${e.status}, índice ${e.currentEmailIndex}, siguiente ${
        e.nextEmailAt?.toISOString() ?? "—"
      }`
    );
  }
}

async function main() {
  const email = arg("email");
  if (!email) throw new Error("Falta --email");

  if (process.argv.includes("--cleanup")) {
    const sub = await db.subscriber.findUnique({ where: { email } });
    if (sub) {
      const del = await db.sequenceEnrollment.deleteMany({
        where: {
          subscriberId: sub.id,
          sequenceId: {
            in: ["6a790319d7dfe60e8edcb5cd", "6a7a496344caa1db8e558fc3"],
          },
        },
      });
      console.log(`🧹 inscripciones borradas: ${del.count}`);
    }
    const ev = await db.purchaseEvent.deleteMany({
      where: { stripeSessionId: SESSION_ID },
    });
    console.log(`🧹 purchase events borrados: ${ev.count}`);
    return;
  }

  const { product, via } = await resolveProduct({
    type: "sistemas-agenticos-workshop",
  });
  if (!product) throw new Error("No resolvió el producto");
  console.log(`📦 ${product.key} (vía ${via})`);

  console.log("\nAntes:");
  await report(email);

  if (!process.argv.includes("--confirm")) {
    console.log("\n(dry-run) Pasa --confirm. Manda correos reales a", email);
    return;
  }

  const { ok, steps } = await fulfillPurchase({
    product,
    email,
    name: "Prueba",
    sessionId: SESSION_ID,
    amountTotal: 0,
    metadata: { type: "sistemas-agenticos-workshop" },
  });

  console.log(`\n${ok ? "✅" : "⚠️"} pasos:`);
  for (const s of steps) {
    const icon = s.status === "ok" ? "✓" : s.status === "skipped" ? "–" : "✗";
    console.log(`   ${icon} ${s.name}${s.detail ? ` — ${s.detail}` : ""}`);
  }

  console.log("\nDespués:");
  await report(email);
}

main();
