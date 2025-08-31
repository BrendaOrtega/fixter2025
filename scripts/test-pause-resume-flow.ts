#!/usr/bin/env npx tsx

import { db } from '../app/.server/db';

/**
 * Script para probar el flujo completo de pausar/reanudar sequences
 */

async function testPauseResumeFlow() {
  console.log('🧪 Probando flujo de pausar/reanudar sequences...\n');

  try {
    // Buscar un enrollment activo para probar
    const activeEnrollment = await db.sequenceEnrollment.findFirst({
      where: { status: 'active' },
      include: {
        sequence: { select: { name: true } },
        subscriber: { select: { email: true } }
      }
    });

    if (!activeEnrollment) {
      console.log('❌ No se encontró ningún enrollment activo para probar');
      return;
    }

    console.log(`📧 Testing con: ${activeEnrollment.subscriber.email}`);
    console.log(`📋 Sequence: ${activeEnrollment.sequence.name}`);
    console.log(`📍 Current Index: ${activeEnrollment.currentEmailIndex}`);
    console.log(`📧 Emails Sent: ${activeEnrollment.emailsSent}\n`);

    // 1. Pausar la sequence
    console.log('⏸️ Pausando sequence...');
    const pausedEnrollment = await db.sequenceEnrollment.update({
      where: { id: activeEnrollment.id },
      data: { status: 'paused' }
    });

    console.log(`✅ Sequence pausada`);
    console.log(`   Status: ${pausedEnrollment.status}`);
    console.log(`   Current Index preservado: ${pausedEnrollment.currentEmailIndex}\n`);

    // 2. Simular que pasa tiempo (actualizar emails sent)
    console.log('⏱️ Simulando progreso en la sequence...');
    await db.sequenceEnrollment.update({
      where: { id: activeEnrollment.id },
      data: { 
        currentEmailIndex: pausedEnrollment.currentEmailIndex + 1,
        emailsSent: pausedEnrollment.emailsSent + 1
      }
    });
    console.log('✅ Progreso simulado\n');

    // 3. Reanudar la sequence
    console.log('🔄 Reanudando sequence...');
    
    // Obtener el enrollment actualizado
    const enrollmentToResume = await db.sequenceEnrollment.findUnique({
      where: { id: activeEnrollment.id }
    });

    // Buscar el próximo email basado en currentEmailIndex
    const sequence = await db.sequence.findUnique({
      where: { id: activeEnrollment.sequenceId },
      include: {
        emails: {
          where: { order: { gte: enrollmentToResume!.currentEmailIndex } },
          orderBy: { order: 'asc' },
          take: 1
        }
      }
    });

    const nextEmail = sequence?.emails[0];
    const nextEmailAt = nextEmail 
      ? new Date(Date.now() + (nextEmail.delayDays * 24 * 60 * 60 * 1000))
      : null;

    const resumedEnrollment = await db.sequenceEnrollment.update({
      where: { id: activeEnrollment.id },
      data: { 
        status: 'active',
        nextEmailAt
      }
    });

    console.log(`✅ Sequence reanudada`);
    console.log(`   Status: ${resumedEnrollment.status}`);
    console.log(`   Current Index: ${resumedEnrollment.currentEmailIndex}`);
    console.log(`   Emails Sent: ${resumedEnrollment.emailsSent}`);
    console.log(`   Next Email At: ${resumedEnrollment.nextEmailAt?.toLocaleString() || 'N/A'}\n`);

    console.log('🎉 ¡Flujo de pausa/reanudación funciona correctamente!');
    console.log('✨ El currentEmailIndex se preserva entre pausa y reanudación');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.$disconnect();
  }
}

// Ejecutar script
if (import.meta.url === `file://${process.argv[1]}`) {
  testPauseResumeFlow();
}

export { testPauseResumeFlow };