#!/usr/bin/env npx tsx
/**
 * Comprueba, sin escribir nada, que una compra del taller resolvería al Product
 * por la misma metadata que ya mandan las landings. Si esto falla, el webhook
 * caería a la rama vieja (o a ninguna).
 *
 *   npx tsx --env-file=.env scripts/verify-sistemas-product.ts
 */
import { resolveProduct } from "~/.server/services/fulfillment.server";

const CASES: { name: string; metadata: Record<string, string | undefined> }[] = [
  {
    name: "landing actual (metadata.type)",
    metadata: { type: "sistemas-agenticos-workshop" },
  },
  {
    name: "por courseSlug",
    metadata: { courseSlug: "sistemas-agenticos" },
  },
  {
    name: "por fulfillmentKey explícito",
    metadata: { fulfillmentKey: "sistemas-agenticos-workshop" },
  },
];

async function main() {
  let ok = true;
  for (const c of CASES) {
    const { product, via } = await resolveProduct(c.metadata);
    const hit = product?.key === "sistemas-agenticos-workshop";
    if (!hit) ok = false;
    console.log(
      `${hit ? "✅" : "❌"} ${c.name} → ${product?.key ?? "ninguno"} (vía ${via})`
    );
    if (product && hit) {
      console.log(
        `      secuencias: ${product.sequences
          .map((s) => s.label || s.sequenceId)
          .join(" + ")}  ·  bienvenida: ${product.welcome ? "sí" : "NO"}`
      );
    }
  }
  process.exit(ok ? 0 : 1);
}

main();
