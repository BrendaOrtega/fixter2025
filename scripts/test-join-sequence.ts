#!/usr/bin/env npx tsx

import { db } from '../app/.server/db';

/**
 * Script para probar la funcionalidad de unirse a una sequence
 */

async function testJoinSequence() {
  console.log('🧪 Probando funcionalidad de unirse a sequence...\n');

  try {
    // Buscar un usuario de prueba
    const testUser = await db.user.findFirst({
      where: { email: { contains: '@' } }
    });

    if (!testUser) {
      console.log('❌ No se encontró ningún usuario para pruebas');
      return;
    }

    console.log(`📧 Usuario de prueba: ${testUser.email}`);

    // Buscar la sequence de Gemini
    const geminiSequence = await db.sequence.findFirst({
      where: { name: 'Pre-Webinar | Gemini-CLI' }
    });

    if (!geminiSequence) {
      console.log('❌ No se encontró la sequence de Gemini');
      return;
    }

    console.log(`📋 Sequence encontrada: ${geminiSequence.name}`);

    // Verificar o crear subscriber
    let subscriber = await db.subscriber.findUnique({
      where: { email: testUser.email }
    });

    if (!subscriber) {
      console.log('➕ Creando subscriber...');
      subscriber = await db.subscriber.create({
        data: {
          email: testUser.email,
          name: testUser.displayName || testUser.username || 'Test User',
          confirmed: true,
          tags: []
        }
      });
      console.log('✅ Subscriber creado');
    } else {
      console.log('✅ Subscriber existente');
    }

    // Verificar enrollment existente
    const existingEnrollment = await db.sequenceEnrollment.findUnique({
      where: {
        sequenceId_subscriberId: {
          sequenceId: geminiSequence.id,
          subscriberId: subscriber.id
        }
      }
    });

    if (existingEnrollment) {
      console.log('⚠️  El usuario ya está inscrito en esta sequence');
      console.log(`   Estado: ${existingEnrollment.status}`);
      console.log(`   Emails enviados: ${existingEnrollment.emailsSent}`);
    } else {
      console.log('📝 Inscribiendo usuario en la sequence...');
      
      // Obtener el primer email para calcular timing
      const sequence = await db.sequence.findUnique({
        where: { id: geminiSequence.id },
        include: {
          emails: {
            orderBy: { order: 'asc' },
            take: 1
          }
        }
      });
      
      const firstEmail = sequence?.emails[0];
      const nextEmailAt = firstEmail 
        ? new Date(Date.now() + (firstEmail.delayDays * 24 * 60 * 60 * 1000))
        : null;
      
      const enrollment = await db.sequenceEnrollment.create({
        data: {
          sequenceId: geminiSequence.id,
          subscriberId: subscriber.id,
          status: 'active',
          currentEmailIndex: 0,
          nextEmailAt,
          enrolledAt: new Date(),
          emailsSent: 0
        }
      });
      
      console.log('✅ Usuario inscrito exitosamente');
      console.log(`   ID de inscripción: ${enrollment.id}`);
      console.log(`   Próximo email: ${nextEmailAt?.toLocaleString() || 'N/A'}`);
    }

    // Mostrar resumen de inscripciones
    console.log('\n📊 Resumen de inscripciones del usuario:');
    const allEnrollments = await db.sequenceEnrollment.findMany({
      where: { subscriberId: subscriber.id },
      include: {
        sequence: {
          select: { name: true }
        }
      }
    });

    allEnrollments.forEach(enrollment => {
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
  testJoinSequence();
}

export { testJoinSequence };