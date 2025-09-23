export const webinarCongratsTemplate = ({
  link,
  webinarTitle = "Claude Workshop",
  webinarDate = "Próximamente"
}: {
  link: string;
  webinarTitle?: string;
  webinarDate?: string;
}) => {
  // Template específico para LlamaIndex
  if (webinarTitle.includes("LlamaIndex")) {
    return `
<div style="padding:80px 16px;font-family:sans-serif;font-size:18px;max-width:420px;margin:0 auto;">
  <img alt="logo" style="width:160px;" src="https://i.imgur.com/mpzZhT9.png" />
  <h2 style="font-size:32px;margin-top:24px;">
    🤖 ¡Registro confirmado! 🦙
  </h2>
  <p>
    <strong>Te has registrado para el curso de Agent Workflows 🚀</strong>
  </p>
  <h3 style="color:#37D7FA;font-size:24px;margin:20px 0;">
    ${webinarTitle}
  </h3>
  <p>
    Serás el primero en saber cuando el <strong>primer video</strong> esté disponible. Prepárate para dominar la creación de agentes inteligentes en TypeScript. 💻⚡
  </p>
  <div style="background:linear-gradient(135deg, #37D7FA 0%, #3E18F9 50%, #FF8DF2 100%);border-radius:12px;padding:16px;margin:24px 0;color:white;text-align:center;box-shadow:0 4px 15px rgba(55, 215, 250, 0.3);">
    <strong>🎯 Contenido premium en desarrollo</strong><br>
    <small>Desde fundamentos hasta sistemas multi-agente</small>
  </div>
  <a href="${link}" style="border-radius:24px;text-decoration:none;background:linear-gradient(135deg, #FF8705 0%, #FF8DF2 100%);padding:12px 16px;font-size:16px;margin:32px 0;display:block;max-width:180px;text-align:center;cursor:pointer;color:white;font-weight:bold;box-shadow:0 4px 12px rgba(255, 135, 5, 0.4);transition:all 0.3s ease;">
    Ir a mi cuenta
  </a>
  <p style="font-size:14px;color:#666;margin-top:40px;">
    ¿Preguntas sobre el curso? Contáctanos en brenda@fixter.org
  </p>
</div>
`;
  }

  // Template original para otros cursos
  return `
<div style="padding:80px 16px;font-family:sans-serif;font-size:18px;max-width:420px;margin:0 auto;">
  <img alt="logo" style="width:160px;" src="https://i.imgur.com/mpzZhT9.png" />
  <h2 style="font-size:32px;margin-top:24px;">
    🎉 ¡Felicitaciones! 🚀
  </h2>
  <p>
    <strong>Ahora puedes disfrutar de tu curso 📼</strong>
  </p>
  <h3 style="color:#83F3D3;font-size:24px;margin:20px 0;">
    ${webinarTitle}
  </h3>
  <p>
    Puedes comenzar a verlo desde tu perfil. Si se programan nuevas sesiones, serás el primero en saberlo. 😎
  </p>
  <a href="${link}" style="border-radius:24px;text-decoration:none;background:#83F3D3;padding:12px 16px;font-size:16px;margin:32px 0;display:block;max-width:180px;text-align:center;cursor:pointer;color:#0E1317;">
    Ir a mi cuenta
  </a>
  <p style="font-size:14px;color:#666;margin-top:40px;">
    Si tienes alguna pregunta, no dudes en contactarnos.
  </p>
</div>
`;
};