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
      items: { label: string; date: string }[];
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

function interpolate(
  html: string,
  vars: Record<string, string | undefined>
): string {
  return html.replace(/\{\{(\w+)\}\}/g, (match, key) =>
    vars[key] !== undefined ? escape(vars[key] as string) : match
  );
}

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
    case "sessions":
      // La agenda de un taller en vivo: la única pieza con estructura propia,
      // y la comparten todos los talleres.
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
${block.title ? `  <tr><td style="padding-bottom:8px;color:#85DDCB;font-size:12px;font-weight:bold;letter-spacing:1.2px;text-transform:uppercase;">${block.title}</td></tr>` : ""}
  <tr><td>${block.items
    .map(
      (item) =>
        `<div style="padding:8px 0;border-bottom:1px solid #223035;"><strong style="color:#E8F1EF;">${item.label}</strong><br/><span style="color:#8FA5A9;font-size:14px;">${item.date}</span></div>`
    )
    .join("")}</td></tr>
</table>`;
    default:
      return "";
  }
}

export async function sendProductWelcome(
  spec: WelcomeSpec,
  ctx: { to: string; userName?: string | null; courseSlug?: string }
): Promise<void> {
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

  await getSesTransport().sendMail({
    from: SEQUENCE_FROM,
    to: ctx.to,
    replyTo: SEQUENCE_REPLY_TO,
    subject: interpolate(spec.subject, vars),
    html,
  });
}
