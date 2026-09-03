import { getSesTransport } from "~/utils/sendGridTransport";
import { wrapEmailHtml, emailButton } from "~/utils/emailShell";

// Dominio verificado en SES — enviar como @gmail.com rompe DMARC y Gmail lo tira
const FROM = "Héctorbliss de FixterGeek <secuencias@fixtergeek.com>";

// Payment Link de Stripe: plan EasyBits Mega con 30 días de trial y sin tarjeta
// (payment_method_collection=if_required). plink_1U9n6nJ7Zwl77LqnAV5COwsh
const TRIAL_URL = "https://buy.stripe.com/dRm28sf3d5pJ3vm3Ul3F60A";
const ROOM_URL = "https://business.teams.ghosty.studio/join/0be8073371a91d8807aecc5588402ea5";

type Props = { to: string; userName?: string | null };

const codeBlock = (code: string) => `
<div style="background:#0E1317;border-radius:8px;padding:14px 16px;margin:8px 0 16px 0;overflow-x:auto;">
  <code style="font-family:Menlo,Consolas,monospace;font-size:13px;color:#85DDCB;white-space:pre;">${code}</code>
</div>`;

const template = ({ userName }: { userName?: string | null }) => `
<h1 style="font-size:26px;margin:0 0 8px 0;color:#19262A;">
  ${userName ? `${userName}, te` : "Te"} faltan tus tokens y tus cajas 👾
</h1>
<p style="margin:0 0 20px 0;">
  Tu trial de EasyBits sigue sin reclamar. De ahí salen los tokens del modelo, las sandboxes y el
  hosting que usamos en clase, así que sin él te toca ver la sesión en lugar de hacerla.
</p>

<p style="margin:0 0 8px 0;color:#19262A;font-weight:bold;">Son 30 días y dos pasos:</p>
<ul style="margin:0 0 20px 0;padding-left:20px;color:#475569;">
  <li style="margin-bottom:8px;">No pide tarjeta y se cancela solo al mes.</li>
  <li style="margin-bottom:8px;">Actívalo con el mismo correo con el que te inscribiste al taller.</li>
</ul>

<div style="margin:0 0 24px 0;">
  ${emailButton("Activar mis 30 días gratis →", TRIAL_URL)}
</div>

<p style="margin:0 0 4px 0;color:#19262A;font-weight:bold;">Luego copia tu API key y conéctala:</p>
<p style="margin:0 0 8px 0;color:#475569;">
  Está en tu <a href="https://www.easybits.cloud/dash/developer" target="_blank" rel="noopener" style="color:#37AB93;">panel</a>,
  empieza con <code style="font-family:Menlo,Consolas,monospace;">eb_sk_live_</code> y es individual.
</p>
${codeBlock("ghosty auth set --provider easybits --api-key TU_KEY")}

<div style="background:#f6fafa;border-left:3px solid #85DDCB;padding:14px 16px;margin:0 0 24px 0;">
  <p style="margin:0;color:#475569;font-size:14px;">
    Si ya lo intentaste y algo falló —el pago no cerró, el panel no muestra la key, la cuenta quedó
    a medias— escríbeme por
    <a href="https://wa.me/527712412825" target="_blank" rel="noopener" style="color:#37AB93;">WhatsApp</a>
    y lo destrabamos hoy mismo.
  </p>
</div>

<div style="background:#0E1317;border-radius:10px;padding:20px;margin:0 0 24px 0;text-align:center;">
  <p style="margin:0 0 6px 0;color:#ffffff;font-size:17px;font-weight:bold;">
    Las sesiones son en el room Fixtergeek
  </p>
  <p style="margin:0 0 16px 0;color:#94A3B8;font-size:14px;">
    Jueves 8:00 pm, dentro de Ghosty Teams. Entra unos minutos antes.
  </p>
  ${emailButton("Entrar al room →", ROOM_URL)}
</div>

<p style="color:#64748B;margin:0;">Abrazo. Blissmo. 🤓</p>
`;

export const buildTallerTrialPendienteHtml = ({ userName }: Omit<Props, "to"> = {}) =>
  wrapEmailHtml(template({ userName }), {
    preheader:
      "El trial de EasyBits te da los tokens, las sandboxes y el hosting que usamos en vivo. Actívalo antes de la próxima sesión.",
    promoFooter: false,
  }).replace(/\{\{unsubscribe\}\}/g, "https://www.fixtergeek.com/perfil");

export const sendTallerTrialPendiente = async ({ to, userName }: Props) =>
  getSesTransport()
    .sendMail({
      from: FROM,
      to,
      subject: "👾 Todavía no reclamas tus tokens del taller",
      html: buildTallerTrialPendienteHtml({ userName }),
    })
    .then((r: unknown) => {
      console.log(`[taller] trial pendiente email sent to: ${to}`);
      return r;
    });
