#!/usr/bin/env npx tsx

import { db } from '../app/.server/db';

/**
 * Script para corregir el status de enrollments pausados
 */

async function fixEnrollmentStatus() {
  console.log('🔧 Corrigiendo status de enrollments...\n');

  try {
    // Buscar enrollments pausados que deberían estar activos
    const pausedEnrollments = await db.sequenceEnrollment.findMany({
      where: { status: 'paused' },
      include: {
        sequence: { select: { name: true } },
        subscriber: { select: { email: true } }
      }
    });

    console.log(`📋 Enrollments pausados encontrados: ${pausedEnrollments.length}`);

    if (pausedEnrollments.length > 0) {
      console.log('\n🔄 Activando enrollments:');
      
      for (const enrollment of pausedEnrollments) {
        console.log(`   ${enrollment.subscriber.email} → ${enrollment.sequence.name}`);
        
        // Reactivar el enrollment
        await db.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { 
            status: 'active',
            // Recalcular el próximo email si es necesario
            nextEmailAt: enrollment.nextEmailAt || new Date()
          }
        });
        
        console.log(`   ✅ Activado`);
      }
    }

    // Mostrar resumen actualizado
    console.log('\n📊 Estado actual de enrollments:');
    const summary = await db.sequenceEnrollment.groupBy({
      by: ['status'],
      _count: true
    });

    summary.forEach(item => {
      console.log(`   ${item.status}: ${item._count}`);
    });

    // Verificar enrollments de contacto@fixter.org específicamente
    const fixterEnrollments = await db.sequenceEnrollment.findMany({
      where: {
        subscriber: {
          email: 'contacto@fixter.org'
        }
      },
      include: {
        sequence: { select: { name: true } }
      }
    });

    console.log('\n📧 Enrollments de contacto@fixter.org:');
    fixterEnrollments.forEach(enrollment => {
      console.log(`   - ${enrollment.sequence.name}: ${enrollment.status}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.$disconnect();
  }
}

// Ejecutar script
if (import.meta.url === `file://${process.argv[1]}`) {
  fixEnrollmentStatus();
}

export { fixEnrollmentStatus };