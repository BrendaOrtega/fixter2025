#!/usr/bin/env npx tsx

import { db } from '../app/.server/db';

/**
 * Script para agregar el tercer email a la sequence de Gemini
 */

async function updateGeminiEmails() {
  console.log('📧 Actualizando emails de Pre-Webinar | Gemini-CLI...\n');

  try {
    // Buscar la sequence
    const sequence = await db.sequence.findFirst({
      where: { name: 'Pre-Webinar | Gemini-CLI' },
      include: { emails: { orderBy: { order: 'asc' } } }
    });

    if (!sequence) {
      console.log('❌ No se encontró la sequence Pre-Webinar | Gemini-CLI');
      return;
    }

    console.log(`📋 Sequence encontrada con ${sequence.emails.length} emails actuales`);

    // Verificar si ya existe el tercer email
    const hasThirdEmail = sequence.emails.some(e => e.order === 3);

    if (!hasThirdEmail) {
      console.log('➕ Agregando tercer email de recordatorio...');

      const newEmail = await db.sequenceEmail.create({
        data: {
          sequenceId: sequence.id,
          order: 3,
          delayDays: 4,
          subject: '⏰ Último recordatorio: Webinar de Gemini CLI mañana',
          content: `
            <h1>¡Mañana es el gran día!</h1>
            
            <p>Solo quería recordarte que mañana tenemos nuestro webinar gratuito de Gemini CLI.</p>
            
            <p><strong>📍 Información de acceso:</strong></p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Fecha:</strong> Mañana</p>
              <p><strong>Hora:</strong> 7:00 PM CDMX</p>
              <p><strong>Link:</strong> Te lo enviaremos 1 hora antes del evento</p>
            </div>
            
            <p><strong>Agenda del webinar:</strong></p>
            <ul>
              <li>7:00 PM - Bienvenida y contexto</li>
              <li>7:10 PM - ¿Por qué Gemini CLI?</li>
              <li>7:20 PM - Demo: Instalación y primeros pasos</li>
              <li>7:40 PM - Casos de uso avanzados</li>
              <li>8:00 PM - Sesión de Q&A</li>
              <li>8:20 PM - Oferta especial para asistentes</li>
            </ul>
            
            <p><strong>🎁 Bonus para asistentes en vivo:</strong></p>
            <p>Los que asistan en vivo recibirán acceso a mi template de automatización con Gemini CLI.</p>
            
            <p><strong>No puedes asistir?</strong> No te preocupes, enviaremos la grabación a todos los registrados.</p>
            
            <p>¡Te veo mañana!<br>
            Héctor Bliss</p>
          `,
          fromName: 'Héctor Bliss',
          fromEmail: 'contacto@fixter.org'
        }
      });

      console.log(`✅ Email #3 agregado exitosamente`);
    } else {
      console.log('ℹ️  El tercer email ya existe');
    }

    // Mostrar resumen actualizado
    const updatedSequence = await db.sequence.findFirst({
      where: { id: sequence.id },
      include: { emails: { orderBy: { order: 'asc' } } }
    });

    console.log('\n📊 Resumen de emails en la sequence:');
    updatedSequence?.emails.forEach(email => {
      console.log(`   Email #${email.order}: "${email.subject}" (Delay: ${email.delayDays} días)`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.$disconnect();
  }
}

// Ejecutar script
if (import.meta.url === `file://${process.argv[1]}`) {
  updateGeminiEmails();
}

export { updateGeminiEmails };