/**
 * Envuelve contenido HTML en un layout de email con estilos INLINE (email-safe).
 * Los clientes de correo (Gmail/Outlook) ignoran <style>/clases, por eso todo va inline.
 * Marca: logo + contenedor centrado + tipografía + footer. CTA usa brand-500 (#85DDCB).
 */
export function wrapEmailHtml(
  innerHtml: string,
  opts?: { preheader?: string }
): string {
  const preheader = opts?.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${opts.preheader}</div>`
    : "";

  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f6;">
${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f6;padding:24px 0;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:12px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
      <tr><td style="padding:28px 32px 0 32px;">
        <img alt="FixterGeek" width="150" src="https://i.imgur.com/mpzZhT9.png" style="width:150px;display:block;" />
      </td></tr>
      <tr><td style="padding:16px 32px 32px 32px;color:#19262A;font-size:16px;line-height:1.6;">
${innerHtml}
      </td></tr>
      <tr><td style="padding:20px 32px;background:#19262A;color:#DAE8E5;font-size:12px;line-height:1.5;">
        Enviado con <strong style="color:#85DDCB;">Secuences</strong> · FixterGeek<br/>
        <a href="https://www.fixtergeek.com/secuences" style="color:#85DDCB;text-decoration:none;">Administra tus suscripciones</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

/**
 * Botón CTA con estilos inline, para insertar dentro del contenido del email.
 */
export function emailButton(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:#85DDCB;color:#0E1317;text-decoration:none;padding:12px 24px;border-radius:24px;font-size:16px;font-weight:bold;margin:8px 0;">${label}</a>`;
}
