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
  ${userName ? `${userName}, prepara` : "Prepara"} tu terminal antes de la sesión 1 🛠️
</h1>
<p style="margin:0 0 20px 0;">
  El taller es en vivo y con las manos en el teclado. Necesitas tres cosas listas:
  <strong>tu trial de EasyBits activo</strong> (de ahí salen los tokens del modelo y las
  sandboxes), <strong>tu API key a la mano</strong> y <strong>Ghosty Code recién instalado</strong>.
  Son diez minutos.
</p>

<h3 style="margin:0 0 12px 0;color:#19262A;font-size:18px;">Paso 1 — Activa tu trial de EasyBits</h3>
<p style="margin:0 0 12px 0;color:#475569;">
  El botón te lleva al plan del taller en Stripe. <strong>No pide tarjeta</strong>: pones tu correo,
  confirmas y ya tienes los ${trialDays} días corriendo. Al terminar el mes decides si te quedas;
  si no haces nada, la suscripción se cancela sola.
</p>
<div style="margin:0 0 12px 0;">
  ${emailButton(`Activar mis ${trialDays} días gratis →`, trialUrl)}
</div>
<p style="margin:0 0 24px 0;color:#64748B;font-size:14px;">
  Usa <strong>el mismo correo con el que te inscribiste al taller</strong>. Si usas otro, tu cuenta
  no queda ligada a tu lugar y tenemos que empatarla a mano el día de la sesión.
</p>

<h3 style="margin:0 0 12px 0;color:#19262A;font-size:18px;">Paso 2 — Copia tu API key</h3>
<p style="margin:0 0 16px 0;color:#475569;">
  En tu panel de desarrollador aparece una key que empieza con
  <code style="font-family:Menlo,Consolas,monospace;">eb_sk_live_</code>. Es individual: no la
  compartas y no la subas a un repo.
</p>
<div style="margin:0 0 24px 0;">
  ${emailButton("Ir a mi panel y copiar la key →", "https://www.easybits.cloud/dash/developer")}
</div>

<h3 style="margin:0 0 12px 0;color:#19262A;font-size:18px;">Paso 3 — Borra los ghostys viejos</h3>
<p style="margin:0 0 12px 0;color:#475569;">
  Si ya habías probado Ghosty en algún taller anterior, esa versión sigue instalada y te va a
  arrancar en lugar de la nueva. El instalador deja un binario suelto en
  <code style="font-family:Menlo,Consolas,monospace;">~/.local/bin/ghosty</code> y su configuración
  en <code style="font-family:Menlo,Consolas,monospace;">~/.ghosty</code>. Esos dos son los que hay
  que borrar.
</p>
${codeBlock("rm -f ~/.local/bin/ghosty\nrm -rf ~/.ghosty")}
<p style="margin:0 0 24px 0;color:#64748B;font-size:14px;">
  Confirma con <code style="font-family:Menlo,Consolas,monospace;">which -a ghosty</code>: no debe
  imprimir nada. Si aún imprime una ruta, ahí quedó otra copia — bórrala con
  <code style="font-family:Menlo,Consolas,monospace;">rm -f</code> y esa ruta.
</p>

<h3 style="margin:0 0 12px 0;color:#19262A;font-size:18px;">Paso 4 — Instala Ghosty Code y conéctalo</h3>
<p style="margin:0 0 4px 0;color:#475569;"><strong>1. Instala la versión nueva:</strong></p>
${codeBlock("curl -fsSL https://formmy.app/ghosty/install.sh | sh")}
<p style="margin:0 0 4px 0;color:#475569;">
  <strong>2. Exporta tu key</strong> — Ghosty Code ya trae EasyBits preinstalado, no hay nada más
  que configurar:
</p>
${codeBlock("export EASYBITS_API_KEY=eb_sk_live_TU_KEY")}
<p style="margin:0 0 4px 0;color:#475569;"><strong>3. Arranca:</strong></p>
${codeBlock("ghosty --yolo")}

<p style="margin:0 0 16px 0;color:#475569;">
  <code style="font-family:Menlo,Consolas,monospace;">--yolo</code> le deja ejecutar sin pedirte
  permiso en cada paso. Pídele algo sencillo — que liste los archivos de tu carpeta, por ejemplo.
  Si responde, ya estás listo para la sesión 1. El idioma de la interfaz se cambia desde la
  configuración de Ghosty, por si prefieres verlo en español.
</p>

<p style="margin:0 0 24px 0;color:#475569;">
  Para que la key sobreviva a cerrar la terminal, pega ese
  <code style="font-family:Menlo,Consolas,monospace;">export</code> en tu
  <code style="font-family:Menlo,Consolas,monospace;">~/.zshrc</code>. Si no, no olvides repetir el
  paso 2 antes de ejecutar.
</p>

<div style="background:#f6fafa;border-left:3px solid #85DDCB;padding:14px 16px;margin:0 0 24px 0;">
  <p style="margin:0 0 8px 0;color:#19262A;font-size:15px;font-weight:bold;">
    ¿Ya trabajas con Claude Code, Codex u otro agente de terminal?
  </p>
  <p style="margin:0;color:#475569;font-size:14px;">
    Sigue usándolo. Lo que construimos en el taller no depende de Ghosty Code: tu key de EasyBits
    sirve igual desde el agente que ya conoces.
  </p>
</div>

<p style="margin:0 0 8px 0;color:#475569;font-size:15px;">Estos mismos pasos, en la página del taller:</p>
<div style="margin:0 0 24px 0;">
  ${emailButton("Guía de instalación →", "https://www.fixtergeek.com/sistemas-agenticos#instalar")}
</div>

<p style="color:#64748B;font-size:14px;margin:24px 0 8px 0;">
  ¿Algo no jala? Escríbeme por <a href="https://wa.me/527712412825" target="_blank" rel="noopener" style="color:#37AB93;">WhatsApp</a> y lo resolvemos antes de la sesión.
</p>
<p style="color:#19262A;margin:16px 0 4px 0;">
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
      subject: "🛠️ Antes de la sesión 1: activa tu trial e instala GhostyCode",
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
