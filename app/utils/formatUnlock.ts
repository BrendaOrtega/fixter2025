/**
 * "hoy" / "mañana" / "el jue 14".
 *
 * Solo el día: el motor de secuencias corre cada 5 minutos, así que prometer
 * una hora exacta sería mentir por un margen que nadie necesita.
 */
export function formatUnlock(iso: string | null): string | null {
  if (!iso) return null;

  const date = new Date(iso);
  const days = Math.round((date.getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return "hoy";
  if (days === 1) return "mañana";

  return `el ${new Intl.DateTimeFormat("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "America/Mexico_City",
  }).format(date)}`;
}
