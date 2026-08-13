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
