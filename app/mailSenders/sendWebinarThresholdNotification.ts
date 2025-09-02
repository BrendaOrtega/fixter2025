import { getSesTransport, getSesRemitent } from "~/utils/sendGridTransport";

type WebinarThresholdNotificationProps = {
  webinarType: string;
  registrationCount: number;
  threshold: number;
};

export const sendWebinarThresholdNotification = async ({
  webinarType,
  registrationCount,
  threshold,
}: WebinarThresholdNotificationProps) => {
  const htmlContent = `
    <div style="padding: 40px 20px; font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 30px; color: white; margin-bottom: 30px;">
        <h1 style="margin: 0; font-size: 24px;">🎯 Meta de Registros Alcanzada</h1>
      </div>
      
      <div style="background: #f8f9fa; border-radius: 8px; padding: 25px; margin-bottom: 25px;">
        <h2 style="color: #333; margin-top: 0;">📊 Detalles del Webinar</h2>
        <div style="display: grid; gap: 15px;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: white; border-radius: 6px; border-left: 4px solid #28a745;">
            <span style="font-weight: 600; color: #666;">Tipo de Webinar:</span>
            <span style="font-weight: 700; color: #333;">${webinarType}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: white; border-radius: 6px; border-left: 4px solid #007bff;">
            <span style="font-weight: 600; color: #666;">Registros Actuales:</span>
            <span style="font-weight: 700; color: #007bff;">${registrationCount}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: white; border-radius: 6px; border-left: 4px solid #ffc107;">
            <span style="font-weight: 600; color: #666;">Meta Requerida:</span>
            <span style="font-weight: 700; color: #ffc107;">${threshold}</span>
          </div>
        </div>
      </div>

      <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
        <h3 style="color: #155724; margin-top: 0;">✅ Acción Requerida</h3>
        <p style="color: #155724; margin: 0; font-size: 16px;">
          El webinar de <strong>${webinarType}</strong> ha alcanzado los <strong>${threshold} registros</strong> necesarios. 
          Es hora de programar la fecha y enviar las confirmaciones a los participantes.
        </p>
      </div>

      <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
        <h3 style="color: #856404; margin-top: 0;">📋 Próximos Pasos</h3>
        <ol style="color: #856404; margin: 0; padding-left: 20px;">
          <li style="margin-bottom: 8px;">Definir fecha y hora del webinar</li>
          <li style="margin-bottom: 8px;">Configurar la sala virtual (Zoom/Meet)</li>
          <li style="margin-bottom: 8px;">Actualizar los emails de confirmación</li>
          <li style="margin-bottom: 8px;">Enviar notificaciones a los registrados</li>
        </ol>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.BASE_URL || "https://fixtergeek.com"}/admin/webinar" 
           style="background: #667eea; color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
          👀 Ver Registrados en Admin
        </a>
      </div>

      <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
        <p style="margin: 0;">
          Este email se envió automáticamente desde el sistema de webinars de FixterGeek.<br>
          <strong>Timestamp:</strong> ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}
        </p>
      </div>
    </div>
  `;

  return getSesTransport()
    .sendMail({
      from: getSesRemitent(),
      to: "brenda@fixter.org",
      subject: `🎯 META ALCANZADA: ${webinarType} - ${registrationCount} registros`,
      html: htmlContent
    })
    .then((result: any) => {
      console.log(`✅ Webinar threshold notification sent to brenda@fixter.org for ${webinarType}`);
      return result;
    })
    .catch((error: any) => {
      console.error(`❌ Error sending webinar threshold notification:`, error);
      throw error;
    });
};