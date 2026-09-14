import { getSesTransport } from "~/utils/sendGridTransport";
import { wrapEmailHtml, emailButton } from "~/utils/emailShell";

// Dominio verificado en SES — enviar como @gmail.com rompe DMARC y Gmail lo tira
const FROM = "Héctorbliss de FixterGeek <secuencias@fixtergeek.com>";

type WeekendTokensProps = {
  to: string;
  userName?: string | null;
  /** Sin cuenta de EasyBits todavía: los tokens quedan apartados, no acreditados. */
  pendiente?: boolean;
};

const codeBlock = (code: string) => `
<div style="background:#0E1317;border-radius:8px;padding:14px 16px;margin:8px 0 16px 0;overflow-x:auto;">
  <code style="font-family:Menlo,Consolas,monospace;font-size:13px;color:#85DDCB;white-space:pre;">${code}</code>
</div>`;

export const template = ({ userName, pendiente }: { userName?: string | null; pendiente?: boolean }) => `
<h1 style="font-size:26px;margin:0 0 8px 0;color:#19262A;">${userName ? `${userName}, un` : "Un"} regalito pal fin de semana 🎁</h1>

<p style="margin:0 0 20px 0;">
  Te acabo de cargar <strong>10 millones de tokens extra</strong> de DeepSeek v4 Pro en tu
  cuenta de EasyBits. Se suman a los que ya traías, no expiran y no hay que hacer nada
  para activarlos${pendiente ? "" : " — ya están ahí"}.
</p>

${
  pendiente
    ? `<div style="background:#FEF3C7;border-radius:8px;padding:14px 16px;margin:0 0 24px 0;">
  <p style="margin:0;color:#92400E;font-size:14px;">
    Ojo: todavía no encuentro tu cuenta de EasyBits, así que tus 10M están
    <strong>apartados</strong>. Créala con este mismo correo y me avisas — te los acredito
    el mismo día.
  </p>
</div>`
    : `<p style="margin:0 0 20px 0;">
  Si esta semana te topaste con un <code style="font-family:Menlo,Consolas,monospace;">402</code>
  o un "quota exceeded", ya quedó: vuelve a correr lo que estabas corriendo.
</p>`
}

<p style="margin:0 0 8px 0;">Para ver cuánto traes:</p>
${codeBlock("curl -s https://www.easybits.cloud/api/v2/llm/balance -H \"Authorization: Bearer \$EASYBITS_API_KEY\"")}

<h3 style="margin:24px 0 10px 0;color:#19262A;font-size:18px;">Y ya puedes elegir modelo</h3>
<p style="margin:0 0 12px 0;">
  La branch <code style="font-family:Menlo,Consolas,monospace;background:#f1f5f5;padding:2px 5px;border-radius:4px;">sesion-2</code>
  ya trae la <strong>auto-conexión</strong> con la caja y el selector de modelos: Flash para
  lo barato, Pro para lo pesado y <strong>Flash Vision</strong> cuando le pases imágenes.
</p>

<img src="https://easybits-public.t3.storage.dev/699f35cbc8ad86037eda62b1/20a7FONfdS2p"
  alt="Selector de modelos: DeepSeek V4 Flash, V4 Pro y V4 Flash Vision Exp"
  width="536"
  style="display:block;width:100%;max-width:536px;height:auto;border-radius:10px;margin:0 0 12px 0;" />

${codeBlock("git clone -b sesion-2 https://github.com/blissito/acp-agent-ui.git")}

<h3 style="margin:24px 0 10px 0;color:#19262A;font-size:18px;">¿Y para qué tantos?</h3>
<p style="margin:0 0 20px 0;">
  Para que este fin de semana no midas tokens, y no detengas tu curiosidad. Agarra el agente
  del taller y ponlo a hacer <strong>una sola cosa bien</strong>: que lea tus imágenes. Un
  progreso pequeño y terminado enseña más que 10 horas de curso. 👨🏻‍🏭
</p>

<div style="margin:0 0 24px 0;">
  ${emailButton("Ver la sesión 2 →", "https://www.fixtergeek.com/cursos/sistemas-agenticos/sesion-2-la-ui-y-su-caja")}
</div>

<p style="color:#64748B;font-size:14px;margin:24px 0 8px 0;">
  Si armas algo, respóndeme este correo con el link. Me encanta ver qué sale.
</p>
<p style="color:#19262A;margin:16px 0 4px 0;">Buen fin.</p>
<p style="color:#64748B;margin:0;">Abrazo. Blissmo. 🤓</p>
`;

export const sendTallerWeekendTokens = async ({ to, userName, pendiente }: WeekendTokensProps) => {
  const html = wrapEmailHtml(template({ userName, pendiente }), {
    preheader: "10M de tokens extra de DeepSeek v4 Pro en tu cuenta, para jugar el fin de semana.",
  }).replace(/\{\{unsubscribe\}\}/g, "https://www.fixtergeek.com/perfil");

  return getSesTransport()
    .sendMail({
      from: FROM,
      to,
      subject: "🎁 10M de tokens extra — un regalito pal fin de semana",
      html,
    })
    .then((result: unknown) => {
      console.log(`[taller] weekend tokens email sent to: ${to}`);
      return result;
    })
    .catch((error: unknown) => {
      console.error(`[taller] error sending weekend tokens email to ${to}:`, error);
      throw error;
    });
};
