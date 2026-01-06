import { redirect, data } from "react-router";
import { db } from "~/.server/db";
import { getUserOrNull, checkSubscriptionByEmail } from "~/.server/dbGetters";
import { sendVerificationCode } from "~/mailSenders/sendVerificationCode";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Cookie name for subscriber email
export const SUBSCRIBER_COOKIE = "fixtergeek_subscriber";

// Configuración centralizada de libros
export const BOOK_CONFIG = {
  "ai-sdk": {
    title: "AI SDK con React Router v7",
    priceUSD: 1500, // centavos USD ($15)
    priceMXN: 24900, // centavos MXN ($249)
    chaptersCount: 12, // 12 capítulos + prólogo + intro
    contentPath: "ai-sdk",
    routePath: "ai_sdk", // ruta con underscore
    // EPUB protegido en S3 (requiere compra)
    epubS3Key: "fixtergeek/books/ai-sdk.epub",
    epubFilename: "ai-sdk-react-router.epub",
    epubPublicPath: null, // No tiene versión pública
  },
  "domina-claude-code": {
    title: "Dominando Claude Code",
    priceUSD: 2500, // centavos USD ($25)
    priceMXN: 49900, // centavos MXN ($499)
    chaptersCount: 14,
    contentPath: "libro",
    routePath: "domina_claude_code",
    // EPUB público (descarga libre)
    epubS3Key: null,
    epubFilename: "dominando-claude-code.epub",
    epubPublicPath: "/dominando-claude-code.epub",
  },
  "llamaindex": {
    title: "Agent Workflows de LlamaIndex",
    priceUSD: 2000, // centavos USD ($20)
    priceMXN: 39900, // centavos MXN ($399)
    chaptersCount: 9,
    contentPath: "llamaindex",
    routePath: "llamaindex",
    // EPUB público (descarga libre)
    epubS3Key: null,
    epubFilename: "llamaindex-workflows.epub",
    epubPublicPath: "/llamaindex-workflows.epub",
  },
} as const;

export type BookSlug = keyof typeof BOOK_CONFIG;

// Types
export interface BookAccessData {
  hasAccess: boolean;
  accessLevel: string;
  isSubscribed: boolean;
  isPurchased: boolean;
  hasFullAccess: boolean;
  showSubscriptionDrawer: boolean;
  showPurchaseDrawer: boolean;
  userEmail: string | null;
}

export interface ChapterAccessInfo {
  [chapterSlug: string]: {
    accessLevel: string;
    isLocked: boolean;
  };
}

// Helper para extraer email del cookie
function getSubscriberEmailFromCookie(request: Request): string | null {
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader
    .split(";")
    .find((c) => c.trim().startsWith(`${SUBSCRIBER_COOKIE}=`));
  if (!match) return null;
  const encoded = match.split("=")[1];
  return encoded ? decodeURIComponent(encoded) : null;
}

/**
 * Obtiene datos de acceso para un capítulo específico de un libro
 */
export async function getBookAccessData(
  request: Request,
  bookSlug: BookSlug,
  chapterSlug: string
): Promise<BookAccessData> {
  // Get user if logged in
  const user = await getUserOrNull(request);

  // Check subscription from cookie
  const subscriberEmail = getSubscriberEmailFromCookie(request);
  let isSubscribed = false;
  if (subscriberEmail) {
    isSubscribed = await checkSubscriptionByEmail(subscriberEmail, bookSlug);
  }

  // Check if user purchased the book
  const isPurchased = user?.books?.includes(bookSlug) || false;

  // Get access level for this chapter
  const chapterAccess = await db.bookChapterAccess.findUnique({
    where: {
      bookSlug_chapterSlug: {
        bookSlug,
        chapterSlug,
      },
    },
  });
  const accessLevel = chapterAccess?.accessLevel || "public";

  // Determine if user has access
  const hasAccess =
    isPurchased ||
    accessLevel === "public" ||
    (accessLevel === "subscriber" && isSubscribed);

  // Has full access (for EPUB download)
  const hasFullAccess = isPurchased;

  console.log(`[Book Access] ${bookSlug}/${chapterSlug}:`, {
    accessLevel,
    isSubscribed,
    isPurchased,
    hasAccess,
    subscriberEmail: subscriberEmail || "NO COOKIE",
    userEmail: user?.email || "NO USER",
    showSubscriptionDrawer: !hasAccess && accessLevel === "subscriber",
    showPurchaseDrawer: !hasAccess && accessLevel === "paid",
  });

  return {
    hasAccess,
    accessLevel,
    isSubscribed,
    isPurchased,
    hasFullAccess,
    showSubscriptionDrawer: !hasAccess && accessLevel === "subscriber",
    showPurchaseDrawer: !hasAccess && accessLevel === "paid",
    userEmail: user?.email || subscriberEmail || null,
  };
}

/**
 * Obtiene los niveles de acceso de TODOS los capítulos de un libro
 * Útil para mostrar candados en la tabla de contenidos
 */
export async function getAllChaptersAccessInfo(
  request: Request,
  bookSlug: BookSlug
): Promise<ChapterAccessInfo> {
  // Get user and subscription status
  const user = await getUserOrNull(request);
  const subscriberEmail = getSubscriberEmailFromCookie(request);
  const isSubscribed = subscriberEmail
    ? await checkSubscriptionByEmail(subscriberEmail, bookSlug)
    : false;
  const isPurchased = user?.books?.includes(bookSlug) || false;

  // Get all chapter access records for this book
  const allAccess = await db.bookChapterAccess.findMany({
    where: { bookSlug },
  });

  // Build the access info map
  const accessInfo: ChapterAccessInfo = {};
  for (const record of allAccess) {
    const level = record.accessLevel || "public";
    const hasAccess =
      isPurchased ||
      level === "public" ||
      (level === "subscriber" && isSubscribed);

    accessInfo[record.chapterSlug] = {
      accessLevel: level,
      isLocked: !hasAccess,
    };
  }

  return accessInfo;
}

/**
 * Maneja el checkout de Stripe para comprar un libro
 * Usa USD por defecto para audiencia internacional
 */
export async function handleBookCheckout(
  request: Request,
  bookSlug: BookSlug,
  currencyOverride?: string
): Promise<Response> {
  const config = BOOK_CONFIG[bookSlug];
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const url = new URL(request.url);
  const origin = url.origin;

  // Recordar el capítulo actual para redirigir después del pago
  const currentChapter = url.searchParams.get("chapter");
  const chapterParam = currentChapter ? `&chapter=${currentChapter}` : "";

  // Permitir elegir moneda via parámetro o query param
  const currencyParam = currencyOverride || url.searchParams.get("currency")?.toLowerCase();
  const currency = currencyParam === "mxn" ? "mxn" : "usd";
  const price = currency === "mxn" ? config.priceMXN : config.priceUSD;

  const session = await stripe.checkout.sessions.create({
    metadata: {
      type: "book-purchase",
      bookSlug,
    },
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency,
          product_data: {
            name: `Libro: ${config.title}`,
            description:
              "Libro completo en formato digital con todos los capítulos y EPUB descargable",
          },
          unit_amount: price,
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/libros/${config.routePath}?success=1${chapterParam}`,
    cancel_url: `${origin}/libros/${config.routePath}?${currentChapter ? `chapter=${currentChapter}` : ""}`,
  });

  return redirect(session.url!);
}

/**
 * Maneja la suscripción (envío de código OTP)
 */
export async function handleBookSubscribe(
  email: string,
  bookSlug: BookSlug
): Promise<{ success: boolean; step?: string; error?: string }> {
  if (!email) {
    return { success: false, error: "Email requerido" };
  }

  const tag = `${bookSlug}-free-access`;

  // Create or update subscriber
  await db.subscriber.upsert({
    where: { email },
    create: {
      email,
      confirmed: false,
      tags: [tag],
    },
    update: {},
  });

  // Generate and save verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  await db.subscriber.update({
    where: { email },
    data: { verificationCode: code },
  });

  // Send verification email
  await sendVerificationCode(email, code);

  return { success: true, step: "verify" };
}

/**
 * Maneja la verificación del código OTP
 */
export async function handleBookVerify(
  email: string,
  code: string,
  bookSlug: BookSlug
): Promise<{
  success: boolean;
  verified?: boolean;
  error?: string;
  headers?: Headers;
}> {
  const tag = `${bookSlug}-free-access`;

  const subscriber = await db.subscriber.findUnique({
    where: { email },
  });

  if (!subscriber || subscriber.verificationCode !== code) {
    return { success: false, error: "Código inválido" };
  }

  // Confirm and add tag (solo si no existe)
  const newTags = subscriber.tags.includes(tag)
    ? subscriber.tags
    : [...subscriber.tags, tag];

  await db.subscriber.update({
    where: { email },
    data: {
      confirmed: true,
      verificationCode: null,
      tags: newTags,
    },
  });

  // Set cookie
  const headers = new Headers();
  headers.append(
    "Set-Cookie",
    `${SUBSCRIBER_COOKIE}=${encodeURIComponent(email)}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`
  );

  return { success: true, verified: true, headers };
}

/**
 * Obtiene la URL de descarga del EPUB de un libro
 * - Libros con epubPublicPath: devuelve la ruta pública (sin verificación)
 * - Libros con epubS3Key: genera presigned URL (solo para compradores)
 */
export async function getEpubDownloadUrl(
  request: Request,
  bookSlug: BookSlug
): Promise<{ success: boolean; url?: string; isPublic?: boolean; error?: string }> {
  const config = BOOK_CONFIG[bookSlug];

  // Si tiene ruta pública, devolverla directamente
  if (config.epubPublicPath) {
    return {
      success: true,
      url: config.epubPublicPath,
      isPublic: true,
    };
  }

  // Si está en S3, verificar compra y generar presigned URL
  if (!config.epubS3Key) {
    return { success: false, error: "EPUB no disponible para este libro" };
  }

  // Verify user has purchased the book
  const user = await getUserOrNull(request);
  const isPurchased = user?.books?.includes(bookSlug) || false;

  if (!isPurchased) {
    return {
      success: false,
      error: "Necesitas comprar el libro para descargar el EPUB",
    };
  }

  try {
    // Create S3 client
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || "auto",
      endpoint: process.env.AWS_ENDPOINT_URL_S3,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true,
    });

    // Generate presigned URL (valid for 1 hour)
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET || "wild-bird-2039",
      Key: config.epubS3Key,
      ResponseContentDisposition: `attachment; filename="${config.epubFilename}"`,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // 1 hour
    });

    console.log(`[EPUB Download] Generated presigned URL for ${bookSlug}`, {
      user: user?.email,
      epubKey: config.epubS3Key,
    });

    return { success: true, url: presignedUrl, isPublic: false };
  } catch (error) {
    console.error("[EPUB Download] Error generating presigned URL:", error);
    return { success: false, error: "Error generando URL de descarga" };
  }
}
