import { getSesTransport } from "~/utils/sesTransport";
import {
  wrapEmailHtml,
  emailButton,
  emailCallout,
  emailDivider,
  emailImage,
  type EmailTheme,
} from "~/utils/emailShell";
import { SEQUENCE_FROM, SEQUENCE_REPLY_TO } from "~/.server/sequences";

/**
 * El correo de bienvenida de un producto, descrito con datos.
 *
 * Antes cada producto traía su propio mailSender con el HTML completo a mano:
 * cuatro archivos que solo se diferenciaban en el texto, las fechas y el botón.
 * Aquí los bloques son datos que vive en Product.welcome y se editan desde
 * administración, sin desplegar.
 */
export type WelcomeBlock =
  | { type: "text"; html: string }
  | { type: "callout"; title?: string; html: string }
  | { type: "button"; label: string; href: string }
  | { type: "divider" }
  | { type: "image"; src: string; alt?: string }
  | {
      type: "sessions";
      title?: string;
      /**
       * `start` y `end` en `YYYYMMDDTHHMMSS`, hora de CDMX. Con ellos el item
       * gana su enlace a Google Calendar; sin ellos se pinta la fila sola.
       */
      items: {
        label: string;
        date: string;
        start?: string;
        end?: string;
        calendarTitle?: string;
        calendarDetails?: string;
      }[];
    };

export type WelcomeSpec = {
  subject: string;
  preheader?: string;
  theme?: EmailTheme;
  blocks: WelcomeBlock[];
};

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};

/** Los valores interpolados se escapan: un nombre con < rompería el HTML. */
const escape = (value: string) => value.replace(/[&<>"]/g, (c) => ESCAPES[c]);

/**
 * "Agregar al calendario" de una sesión en vivo. CDMX no tiene horario de
 * verano desde 2022, así que la zona fija no se desincroniza.
 */
function gcalLink(item: {
  label: string;
  start?: string;
  end?: string;
  calendarTitle?: string;
  calendarDetails?: string;
}): string | null {
  if (!item.start || !item.end) return null;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: item.calendarTitle || item.label,
    dates: `${item.start}/${item.end}`,
    ctz: "America/Mexico_City",
    ...(item.calendarDetails ? { details: item.calendarDetails } : {}),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function interpolate(
  html: string,
  vars: Record<string, string | undefined>
): string {
  return html.replace(/\{\{(\w+)\}\}/g, (match, key) =>
    vars[key] !== undefined ? escape(vars[key] as string) : match
  );
}

/** Los mismos tokens de `emailShell`, para que la agenda siga al tema. */
const SESSION_COLORS = {
  light: {
    text: "#19262A",
    muted: "#5c7076",
    border: "#e2e8e8",
    eyebrow: "#37AB93",
    link: "#37AB93",
  },
  dark: {
    text: "#E8F1EF",
    muted: "#8FA5A9",
    border: "#223035",
    eyebrow: "#85DDCB",
    link: "#85DDCB",
  },
} as const;

function renderBlock(block: WelcomeBlock, theme: EmailTheme): string {
  switch (block.type) {
    case "text":
      return `<p style="margin:0 0 16px;">${block.html}</p>`;
    case "callout":
      return emailCallout(block.html, { title: block.title }, theme);
    case "button":
      return `<div style="text-align:center;margin:20px 0;">${emailButton(
        block.label,
        block.href
      )}</div>`;
    case "divider":
      return emailDivider(theme);
    case "image":
      return emailImage(block.src, block.alt || "", undefined, theme);
    case "sessions": {
      // La agenda de un taller en vivo: la única pieza con estructura propia,
      // y la comparten todos los talleres. Los colores salen del tema: estaban
      // fijos en los del tema oscuro y en un correo claro el título de cada
      // sesión quedaba casi invisible.
      const c = SESSION_COLORS[theme];
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
${block.title ? `  <tr><td style="padding-bottom:8px;color:${c.eyebrow};font-size:12px;font-weight:bold;letter-spacing:1.2px;text-transform:uppercase;">${block.title}</td></tr>` : ""}
  <tr><td>${block.items
    .map((item) => {
      const href = gcalLink(item);
      const cal = href
        ? `<a href="${href}" style="color:${c.link};font-size:13px;font-weight:bold;text-decoration:none;white-space:nowrap;">+ Google Calendar</a>`
        : "";
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
  <td style="padding:8px 0;border-bottom:1px solid ${c.border};"><strong style="color:${c.text};">${item.label}</strong><br/><span style="color:${c.muted};font-size:14px;">${item.date}</span></td>
  ${cal ? `<td style="padding:8px 0;border-bottom:1px solid ${c.border};text-align:right;vertical-align:middle;">${cal}</td>` : ""}
</tr></table>`;
    })
    .join("")}</td></tr>
</table>`;
    }
    default:
      return "";
  }
}

export type WelcomeContext = {
  to: string;
  userName?: string | null;
  courseSlug?: string;
};

/**
 * El correo armado, sin mandarlo. Separado del envío para poder revisarlo en el
 * navegador antes de que lo reciba un comprador.
 */
export function renderProductWelcome(
  spec: WelcomeSpec,
  ctx: WelcomeContext
): { subject: string; html: string } {
  const theme = spec.theme || "dark";
  const vars = {
    name: ctx.userName || "",
    email: ctx.to,
    courseUrl: ctx.courseSlug
      ? `https://www.fixtergeek.com/cursos/${ctx.courseSlug}/viewer`
      : "https://www.fixtergeek.com/mis-cursos",
  };

  const inner = spec.blocks
    .map((block) => renderBlock(block, theme))
    .join("\n");

  const html = wrapEmailHtml(interpolate(inner, vars), {
    theme,
    promoFooter: false,
    preheader: spec.preheader,
  }).replace(/\{\{unsubscribe\}\}/g, "https://www.fixtergeek.com/perfil");

  return { subject: interpolate(spec.subject, vars), html };
}

export async function sendProductWelcome(
  spec: WelcomeSpec,
  ctx: WelcomeContext
): Promise<void> {
  const { subject, html } = renderProductWelcome(spec, ctx);

  await getSesTransport().sendMail({
    from: SEQUENCE_FROM,
    to: ctx.to,
    replyTo: SEQUENCE_REPLY_TO,
    subject,
    html,
  });
}
