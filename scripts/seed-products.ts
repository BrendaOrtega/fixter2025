#!/usr/bin/env npx tsx
/**
 * Descriptores de cumplimiento (Product) para los productos que hoy NO se
 * cumplen: los talleres en vivo cuyas landings emiten un `metadata.type` que el
 * webhook no conoce, y cuyas compras se ignoraban en silencio.
 *
 * A propósito NO se migran aquí los productos que ya funcionan bien
 * (sistemas-agenticos-workshop, aisdk-*): sus bloques siguen atendiéndolos y su
 * correo de bienvenida es mejor que el genérico. Se migran cuando su welcome
 * esté portado a WelcomeSpec, no antes — el webhook es híbrido justamente para
 * poder hacerlo de a poco.
 *
 * Idempotente: se puede correr las veces que haga falta.
 *
 *   npx tsx --env-file=.env scripts/seed-products.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

/**
 * Talleres en vivo: no otorgan acceso a nada dentro del sitio (no hay edición
 * on-demand), y eso es correcto, no un descriptor incompleto. Lo que sí hacen
 * es dejar registro de la compra y etiquetar a la persona.
 */
const PRODUCTS = [
  {
    key: "claude-workshop-direct",
    title: "Taller: Claude Code",
    courseSlugs: [],
    userTags: ["newsletter", "claude-workshop-paid"],
    subscriberTags: ["claude-workshop-paid"],
    createsUser: true,
    createsSubscriber: true,
    sequences: [],
  },
  {
    key: "gemini-workshop-direct",
    title: "Taller: Gemini",
    courseSlugs: [],
    userTags: ["newsletter", "gemini-workshop-paid"],
    subscriberTags: ["gemini-workshop-paid"],
    createsUser: true,
    createsSubscriber: true,
    sequences: [],
  },
  {
    key: "ia-nocode-course",
    title: "Curso: IA sin código",
    courseSlugs: [],
    userTags: ["newsletter", "ia-nocode-paid"],
    subscriberTags: ["ia-nocode-paid"],
    createsUser: true,
    createsSubscriber: true,
    sequences: [],
  },
];

async function main() {
  for (const product of PRODUCTS) {
    const existing = await db.product.findUnique({
      where: { key: product.key },
    });

    // Update sin pisar lo que se haya editado desde el admin: solo se
    // asegura que exista y esté activo.
    if (existing) {
      await db.product.update({
        where: { key: product.key },
        data: { active: true },
      });
      console.log(`♻️  ya existía: ${product.key}`);
      continue;
    }

    await db.product.create({ data: product });
    console.log(`✅ creado: ${product.key} — ${product.title}`);
  }

  const total = await db.product.count();
  console.log(`\n${total} producto(s) con descriptor.`);
  console.log(
    "Los demás tipos siguen atendidos por los bloques del webhook hasta migrarlos."
  );
}

main()
  .catch((error) => {
    console.error("❌", error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
