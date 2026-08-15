#!/usr/bin/env npx tsx

// Llena el slug de las secuencias que no lo tienen (creadas antes de este
// campo). Idempotente: correrlo varias veces no cambia las que ya tienen
// slug. NO correr contra producción sin revisar primero (DATABASE_URL debe
// apuntar a la base correcta).

import { db } from "../app/.server/db";

// Copia local de la lógica de app/.server/slug.ts para no depender de un
// import con alias "~/" fuera del build de la app.
function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function generateUniqueSlug(
  name: string,
  excludeSequenceId?: string
): Promise<string> {
  const base = slugify(name) || "secuencia";
  let candidate = base;
  let suffix = 2;
  for (let i = 0; i < 1000; i++) {
    const existing = await db.sequence.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeSequenceId) return candidate;
    candidate = `${base}-${suffix}`;
    suffix++;
  }
  return `${base}-${Date.now()}`;
}

async function backfillSequenceSlugs() {
  console.log("🔍 Buscando secuencias sin slug...\n");

  const sequences = await db.sequence.findMany({
    where: { slug: null },
    select: { id: true, name: true },
  });

  console.log(`📊 Secuencias sin slug: ${sequences.length}\n`);

  for (const sequence of sequences) {
    const slug = await generateUniqueSlug(sequence.name, sequence.id);
    await db.sequence.update({
      where: { id: sequence.id },
      data: { slug },
    });
    console.log(`✅ "${sequence.name}" -> ${slug}`);
  }

  console.log("\n🎉 Listo.");
}

backfillSequenceSlugs()
  .catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
