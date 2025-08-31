#!/usr/bin/env npx tsx

import { db } from '../app/.server/db';

/**
 * Script para marcar la sequence de Gemini como featured
 */

async function markGeminiFeatured() {
  console.log('⭐ Marcando Pre-Webinar | Gemini-CLI como featured...\n');

  try {
    // Buscar y actualizar la sequence de Gemini
    const geminiSequence = await db.sequence.findFirst({
      where: { name: 'Pre-Webinar | Gemini-CLI' }
    });

    if (geminiSequence) {
      await db.sequence.update({
        where: { id: geminiSequence.id },
        data: { isFeatured: true }
      });
      
      console.log('✅ Sequence de Gemini marcada como featured');
    } else {
      console.log('❌ No se encontró la sequence Pre-Webinar | Gemini-CLI');
    }

    // Asegurarnos de que las otras sequences no estén marcadas como featured
    await db.sequence.updateMany({
      where: {
        NOT: { name: 'Pre-Webinar | Gemini-CLI' }
      },
      data: { isFeatured: false }
    });

    // Mostrar estado actual
    console.log('\n📊 Estado actual de sequences:');
    const allSequences = await db.sequence.findMany({
      select: {
        name: true,
        isActive: true,
        isFeatured: true
      }
    });

    allSequences.forEach(seq => {
      const status = seq.isActive ? '🟢' : '🔴';
      const featured = seq.isFeatured ? '⭐' : '  ';
      console.log(`   ${featured} ${status} ${seq.name}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.$disconnect();
  }
}

// Ejecutar script
if (import.meta.url === `file://${process.argv[1]}`) {
  markGeminiFeatured();
}

export { markGeminiFeatured };