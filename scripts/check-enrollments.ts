#!/usr/bin/env npx tsx

import { db } from '../app/.server/db';

/**
 * Script para verificar los enrollments de sequences
 */

async function checkEnrollments() {
  console.log('🔍 Verificando enrollments de sequences...\n');

  try {
    // Obtener todos los enrollments
    const allEnrollments = await db.sequenceEnrollment.findMany({
      include: {
        sequence: {
          select: { name: true }
        },
        subscriber: {
          select: { email: true }
        }
      }
    });

    console.log(`📊 Total de enrollments: ${allEnrollments.length}\n`);

    // Agrupar por status
    const byStatus = allEnrollments.reduce((acc, enrollment) => {
      acc[enrollment.status] = (acc[enrollment.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('📈 Enrollments por status:');
    Object.entries(byStatus).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

    console.log('\n📋 Detalle de enrollments:');
    allEnrollments.forEach(enrollment => {
      console.log(`   ${enrollment.subscriber.email} → ${enrollment.sequence.name}`);
      console.log(`      Status: ${enrollment.status}`);
      console.log(`      Enrolled: ${enrollment.enrolledAt?.toLocaleString()}`);
      console.log(`      Emails sent: ${enrollment.emailsSent}`);
      console.log('');
    });

    // Verificar usuarios con subscriber pero sin enrollments activos
    const subscribersWithoutActive = await db.subscriber.findMany({
      include: {
        sequenceEnrollments: {
          where: { status: 'active' }
        }
      }
    });

    const withoutActive = subscribersWithoutActive.filter(s => s.sequenceEnrollments.length === 0);
    
    if (withoutActive.length > 0) {
      console.log('⚠️  Subscribers sin enrollments activos:');
      withoutActive.forEach(sub => {
        console.log(`   - ${sub.email}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.$disconnect();
  }
}

// Ejecutar script
if (import.meta.url === `file://${process.argv[1]}`) {
  checkEnrollments();
}

export { checkEnrollments };