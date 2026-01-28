import jwt from "jsonwebtoken";

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
