import * as dotenv from 'dotenv';
dotenv.config();

import { getSesTransport, getSesRemitent } from './app/utils/sendGridTransport';
import { webinarCongratsTemplate } from './app/mailSenders/templates/webinarCongrats';

async function testEmailSimple() {
  try {
    console.log('📧 Enviando email de prueba simple a contacto@fixter.org...');
    
    const link = `${process.env.BASE_URL || "https://fixtergeek.com"}/mis-cursos`;
    const htmlContent = webinarCongratsTemplate({ 
      link, 
      webinarTitle: 'Claude Code Workshop - PRUEBA', 
      webinarDate: 'Viernes 15 de Agosto, 7:00 PM (CDMX)' 
    });

    const transport = getSesTransport();
    
    const result = await transport.sendMail({
      from: getSesRemitent(),
      to: 'contacto@fixter.org', // Cambiar de bcc a to para test
      subject: `🎉 ¡Registro confirmado! - Claude Code Workshop - PRUEBA`,
      html: htmlContent
    });

    console.log('✅ Email de prueba enviado exitosamente a contacto@fixter.org');
    console.log('📬 Revisa la bandeja de entrada de contacto@fixter.org');
    console.log('📋 ID del mensaje:', result.messageId);
    
  } catch (error) {
    console.error('❌ Error enviando email:', error.message || error);
  }
}

testEmailSimple();