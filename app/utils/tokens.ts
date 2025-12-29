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
