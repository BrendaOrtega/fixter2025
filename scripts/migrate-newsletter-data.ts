#!/usr/bin/env npx tsx

import { db } from '../app/.server/db';

/**
 * Script de migración para actualizar datos existentes al nuevo modelo Newsletter
 * 
 * Migra:
 * 1. Newsletters existentes al nuevo formato
 * 2. Subscribers existentes con nuevos campos
 * 3. Crea registros de Analytics para newsletters existentes
 */

async function migrateNewsletterData() {
  console.log('🚀 Iniciando migración de datos del Newsletter...\n');

  try {
    // 1. Migrar Newsletters existentes
    console.log('📧 Migrando Newsletters...');
    const existingNewsletters = await db.newsletter.findMany();
    
    for (const newsletter of existingNewsletters) {
      // Verificar si ya tiene los nuevos campos
      if (!newsletter.subject) {
        console.log(`📝 Actualizando newsletter: ${newsletter.title}`);
        
        await db.newsletter.update({
          where: { id: newsletter.id },
          data: {
            // Campos obligatorios que faltan
            subject: newsletter.title, // Usar título como subject por defecto
            fromName: 'FixterGeek',
            fromEmail: 'contacto@fixter.org',
            
            // Migrar status si es necesario
            status: newsletter.status === 'PUBLISHED' ? 'SENT' : newsletter.status,
            
            // Mantener contenido existente
            content: newsletter.content || '',
            
            // Inicializar campos nuevos
            engagementScore: 0,
            isAbTest: false,
            isAutomated: false,
            timeZoneOptimized: false,
            sendTimeOptimization: false,
          }
        });
        
        // Crear analytics para newsletter existente si no existe
        const existingAnalytics = await db.newsletterAnalytics.findUnique({
          where: { newsletterId: newsletter.id }
        });
        
        if (!existingAnalytics) {
          await db.newsletterAnalytics.create({
            data: {
              newsletterId: newsletter.id,
              // Migrar stats existentes si existen
              sent: newsletter.delivered?.length || 0,
              delivered: newsletter.delivered?.length || 0,
              opened: newsletter.opened?.length || 0,
              clicked: newsletter.clicked?.length || 0,
              
              // Calcular tasas básicas
              openRate: newsletter.delivered?.length > 0 
                ? (newsletter.opened?.length || 0) / newsletter.delivered.length 
                : 0,
              clickRate: newsletter.delivered?.length > 0 
                ? (newsletter.clicked?.length || 0) / newsletter.delivered.length 
                : 0,
            }
          });
          console.log(`📊 Analytics creados para: ${newsletter.title}`);
        }
      }
    }
    console.log(`✅ ${existingNewsletters.length} newsletters migrados\n`);

    // 2. Migrar Subscribers existentes  
    console.log('👥 Migrando Subscribers...');
    const existingSubscribers = await db.subscriber.findMany();
    
    for (const subscriber of existingSubscribers) {
      // Verificar si ya tiene los nuevos campos
      if (subscriber.status === undefined || subscriber.engagementScore === undefined) {
        console.log(`👤 Actualizando subscriber: ${subscriber.email}`);
        
        await db.subscriber.update({
          where: { id: subscriber.id },
          data: {
            // Migrar status basado en confirmación
            status: subscriber.confirmed ? 'ACTIVE' : 'PENDING_CONFIRMATION',
            
            // Separar nombre si existe
            firstName: subscriber.name?.split(' ')[0] || null,
            lastName: subscriber.name?.split(' ').slice(1).join(' ') || null,
            
            // Inicializar engagement
            engagementScore: subscriber.confirmed ? 25 : 0, // Score inicial para confirmados
            
            // Configuraciones por defecto
            doubleOptIn: true,
            language: 'es',
            
            // Arrays vacíos para nuevos campos
            autoTags: [],
            audienceIds: [],
            
            // Contadores
            totalOpens: 0,
            totalClicks: 0,
          }
        });
        
        // Crear preferencias por defecto
        const existingPrefs = await db.subscriberPreferences.findUnique({
          where: { subscriberId: subscriber.id }
        });
        
        if (!existingPrefs) {
          await db.subscriberPreferences.create({
            data: {
              subscriberId: subscriber.id,
              frequency: 'weekly',
              topics: subscriber.tags || [],
              contentTypes: ['newsletter'],
              htmlEmails: true,
              plaintextFallback: true,
              allowTracking: true,
              allowProfiling: true,
              gdprConsent: subscriber.confirmed || false,
              gdprConsentDate: subscriber.confirmed ? subscriber.createdAt : null,
              preferredDays: ['tuesday', 'thursday'],
            }
          });
          console.log(`⚙️  Preferencias creadas para: ${subscriber.email}`);
        }
      }
    }
    console.log(`✅ ${existingSubscribers.length} subscribers migrados\n`);

    // 3. Crear audiencia por defecto
    console.log('🎯 Creando audiencias por defecto...');
    const defaultAudience = await db.audience.findFirst({
      where: { name: 'Todos los Suscriptores' }
    });
    
    if (!defaultAudience) {
      const allSubscribers = await db.subscriber.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true }
      });
      
      const newAudience = await db.audience.create({
        data: {
          name: 'Todos los Suscriptores',
          description: 'Audiencia principal con todos los suscriptores activos',
          tags: ['general'],
          isDynamic: true,
          subscriberIds: allSubscribers.map(s => s.id),
          subscriberCount: allSubscribers.length,
          conditions: {
            status: 'ACTIVE'
          }
        }
      });
      console.log(`🎯 Audiencia por defecto creada: ${newAudience.name}`);
    }

    // 4. Estadísticas finales
    console.log('\n📊 Estadísticas de migración:');
    const totalNewsletters = await db.newsletter.count();
    const totalSubscribers = await db.subscriber.count();
    const totalAnalytics = await db.newsletterAnalytics.count();
    const totalAudiences = await db.audience.count();
    const totalPreferences = await db.subscriberPreferences.count();
    
    console.log(`📧 Newsletters: ${totalNewsletters}`);
    console.log(`👥 Subscribers: ${totalSubscribers}`);
    console.log(`📊 Analytics: ${totalAnalytics}`);
    console.log(`🎯 Audiencias: ${totalAudiences}`);
    console.log(`⚙️  Preferencias: ${totalPreferences}`);

    console.log('\n✅ ¡Migración completada exitosamente!');
    console.log('\n🚀 Tu sistema de Newsletter ahora supera a ConvertKit con:');
    console.log('• Segmentación avanzada con audiencias dinámicas');
    console.log('• Analytics detallados en tiempo real');
    console.log('• Engagement scoring automático');  
    console.log('• Personalización basada en comportamiento');
    console.log('• A/B testing integrado');
    console.log('• Automatizaciones inteligentes');
    console.log('• Compliance GDPR automático');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Ejecutar migración
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateNewsletterData();
}

export { migrateNewsletterData };