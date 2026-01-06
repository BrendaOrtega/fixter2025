import { getSesTransport, getSesRemitent } from "~/utils/sendGridTransport";
import { generateBookDownloadToken } from "~/utils/tokens";
import { BOOK_CONFIG, type BookSlug } from "~/.server/services/book-access.server";

type SendBookDownloadLinkProps = {
  to: string;
  bookSlug: BookSlug;
  userName?: string;
};

const bookDownloadTemplate = ({
  userName,
  bookTitle,
  downloadUrl,
}: {
  userName?: string;
  bookTitle: string;
  downloadUrl: string;
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Tu libro esta listo para descargar</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="padding: 40px 16px; max-width: 520px; margin: 0 auto; background: #ffffff;">
    <img style="max-width: 180px; margin-bottom: 24px;" src="https://i.imgur.com/mpzZhT9.png" alt="FixterGeek" />

    <h1 style="font-size: 28px; margin: 0 0 16px 0; color: #1a1a1a;">
      ${userName ? `Hola ${userName}` : "Hola"}
    </h1>

    <div style="background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <h2 style="color: #ffffff; margin: 0 0 8px 0; font-size: 20px;">
        Tu compra de "${bookTitle}" esta confirmada
      </h2>
      <p style="color: #E0E7FF; margin: 0; font-size: 14px;">
        Ya puedes descargar tu EPUB
      </p>
    </div>

    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
      Gracias por tu compra. Tu libro digital esta listo para descargar.
      Haz clic en el boton de abajo para obtener tu EPUB.
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${downloadUrl}"
         style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
        Descargar EPUB
      </a>
    </div>

    <div style="background: #FEF3C7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; color: #92400E; font-size: 14px;">
        <strong>Importante:</strong> Este enlace es valido por 30 dias.
        Si expira, puedes solicitar uno nuevo desde la pagina del libro.
      </p>
    </div>

    <p style="color: #64748B; font-size: 14px; margin: 24px 0;">
      Tambien puedes leer el libro completo en linea en
      <a href="https://www.fixtergeek.com/libros/ai_sdk" style="color: #3B82F6;">fixtergeek.com/libros/ai_sdk</a>
    </p>

    <p style="color: #64748B; font-size: 14px; margin: 24px 0;">
      Si tienes alguna pregunta, no dudes en escribirnos a
      <a href="mailto:brenda@fixter.org" style="color: #3B82F6;">brenda@fixter.org</a>
    </p>

    <p style="color: #1a1a1a; margin: 24px 0 8px 0;">
      Gracias por apoyar nuestro trabajo
    </p>
    <p style="color: #64748B; margin: 0;">
      El equipo de FixterGeek
    </p>
  </div>
</body>
</html>
`;

/**
 * Envía un email con el magic link para descargar el EPUB de un libro comprado
 */
export const sendBookDownloadLink = async ({
  to,
  bookSlug,
  userName,
}: SendBookDownloadLinkProps) => {
  const config = BOOK_CONFIG[bookSlug];

  if (!config) {
    throw new Error(`Libro no encontrado: ${bookSlug}`);
  }

  // Generar token válido por 30 días
  const token = generateBookDownloadToken(to, bookSlug);
  const downloadUrl = `https://www.fixtergeek.com/api/book-epub?book=${bookSlug}&token=${token}`;

  const htmlContent = bookDownloadTemplate({
    userName,
    bookTitle: config.title,
    downloadUrl,
  });

  return getSesTransport()
    .sendMail({
      from: getSesRemitent(),
      bcc: to,
      subject: `Tu libro "${config.title}" esta listo para descargar`,
      html: htmlContent,
    })
    .then((result: any) => {
      console.log(`[Book Download] Email enviado a: ${to} para libro: ${bookSlug}`);
      return result;
    })
    .catch((error: any) => {
      console.error(`[Book Download] Error enviando email a ${to}:`, error);
      throw error;
    });
};
