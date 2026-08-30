import { getSesTransport } from "~/utils/sendGridTransport";
import { wrapEmailHtml, emailButton } from "~/utils/emailShell";

// Dominio verificado en SES — enviar como @gmail.com rompe DMARC y Gmail lo tira
const FROM = "Héctorbliss de FixterGeek <secuencias@fixtergeek.com>";

// Payment Link de Stripe: plan EasyBits Mega con 30 días de trial y sin tarjeta
// (payment_method_collection=if_required). plink_1U9n6nJ7Zwl77LqnAV5COwsh
const TRIAL_URL = "https://buy.stripe.com/dRm28sf3d5pJ3vm3Ul3F60A";

type TallerTrialSetupProps = {
  to: string;
  userName?: string | null;
  trialDays?: number;
  trialUrl?: string;
};

const codeBlock = (code: string) => `
<div style="background:#0E1317;border-radius:8px;padding:14px 16px;margin:8px 0 16px 0;overflow-x:auto;">
  <code style="font-family:Menlo,Consolas,monospace;font-size:13px;color:#85DDCB;white-space:pre;">${code}</code>
</div>`;

const template = ({
  userName,
  trialDays,
  trialUrl,
}: {
  userName?: string | null;
  trialDays: number;
  trialUrl: string;
}) => `
<h1 style="font-size:26px;margin:0 0 8px 0;color:#19262A;">
  ${userName ? `${userName}, prepara` : "Prepara"} tu terminal antes de la primera sesión 🛠️
</h1>
<p style="margin:0 0 24px 0;">
  Cinco pasos, diez minutos. Llega con esto listo y arrancamos escribiendo código.
</p>

<h3 style="margin:0 0 8px 0;color:#19262A;font-size:18px;">1. Activa tu trial de EasyBits</h3>
<p style="margin:0 0 12px 0;color:#475569;">
  De ahí salen los tokens del modelo y las sandboxes. No pide tarjeta y al mes se cancela solo.
  Usa el mismo correo con el que te inscribiste.
</p>
<div style="margin:0 0 28px 0;">
  ${emailButton(`Activar mis ${trialDays} días gratis →`, trialUrl)}
</div>

<h3 style="margin:0 0 8px 0;color:#19262A;font-size:18px;">2. Copia tu API key</h3>
<p style="margin:0 0 12px 0;color:#475569;">
  En tu panel, la key que empieza con
  <code style="font-family:Menlo,Consolas,monospace;">eb_sk_live_</code>. Es individual.
</p>
<div style="margin:0 0 28px 0;">
  ${emailButton("Ir a mi panel →", "https://www.easybits.cloud/dash/developer")}
</div>

<h3 style="margin:0 0 8px 0;color:#19262A;font-size:18px;">3. Borra el Ghosty viejo</h3>
<p style="margin:0 0 4px 0;color:#475569;">
  Si lo instalaste en otro taller, esa versión arranca en lugar de la nueva.
</p>
${codeBlock("rm -f ~/.local/bin/ghosty\nrm -rf ~/.ghosty")}
<p style="margin:0 0 28px 0;color:#64748B;font-size:14px;">
  <code style="font-family:Menlo,Consolas,monospace;">which -a ghosty</code> no debe imprimir nada.
</p>

<h3 style="margin:0 0 12px 0;color:#19262A;font-size:18px;">4. Instala Ghosty Code y conéctalo a EasyBits</h3>
${codeBlock('curl -fsSL https://formmy.app/ghosty/install.sh | sh\nghosty auth set --provider easybits --api-key TU_KEY\nghosty mcp add easybits --url "https://www.easybits.cloud/api/mcp/sandbox"\nghosty mcp login easybits')}
<p style="margin:0 0 28px 0;color:#64748B;font-size:14px;">
  Las dos últimas líneas le conectan las sandboxes, que son las que usaremos en vivo;
  <code style="font-family:Menlo,Consolas,monospace;">login</code> abre el navegador y autorizas con
  tu cuenta.
</p>

<h3 style="margin:0 0 12px 0;color:#19262A;font-size:18px;">5. Todo listo, hora de correr</h3>
${codeBlock('ghosty --yolo')}
<p style="margin:0 0 28px 0;color:#64748B;font-size:14px;">
  Pídele algo sencillo y, si responde, ya estás listo para la sesión 1.
  <code style="font-family:Menlo,Consolas,monospace;">--yolo</code> lo deja ejecutar sin pedirte
  permiso en cada paso; el idioma se cambia desde su configuración.
</p>

<div style="background:#f6fafa;border-left:3px solid #85DDCB;padding:14px 16px;margin:0 0 24px 0;">
  <p style="margin:0 0 8px 0;color:#19262A;font-size:15px;font-weight:bold;">
    ¿Usas Claude Code, Codex u otro agente de terminal?
  </p>
  <p style="margin:0 0 10px 0;color:#475569;font-size:14px;">
    Sigue con el tuyo. Conéctale EasyBits por MCP y tienes las mismas herramientas. En Claude Code:
  </p>
  ${codeBlock('claude mcp add --transport http easybits "https://www.easybits.cloud/api/mcp/sandbox"\nclaude mcp login easybits')}
  <p style="margin:0;color:#64748B;font-size:13px;">
    Otros clientes MCP toman la misma URL y autorizan igual, desde el navegador.
  </p>
</div>

<div style="background:#0E1317;border-radius:10px;padding:20px;margin:0 0 24px 0;text-align:center;">
  <p style="margin:0 0 6px 0;color:#ffffff;font-size:17px;font-weight:bold;">
    Tu sala privada del taller
  </p>
  <p style="margin:0 0 16px 0;color:#94A3B8;font-size:14px;">
    Ahí van los enlaces de las sesiones, el material y las dudas entre clase y clase.
    Es sólo para los inscritos, no la compartas.
  </p>
  ${emailButton("Entrar a la sala →", "https://business.teams.ghosty.studio/join/0be8073371a91d8807aecc5588402ea5")}
</div>

<p style="color:#64748B;font-size:14px;margin:0 0 24px 0;">
  ¿Algo no jala? Escríbeme por <a href="https://wa.me/527712412825" target="_blank" rel="noopener" style="color:#37AB93;">WhatsApp</a> y lo resolvemos antes de la sesión.
</p>

<p style="color:#19262A;margin:0 0 4px 0;">
  Nos vemos en la sesión 1: <strong>1 de septiembre, 8:00 pm</strong>. Te mando el enlace por correo.
</p>
<p style="color:#64748B;margin:0;">Abrazo. Blissmo. 🤓</p>
`;

export const buildTallerTrialSetupHtml = ({
  userName,
  trialDays = 30,
  trialUrl = TRIAL_URL,
}: Omit<TallerTrialSetupProps, "to"> = {}) =>
  wrapEmailHtml(template({ userName, trialDays, trialUrl }), {
    preheader: `Limpia la instalación vieja, activa tu trial de EasyBits y deja Ghosty Code listo antes de la sesión 1.`,
    promoFooter: false,
  }).replace(/\{\{unsubscribe\}\}/g, "https://www.fixtergeek.com/perfil");

export const sendTallerTrialSetup = async ({
  to,
  userName,
  trialDays = 30,
  trialUrl = TRIAL_URL,
}: TallerTrialSetupProps) => {
  const html = buildTallerTrialSetupHtml({ userName, trialDays, trialUrl });

  return getSesTransport()
    .sendMail({
      from: FROM,
      to,
      subject: "👾 Reclama tus tokens gratis para el taller",
      html,
    })
    .then((result: unknown) => {
      console.log(`[taller] trial setup email sent to: ${to}`);
      return result;
    })
    .catch((error: unknown) => {
      console.error(`[taller] error sending trial setup email to ${to}:`, error);
      throw error;
    });
};
