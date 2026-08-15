import jwt from "jsonwebtoken";
import { createHmac, timingSafeEqual } from "crypto";

type TokenData = {
  email: string;
  tags?: string[];
  // Acción a ejecutar al validar el token
  action?: "confirm-subscriber" | "magic-link";
  // Tipo de email de bienvenida a enviar post-confirmación
  welcomeType?: string;
  // Redirect después de la acción
  redirectTo?: string;
};

export const generateUserToken = (data: TokenData) => {
  return jwt.sign(data, process.env.SECRET || "fixtergeek", {
    expiresIn: "1h",
  });
};

export const validateUserToken = (token: string) => {
  try {
    const decoded = jwt.verify(token, process.env.SECRET || "fixtergeek") as {
      email: string;
      tags?: string[];
      action?: "confirm-subscriber" | "magic-link";
      welcomeType?: string;
      redirectTo?: string;
    };
    return {
      isValid: true,
      decoded,
    };
  } catch (e: unknown) {
    console.error(e);
    return {
      isValid: false,
      err: e,
      errorMessage: (e as Error).message,
    };
  }
};

// ==========================================
// Magic Link para descarga de libros (EPUB)
// ==========================================

export type BookDownloadTokenData = {
  email: string;
  bookSlug: string;
  action: "book-download";
};

/**
 * Genera un token firmado para descarga de libro
 * Válido por 30 días
 */
export const generateBookDownloadToken = (
  email: string,
  bookSlug: string
): string => {
  const data: BookDownloadTokenData = {
    email,
    bookSlug,
    action: "book-download",
  };
  return jwt.sign(data, process.env.SECRET || "fixtergeek", {
    expiresIn: "30d",
  });
};

/**
 * Valida un token de descarga de libro
 * Retorna los datos del token o error
 */
export const validateBookDownloadToken = (
  token: string
): {
  isValid: boolean;
  decoded?: BookDownloadTokenData;
  error?: string;
} => {
  try {
    const decoded = jwt.verify(
      token,
      process.env.SECRET || "fixtergeek"
    ) as BookDownloadTokenData;

    // Verificar que sea un token de descarga de libro
    if (decoded.action !== "book-download") {
      return {
        isValid: false,
        error: "Token inválido: no es un token de descarga",
      };
    }

    return {
      isValid: true,
      decoded,
    };
  } catch (e: unknown) {
    const error = e as Error;
    if (error.name === "TokenExpiredError") {
      return {
        isValid: false,
        error: "El enlace ha expirado. Solicita uno nuevo.",
      };
    }
    return {
      isValid: false,
      error: "Enlace inválido",
    };
  }
};

// ==========================================
// Magic Link para suscripción pública a una Secuencia (doble opt-in)
// ==========================================

export type SequenceSubscribeTokenData = {
  email: string;
  sequenceId: string;
  name?: string;
  action: "sequence-subscribe";
};

/**
 * Genera un token firmado para confirmar la suscripción a una secuencia.
 * Válido por 7 días.
 */
export const generateSequenceSubscribeToken = (
  email: string,
  sequenceId: string,
  name?: string
): string => {
  const data: SequenceSubscribeTokenData = {
    email,
    sequenceId,
    name,
    action: "sequence-subscribe",
  };
  return jwt.sign(data, process.env.SECRET || "fixtergeek", {
    expiresIn: "7d",
  });
};

/**
 * Valida un token de suscripción a secuencia.
 */
export const validateSequenceSubscribeToken = (
  token: string
): {
  isValid: boolean;
  decoded?: SequenceSubscribeTokenData;
  error?: string;
} => {
  try {
    const decoded = jwt.verify(
      token,
      process.env.SECRET || "fixtergeek"
    ) as SequenceSubscribeTokenData;

    if (decoded.action !== "sequence-subscribe") {
      return { isValid: false, error: "Token inválido" };
    }

    return { isValid: true, decoded };
  } catch (e: unknown) {
    const error = e as Error;
    if (error.name === "TokenExpiredError") {
      return {
        isValid: false,
        error: "El enlace ha expirado. Solicita uno nuevo.",
      };
    }
    return { isValid: false, error: "Enlace inválido" };
  }
};

// ==========================================
// Token para confirmar el alta en una comunidad
// ==========================================

export type CommunitySubscribeTokenData = {
  email: string;
  communityId: string;
  name?: string;
  action: "community-subscribe";
};

/**
 * Genera un token firmado para confirmar el alta en una comunidad.
 * Válido por 7 días, igual que el de secuencias.
 */
export const generateCommunitySubscribeToken = (
  email: string,
  communityId: string,
  name?: string
): string => {
  const data: CommunitySubscribeTokenData = {
    email,
    communityId,
    name,
    action: "community-subscribe",
  };
  return jwt.sign(data, process.env.SECRET || "fixtergeek", {
    expiresIn: "7d",
  });
};

export const validateCommunitySubscribeToken = (
  token: string
): {
  isValid: boolean;
  decoded?: CommunitySubscribeTokenData;
  error?: string;
} => {
  try {
    const decoded = jwt.verify(
      token,
      process.env.SECRET || "fixtergeek"
    ) as CommunitySubscribeTokenData;

    if (decoded.action !== "community-subscribe") {
      return { isValid: false, error: "Token inválido" };
    }

    return { isValid: true, decoded };
  } catch (e: unknown) {
    const error = e as Error;
    if (error.name === "TokenExpiredError") {
      return {
        isValid: false,
        error: "El enlace ha expirado. Solicita uno nuevo.",
      };
    }
    return { isValid: false, error: "Enlace inválido" };
  }
};

// ==========================================
// Token para ver videos de una secuencia (gating por avance del suscriptor)
// ==========================================

// El enrollmentId identifica; sequenceId y subscriberId son el respaldo. Un
// enrollment puede desaparecer (baja y realta, limpieza, cascada al borrar el
// subscriber) y con solo el id todos los links ya enviados mueren para siempre:
// el correo vive 90 días en la bandeja, la fila de la base no necesariamente.
export type SequenceVideoTokenData = {
  enrollmentId: string;
  sequenceId?: string;
  subscriberId?: string;
  action: "sequence-video";
};

export const generateSequenceVideoToken = (
  enrollmentId: string,
  fallback?: { sequenceId: string; subscriberId: string }
): string => {
  const data: SequenceVideoTokenData = {
    enrollmentId,
    ...fallback,
    action: "sequence-video",
  };
  return jwt.sign(data, process.env.SECRET || "fixtergeek", {
    expiresIn: "90d",
  });
};

export const validateSequenceVideoToken = (
  token: string
): {
  isValid: boolean;
  decoded?: SequenceVideoTokenData;
  error?: string;
} => {
  try {
    const decoded = jwt.verify(
      token,
      process.env.SECRET || "fixtergeek"
    ) as SequenceVideoTokenData;
    if (decoded.action !== "sequence-video") {
      return { isValid: false, error: "Token inválido" };
    }
    return { isValid: true, decoded };
  } catch (e: unknown) {
    const error = e as Error;
    if (error.name === "TokenExpiredError") {
      return { isValid: false, error: "El enlace ha expirado." };
    }
    return { isValid: false, error: "Enlace inválido" };
  }
};

// ==========================================
// Token de acceso desde un correo
//
// Quien recibe una secuencia YA demostró que ese buzón es suyo al confirmarla.
// Volver a pedirle el correo cuando hace clic en un link del propio correo es
// cobrarle dos veces la misma prueba, y ahí se pierde a la gente. Este token
// viaja en los links y lo único que hace es sembrar la cookie de identidad.
// ==========================================

export type AccessTokenData = { email: string; action: "email-access" };

export const generateAccessToken = (email: string): string =>
  jwt.sign({ email, action: "email-access" } as AccessTokenData,
    process.env.SECRET || "fixtergeek",
    { expiresIn: "180d" }
  );

export const validateAccessToken = (
  token: string
): { isValid: boolean; decoded?: AccessTokenData; error?: string } => {
  try {
    const decoded = jwt.verify(
      token,
      process.env.SECRET || "fixtergeek"
    ) as AccessTokenData;
    if (decoded.action !== "email-access") {
      return { isValid: false, error: "Token inválido" };
    }
    return { isValid: true, decoded };
  } catch (e: unknown) {
    const error = e as Error;
    if (error.name === "TokenExpiredError") {
      return { isValid: false, error: "El enlace ha expirado." };
    }
    return { isValid: false, error: "Enlace inválido" };
  }
};

// ==========================================
// Token de baja (unsubscribe) de una secuencia
// ==========================================

export type SequenceUnsubscribeTokenData = {
  enrollmentId: string;
  action: "sequence-unsubscribe";
};

export const generateSequenceUnsubscribeToken = (
  enrollmentId: string
): string => {
  const data: SequenceUnsubscribeTokenData = {
    enrollmentId,
    action: "sequence-unsubscribe",
  };
  return jwt.sign(data, process.env.SECRET || "fixtergeek", {
    expiresIn: "365d",
  });
};

export const validateSequenceUnsubscribeToken = (
  token: string
): {
  isValid: boolean;
  decoded?: SequenceUnsubscribeTokenData;
  error?: string;
} => {
  try {
    const decoded = jwt.verify(
      token,
      process.env.SECRET || "fixtergeek"
    ) as SequenceUnsubscribeTokenData;
    if (decoded.action !== "sequence-unsubscribe") {
      return { isValid: false, error: "Token inválido" };
    }
    return { isValid: true, decoded };
  } catch (e: unknown) {
    return { isValid: false, error: "Enlace inválido" };
  }
};

// ==========================================
// Magic Link para Lead Magnets (descarga de recursos)
// ==========================================

export type LeadMagnetTokenData = {
  email: string;
  slug: string;
  action: "leadmagnet-download";
};

/**
 * Genera un token firmado para descarga de lead magnet
 * Válido por 7 días
 */
export const generateLeadMagnetToken = (
  email: string,
  slug: string
): string => {
  const data: LeadMagnetTokenData = {
    email,
    slug,
    action: "leadmagnet-download",
  };
  return jwt.sign(data, process.env.SECRET || "fixtergeek", {
    expiresIn: "7d",
  });
};

/**
 * Valida un token de descarga de lead magnet
 * Retorna los datos del token o error
 */
export const validateLeadMagnetToken = (
  token: string
): {
  isValid: boolean;
  decoded?: LeadMagnetTokenData;
  error?: string;
} => {
  try {
    const decoded = jwt.verify(
      token,
      process.env.SECRET || "fixtergeek"
    ) as LeadMagnetTokenData;

    // Verificar que sea un token de lead magnet
    if (decoded.action !== "leadmagnet-download") {
      return {
        isValid: false,
        error: "Token inválido: no es un token de descarga",
      };
    }

    return {
      isValid: true,
      decoded,
    };
  } catch (e: unknown) {
    const error = e as Error;
    if (error.name === "TokenExpiredError") {
      return {
        isValid: false,
        error: "El enlace ha expirado. Solicita uno nuevo.",
      };
    }
    return {
      isValid: false,
      error: "Enlace inválido",
    };
  }
};

// ==========================================
// Token de acceso a HLS (playlists y segmentos)
// ==========================================

// A diferencia de los tokens de arriba, este NO es JWT: un JWT pesa ~200 caracteres y
// aquí el token se repite en cada una de las ~450 líneas de la playlist. Un HMAC crudo
// baja eso a ~50 y mantiene la playlist chica (que era justo la razón por la que los
// segmentos se reenviaban por el servidor en vez de redirigir a Tigris).
//
// Se firma la CARPETA, no el segmento: un solo token cubre el video completo.

const HLS_TOKEN_TTL = 6 * 60 * 60; // 6 h — cubre de sobra una sesión larga de video
const HLS_TOKEN_SLOT = 30 * 60; // la expiración se redondea a esto: URLs estables

const signHlsPrefix = (prefix: string, exp: number) =>
  createHmac("sha256", process.env.SECRET || "fixtergeek")
    .update(`${prefix}|${exp}`)
    .digest("base64url")
    .slice(0, 27); // 27 chars ≈ 160 bits, de sobra para esto

/**
 * Genera el token de acceso para todos los archivos bajo `prefix`.
 * `prefix` es la ruta de la carpeta en el bucket, con diagonal final.
 */
export const generateHlsToken = (
  prefix: string,
  ttlSeconds: number = HLS_TOKEN_TTL
): string => {
  // La expiración se redondea a bloques de media hora para que el token —y por lo
  // tanto la URL del video— sea IDÉNTICO entre recargas del loader. Con un `exp`
  // al segundo, cada revalidación de React Router cambiaba la URL, el player
  // destruía y rearmaba HLS, y el video se reiniciaba o se trababa a media
  // reproducción. Peor caso, el token vale ttl − 30 min.
  const now = Math.floor(Date.now() / 1000);
  const exp = Math.ceil((now + ttlSeconds) / HLS_TOKEN_SLOT) * HLS_TOKEN_SLOT;
  return `${exp}.${signHlsPrefix(prefix, exp)}`;
};

/**
 * Valida que el token cubra `path`. El prefijo firmado se deriva del propio `path`
 * (su carpeta), así que un token de un video no sirve para otro.
 */
export const validateHlsToken = (
  token: string | null,
  path: string
): { isValid: boolean; error?: string } => {
  if (!token) return { isValid: false, error: "Falta el token de acceso" };

  const [expRaw, signature] = token.split(".");
  const exp = Number(expRaw);
  if (!signature || !Number.isFinite(exp)) {
    return { isValid: false, error: "Token inválido" };
  }
  if (exp < Math.floor(Date.now() / 1000)) {
    return { isValid: false, error: "El acceso al video expiró" };
  }

  const prefix = path.substring(0, path.lastIndexOf("/") + 1);
  const expected = signHlsPrefix(prefix, exp);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { isValid: false, error: "Token inválido" };
  }
  return { isValid: true };
};
