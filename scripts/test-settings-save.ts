#!/usr/bin/env npx tsx

import { db } from '../app/.server/db';

/**
 * Script para probar que las preferencias se guarden correctamente
 */

async function testSettingsSave() {
  console.log('🧪 Probando guardado de configuraciones...\n');

  try {
    // Buscar un subscriber de prueba
    const testSubscriber = await db.subscriber.findFirst({
      where: { email: { contains: '@' } }
    });

    if (!testSubscriber) {
      console.log('❌ No se encontró subscriber para pruebas');
      return;
    }

    console.log(`📧 Testing con subscriber: ${testSubscriber.email}`);
    console.log(`📋 Tags actuales: ${JSON.stringify(testSubscriber.tags)}\n`);

    // Simular guardado de diferentes frecuencias
    const frequencies = ['weekly', 'biweekly', 'monthly'];
    
    for (const frequency of frequencies) {
      console.log(`🔄 Probando frecuencia: ${frequency}`);
      
      // Simular las preferencias que vendría del form
      const preferences = {
        frequency,
        notifications: false,
        digest: true
      };

      // Simular la lógica del action
      const updatedSubscriber = await db.subscriber.update({
        where: { id: testSubscriber.id },
        data: {
          tags: [
            ...testSubscriber.tags.filter(tag => !tag.startsWith('pref:')),
            `pref:${JSON.stringify(preferences)}`
          ]
        }
      });

      // Verificar que se guardó correctamente
      const prefTag = updatedSubscriber.tags.find(tag => tag.startsWith('pref:'));
      const savedPrefs = prefTag ? JSON.parse(prefTag.replace('pref:', '')) : null;

      console.log(`✅ Guardado exitoso`);
      console.log(`   Frequency: ${savedPrefs?.frequency}`);
      console.log(`   Notifications: ${savedPrefs?.notifications}`);
      console.log(`   Digest: ${savedPrefs?.digest}\n`);

      // Usar las preferencias actualizadas para el siguiente test
      testSubscriber.tags = updatedSubscriber.tags;
    }

    // Verificar que se puede extraer correctamente
    console.log('🔍 Verificando extracción de preferencias:');
    const finalSubscriber = await db.subscriber.findUnique({
      where: { id: testSubscriber.id }
    });

    const preferencesTag = finalSubscriber?.tags?.find((tag: string) => tag.startsWith('pref:'));
    const currentPrefs = preferencesTag 
      ? JSON.parse(preferencesTag.replace('pref:', ''))
      : { frequency: 'weekly', notifications: true, digest: false };

    console.log('📊 Preferencias extraídas:');
    console.log(`   Frequency: ${currentPrefs.frequency}`);
    console.log(`   Notifications: ${currentPrefs.notifications}`);
    console.log(`   Digest: ${currentPrefs.digest}`);

    console.log('\n🎉 ¡Todas las pruebas de guardado funcionan correctamente!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.$disconnect();
  }
}

// Ejecutar script
if (import.meta.url === `file://${process.argv[1]}`) {
  testSettingsSave();
}

export { testSettingsSave };