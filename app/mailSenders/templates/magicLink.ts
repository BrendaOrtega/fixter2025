export const magicLinkTemplate = ({ link }: { link: string }) => `
<div style="padding:80px 16px;font-family:sans-serif;font-size:18px;max-width:420px;margin:0 auto;">
   <img alt="logo" style="width:160px;" src="https://i.imgur.com/mpzZhT9.png" />
 <h2 style="font-size:32px;margin-top:24px;">
    👋🏼 ¡Hola Geek! 🤓
  </h2>
  <p>
    Aquí está tu enlace para iniciar seisón. <strong>Así no tienes que recordar contraseñas.</strong> <br />
  <p>
    <strong>Solo da clic en el enlace y no te olvides de visitar los estrenos.</strong> 🔥
  </p>
  <a href="${link}" style="border-radius:24px;text-decoration:none;background:#83F3D3;padding:12px 16px;font-size:16px;margin:32px 0;display:block;max-width:120px;text-align:center;cursor:pointer;color:#0E1317;">
    Ir a mi cuenta
  </a>
</div>
`;
