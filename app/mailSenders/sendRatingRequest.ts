import { getSesTransport, getSesRemitent } from "~/utils/sendGridTransport";

type Props = {
  email: string;
  courseName: string;
  courseSlug: string;
};

const ratingRequestTemplate = ({
  courseName,
  ratingUrl,
}: {
  courseName: string;
  ratingUrl: string;
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>¿Qué te pareció el curso?</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #0f0f0f;">
  <div style="padding: 40px 16px; max-width: 500px; margin: 0 auto; background: #0f0f0f;">
    <img style="max-width: 120px; margin-bottom: 24px;" src="https://i.imgur.com/mpzZhT9.png" alt="FixterGeek" />

    <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 16px 0; font-weight: bold;">
      ¿Qué te pareció el curso?
    </h1>

    <p style="color: #a1a1aa; font-size: 16px; margin: 0 0 24px 0; line-height: 1.6;">
      Hola, completaste el curso <strong style="color: #ffffff;">${courseName}</strong> y nos encantaría saber tu opinión.
    </p>

    <p style="color: #a1a1aa; font-size: 16px; margin: 0 0 32px 0; line-height: 1.6;">
      Tu calificación ayuda a otros estudiantes a decidirse y nos permite mejorar el contenido.
    </p>

    <!-- Star Rating Visual -->
    <div style="text-align: center; margin-bottom: 32px;">
      <p style="font-size: 48px; margin: 0; line-height: 1;">
        ⭐⭐⭐⭐⭐
      </p>
      <p style="color: #71717a; font-size: 14px; margin-top: 8px;">
        Solo toma 30 segundos
      </p>
    </div>

    <!-- CTA Button -->
    <div style="text-align: center; margin-bottom: 32px;">
      <a href="${ratingUrl}"
         style="display: inline-block; background: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: bold;">
        Calificar curso
      </a>
    </div>

    <p style="color: #52525b; font-size: 12px; margin: 0; line-height: 1.6;">
      Si tienes alguna duda o sugerencia, responde a este correo. Te leemos.
    </p>

    <hr style="border: none; border-top: 1px solid #27272a; margin: 32px 0;" />

    <p style="color: #52525b; font-size: 12px; margin: 0; text-align: center;">
      FixterGeek - Aprende a construir productos de software
    </p>
  </div>
</body>
</html>
`;

export const sendRatingRequest = async ({
  email,
  courseName,
  courseSlug,
}: Props) => {
  const ratingUrl = `https://www.fixtergeek.com/cursos/${courseSlug}/rating?email=${encodeURIComponent(email)}`;
  const htmlContent = ratingRequestTemplate({ courseName, ratingUrl });

  return getSesTransport()
    .sendMail({
      from: getSesRemitent(),
      to: email,
      subject: `¿Qué te pareció ${courseName}? ⭐`,
      html: htmlContent,
    })
    .then((result: any) => {
      console.log(`Rating request sent to: ${email} for course: ${courseSlug}`);
      return result;
    })
    .catch((error: any) => {
      console.error(`Error sending rating request to ${email}:`, error);
      throw error;
    });
};
