import { db } from "~/.server/db";
import { checkSignupEmail, normalizeEmail } from "~/.server/anti-bot";

/**
 * Guard anti-spam para TODO formulario público que recibe un correo y puede mandar uno.
 *
 * Dos pasos, en este orden:
 * 1. `checkSignupRequest` — antes de tocar la DB: honeypot, tiempo mínimo, formato,
 *    desechables/bots (`checkSignupEmail`), lista negra y límite por IP.
 * 2. `claimEmailSend` — justo antes de cada `send*`: decide si ESTE correo puede mandarse
 *    a ESA dirección (una vez, cada 24 h, cooldown de OTP) y respeta un tope global diario.
 *
 * El conteo vive en Mongo (`EmailSendLog`) y no en un Map en memoria: el Map se reiniciaba
 * con cada deploy y no se compartía entre máquinas de Fly.
 *
 * A un bot se le contesta "ok" (fake) para no darle pistas; a un humano con un error real
 * (correo mal escrito, lista negra) se le dice qué pasó.
 */

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/// intentos (altas + envíos) por IP en una hora
const IP_HOURLY_LIMIT = 12; // un alta exitosa deja 2 filas (intento + envío)
/// correos públicos en 24 h entre todos los formularios; por encima no se manda nada
const DAILY_CAP = Number(process.env.SIGNUP_EMAIL_DAILY_CAP || 300);
/// un formulario enviado en menos de esto es un bot
const MIN_FILL_MS = 2000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type GuardResult =
  | { ok: true; ip: string }
  | { ok: false; fake: true }
  | { ok: false; fake: false; error: string };

export const clientIp = (request: Request) =>
  request.headers.get("fly-client-ip") ??
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
  "?";

export async function checkSignupRequest(
  request: Request,
  formData: FormData,
  { email, name, label }: { email: string; name?: string | null; label: string },
): Promise<GuardResult> {
  const ip = clientIp(request);

  // honeypot: un humano no ve el campo ni lo llena
  if (String(formData.get("website") ?? "")) return { ok: false, fake: true };

  // tiempo mínimo: si el form trae `t`, es obligatorio (antes un `t` vacío saltaba la regla)
  if (formData.has("t")) {
    const startedAt = Number(formData.get("t"));
    if (!startedAt || Date.now() - startedAt < MIN_FILL_MS) return { ok: false, fake: true };
  }

  const e = (email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(e)) return { ok: false, fake: false, error: "Escribe un correo válido." };

  if (checkSignupEmail(e, name).blocked) return { ok: false, fake: true };

  const blocked = await db.emailBlacklist.findUnique({ where: { email: e } });
  if (blocked) {
    return { ok: false, fake: false, error: "Este correo no puede suscribirse en este momento." };
  }

  const recent = await db.emailSendLog.count({
    where: { ip, createdAt: { gt: new Date(Date.now() - HOUR) } },
  });
  if (recent >= IP_HOURLY_LIMIT) return { ok: false, fake: true };

  // el intento cuenta para el límite por IP aunque no se mande correo
  await db.emailSendLog.create({ data: { email: normalizeEmail(e), purpose: `attempt:${label}`, ip } });
  return { ok: true, ip };
}

/**
 * - `once`: una sola vez por dirección y propósito (bienvenidas, felicitaciones).
 * - `confirm`: doble opt-in; 1 cada 24 h y 3 en total (quien perdió el correo lo vuelve a pedir).
 * - `otp`: códigos y links de acceso; 1 por minuto y 10 al día.
 */
export type SendPolicy = "once" | "confirm" | "otp";

export async function claimEmailSend(
  email: string,
  purpose: string,
  ip: string,
  policy: SendPolicy,
): Promise<boolean> {
  const key = normalizeEmail(email);
  const now = Date.now();

  const sentToday = await db.emailSendLog.count({
    where: { createdAt: { gt: new Date(now - DAY) }, NOT: { purpose: { startsWith: "attempt:" } } },
  });
  if (sentToday >= DAILY_CAP) {
    console.warn(`[signup-guard] tope diario (${DAILY_CAP}) alcanzado; no se manda ${purpose} a ${key}`);
    return false;
  }

  const previous = await db.emailSendLog.findMany({
    where: { email: key, purpose },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const last = previous[0]?.createdAt.getTime() ?? 0;

  const allowed =
    policy === "once"
      ? previous.length === 0
      : policy === "confirm"
        ? now - last > DAY && previous.length < 3
        : now - last > 60 * 1000 && previous.filter((p) => now - p.createdAt.getTime() < DAY).length < 10;

  if (!allowed) return false;

  await db.emailSendLog.create({ data: { email: key, purpose, ip } });
  return true;
}
