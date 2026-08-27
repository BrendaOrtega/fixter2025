/**
 * Entrega 6 de «ACP desde cero»: la lección 2.5.
 * ⚠️ `delayDays` sólo al CREAR — la espera se acomoda desde el riel.
 */
import { db } from "../app/.server/db";
import { wrapEmailHtml, emailVideoCard, emailCallout } from "../app/utils/emailShell";
const VIEWER = (s: string) => `https://www.fixtergeek.com/cursos/sistemas-agenticos/viewer?videoSlug=${s}`;
const POSTER = (s: string) => `https://t3.storage.dev/wild-bird-2039/fixtergeek/posters/${s}.png`;

const contenido = wrapEmailHtml(
  `<p>Hasta aquí el agente era un proceso que arrancabas tú, en tu máquina. En
   esta entrega se muda a una caja que no es tuya — y el cliente <strong>no se
   entera</strong>.</p>

   ${emailVideoCard({
     posterUrl: POSTER("acp-el-remoto"),
     href: VIEWER("acp-el-remoto"),
     title: "El agente remoto",
     duration: "4 min",
     label: "Entrega 6",
   })}

   <p>ACP no dice nada sobre el cable: dice que los mensajes son JSON-RPC y que
   van uno por línea. Quién los lleva es problema aparte, y por eso el cambio
   entero <strong>cabe en un ternario</strong>. Ni la sesión, ni el turno, ni la
   respuesta a lo que el agente pide saben cuál de los dos transportes les tocó.</p>

   ${emailCallout(
     `Las dos piedras del camino. Un <code>new WebSocket()</code> no puede poner
      cabeceras, así que la autorización viaja como ticket firmado con HMAC en el
      query — y el inquilino va <strong>dentro</strong> de la firma, o el ticket
      serviría igual contra la caja de otro. Y sobre WebSocket el salto de línea
      <strong>no llega</strong>, porque la trama ya es la frontera: un lector de
      líneas se queda con el mensaje en el buffer y el cliente cuelga sin un solo
      error.`,
     { title: "Lo que cuesta una tarde descubrir" }
   )}

   <p>El archivo del turno queda en <code>/data</code>, dentro de la caja, y en tu
   carpeta no aparece nada. Tu código no sale de tu máquina, el del agente no
   entra en ella, y el agente sigue deteniéndose para pedirte permiso desde el
   otro lado.</p>

   <p>Puedes correrlo mientras miras:<br/>
   <code>git checkout 06-remoto</code></p>`,
  { preheader: "spawn → wss://, y el cliente no se entera." }
);

async function main() {
  const seq = await db.sequence.findUnique({ where: { slug: "acp-desde-cero" }, include: { emails: true } });
  const ya = seq!.emails.find((e) => e.videoSlug === "acp-el-remoto");
  const base = { sequenceId: seq!.id, order: 6, schedulingType: "delay",
    subject: "El mismo cliente, un agente que no está en tu máquina", content: contenido,
    videoSlug: "acp-el-remoto", fromName: "Héctorbliss de FixterGeek",
    fromEmail: "secuencias@fixtergeek.com" };
  if (ya) { await db.sequenceEmail.update({ where: { id: ya.id }, data: base }); console.log(`✏️  #6 (espera intacta: ${ya.delayDays}d)`); }
  else { await db.sequenceEmail.create({ data: { ...base, delayDays: 2 } }); console.log("✅ #6 +2d"); }
  for (const e of await db.sequenceEmail.findMany({ where: { sequenceId: seq!.id }, orderBy: { order: "asc" } }))
    console.log(`  #${e.order} +${e.delayDays}d ${e.videoSlug}`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
