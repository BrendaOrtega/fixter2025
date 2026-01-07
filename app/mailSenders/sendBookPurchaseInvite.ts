import { getSesTransport, getSesRemitent } from "~/utils/sendGridTransport";
import { BOOK_CONFIG, type BookSlug } from "~/.server/services/book-access.server";

type SendBookPurchaseInviteProps = {
  to: string;
  bookSlug: BookSlug;
};

const bookPurchaseInviteTemplate = ({
  bookTitle,
  bookPrice,
  purchaseUrl,
}: {
  bookTitle: string;
  bookPrice: string;
  purchaseUrl: string;
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Completa tu acceso al libro</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="padding: 40px 16px; max-width: 520px; margin: 0 auto; background: #ffffff;">
    <img style="max-width: 180px; margin-bottom: 24px;" src="https://i.imgur.com/mpzZhT9.png" alt="FixterGeek" />

    <h1 style="font-size: 28px; margin: 0 0 16px 0; color: #1a1a1a;">
      No encontramos tu compra
    </h1>

    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
      Buscamos en nuestros registros pero no encontramos una compra del libro
      <strong>"${bookTitle}"</strong> asociada a este email.
    </p>

    <div style="background: linear-gradient(135deg, #3178C6 0%, #1D4ED8 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <h2 style="color: #ffffff; margin: 0 0 8px 0; font-size: 20px;">
        Obtén acceso completo por solo ${bookPrice}
      </h2>
      <p style="color: #E0E7FF; margin: 0; font-size: 14px;">
        Incluye todos los capítulos + EPUB descargable
      </p>
    </div>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${purchaseUrl}"
         style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #3178C6 0%, #1D4ED8 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
        Comprar libro completo
      </a>
    </div>

    <div style="background: #F0FDF4; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; color: #166534; font-size: 14px;">
        <strong>¿Ya compraste?</strong> Si usaste otro email para la compra,
        intenta buscarlo con ese email. Si sigues teniendo problemas,
        escríbenos a <a href="mailto:brenda@fixter.org" style="color: #3178C6;">brenda@fixter.org</a>
      </p>
    </div>

    <p style="color: #64748B; font-size: 14px; margin: 24px 0;">
      Mientras tanto, puedes leer los capítulos gratuitos en
      <a href="https://www.fixtergeek.com/libros/ai_sdk" style="color: #3B82F6;">fixtergeek.com/libros/ai_sdk</a>
    </p>

    <p style="color: #1a1a1a; margin: 24px 0 8px 0;">
      Saludos,
    </p>
    <p style="color: #64748B; margin: 0;">
      El equipo de FixterGeek
    </p>
  </div>
</body>
</html>
`;

/**
 * Envía un email invitando a comprar el libro cuando no se encuentra una compra
 */
export const sendBookPurchaseInvite = async ({
  to,
  bookSlug,
}: SendBookPurchaseInviteProps) => {
  const config = BOOK_CONFIG[bookSlug];

  if (!config) {
    throw new Error(`Libro no encontrado: ${bookSlug}`);
  }

  const bookPrice = `$${(config.priceUSD / 100).toFixed(0)} USD`;
  const purchaseUrl = `https://www.fixtergeek.com/libros/${config.routePath}`;

  const htmlContent = bookPurchaseInviteTemplate({
    bookTitle: config.title,
    bookPrice,
    purchaseUrl,
  });

  return getSesTransport()
    .sendMail({
      from: getSesRemitent(),
      to: to,
      subject: `No encontramos tu compra de "${config.title}"`,
      html: htmlContent,
    })
    .then((result: any) => {
      console.log(`[Book Purchase Invite] Email enviado a: ${to} para libro: ${bookSlug}`);
      return result;
    })
    .catch((error: any) => {
      console.error(`[Book Purchase Invite] Error enviando email a ${to}:`, error);
      throw error;
    });
};
