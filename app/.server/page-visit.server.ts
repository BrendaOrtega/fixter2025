import { isbot } from "isbot";
import { db } from "./db";

const clip = (v: string | null, max = 120) => (v ? v.trim().slice(0, max) || null : null);

/** Extrae la visita de un request de documento; null si es bot, prefetch o navegación interna (.data). */
export function parseVisit(request: Request) {
  if (request.method !== "GET") return null;
  const url = new URL(request.url);
  if (url.pathname.endsWith(".data")) return null; // navegación cliente / revalidación, no una llegada
  const h = request.headers;
  if (isbot(h.get("user-agent") || "")) return null;
  if ((h.get("sec-purpose") || h.get("purpose") || "").includes("prefetch")) return null;

  let referrer: string | null = null;
  try {
    const host = new URL(h.get("referer") || "").host;
    // Un referrer propio no dice de dónde llegó la persona.
    referrer = /(^|\.)fixtergeek\.com$/.test(host) ? null : host;
  } catch {}

  return {
    path: url.pathname,
    utmSource: clip(url.searchParams.get("utm_source")),
    utmMedium: clip(url.searchParams.get("utm_medium")),
    utmCampaign: clip(url.searchParams.get("utm_campaign")),
    referrer,
  };
}

/** Registra la visita sin bloquear ni romper el loader. Sin cookies, sin IP, sin user-agent guardado. */
export function recordPageVisit(request: Request) {
  const visit = parseVisit(request);
  if (!visit) return;
  db.pageVisit.create({ data: visit }).catch((e: Error) => console.error("[page-visit]", e?.message));
}
