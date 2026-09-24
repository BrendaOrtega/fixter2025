// Para meter texto que escribió un visitante (nombre, etc.) dentro del HTML de un correo:
// sin esto, un "nombre" como `<a href=//x.io>` viajaba como link en nuestro remitente.
export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
