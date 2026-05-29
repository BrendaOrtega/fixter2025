import disposableList from "disposable-email-domains";

// Lista comunitaria (~121k dominios desechables) cargada una vez.
const disposableSet = new Set(disposableList as string[]);

// Dominios desechables/bot observados que NO están en la lista comunitaria.
// Agregar aquí los que veamos en suscriptores basura.
const CUSTOM_DISPOSABLE = new Set([
  "wshu.net",
  "cloneiostrau.org",
  "hotrokh.com",
]);

/**
 * Decide si un email de signup debe bloquearse (bot/desechable).
 * - dominios desechables (lista comunitaria + custom)
 * - truco de puntos en gmail (misma cuenta, muchas variaciones)
 */
export function checkSignupEmail(email: string): {
  blocked: boolean;
  reason?: string;
} {
  const e = (email || "").toLowerCase().trim();
  const at = e.lastIndexOf("@");
  if (at < 1) return { blocked: true, reason: "invalid" };
  const local = e.slice(0, at);
  const domain = e.slice(at + 1);

  if (disposableSet.has(domain) || CUSTOM_DISPOSABLE.has(domain)) {
    return { blocked: true, reason: "disposable" };
  }

  if (
    (domain === "gmail.com" || domain === "googlemail.com") &&
    (local.match(/\./g) || []).length >= 3
  ) {
    return { blocked: true, reason: "gmail-dots" };
  }

  return { blocked: false };
}

/**
 * Normaliza un email para dedupe (gmail ignora puntos y +alias).
 */
export function normalizeEmail(email: string): string {
  const e = (email || "").toLowerCase().trim();
  const at = e.lastIndexOf("@");
  if (at < 1) return e;
  const local = e.slice(0, at);
  const domain = e.slice(at + 1);
  if (domain === "gmail.com" || domain === "googlemail.com") {
    return `${local.split("+")[0].replace(/\./g, "")}@gmail.com`;
  }
  return e;
}
