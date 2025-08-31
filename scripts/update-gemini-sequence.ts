#!/usr/bin/env npx tsx

import { db } from '../app/.server/db';

/**
 * Script para actualizar la sequence de Gemini CLI
 */

async function updateGeminiSequence() {
  console.log('🔄 Actualizando sequence de Gemini CLI...\n');

  try {
    // Buscar la sequence existente
    const existingSequence = await db.sequence.findFirst({
      where: {
        OR: [
          { name: 'Bienvenida Gemini CLI' },
          { name: 'Pre-Webinar | Gemini-CLI' }
        ]
      }
    });

    if (existingSequence) {
      console.log('📧 Actualizando sequence existente...');
      
      const updated = await db.sequence.update({
        where: { id: existingSequence.id },
        data: {
          name: 'Pre-Webinar | Gemini-CLI',
          description: 'Serie de preparación para el webinar de Gemini CLI'
        }
      });
      
      console.log(`✅ Sequence actualizada: ${updated.id}`);
      console.log(`   Nombre: ${updated.name}`);
      console.log(`   Descripción: ${updated.description}`);
    } else {
      console.log('❌ No se encontró la sequence de Gemini CLI');
      console.log('   Puedes crearla ejecutando: npm run sequences:create');
    }

    // Mostrar todas las sequences actuales
    console.log('\n📊 Sequences actuales:');
    const allSequences = await db.sequence.findMany({
      select: {
        name: true,
        isActive: true,
        _count: {
          select: { emails: true }
        }
      }
    });

    allSequences.forEach(seq => {
      console.log(`   - ${seq.name} (${seq.isActive ? '🟢 Activa' : '🔴 Inactiva'}) - ${seq._count.emails} emails`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.$disconnect();
  }
}

// Ejecutar script
if (import.meta.url === `file://${process.argv[1]}`) {
  updateGeminiSequence();
}

export { updateGeminiSequence };