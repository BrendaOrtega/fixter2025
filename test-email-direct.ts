import * as dotenv from 'dotenv';
dotenv.config();

import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { webinarCongratsTemplate } from './app/mailSenders/templates/webinarCongrats';

async function testEmailDirect() {
  try {
    console.log('📧 Enviando email de prueba directo con SES a contacto@fixter.org...');
    
    const sesClient = new SESClient({
      region: process.env.SES_REGION || "us-east-2",
      credentials: {
        accessKeyId: process.env.SES_KEY,
        secretAccessKey: process.env.SES_SECRET,
      },
    });

    const link = `${process.env.BASE_URL || "https://fixtergeek.com"}/mis-cursos`;
    const htmlContent = webinarCongratsTemplate({ 
      link, 
      webinarTitle: 'Claude Code Workshop - PRUEBA', 
      webinarDate: 'Viernes 15 de Agosto, 7:00 PM (CDMX)' 
    });

    const params = {
      Destination: {
        ToAddresses: ['contacto@fixter.org'],
      },
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: htmlContent,
          },
        },
        Subject: {
          Charset: 'UTF-8',
          Data: '🎉 ¡Registro confirmado! - Claude Code Workshop - PRUEBA',
        },
      },
      Source: 'fixtergeek@gmail.com', // Email verificado en SES
    };

    const command = new SendEmailCommand(params);
    const result = await sesClient.send(command);

    console.log('✅ Email de prueba enviado exitosamente a contacto@fixter.org');
    console.log('📬 Revisa la bandeja de entrada de contacto@fixter.org');
    console.log('📋 ID del mensaje:', result.MessageId);
    
  } catch (error) {
    console.error('❌ Error enviando email:', error.message || error);
    console.error('Detalles del error:', error);
  }
}

testEmailDirect();