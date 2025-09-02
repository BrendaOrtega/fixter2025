#!/usr/bin/env npx tsx

/**
 * Script para simular y probar la lógica de threshold de webinar
 */

import { db } from "../app/.server/db";

async function testThresholdLogic() {
  console.log('🧪 Simulando lógica de threshold de webinar...\n');

  try {
    // Simular conteo de registros con tag gemini_webinar_solicitud
    console.log('📊 Contando usuarios con tag "gemini_webinar_solicitud"...');
    
    const registrationCount = await db.user.count({
      where: {
        tags: {
          has: "gemini_webinar_solicitud"
        }
      }
    });

    console.log(`📈 Registros actuales: ${registrationCount}`);
    console.log(`🎯 Meta requerida: 12`);

    if (registrationCount >= 12) {
      console.log('✅ ¡Meta alcanzada o superada!');
      console.log('📧 En producción se enviaría notificación a brenda@fixter.org');
      console.log('📝 Contenido del email:');
      console.log(`   - Tipo: Gemini CLI`);
      console.log(`   - Registros: ${registrationCount}`);
      console.log(`   - Threshold: 12`);
      console.log(`   - Admin URL: ${process.env.BASE_URL || "https://fixtergeek.com"}/admin/webinar`);
    } else {
      console.log(`⏳ Aún faltan ${12 - registrationCount} registros para alcanzar la meta`);
    }
    
  } catch (error) {
    console.error('❌ Error simulando threshold:', error);
  } finally {
    await db.$disconnect();
  }
}

testThresholdLogic();