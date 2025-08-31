#!/usr/bin/env npx tsx

import { db } from '../app/.server/db';

/**
 * Script para crear sequences de ejemplo para FixterGeek
 */

async function createSampleSequences() {
  console.log('🚀 Creando sequences de ejemplo...\n');

  try {
    // 1. Sequence de Bienvenida Claude Code
    console.log('📧 Creando: Welcome Claude Code Sequence...');
    
    const claudeSequence = await db.sequence.create({
      data: {
        name: 'Bienvenida Claude Code',
        description: 'Serie de introducción para nuevos estudiantes de Claude Code',
        trigger: 'TAG_ADDED',
        triggerTag: 'claude',
        isActive: true,
        emails: {
          create: [
            {
              order: 1,
              delayDays: 0, // Inmediato
              subject: '¡Bienvenido a Claude Code! 🤖',
              content: `
                <h1>¡Hola y bienvenido!</h1>
                <p>Me emociona mucho que hayas decidido empezar tu journey con Claude Code.</p>
                
                <p><strong>¿Qué vas a aprender?</strong></p>
                <ul>
                  <li>Cómo usar Claude Code para automatizar tu desarrollo</li>
                  <li>Técnicas avanzadas de prompting para developers</li>
                  <li>Integración con tu workflow actual</li>
                </ul>
                
                <p>En los próximos días te estaré enviando contenido súper valioso.</p>
                
                <p>¡Nos vemos pronto!<br>
                Héctor Bliss</p>
              `,
              fromName: 'Héctor Bliss',
              fromEmail: 'contacto@fixter.org'
            },
            {
              order: 2,
              delayDays: 2,
              subject: 'Tu primera automatización con Claude Code',
              content: `
                <h1>¿Listo para tu primera automatización?</h1>
                
                <p>Hoy te voy a enseñar cómo crear tu primera automatización con Claude Code.</p>
                
                <p><strong>Ejercicio práctico:</strong></p>
                <p>Vamos a automatizar la creación de componentes React.</p>
                
                <pre><code>
                // Prompt para Claude:
                "Crea un componente React llamado {nombre} que..."
                </code></pre>
                
                <p><a href="https://fixtergeek.com/blog/primera-automatizacion-claude">Ver tutorial completo →</a></p>
                
                <p>¿Tienes dudas? Solo responde este email.</p>
                
                <p>Héctor</p>
              `,
              fromName: 'Héctor Bliss',
              fromEmail: 'contacto@fixter.org'
            },
            {
              order: 3,
              delayDays: 5,
              subject: 'Recursos gratuitos para dominar Claude Code',
              content: `
                <h1>🎁 Recursos gratuitos para ti</h1>
                
                <p>Como parte de nuestra comunidad, quiero compartirte algunos recursos que te van a ayudar muchísimo:</p>
                
                <ul>
                  <li><a href="#">📚 Cheat sheet de prompts para developers</a></li>
                  <li><a href="#">🎥 Video: 5 errores comunes con Claude</a></li>
                  <li><a href="#">🛠️ Template de proyecto con Claude Code</a></li>
                </ul>
                
                <p><strong>Próximamente:</strong> Estaremos lanzando el curso completo de Claude Code. Te daré acceso prioritario.</p>
                
                <p>¡Sigue practicando!</p>
                <p>Héctor</p>
              `,
              fromName: 'Héctor Bliss',
              fromEmail: 'contacto@fixter.org'
            }
          ]
        }
      },
      include: {
        emails: true
      }
    });
    
    console.log(`✅ Claude Sequence creada: ${claudeSequence.id}`);

    // 2. Sequence de Pre-Webinar Gemini CLI
    console.log('📧 Creando: Pre-Webinar Gemini CLI Sequence...');
    
    const geminiSequence = await db.sequence.create({
      data: {
        name: 'Pre-Webinar | Gemini-CLI',
        description: 'Serie de preparación para el webinar de Gemini CLI',
        trigger: 'TAG_ADDED',
        triggerTag: 'gemini',
        isActive: true,
        emails: {
          create: [
            {
              order: 1,
              delayDays: 0,
              subject: '¡Tu lugar está confirmado para el webinar de Gemini CLI! 💎',
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
              `,
              fromName: 'Héctor Bliss', 
              fromEmail: 'contacto@fixter.org'
            },
            {
              order: 2,
              delayDays: 2,
              subject: '🚀 Prepárate para el webinar de Gemini CLI',
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
              `,
              fromName: 'Héctor Bliss',
              fromEmail: 'contacto@fixter.org'
            },
            {
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
          ]
        }
      },
      include: {
        emails: true
      }
    });
    
    console.log(`✅ Gemini Sequence creada: ${geminiSequence.id}`);

    // 3. Sequence para Re-engagement
    console.log('📧 Creando: Re-engagement Sequence...');
    
    const reEngagementSequence = await db.sequence.create({
      data: {
        name: 'Re-engagement',
        description: 'Reactivar usuarios inactivos',
        trigger: 'MANUAL', // Se activa manualmente
        isActive: false, // Inicialmente inactiva
        emails: {
          create: [
            {
              order: 1,
              delayDays: 0,
              subject: '¿Sigues interesado en la automatización con IA?',
              content: `
                <h1>Te extrañamos por aquí...</h1>
                
                <p>Hace tiempo que no sabemos de ti y queríamos preguntarte:</p>
                
                <p><strong>¿Sigues interesado en dominar la automatización con IA?</strong></p>
                
                <p>Hemos añadido muchísimo contenido nuevo:</p>
                <ul>
                  <li>🤖 Nuevas técnicas con Claude Code</li>
                  <li>💎 Tutoriales de Gemini CLI</li>
                  <li>🚀 Casos de uso reales en producción</li>
                </ul>
                
                <p><a href="#">Sí, quiero seguir aprendiendo →</a></p>
                
                <p>Si no, no hay problema. Puedes darte de baja más abajo.</p>
                
                <p>Héctor</p>
              `,
              fromName: 'Héctor Bliss',
              fromEmail: 'contacto@fixter.org'
            }
          ]
        }
      },
      include: {
        emails: true
      }
    });
    
    console.log(`✅ Re-engagement Sequence creada: ${reEngagementSequence.id}`);

    // 4. Estadísticas
    console.log('\n📊 Resumen:');
    const totalSequences = await db.sequence.count();
    const totalEmails = await db.sequenceEmail.count();
    const activeSequences = await db.sequence.count({ where: { isActive: true } });
    
    console.log(`📧 Total sequences: ${totalSequences}`);
    console.log(`✉️  Total emails: ${totalEmails}`);
    console.log(`🟢 Active sequences: ${activeSequences}`);
    
    console.log('\n✅ ¡Sequences de ejemplo creadas!');
    console.log('\n🎯 Próximos pasos:');
    console.log('1. Ve a /newsletters para ver las sequences');
    console.log('2. Únete a una sequence para probar');
    console.log('3. Crea un cron job para procesar envíos');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.$disconnect();
  }
}

// Ejecutar script
if (import.meta.url === `file://${process.argv[1]}`) {
  createSampleSequences();
}

export { createSampleSequences };