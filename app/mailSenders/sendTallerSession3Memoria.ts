import { getSesTransport } from "~/utils/sendGridTransport";
import {
  wrapEmailHtml,
  emailButton,
  emailVideoCard,
} from "~/utils/emailShell";

// Dominio verificado en SES — enviar como @gmail.com rompe DMARC y Gmail lo tira
const FROM = "Héctorbliss de FixterGeek <secuencias@fixtergeek.com>";

const ROOM_URL =
  "https://business.teams.ghosty.studio/join/0be8073371a91d8807aecc5588402ea5";
const VIDEO_URL = "https://www.fixtergeek.com/sistemas-agenticos?v=las-4-memorias";
// Horizontal a propósito. El póster vertical del video (9:16) es el que va en
// la galería de la landing; en un correo de 600 px de ancho ocupa la pantalla
// entera y casi todo es fondo vacío.
const POSTER_URL =
  "https://wild-bird-2039.t3.storage.dev/videos/posters/sesion-03-las-4-memorias-email.jpg";

type Props = { to: string; userName?: string | null };

const template = ({ userName }: { userName?: string | null }) => `
<h1 style="font-size:26px;margin:0 0 8px 0;color:#19262A;">
  ${userName ? `${userName}, hoy` : "Hoy"} a las 8: memoria y estado 🧠
</h1>

<p style="margin:0 0 20px 0;">
  Un agente sin memoria vuelve a empezar en cada sesión. Le explicas tu proyecto,
  entiende, resuelve — y a la siguiente pregunta no sabe quién eres. Hoy armamos
  las cuatro que lo arreglan. 🎬
</p>

${emailVideoCard({
  posterUrl: POSTER_URL,
  href: VIDEO_URL,
  title: "Las cuatro memorias de un agente",
  duration: "0:58",
})}

<p style="margin:0 0 10px 0;color:#19262A;font-weight:bold;">Lo que vamos a construir:</p>
<ul style="margin:0 0 24px 0;padding-left:20px;color:#475569;">
  <li style="margin-bottom:8px;"><strong>Episódica</strong> — <code>sessions.db</code> dentro de la caja. Listar, abrir y cerrar hilos, y el respaldo que sobrevive a que borres la caja completa.</li>
  <li style="margin-bottom:8px;"><strong>Procedimental</strong> — las skills en disco, que el agente puede escribirse solo y <code>git status</code> detecta.</li>
  <li style="margin-bottom:8px;"><strong>De trabajo</strong> — la que se borra al cerrar, y por qué confundirla con las otras es el error más común.</li>
  <li style="margin-bottom:8px;">La <strong>semántica</strong> se va a la sesión 4: recordar es una tool, y las tools llegan por MCP.</li>
</ul>

<div style="background:#0E1317;border-radius:10px;padding:20px;margin:0 0 24px 0;text-align:center;">
  <p style="margin:0 0 6px 0;color:#ffffff;font-size:17px;font-weight:bold;">
    Room Fixtergeek · Martes 8 de septiembre · 8:00 pm
  </p>
  <p style="margin:0 0 16px 0;color:#94A3B8;font-size:14px;">
    Entra unos minutos antes, con el mismo correo con el que te inscribiste.
  </p>
  ${emailButton("Entrar al room →", ROOM_URL)}
</div>

<p style="color:#64748B;font-size:14px;margin:0 0 24px 0;">
  Llega con tu caja despierta si puedes: hoy se trabaja sobre lo que ya tienes
  corriendo. Si la tuya murió, la levantamos al inicio y no pierdes nada.
</p>

<p style="color:#64748B;margin:0;">Abrazo. Blissmo. 🤓</p>
`;

export const buildTallerSession3MemoriaHtml = ({
  userName,
}: Omit<Props, "to"> = {}) =>
  wrapEmailHtml(template({ userName }), {
    preheader:
      "Hoy a las 8: qué sobrevive cuando la caja muere, y qué se pierde sin que te enteres.",
    theme: "light",
    // Es un correo del taller pagado, no una secuencia: el footer promocional sobra.
    promoFooter: false,
  });

export const sendTallerSession3Memoria = async ({ to, userName }: Props) => {
  const transport = getSesTransport();
  return transport.sendMail({
    from: FROM,
    to,
    subject: "Hoy a las 8 · Las cuatro memorias de un agente 🧠",
    html: buildTallerSession3MemoriaHtml({ userName }),
  });
};
