import 'dotenv/config';
import { getSesTransport, getSesRemitent } from "./app/utils/sendGridTransport";

async function testSesEmail() {
  console.log("📧 Enviando email de prueba...");
  
  try {
    const result = await getSesTransport().sendMail({
      from: getSesRemitent(),
      to: "fixtergeek@gmail.com",
      subject: "🧪 Prueba de AWS SES - FixterGeek",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #667eea;">✅ AWS SES Funcionando Correctamente</h2>
          <p>Este es un email de prueba enviado desde tu configuración de AWS SES.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <h3>Configuración actual:</h3>
          <ul>
            <li><strong>Región:</strong> ${process.env.SES_REGION || 'us-east-2'}</li>
            <li><strong>Remitente:</strong> ${getSesRemitent()}</li>
            <li><strong>Fecha:</strong> ${new Date().toLocaleString('es-MX')}</li>
          </ul>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666;">
            Los emails del webinar están listos para funcionar en producción.
          </p>
          <p style="margin-top: 30px; color: #999; font-size: 12px;">
            Enviado desde FixterGeek.com
          </p>
        </div>
      `,
      text: "AWS SES funcionando correctamente. Este es un email de prueba."
    });
    
    console.log("✅ Email enviado exitosamente!");
    console.log("📬 Resultado:", result);
    console.log("🎯 Revisa tu bandeja de entrada: fixtergeek@gmail.com");
    
  } catch (error) {
    console.error("❌ Error al enviar el email:", error);
  }
  
  process.exit(0);
}

testSesEmail();