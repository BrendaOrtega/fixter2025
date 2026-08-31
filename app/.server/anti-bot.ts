import disposableList from "disposable-email-domains";

// Lista comunitaria (~121k dominios desechables) cargada una vez.
const disposableSet = new Set(disposableList as string[]);

// Dominios desechables/bot observados que NO están en la lista comunitaria.
// Agregar aquí los que veamos en suscriptores basura.
const CUSTOM_DISPOSABLE = new Set([
  "wshu.net",
  "cloneiostrau.org",
  "hotrokh.com",
  "emalupe.com",
  "vtmpj.com",
  "web-library.net",
  "immenseignite.info",
  "ship79.com",
  "shopcobe.com",
  "mailvn.top",
  "gxmail.top",
  "warunkpedia.com",
  "wailo.cloudns.asia",
  "dfgdfg.com",
]);

/**
 * Un nombre que sólo un generador escribiría. Las 26 altas del webinar del 27 de
 * agosto de 2026 usaron dominios legítimos —`@crai.com`, `@deloittece.com`— así
 * que el filtro de dominio no las veía; lo que las delataba era el nombre:
 * "FJdAWnWGjsxTFBTQqSPXoo". El otro nido usa el campo como anzuelo, con una URL
 * o emojis de dinero.
 */
export function nombreDeBot(name?: string | null): boolean {
  const n = (name ?? "").trim();
  if (/https?:|\.(org|ph|com)\//i.test(n) || n.includes("\n")) return true;
  if (/[\u{1F300}-\u{1FAFF}\u{2700}-\u{27BF}]/u.test(n)) return true;
  // Cadena larga sin espacios ni acentos, alternando mayúsculas: la firma del
  // generador. Una persona escribe "Juan Romero", o deja el campo vacío.
  if (n.length < 15 || /[\s@.\u00c0-\u017f]/.test(n)) return false;
  return /[a-z]/.test(n) && /[A-Z]/.test(n) && /^[A-Za-z]+$/.test(n);
}

/**
 * Un nombre con espacios y sin anzuelos es una persona. Sirve de indulto para
 * `gmail-dots`, que bloquea los gmail con tres puntos o más y ahí caía
 * "Martin Melo Godínez" (martin.melo.dev.97@), que es alguien de verdad.
 */
export function pareceHumano(name?: string | null): boolean {
  const n = (name ?? "").trim();
  return n.includes(" ") && !nombreDeBot(n);
}

/**
 * Decide si un signup debe bloquearse (bot/desechable).
 * - nombre generado (cadena aleatoria, URL o emojis de anzuelo)
 * - dominios desechables (lista comunitaria + custom)
 * - truco de puntos en gmail (misma cuenta, muchas variaciones), salvo que el
 *   nombre sea de persona
 */
export function checkSignupEmail(email: string, name?: string | null): {
  blocked: boolean;
  reason?: string;
} {
  const e = (email || "").toLowerCase().trim();
  const at = e.lastIndexOf("@");
  if (at < 1) return { blocked: true, reason: "invalid" };
  const local = e.slice(0, at);
  const domain = e.slice(at + 1);

  if (nombreDeBot(name)) {
    return { blocked: true, reason: "generated-name" };
  }

  if (disposableSet.has(domain) || CUSTOM_DISPOSABLE.has(domain)) {
    return { blocked: true, reason: "disposable" };
  }

  if (
    (domain === "gmail.com" || domain === "googlemail.com") &&
    (local.match(/\./g) || []).length >= 3 &&
    !pareceHumano(name)
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
