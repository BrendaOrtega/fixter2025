import { getSesRemitent, getSesTransport } from "~/utils/sesTransport";

interface BackupNotificationParams {
  to: string;
  status: "success" | "failed";
  filename: string;
  s3Key: string;
  sizeBytes?: number;
  downloadUrl?: string;
  errorMessage?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function getSuccessHtml(params: BackupNotificationParams): string {
  const { filename, s3Key, sizeBytes, downloadUrl } = params;
  const date = new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">Backup Completado</h1>
    <p style="margin: 10px 0 0; opacity: 0.9;">${date}</p>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="margin: 0 0 20px; font-size: 16px;">
      El backup semanal de la base de datos de FixterGeek se completó exitosamente.
    </p>

    <div style="background: white; border-radius: 8px; padding: 20px; border: 1px solid #e5e7eb; margin-bottom: 20px;">
      <h3 style="margin: 0 0 15px; color: #374151; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Detalles del Backup</h3>

      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Archivo:</td>
          <td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 13px;">${filename}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Tamaño:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${formatBytes(sizeBytes || 0)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Ubicación S3:</td>
          <td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 12px; word-break: break-all;">${s3Key}</td>
        </tr>
      </table>
    </div>

    ${downloadUrl ? `
    <div style="text-align: center; margin: 25px 0;">
      <a href="${downloadUrl}"
         style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">
        Descargar Backup
      </a>
      <p style="margin: 10px 0 0; font-size: 12px; color: #6b7280;">
        Este enlace expira en 7 días
      </p>
    </div>
    ` : ""}

    <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center;">
      <p style="margin: 0;">
        Este es un correo automático de FixterGeek.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

function getFailedHtml(params: BackupNotificationParams): string {
  const { filename, errorMessage } = params;
  const date = new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">Backup Fallido</h1>
    <p style="margin: 10px 0 0; opacity: 0.9;">${date}</p>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="margin: 0 0 20px; font-size: 16px;">
      El backup semanal de la base de datos de FixterGeek falló y requiere atención.
    </p>

    <div style="background: #fef2f2; border-radius: 8px; padding: 20px; border: 1px solid #fecaca; margin-bottom: 20px;">
      <h3 style="margin: 0 0 15px; color: #991b1b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Error</h3>

      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Archivo:</td>
          <td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 13px;">${filename}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding: 12px 0 0;">
            <div style="background: white; border-radius: 4px; padding: 12px; font-family: monospace; font-size: 12px; color: #dc2626; word-break: break-all; border: 1px solid #fecaca;">
              ${errorMessage || "Error desconocido"}
            </div>
          </td>
        </tr>
      </table>
    </div>

    <div style="background: #fffbeb; border-radius: 8px; padding: 15px; border: 1px solid #fde68a;">
      <p style="margin: 0; font-size: 14px; color: #92400e;">
        <strong>Acción requerida:</strong> Revisa los logs del servidor y ejecuta un backup manual desde el panel de admin.
      </p>
    </div>

    <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center;">
      <p style="margin: 0;">
        Este es un correo automático de FixterGeek.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

export const sendBackupNotification = async (params: BackupNotificationParams) => {
  const { to, status, filename } = params;

  const subject =
    status === "success"
      ? `Backup completado: ${filename}`
      : `Backup FALLIDO: ${filename}`;

  const html = status === "success" ? getSuccessHtml(params) : getFailedHtml(params);

  return getSesTransport()
    .sendMail({
      from: getSesRemitent(),
      subject,
      to,
      html,
    })
    .then((result: unknown) => {
      console.info(`[BACKUP EMAIL] Notificación enviada a ${to}`);
      return result;
    })
    .catch((e: Error) => {
      console.error(`[BACKUP EMAIL] Error enviando a ${to}:`, e.message);
    });
};
