#!/usr/bin/env npx tsx

import { db } from '../app/.server/db';

/**
 * Script para verificar el estado actual de los datos antes de la migración
 */

async function checkMigrationStatus() {
  console.log('🔍 Verificando estado actual del sistema Newsletter...\n');

  try {
    // 1. Verificar Newsletters
    console.log('📧 NEWSLETTERS:');
    const newsletters = await db.newsletter.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        subject: true,
        fromName: true,
        fromEmail: true,
        analytics: true,
      }
    });
    
    console.log(`Total: ${newsletters.length}`);
    
    const needsMigration = newsletters.filter(n => !n.subject || !n.fromName || !n.fromEmail);
    console.log(`Necesitan migración: ${needsMigration.length}`);
    
    const withAnalytics = newsletters.filter(n => n.analytics).length;
    console.log(`Con analytics: ${withAnalytics}`);
    console.log(`Sin analytics: ${newsletters.length - withAnalytics}\n`);

    // 2. Verificar Subscribers
    console.log('👥 SUBSCRIBERS:');
    const subscribers = await db.subscriber.findMany({
      select: {
        id: true,
        email: true,
        status: true,
        confirmed: true,
        engagementScore: true,
        preferences: true,
        firstName: true,
        lastName: true,
      }
    });
    
    console.log(`Total: ${subscribers.length}`);
    
    const confirmedSubscribers = subscribers.filter(s => s.confirmed).length;
    console.log(`Confirmados: ${confirmedSubscribers}`);
    
    const withStatus = subscribers.filter(s => s.status && s.status !== null).length;
    console.log(`Con status migrado: ${withStatus}`);
    
    const withEngagement = subscribers.filter(s => s.engagementScore !== null && s.engagementScore !== undefined).length;
    console.log(`Con engagement score: ${withEngagement}`);
    
    const withPreferences = subscribers.filter(s => s.preferences).length;
    console.log(`Con preferencias: ${withPreferences}\n`);

    // 3. Verificar Audiencias
    console.log('🎯 AUDIENCIAS:');
    const audiences = await db.audience.count();
    console.log(`Total: ${audiences}\n`);

    // 4. Verificar Analytics
    console.log('📊 ANALYTICS:');
    const analytics = await db.newsletterAnalytics.count();
    console.log(`Total: ${analytics}\n`);

    // 5. Verificar Templates
    console.log('🎨 TEMPLATES:');
    const templates = await db.template.count();
    console.log(`Total: ${templates}\n`);

    // 6. Verificar Secuencias
    console.log('🔄 SECUENCIAS:');
    const sequences = await db.sequence.count();
    console.log(`Total: ${sequences}\n`);

    // 7. Resumen
    console.log('📋 RESUMEN DE MIGRACIÓN NECESARIA:');
    
    const migrationNeeded = 
      needsMigration.length > 0 || 
      withStatus < subscribers.length ||
      withEngagement < subscribers.length ||
      withPreferences < subscribers.length ||
      audiences === 0;
    
    if (migrationNeeded) {
      console.log('⚠️  MIGRACIÓN REQUERIDA');
      console.log('\nTareas pendientes:');
      
      if (needsMigration.length > 0) {
        console.log(`• Migrar ${needsMigration.length} newsletters`);
      }
      
      if (withStatus < subscribers.length) {
        console.log(`• Actualizar status de ${subscribers.length - withStatus} subscribers`);
      }
      
      if (withEngagement < subscribers.length) {
        console.log(`• Inicializar engagement score de ${subscribers.length - withEngagement} subscribers`);
      }
      
      if (withPreferences < subscribers.length) {
        console.log(`• Crear preferencias para ${subscribers.length - withPreferences} subscribers`);
      }
      
      if (audiences === 0) {
        console.log('• Crear audiencia por defecto');
      }
      
      console.log('\n🚀 Ejecuta: npm run migrate:newsletter');
      
    } else {
      console.log('✅ NO SE REQUIERE MIGRACIÓN');
      console.log('Tu sistema ya está actualizado al nuevo modelo.');
    }

  } catch (error) {
    console.error('❌ Error verificando estado:', error);
  } finally {
    await db.$disconnect();
  }
}

// Ejecutar verificación
if (import.meta.url === `file://${process.argv[1]}`) {
  checkMigrationStatus();
}

export { checkMigrationStatus };