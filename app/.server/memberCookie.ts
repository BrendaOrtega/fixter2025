import { createCookie } from "react-router";

/**
 * Identidad ligera del miembro de una comunidad. Quien se une NO es un User
 * con sesión — es un Subscriber que solo dejó su correo. Esta cookie firmada
 * es lo que permite reconocerlo cuando vuelve a /c/:slug y enseñarle su panel
 * en vez del formulario, sin obligarlo a crear cuenta.
 *
 * Guarda el email, no el id: así sirve aunque el subscriber se recree.
 */
export const memberCookie = createCookie("fxg_member", {
  path: "/",
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV !== "development",
  secrets: [process.env.SECRET || "fixtergeek"],
  maxAge: 60 * 60 * 24 * 365,
});

export async function getMemberEmail(request: Request): Promise<string | null> {
  const value = await memberCookie.parse(request.headers.get("Cookie"));
  return typeof value === "string" && value.includes("@") ? value : null;
}

export const setMemberCookie = (email: string) => memberCookie.serialize(email);
