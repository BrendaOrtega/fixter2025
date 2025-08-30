import { data, redirect, type LoaderFunctionArgs } from "react-router";
import { db } from "~/.server/db";
import jwt from "jsonwebtoken";

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const token = params.token;

  if (!token) {
    return redirect("/gemini?error=token_missing");
  }

  try {
    // Verificar el token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { email: string };
    console.log("Token verificado para email:", decoded.email);
    
    // Actualizar el usuario como confirmado
    const user = await db.user.update({
      where: { email: decoded.email },
      data: { confirmed: true }
    });

    console.log("Usuario actualizado:", user?.email, "confirmed:", user?.confirmed);

    if (!user) {
      console.error("Usuario no encontrado para email:", decoded.email);
      return redirect("/gemini?error=user_not_found");
    }

    // Redirigir con éxito
    return redirect("/gemini?confirmed=true");

  } catch (error) {
    console.error("Error confirmando email - Detalles:", error);
    if (error instanceof jwt.JsonWebTokenError) {
      console.error("Error JWT específico:", error.message);
      return redirect("/gemini?error=invalid_token");
    }
    if (error instanceof jwt.TokenExpiredError) {
      console.error("Token expirado");
      return redirect("/gemini?error=token_expired");
    }
    return redirect("/gemini?error=unknown_error");
  }
};

export default function ConfirmarEmail() {
  // Esta página no se renderiza, siempre redirige
  return null;
}