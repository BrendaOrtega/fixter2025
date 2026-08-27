/**
 * Entrega 5 de «ACP desde cero»: la lección 2.4.
 * ⚠️ `delayDays` sólo al CREAR — la espera se acomoda desde el riel.
 */
import { db } from "../app/.server/db";
import { wrapEmailHtml, emailVideoCard, emailCallout } from "../app/utils/emailShell";
const VIEWER = (s: string) => `https://www.fixtergeek.com/cursos/sistemas-agenticos/viewer?videoSlug=${s}`;
const POSTER = (s: string) => `https://t3.storage.dev/wild-bird-2039/fixtergeek/posters/${s}.png`;

const contenido = wrapEmailHtml(
  `<p>Tienes el turno completo grabado en disco. El problema es que no se puede
   leer: <strong>25 tramas, 58 mil caracteres</strong>, y ninguna cabe en una
   línea.</p>

   ${emailVideoCard({
     posterUrl: POSTER("acp-el-inspector"),
     href: VIEWER("acp-el-inspector"),
     title: "El inspector",
     duration: "3 min",
     label: "Entrega 5",
   })}

   <p>El inspector del repo son <strong>58 líneas</strong> y hace dos cosas:
   colapsa las rachas de notificaciones iguales, y correlaciona cada petición con
   su respuesta. Con eso el turno entero cabe en una pantalla, con el
   milisegundo de cada paso y lo que esperó cada llamada.</p>

   ${emailCallout(
     `El truco de la correlación: cada petición se guarda con su dirección y su
      id, y la respuesta se busca por la <strong>dirección contraria</strong>.
      Tres líneas, y funciona en los dos sentidos sin escribir el caso dos veces
      — que es justo lo que hace falta cuando el agente también te llama a ti.`,
     { title: "La idea que vale la lección" }
   )}

   <p>Y de regalo, lo que casi nadie espera encontrar ahí dentro: <strong>el gasto
   viaja por el mismo cable</strong>. En el turno de la entrega anterior fueron
   34,847 tokens de un millón y 18 centavos, reportados mientras el turno seguía
   vivo.</p>

   <p>Puedes correrlo mientras miras:<br/>
   <code>git checkout 05-inspector</code><br/>
   <code>node inspector.mjs wire/permiso.jsonl</code></p>`,
  { preheader: "58 líneas, y el turno entero cabe en una pantalla." }
);

async function main() {
  const seq = await db.sequence.findUnique({ where: { slug: "acp-desde-cero" }, include: { emails: true } });
  const ya = seq!.emails.find((e) => e.videoSlug === "acp-el-inspector");
  const base = { sequenceId: seq!.id, order: 5, schedulingType: "delay",
    subject: "58 líneas para leer el cable", content: contenido,
    videoSlug: "acp-el-inspector", fromName: "Héctorbliss de FixterGeek",
    fromEmail: "secuencias@fixtergeek.com" };
  if (ya) { await db.sequenceEmail.update({ where: { id: ya.id }, data: base }); console.log(`✏️  #5 (espera intacta: ${ya.delayDays}d)`); }
  else { await db.sequenceEmail.create({ data: { ...base, delayDays: 2 } }); console.log("✅ #5 +2d"); }
  for (const e of await db.sequenceEmail.findMany({ where: { sequenceId: seq!.id }, orderBy: { order: "asc" } }))
    console.log(`  #${e.order} +${e.delayDays}d ${e.videoSlug}`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
