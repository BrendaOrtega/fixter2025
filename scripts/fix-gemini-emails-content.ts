#!/usr/bin/env npx tsx

import { db } from '../app/.server/db';

/**
 * Script para actualizar el contenido de los emails de Pre-Webinar | Gemini-CLI
 */

async function fixGeminiEmailsContent() {
  console.log('🔧 Actualizando contenido de emails de Pre-Webinar | Gemini-CLI...\n');

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

    console.log(`📋 Actualizando ${sequence.emails.length} emails...\n`);

    // Actualizar Email #1
    if (sequence.emails[0]) {
      await db.sequenceEmail.update({
        where: { id: sequence.emails[0].id },
        data: {
          subject: '¡Tu lugar está confirmado para el webinar de Gemini CLI! 💎',
          delayDays: 0,
          content: `
            <h1>¡Excelente decisión!</h1>
            
            <p>Has reservado tu lugar para el webinar gratuito de Gemini CLI.</p>
            
            <p><strong>📅 Detalles del webinar:</strong></p>
            <ul>
              <li>🗓️ Fecha: Próximamente</li>
              <li>🕐 Hora: 7:00 PM CDMX</li>
              <li>⏱️ Duración: 90 minutos</li>
              <li>💻 Formato: Online en vivo</li>
            </ul>
            
            <p><strong>¿Qué aprenderás en el webinar?</strong></p>
            <ul>
              <li>Cómo Gemini CLI revoluciona tu desarrollo</li>
              <li>Integración perfecta con tu terminal</li>
              <li>Casos de uso reales en producción</li>
              <li>Demo en vivo de automatización</li>
            </ul>
            
            <p>Te enviaré el link de acceso un día antes del evento.</p>
            
            <p>¡Nos vemos pronto!<br>
            Héctor Bliss</p>
          `
        }
      });
      console.log('✅ Email #1 actualizado');
    }

    // Actualizar Email #2
    if (sequence.emails[1]) {
      await db.sequenceEmail.update({
        where: { id: sequence.emails[1].id },
        data: {
          subject: '🚀 Prepárate para el webinar de Gemini CLI',
          delayDays: 2,
          content: `
            <h1>¡Faltan pocos días para el webinar!</h1>
            
            <p>Quiero que llegues preparado para aprovechar al máximo nuestra sesión.</p>
            
            <p><strong>Checklist de preparación:</strong></p>
            <ul>
              <li>✅ Ten Node.js instalado (v18 o superior)</li>
              <li>✅ Ten tu terminal favorita lista</li>
              <li>✅ Prepara tus preguntas sobre automatización</li>
              <li>✅ Ten un proyecto donde quieras aplicar Gemini</li>
            </ul>
            
            <p><strong>Lo que veremos en vivo:</strong></p>
            <ul>
              <li>Instalación y configuración desde cero</li>
              <li>Primeros comandos esenciales</li>
              <li>Automatización de tareas repetitivas</li>
              <li>Integración con tu workflow actual</li>
            </ul>
            
            <p><strong>💡 Tip previo:</strong> Gemini CLI es especialmente poderoso para análisis de código y refactoring masivo.</p>
            
            <p>¿Tienes alguna pregunta específica que quieras que abordemos? Responde este email.</p>
            
            <p>¡Nos vemos pronto!<br>
            Héctor</p>
          `
        }
      });
      console.log('✅ Email #2 actualizado');
    }

    // Mostrar resumen actualizado
    const updatedSequence = await db.sequence.findFirst({
      where: { id: sequence.id },
      include: { emails: { orderBy: { order: 'asc' } } }
    });

    console.log('\n📊 Resumen de emails actualizados:');
    updatedSequence?.emails.forEach(email => {
      console.log(`   Email #${email.order}: "${email.subject}"`);
      console.log(`      Delay: ${email.delayDays} días desde el email anterior`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.$disconnect();
  }
}

// Ejecutar script
if (import.meta.url === `file://${process.argv[1]}`) {
  fixGeminiEmailsContent();
}

export { fixGeminiEmailsContent };