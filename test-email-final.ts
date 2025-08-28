import * as dotenv from 'dotenv';
dotenv.config();

import { sendWebinarCongrats } from './app/mailSenders/sendWebinarCongrats';

async function testEmail() {
  try {
    console.log('📧 Enviando email de prueba a contacto@fixter.org...');
    console.log('🔑 Variables SES configuradas:');
    console.log('- SES_SECRET:', process.env.SES_SECRET ? '✅ Configurada' : '❌ No configurada');
    console.log('- SES_KEY:', process.env.SES_KEY ? '✅ Configurada' : '❌ No configurada');
    console.log('- SES_REGION:', process.env.SES_REGION || 'No configurada');
    console.log('- SES_CONFIGURATION_SET:', process.env.SES_CONFIGURATION_SET || 'No configurada');
    console.log('');
    
    await sendWebinarCongrats({
      to: 'contacto@fixter.org',
      webinarTitle: 'Claude Code Workshop - PRUEBA',
      webinarDate: 'Viernes 15 de Agosto, 7:00 PM (CDMX)',
      userName: 'Usuario de Prueba'
    });
    
    console.log('✅ Email de prueba enviado exitosamente a contacto@fixter.org');
    console.log('📬 Revisa la bandeja de entrada de contacto@fixter.org');
  } catch (error) {
    console.error('❌ Error enviando email:', error.message || error);
  }
}

testEmail();