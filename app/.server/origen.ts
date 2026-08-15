import { db } from "~/.server/db";

/**
 * De dónde llegó cada persona.
 *
 * Se guardan dos cosas a la vez, a propósito: el UTM y el referrer, que sirven
 * para lo que viene etiquetado; y lo que la persona contesta, que es lo único
 * que ve los mensajes privados, las comunidades y las recomendaciones —la mayor
 * parte del tráfico de una audiencia de creador—. Cuando los dos no coinciden,
 * ese desacuerdo señala dónde está ciega la medición.
 *
 * El primer toque nunca se sobrescribe. Es el que dice qué te trajo; el último
 * solo dice qué te hizo volver.
 */

export const ORIGIN_COOKIE = "fx_origen";

export type Origin = {
  source?: string;
  medium?: string;
  campaign?: string;
  referrer?: string;
  landingPath?: string;
  at?: string;
};

type StoredOrigin = { first?: Origin; last?: Origin };

/// Dominios que valen como canal propio. Lo demás se guarda con su host pelón:
/// inventar categorías por adelantado esconde de dónde viene la gente de verdad.
const KNOWN_HOSTS: Record<string, string> = {
  "linkedin.com": "linkedin",
  "lnkd.in": "linkedin",
  "youtube.com": "youtube",
  "youtu.be": "youtube",
  "x.com": "x",
  "twitter.com": "x",
  "t.co": "x",
  "facebook.com": "facebook",
  "instagram.com": "instagram",
  "google.com": "google",
  "bing.com": "google",
  "duckduckgo.com": "google",
  "github.com": "github",
  "news.ycombinator.com": "hackernews",
  "reddit.com": "reddit",
  "whatsapp.com": "whatsapp",
  "chat.whatsapp.com": "whatsapp",
};

/** Un host cualquiera reducido al canal con el que lo llamamos. */
export const normalizeHost = (raw?: string | null): string | undefined => {
  if (!raw) return undefined;
  try {
    const host = new URL(raw).hostname.replace(/^www\./, "");
    if (KNOWN_HOSTS[host]) return KNOWN_HOSTS[host];
    // Salir de fixtergeek.com hacia fixtergeek.com no es una fuente.
    if (host.endsWith("fixtergeek.com")) return undefined;
    return host;
  } catch {
    return undefined;
  }
};

/** El origen que trae la petición, o `null` si nunca se escribió la cookie. */
export const readOrigin = (request: Request): StoredOrigin | null => {
  const cookie = request.headers.get("Cookie");
  if (!cookie) return null;
  const match = cookie.match(new RegExp(`${ORIGIN_COOKIE}=([^;]+)`));
  if (!match) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1])) as StoredOrigin;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

/**
 * Captura el origen EN EL SERVIDOR y devuelve la cabecera que lo persiste, o
 * `null` si esta visita no aporta nada nuevo.
 *
 * Se hace aquí y no en el navegador porque en el navegador se pierde de tres
 * formas distintas: un redirect se lleva la query antes de que corra el JS
 * (justo lo que pasaba con `/cursos/:curso/:video`), un bloqueador puede
 * detener el script, y el primer render puede tardar más que el primer clic.
 * El servidor ve la URL y el `Referer` siempre, en la primera petición.
 *
 * El primer toque nunca se pisa: es el que dice qué trajo a la persona.
 */
export const captureOriginHeaders = (request: Request): string | null => {
  const url = new URL(request.url);
  const params = url.searchParams;
  const referer = request.headers.get("Referer") || undefined;

  // Navegar dentro del sitio no es una fuente.
  const external =
    referer && !referer.includes(url.host) ? referer : undefined;

  const ahora: Origin = {
    source: params.get("utm_source") ?? undefined,
    medium: params.get("utm_medium") ?? undefined,
    campaign: params.get("utm_campaign") ?? undefined,
    referrer: external,
    landingPath: url.pathname,
    at: new Date().toISOString(),
  };

  const haySeñal = Boolean(ahora.source || ahora.referrer);
  const guardado = readOrigin(request);

  // Sin señal y con primer toque ya guardado no hay nada que escribir: una
  // visita directa de alguien que ya conocemos no cambia su origen.
  if (!haySeñal && guardado?.first) return null;

  const valor: StoredOrigin = {
    first: guardado?.first ?? ahora,
    last: haySeñal ? ahora : guardado?.last,
  };

  const YEAR = 60 * 60 * 24 * 365;
  return `${ORIGIN_COOKIE}=${encodeURIComponent(
    JSON.stringify(valor)
  )}; Path=/; Max-Age=${YEAR}; SameSite=Lax`;
};

/** El canal, con el UTM ganando sobre el referrer y "directo" como último recurso. */
const channelOf = (origin?: Origin): string =>
  origin?.source || normalizeHost(origin?.referrer) || "directo";

/**
 * Deja el origen en el subscriber. Idempotente: los campos `first*` solo se
 * escriben si están vacíos, así que volver a entrar un mes después no borra de
 * dónde vino la persona la primera vez.
 *
 * Nunca lanza: perder la atribución es molesto, perder el alta no.
 */
export const recordOrigin = async (email: string, request: Request) => {
  try {
    const stored = readOrigin(request);
    if (!stored) return;

    const subscriber = await db.subscriber.findUnique({
      where: { email },
      select: { id: true, firstSource: true },
    });
    if (!subscriber) return;

    const first = stored.first;
    const last = stored.last ?? stored.first;

    await db.subscriber.update({
      where: { id: subscriber.id },
      data: {
        ...(subscriber.firstSource || !first
          ? {}
          : {
              firstSource: channelOf(first),
              firstMedium: first.medium,
              firstCampaign: first.campaign,
              firstReferrer: first.referrer,
              firstLandingPath: first.landingPath,
              firstSeenAt: first.at ? new Date(first.at) : new Date(),
            }),
        lastSource: channelOf(last),
      },
    });
  } catch (error) {
    console.error("📊 No se pudo guardar el origen:", error);
  }
};

/** Guarda la respuesta al "¿cómo llegaste?". Se pisa: la última vale. */
export const recordSelfReported = async (email: string, answer?: string | null) => {
  const clean = answer?.trim().slice(0, 60);
  if (!clean) return;
  try {
    await db.subscriber.update({
      where: { email },
      data: { selfReportedSource: clean },
    });
  } catch (error) {
    console.error("📊 No se pudo guardar la autoatribución:", error);
  }
};
