// Oferta para los alumnos del taller "Diseño de sistemas agénticos": primer mes al 50 % en
// ghosty.studio, en el plan personal (Pro/Power) o en un Space de Ghosty Teams. El código
// TALLER50 vive en Stripe (gs: scripts/stripe-promo-taller.mts) y va dentro de cada liga.
//
// Estilo Ghosty (cards blancas, borde suave #E1E3E7, CTA brand-500 #9A99EA), NO el brutalista de EasyBits ni el shell de FixterGeek: tablas, estilos
// inline, 600 px, sin JS ni fuentes web (referencia: gs app/lib/tester-invite-email.ts).

// Dominio verificado en SES — enviar como @gmail.com rompe DMARC y Gmail lo tira
const FROM = "Héctorbliss de Ghosty <secuencias@fixtergeek.com>";

const SITE = "https://www.ghosty.studio";
const MASCOT_URL = "https://formmy.app/logo.png";
export const PROMO = "TALLER50";
const UTM = "utm_source=fixtergeek&utm_medium=email&utm_campaign=taller-sistemas-agenticos";
// Plan personal: /c/uso abre el checkout con el código aplicado (pide login si hace falta).
const PRO_URL = `${SITE}/c/uso?elegir=pro&promo=${PROMO}&${UTM}`;
const POWER_URL = `${SITE}/c/uso?elegir=power&promo=${PROMO}&${UTM}`;
// Space: la liga deja el código en la cookie gs_promo y aterriza en el formulario de crear Space
// (/app#nuevo-espacio); en la pasarela del Space el código se teclea (allow_promotion_codes).
const SPACE_URL = `${SITE}/app?promo=${PROMO}&${UTM}#nuevo-espacio`;
const DEADLINE = "7 de noviembre a las 11:59 pm (hora de CDMX)";

// Referencia en dólares para alumnos fuera de México (España, Bolivia…); el cobro sigue en MXN.
// Mismo tipo de cambio y redondeo que `usdFromMxn` de /planes en gs (app/components/planes/pricing.ts).
const MXN_PER_USD = 17.32;
const usd = (mxn: number) => `≈ US$${Math.round(mxn / MXN_PER_USD)}`;
const mxn = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: n % 1 ? 2 : 0 })} MXN`;

type Props = { to: string; userName?: string | null };

const FONT = "-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif";

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const button = (label: string, href: string, bg: string, color: string) => `
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr><td align="center" style="background:${bg};border:1px solid #E1E3E7;border-radius:12px;">
              <a target="_blank" rel="noopener" href="${esc(href)}" style="display:inline-block;padding:14px 26px;font-family:${FONT};font-size:16px;font-weight:800;color:${color};text-decoration:none;">${label}</a>
            </td></tr>
          </table>`;

const option = (o: { bg: string; eyebrow: string; title: string; body: string; was: string; now: string; per: string; cta: string }) => `
        <tr><td style="padding:0 32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="background:${o.bg};border:1px solid #E1E3E7;border-radius:16px;padding:20px 22px;font-family:${FONT};color:#191A20;">
              <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#5B5D6B;">${o.eyebrow}</p>
              <p style="margin:0 0 8px;font-size:21px;font-weight:800;line-height:1.25;">${o.title}</p>
              <p style="margin:0 0 14px;font-size:15px;line-height:1.55;">${o.body}</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.4;">
                <span style="text-decoration:line-through;color:#7C7E8A;">${o.was}</span>
                &nbsp;<span style="font-size:26px;font-weight:800;">${o.now}</span>
                <span style="color:#5B5D6B;"> ${o.per}</span>
              </p>
              ${o.cta}
            </td></tr>
          </table>
        </td></tr>`;

export function tallerOfertaGhostyEmail({ userName }: { userName?: string | null } = {}) {
  const subject = "Tu primer mes de Ghosty a mitad de precio";
  const preheader = `Para alumnos del taller de sistemas agénticos: 50 % el primer mes, hasta el ${DEADLINE}.`;
  const hola = userName ? `Hola, ${esc(userName)}:` : "Hola:";

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#F4F5FB;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F4F5FB;">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
    <tr><td style="padding:0 4px 16px;font-family:${FONT};">
      <img src="${MASCOT_URL}" width="32" height="32" alt="" style="vertical-align:middle;border:0;">
      <span style="vertical-align:middle;font-size:18px;font-weight:700;color:#191A20;padding-left:6px;">Ghosty</span>
    </td></tr>
    <tr><td style="background:#FFFFFF;border:1px solid #E1E3E7;border-radius:20px;overflow:hidden;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="padding:32px 32px 8px;font-family:${FONT};color:#191A20;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#8483E0;">Taller · Diseño de sistemas agénticos</p>
          <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;font-weight:800;">Tu primer mes de Ghosty a mitad de precio</h1>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">${hola}</p>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Gracias por tomar el taller. En el taller armaste agentes que corren en su propia caja en la nube; Ghosty es esa misma plataforma, lista para usar todos los días sin montar nada.</p>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">Para quienes tomaron el taller, el primer mes cuesta la mitad. Elige una de las dos opciones:</p>
        </td></tr>
${option({
  bg: "#FFFFFF",
  eyebrow: "Para ti",
  title: "Tu agente personal",
  body: "Ghosty en la web (ghosty.studio/c) y en la app de tu celular: investiga, te arma documentos y PDFs, publica páginas y trabaja con tus archivos. Plan Pro.",
  was: mxn(299),
  now: mxn(149.5),
  per: `(${usd(149.5)}) el primer mes; después ${mxn(299)} (${usd(299)})`,
  cta: button("Quiero mi agente personal", PRO_URL, "#9A99EA", "#191A20"),
})}
${option({
  bg: "#FFFFFF",
  eyebrow: "Para tu equipo",
  title: "Un Space de Ghosty Teams",
  body: "Rooms donde tu equipo y tus agentes trabajan juntos: cada persona menciona al agente con @, el agente edita documentos compartidos y abre pull requests en tus repos. Tu Space nace con 30 días de prueba; si lo pagas antes del 7 de noviembre, el primer mes sale a mitad de precio.",
  was: mxn(690),
  now: mxn(345),
  per: `(${usd(345)}) el primer mes, IVA incluido; después ${mxn(690)} (${usd(690)})`,
  cta: button("Quiero un Space para mi equipo", SPACE_URL, "#9A99EA", "#191A20"),
})}
        <tr><td style="padding:4px 32px 0;font-family:${FONT};color:#191A20;">
          <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">¿Necesitas más uso en tu agente personal? El plan Power también entra: <span style="text-decoration:line-through;color:#7C7E8A;">${mxn(1499)}</span> <b>${mxn(749.5)}</b> (${usd(749.5)}) el primer mes. <a target="_blank" rel="noopener" href="${esc(POWER_URL)}" style="color:#8483E0;font-weight:700;">Quiero el plan Power</a></p>
          <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">El código <b>${PROMO}</b> ya va dentro de cada botón. Si la pantalla de pago te pide un código, escribe <b>${PROMO}</b>.</p>
          <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">La oferta vale hasta el <b>${DEADLINE}</b>. Desde el segundo mes pagas el precio normal y cancelas cuando quieras.</p>
        </td></tr>
        <tr><td style="padding:20px 32px 32px;font-family:${FONT};color:#191A20;">
          <p style="margin:0 0 12px;font-size:16px;line-height:1.6;">¿Dudas? Contesta este correo y te respondo yo.</p>
          <p style="margin:0;font-size:16px;line-height:1.4;font-weight:800;">@brendi &amp; <a href="https://github.com/blissito" style="color:#191A20;text-decoration:none;">@blissito</a></p>
          <p style="margin:0;font-size:14px;line-height:1.4;color:#5B5D6B;">creadores de Ghosty</p>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:20px 8px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:#7C7E8A;text-align:center;">
      Recibes este correo porque tomaste el taller «Diseño de sistemas agénticos» en FixterGeek.<br>
      Ghosty Studio · <a target="_blank" rel="noopener" href="${SITE}" style="color:#7C7E8A;">ghosty.studio</a>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;

  const text = `${userName ? `Hola, ${userName}:` : "Hola:"}

Gracias por tomar el taller. En el taller armaste agentes que corren en su propia caja en la nube; Ghosty es esa misma plataforma, lista para usar todos los días sin montar nada.

Para quienes tomaron el taller, el primer mes cuesta la mitad:

1. Tu agente personal (plan Pro): ${mxn(299)} → ${mxn(149.5)} (${usd(149.5)}) el primer mes
   ${PRO_URL}

2. Un Space de Ghosty Teams para tu equipo: ${mxn(690)} → ${mxn(345)} (${usd(345)}) el primer mes, IVA incluido
   (nace con 30 días de prueba; págalo antes del 7 de noviembre para el precio de oferta)
   ${SPACE_URL}

Plan Power del agente personal: ${mxn(1499)} → ${mxn(749.5)} (${usd(749.5)}) el primer mes
   ${POWER_URL}

El código ${PROMO} ya va dentro de cada liga. Si la pantalla de pago te pide un código, escribe ${PROMO}.
La oferta vale hasta el ${DEADLINE}. Desde el segundo mes pagas el precio normal y cancelas cuando quieras.

¿Dudas? Contesta este correo.

@brendi & @blissito, creadores de Ghosty
${SITE}`;

  return { subject, html, text };
}

export const sendTallerOfertaGhosty = async ({ to, userName }: Props) => {
  const { subject, html, text } = tallerOfertaGhostyEmail({ userName });
  // Import tardío: la plantilla se puede renderizar (preview) sin nodemailer.
  const { getSesTransport } = await import("~/utils/sendGridTransport");
  return getSesTransport()
    .sendMail({ from: FROM, to, subject, html, text })
    .then((r: unknown) => {
      console.log(`[taller] oferta Ghosty enviada a: ${to}`);
      return r;
    });
};
