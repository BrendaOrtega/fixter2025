export const webinarCongratsTemplate = ({ 
  link, 
  webinarTitle = "Claude Workshop",
  webinarDate = "Próximamente"
}: { 
  link: string;
  webinarTitle?: string;
  webinarDate?: string;
}) => `
<div style="padding:80px 16px;font-family:sans-serif;font-size:18px;max-width:420px;margin:0 auto;">
  <img alt="logo" style="width:160px;" src="https://i.imgur.com/mpzZhT9.png" />
  <h2 style="font-size:32px;margin-top:24px;">
    🎉 ¡Felicitaciones! 🚀
  </h2>
  <p>
    <strong>Te has registrado exitosamente al webinar:</strong>
  </p>
  <h3 style="color:#83F3D3;font-size:24px;margin:20px 0;">
    ${webinarTitle}
  </h3>
  <p style="margin:20px 0;">
    <strong>📅 Fecha:</strong> ${webinarDate}
  </p>
  <p>
    Recibirás un recordatorio con el link de acceso 24 horas antes del evento.
  </p>
  <p style="margin-top:24px;">
    <strong>Mientras tanto, explora nuestros recursos y prepárate para el webinar:</strong>
  </p>
  <a href="${link}" style="border-radius:24px;text-decoration:none;background:#83F3D3;padding:12px 16px;font-size:16px;margin:32px 0;display:block;max-width:180px;text-align:center;cursor:pointer;color:#0E1317;">
    Ir a mi cuenta
  </a>
  <p style="font-size:14px;color:#666;margin-top:40px;">
    Si tienes alguna pregunta, no dudes en contactarnos.
  </p>
</div>
`;