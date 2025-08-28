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