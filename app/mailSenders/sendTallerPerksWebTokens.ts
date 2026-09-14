import { getSesTransport } from "~/utils/sendGridTransport";
import { wrapEmailHtml, emailButton } from "~/utils/emailShell";

// Dominio verificado en SES — enviar como @gmail.com rompe DMARC y Gmail lo tira
const FROM = "Héctorbliss de FixterGeek <secuencias@fixtergeek.com>";

const ROOM_URL =
  "https://business.teams.ghosty.studio/join/0be8073371a91d8807aecc5588402ea5";
const DOCS_WEB_URL = "https://easybits.cloud/docs#web";

type Props = { to: string; userName?: string | null };

const template = ({ userName }: { userName?: string | null }) => `
<h1 style="font-size:24px;margin:0 0 8px 0;color:#19262A;">
  ${userName ? `${userName}, hoy` : "Hoy"} a las 8: MCP 🔌
</h1>
<p style="margin:0 0 24px 0;">
  La sesión 4 va de cómo tu agente deja de sólo hablar y empieza a hacer: servidores
  MCP, tools y cómo las llama. Para que llegues con con qué jugar, te dejé dos cosas
  ya activas en tu cuenta de EasyBits:
</p>

<ul style="margin:0 0 24px 0;padding-left:20px;color:#475569;">
  <li style="margin-bottom:8px;">
    <strong>1,050 consultas del toolset Web</strong> — tu agente busca en Google, lee
    páginas aunque bloqueen bots y extrae registros.
    <a href="${DOCS_WEB_URL}" target="_blank" rel="noopener" style="color:#37AB93;">Cómo se usa →</a>
  </li>
  <li style="margin-bottom:8px;">
    <strong>+10 millones de tokens</strong> — es la segunda vez que te los recargo,
    para que no detengas tu curiosidad el fin de semana y termines tu sistema agéntico
    completo. Van encima de los de tu plan y no caducan.
  </li>
</ul>

<div style="background:#0E1317;border-radius:10px;padding:20px;margin:0 0 24px 0;text-align:center;">
  <p style="margin:0 0 16px 0;color:#ffffff;font-size:17px;font-weight:bold;">
    Room Fixtergeek · Hoy · 8:00 pm
  </p>
  ${emailButton("Entrar al room →", ROOM_URL)}
</div>

<p style="color:#64748B;font-size:14px;margin:0 0 24px 0;">
  ¿Algo no jala? Escríbeme por <a href="https://wa.me/527712412825" target="_blank" rel="noopener" style="color:#37AB93;">WhatsApp</a>.
</p>

<p style="color:#64748B;margin:0;">Abrazo. Blissmo. 🤓</p>
`;

export const buildTallerPerksWebTokensHtml = ({ userName }: Omit<Props, "to"> = {}) =>
  wrapEmailHtml(template({ userName }), {
    preheader: "Sesión 4 hoy 8 pm: MCP. Y te dejé el toolset Web y 10 millones de tokens extra para jugar.",
    promoFooter: false,
  }).replace(/\{\{unsubscribe\}\}/g, "https://www.fixtergeek.com/perfil");

export const sendTallerPerksWebTokens = async ({ to, userName }: Props) =>
  getSesTransport()
    .sendMail({
      from: FROM,
      to,
      subject: "🔌 Hoy 8 pm: MCP (y te dejé dos regalos para la sesión)",
      html: buildTallerPerksWebTokensHtml({ userName }),
    })
    .then((r: unknown) => {
      console.log(`[taller] perks web+tokens email sent to: ${to}`);
      return r;
    });
