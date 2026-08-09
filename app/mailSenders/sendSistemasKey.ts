import { getSesTransport } from "~/utils/sendGridTransport";
import { wrapEmailHtml, emailButton } from "~/utils/emailShell";

// Dominio verificado en SES — enviar como @gmail.com rompe DMARC y Gmail lo tira
const FROM = "Héctorbliss de FixterGeek <secuencias@fixtergeek.com>";

type SistemasKeyProps = {
  to: string;
  userName?: string | null;
  apiKey: string; // eb_sk_live_...
};

const codeBlock = (code: string) => `
<div style="background:#0E1317;border-radius:8px;padding:14px 16px;margin:8px 0 16px 0;overflow-x:auto;">
  <code style="font-family:Menlo,Consolas,monospace;font-size:13px;color:#85DDCB;white-space:pre;">${code}</code>
</div>`;

const template = ({ userName, apiKey }: { userName?: string | null; apiKey: string }) => `
<h1 style="font-size:26px;margin:0 0 8px 0;color:#19262A;">${userName ? `${userName}, aquí` : "Aquí"} está tu regalo 🎁</h1>
<p style="margin:0 0 20px 0;">
  Esta es <strong>tu API key personal de EasyBits</strong>, cargada con todos los tokens de
  <strong>DeepSeek v4 Pro</strong> que vas a necesitar para construir el agente completo del
  taller. Es tuya, es individual — no la compartas.
</p>

<div style="background:#f6fafa;border:2px dashed #85DDCB;border-radius:10px;padding:16px;margin:0 0 24px 0;text-align:center;">
  <code style="font-family:Menlo,Consolas,monospace;font-size:14px;color:#19262A;word-break:break-all;">${apiKey}</code>
</div>

<h3 style="margin:0 0 10px 0;color:#19262A;font-size:18px;">Ponla a trabajar en 3 pasos</h3>

<p style="margin:0 0 4px 0;color:#475569;"><strong>1. Instala GhostyCode</strong> (nuestro agente de código en terminal, open source):</p>
${codeBlock("curl -fsSL https://formmy.app/ghosty/install.sh | sh")}

<p style="margin:0 0 4px 0;color:#475569;"><strong>2. Conecta tu key</strong> — la misma sirve para el modelo y las tools de EasyBits:</p>
${codeBlock(`ghosty auth set --provider easybits --api-key ${apiKey}`)}

<p style="margin:0 0 4px 0;color:#475569;"><strong>3. Verifica que todo esté en orden:</strong></p>
${codeBlock("ghosty doctor")}

<p style="margin:0 0 24px 0;color:#475569;">
  Si <code style="font-family:Menlo,Consolas,monospace;">doctor</code> sale en verde, corre
  <code style="font-family:Menlo,Consolas,monospace;">ghosty</code> y pídele algo — ya estás
  usando DeepSeek v4 Pro con tus tokens del taller.
</p>

<div style="background:#FEF3C7;border-radius:8px;padding:14px 16px;margin:0 0 24px 0;">
  <p style="margin:0;color:#92400E;font-size:14px;">
    <strong>Si te dice "DeepSeek API key not found":</strong> tienes una variable de entorno
    vieja pisando la config. Corre
    <code style="font-family:Menlo,Consolas,monospace;">unset DEEPSEEK_PROVIDER GHOSTY_PROVIDER</code>
    o abre una terminal nueva.
  </p>
</div>

<p style="margin:0 0 8px 0;color:#475569;font-size:15px;">
  En el taller usaremos esta misma key para el agente que vas a construir. La guía completa
  vive aquí:
</p>
<div style="margin:0 0 24px 0;">
  ${emailButton("Guía de instalación →", "https://www.fixtergeek.com/sistemas-agenticos#instalar")}
</div>

<p style="color:#64748B;font-size:14px;margin:24px 0 8px 0;">
  ¿Algo no jala? Escríbeme por <a href="https://wa.me/527712412825" style="color:#37AB93;">WhatsApp</a> y lo resolvemos.
</p>
<p style="color:#19262A;margin:16px 0 4px 0;">Nos vemos en la sesión 1.</p>
<p style="color:#64748B;margin:0;">Abrazo. bliss.</p>
`;

export const sendSistemasKey = async ({ to, userName, apiKey }: SistemasKeyProps) => {
  const html = wrapEmailHtml(template({ userName, apiKey }), {
    preheader:
      "Tu API key con los tokens de DeepSeek v4 Pro del taller + cómo activarla en 3 pasos.",
  }).replace(/\{\{unsubscribe\}\}/g, "https://www.fixtergeek.com/perfil");

  return getSesTransport()
    .sendMail({
      from: FROM,
      to,
      subject: "🎁 Tu API key del taller — tokens de DeepSeek v4 Pro incluidos",
      html,
    })
    .then((result: unknown) => {
      console.log(`[sistemas] key email sent to: ${to}`);
      return result;
    })
    .catch((error: unknown) => {
      console.error(`[sistemas] error sending key email to ${to}:`, error);
      throw error;
    });
};
