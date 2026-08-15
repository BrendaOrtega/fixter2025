/**
 * Normalización de celulares a E.164, que es como los quiere cualquier API de
 * WhatsApp. La gente escribe "55 1234 5678", "(55) 1234-5678" o "044 55…";
 * todo eso tiene que salir como "+525512345678".
 *
 * Sin librería a propósito: solo necesitamos México por default y aceptar un
 * prefijo internacional si la persona lo escribe.
 */

const DEFAULT_COUNTRY_CODE = "52"; // México

export type PhoneResult =
  | { ok: true; phone: string }
  | { ok: false; error: string };

export function normalizePhone(raw: string): PhoneResult {
  const trimmed = (raw || "").trim();
  if (!trimmed) return { ok: false, error: "Escribe tu celular" };

  const hadPlus = trimmed.startsWith("+");
  let digits = trimmed.replace(/\D/g, "");

  // "044" y "045" son prefijos viejos de larga distancia a celular en México:
  // ya no existen, pero mucha gente los sigue escribiendo.
  if (!hadPlus && /^04[45]/.test(digits)) digits = digits.slice(3);

  // "01" era el prefijo nacional; mismo caso.
  if (!hadPlus && /^01/.test(digits)) digits = digits.slice(2);

  if (!hadPlus) {
    // Un número mexicano local trae 10 dígitos. Si ya trae la lada del país
    // (52 + 10), lo dejamos pasar sin duplicarla.
    if (digits.length === 10) digits = DEFAULT_COUNTRY_CODE + digits;
    else if (digits.length === 12 && digits.startsWith(DEFAULT_COUNTRY_CODE)) {
      // ya viene completo
    } else if (digits.length === 13 && digits.startsWith(DEFAULT_COUNTRY_CODE + "1")) {
      // "+52 1 55…": el 1 de celular ya no se usa en WhatsApp desde 2020.
      digits = DEFAULT_COUNTRY_CODE + digits.slice(3);
    }
  }

  if (digits.length < 10 || digits.length > 15) {
    return { ok: false, error: "Ese celular no parece completo" };
  }

  return { ok: true, phone: `+${digits}` };
}
