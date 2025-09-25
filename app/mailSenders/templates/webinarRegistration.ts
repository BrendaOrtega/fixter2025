export const webinarRegistrationTemplate = ({
  webinarTitle = "Webinar Gratuito",
  webinarDate = "Próximamente",
  confirmationLink,
  isConfirmed = false,
}: {
  webinarTitle?: string;
  webinarDate?: string;
  confirmationLink?: string;
  isConfirmed?: boolean;
}) => `
<div style="padding:80px 16px;font-family:sans-serif;font-size:18px;max-width:420px;margin:0 auto;color:#0E1317;">
  <img alt="logo" style="width:160px;" src="https://i.imgur.com/mpzZhT9.png" />
  <h2 style="font-size:32px;margin-top:24px;">
    🎉 ¡Ya estás registrado! ✅
  </h2>
  <p>Tu lugar en el webinar
    <strong style="color:#83F3D3;"> ${webinarTitle} </strong> está reservado.
  </p>
  <p>
    <strong>📬 Te haremos saber la fecha del webinar</strong> una vez que este programado y te enviaremos el enlace de acceso unos días antes de la primera sesión. 🔗
  </p>
  <p>
    <strong>¡No te lo pierdas! 🚀</strong> Será una sesión práctica donde aprenderás herramientas que transformarán tu productividad como profesional.
  </p>
  ${
    (() => {
      console.log(
        "En template - isConfirmed:",
        isConfirmed,
        "confirmationLink:",
        confirmationLink
      );
      return !isConfirmed && confirmationLink;
    })()
      ? `
    <div style="background:#fff3cd;border:1px solid #ffeaa7;border-radius:8px;padding:16px;margin:20px 0;">
      <p style="margin:0;font-size:16px;color:#856404;">
        📧 <strong>Confirma tu email</strong> para asegurar que eres tú quien quiere recibir estos correos. 🥳
      </p>
      <a href="${confirmationLink}" style="border-radius:24px;text-decoration:none;background:#667eea;padding:12px 16px;font-size:16px;margin:12px 0;display:block;max-width:200px;text-align:center;cursor:pointer;color:#fff;">
        Confirmar mi email
      </a>
    </div>
  `
      : ""
  }
  <p style="font-size:14px;color:#666;margin-top:40px;">
    Si tienes alguna pregunta, envía un correo a brenda@fixter.org
  </p>
</div>
`;
