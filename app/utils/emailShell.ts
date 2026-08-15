/**
 * Paletas del layout. El tema oscuro se pinta con colores oscuros REALES en vez
 * de confiar en `prefers-color-scheme`: Gmail descarta las media queries, así que
 * un correo que "se adapta" acaba viéndose distinto en cada app.
 * Hex de 6 dígitos siempre — Outlook ignora rgba().
 */
export type EmailTheme = "light" | "dark";

const THEMES = {
  light: {
    pageBg: "#f4f6f6",
    cardBg: "#ffffff",
    text: "#19262A",
    muted: "#5c7076",
    border: "#e2e8e8",
    soft: "#f7faf9",
    accent: "#85DDCB",
    accentInk: "#0E1317",
    logo: "https://i.imgur.com/mpzZhT9.png",
  },
  dark: {
    pageBg: "#0B1114",
    cardBg: "#121D21",
    text: "#E8F1EF",
    muted: "#8FA5A9",
    border: "#223035",
    soft: "#0F191D",
    accent: "#85DDCB",
    accentInk: "#0E1317",
    logo: "https://i.imgur.com/mpzZhT9.png",
  },
} as const;

const t = (theme: EmailTheme = "light") => THEMES[theme];

/**
 * Envuelve contenido HTML en un layout de email con estilos INLINE (email-safe).
 * Los clientes de correo (Gmail/Outlook) ignoran <style>/clases, por eso todo va inline.
 * Marca: logo + contenedor centrado + tipografía + footer. CTA usa brand-500 (#85DDCB).
 */
export function wrapEmailHtml(
  innerHtml: string,
  opts?: { preheader?: string; theme?: EmailTheme; promoFooter?: boolean }
): string {
  const c = t(opts?.theme);
  const preheader = opts?.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${opts.preheader}</div>`
    : "";

  // El footer promocional de Secuencias sobra en correos que son un perk pagado.
  const promoFooter =
    opts?.promoFooter === false
      ? ""
      : `      <tr><td style="padding:18px 32px;background:#0f1a1d;text-align:center;color:#DAE8E5;font-size:13px;line-height:1.5;">
        ¿Quieres crear una secuencia de correo como esta?<br/>
        <a href="https://www.fixtergeek.com/secuencias" target="_blank" rel="noopener" style="color:#85DDCB;text-decoration:none;font-weight:bold;">Créala gratis en FixterGeek →</a>
      </td></tr>
`;

  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"></head>
<body style="margin:0;padding:0;background:${c.pageBg};">
${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.pageBg};padding:24px 0;">
  <tr><td align="center">
    <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${c.cardBg};border-radius:12px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
      <tr><td style="padding:28px 32px 0 32px;">
        <img alt="FixterGeek" width="150" src="${c.logo}" style="width:150px;display:block;border:0;" />
      </td></tr>
      <tr><td style="padding:16px 32px 32px 32px;color:${c.text};font-size:16px;line-height:1.6;">
${innerHtml}
      </td></tr>
${promoFooter}      <tr><td style="padding:14px 32px;background:#19262A;color:#7e9499;font-size:11px;line-height:1.5;text-align:center;">
        Enviado con <strong style="color:#85DDCB;">Secuencias</strong> · FixterGeek<br/>
        <a href="{{unsubscribe}}" target="_blank" rel="noopener" style="color:#7e9499;text-decoration:underline;">Cancelar suscripción</a>
      </td></tr>
    </table>
    <!--[if mso]></td></tr></table><![endif]-->
  </td></tr>
</table>
</body>
</html>`;
}

/**
 * Botón CTA con estilos inline, para insertar dentro del contenido del email.
 */
export function emailButton(label: string, href: string): string {
  return `<a href="${href}" target="_blank" rel="noopener" style="display:inline-block;background:#85DDCB;color:#0E1317;text-decoration:none;padding:12px 24px;border-radius:24px;font-size:16px;font-weight:bold;margin:8px 0;white-space:nowrap;">${label}</a>`;
}

/* ------------------------------------------------------------------ *
 * Bloques de contenido
 *
 * Todos devuelven <table> con estilos inline. Nada de flex/grid,
 * background-image ni webfonts: no sobreviven a Outlook. El ancho útil
 * dentro de la card de 600px es 536px (32px de padding a cada lado).
 * ------------------------------------------------------------------ */

const CONTENT_WIDTH = 536;

/** Encabezado: etiqueta pequeña + título grande, con ilustración opcional arriba. */
export function emailHero(
  opts: { kicker?: string; title: string; imageUrl?: string; alt?: string },
  theme: EmailTheme = "dark"
): string {
  const c = t(theme);
  const image = opts.imageUrl
    ? `<tr><td style="padding-bottom:18px;"><img src="${opts.imageUrl}" alt="${
        opts.alt || ""
      }" width="${CONTENT_WIDTH}" style="width:100%;max-width:${CONTENT_WIDTH}px;height:auto;display:block;border:0;border-radius:10px;" /></td></tr>`
    : "";
  const kicker = opts.kicker
    ? `<tr><td style="padding-bottom:8px;color:${c.accent};font-size:12px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;">${opts.kicker}</td></tr>`
    : "";

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
${image}${kicker}  <tr><td style="color:${c.text};font-size:26px;line-height:1.25;font-weight:bold;">${opts.title}</td></tr>
</table>`;
}

/**
 * Card de video: poster clicable + botón de texto debajo.
 *
 * Ningún cliente reproduce <video>, así que el poster es un enlace a la página
 * del sitio. El triángulo de play va QUEMADO en la imagen — superponerlo con CSS
 * se descuadra en Outlook. Si el lector bloquea imágenes, el alt describe el
 * video y el botón de abajo sigue siendo clicable.
 */
export function emailVideoCard(
  opts: {
    posterUrl: string;
    href: string;
    title: string;
    duration?: string | null;
    label?: string;
  },
  theme: EmailTheme = "dark"
): string {
  const c = t(theme);
  const meta = [opts.title, opts.duration].filter(Boolean).join(" · ");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px 0;background:${
    c.soft
  };border:1px solid ${c.border};border-radius:12px;">
  <tr><td style="padding:10px 10px 0 10px;">
    <a href="${opts.href}" target="_blank" rel="noopener" style="display:block;text-decoration:none;">
      <img src="${opts.posterUrl}" alt="▶ Ver: ${meta}" width="${
    CONTENT_WIDTH - 20
  }" style="width:100%;max-width:${
    CONTENT_WIDTH - 20
  }px;height:auto;display:block;border:0;border-radius:8px;" />
    </a>
  </td></tr>
  <tr><td style="padding:12px 16px 16px 16px;text-align:center;">
    <div style="color:${
      c.muted
    };font-size:13px;line-height:1.4;margin-bottom:10px;">${meta}</div>
    ${emailButton(opts.label || "▶ Ver el video", opts.href)}
  </td></tr>
</table>`;
}

/** Imagen suelta, centrada y responsiva. El alt no es opcional: se bloquean seguido. */
export function emailImage(
  url: string,
  alt: string,
  opts?: { width?: number; caption?: string },
  theme: EmailTheme = "dark"
): string {
  const c = t(theme);
  const width = opts?.width || CONTENT_WIDTH;
  const caption = opts?.caption
    ? `<tr><td style="padding-top:8px;color:${c.muted};font-size:13px;line-height:1.4;text-align:center;">${opts.caption}</td></tr>`
    : "";

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
  <tr><td align="center"><img src="${url}" alt="${alt}" width="${width}" style="width:100%;max-width:${width}px;height:auto;display:block;border:0;border-radius:10px;" /></td></tr>
${caption}</table>`;
}

/** Caja destacada — la tarea del correo. La barra lateral es una celda, no un border-left. */
export function emailCallout(
  html: string,
  opts?: { title?: string; variant?: "tip" | "warn" },
  theme: EmailTheme = "dark"
): string {
  const c = t(theme);
  const bar = opts?.variant === "warn" ? "#E4A853" : c.accent;
  const title = opts?.title
    ? `<div style="color:${bar};font-size:12px;font-weight:bold;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:6px;">${opts.title}</div>`
    : "";

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;background:${c.soft};border-radius:0 10px 10px 0;">
  <tr>
    <td width="3" style="width:3px;background:${bar};font-size:0;line-height:0;">&nbsp;</td>
    <td style="padding:14px 18px;color:${c.text};font-size:15px;line-height:1.6;">${title}${html}</td>
  </tr>
</table>`;
}

/** Separador. <hr> se renderiza distinto en cada cliente; una celda de 1px no. */
export function emailDivider(theme: EmailTheme = "dark"): string {
  const c = t(theme);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;">
  <tr><td height="1" style="height:1px;background:${c.border};font-size:0;line-height:0;">&nbsp;</td></tr>
</table>`;
}

/**
 * Barra de progreso hecha con celdas de tabla: sin imágenes ni CSS moderno,
 * así que se ve igual en todos lados y sobrevive al bloqueo de imágenes.
 * Es el gancho de retorno: ver "2 de 5" jala más que cualquier recordatorio.
 */
export function emailProgress(
  current: number,
  total: number,
  opts?: { label?: string },
  theme: EmailTheme = "dark"
): string {
  const c = t(theme);
  const cells = Array.from({ length: total }, (_, i) => {
    const done = i < current;
    return `<td width="${Math.floor(
      100 / total
    )}%" height="6" style="height:6px;font-size:0;line-height:0;background:${
      done ? c.accent : c.border
    };border-radius:3px;">&nbsp;</td>${
      i < total - 1 ? '<td width="6" style="width:6px;font-size:0;">&nbsp;</td>' : ""
    }`;
  }).join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px 0;">
  <tr><td style="padding-bottom:8px;color:${c.muted};font-size:12px;letter-spacing:0.5px;text-transform:uppercase;font-weight:bold;">${
    opts?.label || `Preparación · ${current} de ${total}`
  }</td></tr>
  <tr><td>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${cells}</tr></table>
  </td></tr>
</table>`;
}

/**
 * Cierre de cada correo: qué viene y cuándo.
 * El encabezado dice "En el siguiente correo" y no "Lo que sigue": lo segundo
 * se confunde con lo que sigue en el taller.
 */
export function emailTeaser(
  opts: { title: string; when?: string; heading?: string },
  theme: EmailTheme = "dark"
): string {
  const c = t(theme);
  const when = opts.when
    ? `<span style="color:${c.accent};">${opts.when}</span> · `
    : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 4px 0;">
  <tr><td style="color:${c.muted};font-size:14px;line-height:1.5;">
    <strong style="color:${c.text};">${
      opts.heading || "En el siguiente correo:"
    }</strong><br/>${when}${opts.title}
  </td></tr>
</table>`;
}
