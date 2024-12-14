export const confirmation = ({ link }: { link: string }) => `
<div style="padding:80px 16px;font-family:sans-serif;font-size:18px;max-width:420px;margin:0 auto;">
  <img style="max-width:220px;margin-bottom:16px;" src="https://i.imgur.com/YPzE4Ks.png" alt="logo" />
  <h2 style="font-size:38px;margin:0;font-size:38px">
    👋🏼 ¡Hola Geek! 🤓
  </h2>
  <p>
    Este es un token para confirmar que eres real. 🤖 <strong>tu sabes que los robots poco a poco se apoderan del planeta 🌎 y necesitamos asegurarnos. 😅</strong> <br /><code style="color:#4b0082;margin-top:4px;display:inline-block;padding:2px 4px;background:#FFD966;border-radius:5px;">Solo da clic en el enlace.</code>
  </p>
  <p>
    <strong>Ahora que sabemos que eres humano, ¡nos vemos en clase!</strong> 🔥
  </p>
  <a href="${link}" style="border-radius:9px;text-decoration:none;background:#FFD966;padding:16px;font-size:18px;margin:32px 0;display:block;max-width:150px;text-align:center;cursor:pointer;color:#4b0082;">
    Confirmar mi cuenta
  </a>
</div>
`;
