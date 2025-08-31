#!/usr/bin/env npx tsx

import { db } from '../app/.server/db';

async function testFeaturedField() {
  console.log('🔍 Probando campo isFeatured...\n');

  try {
    // Intentar obtener las sequences
    const sequences = await db.sequence.findMany({
      select: {
        id: true,
        name: true,
        isActive: true,
        // Intentar incluir isFeatured si existe
      }
    });

    console.log('📋 Sequences encontradas:');
    sequences.forEach(seq => {
      console.log(`   - ${seq.name} (Active: ${seq.isActive})`);
    });

    // Intentar actualizar una sequence con isFeatured
    console.log('\n🔄 Intentando actualizar campo isFeatured...');
    const geminiSeq = await db.sequence.findFirst({
      where: { name: 'Pre-Webinar | Gemini-CLI' }
    });

    if (geminiSeq) {
      // Intentar actualizar con campo raw
      const result = await db.$runCommandRaw({
        update: 'Sequence',
        updates: [{
          q: { _id: { $oid: geminiSeq.id } },
          u: { $set: { isFeatured: true } }
        }]
      });
      
      console.log('✅ Campo isFeatured agregado directamente a MongoDB');
      console.log('   Resultado:', JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.$disconnect();
  }
}

// Ejecutar script
if (import.meta.url === `file://${process.argv[1]}`) {
  testFeaturedField();
}

export { testFeaturedField };