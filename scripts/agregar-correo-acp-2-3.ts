/**
 * Entrega 4 de la secuencia «ACP desde cero»: la lección 2.3.
 *
 * ⚠️ `delayDays` sólo se escribe al CREAR. Al actualizar no se toca: la espera
 * se acomoda a mano desde el riel de /secuencias/:id y pisarla la borra en
 * silencio, que se ve como si la UI no guardara.
 */
import { db } from "../app/.server/db";
import { wrapEmailHtml, emailVideoCard, emailCallout } from "../app/utils/emailShell";

const VIEWER = (s: string) => `https://www.fixtergeek.com/cursos/sistemas-agenticos/viewer?videoSlug=${s}`;
const POSTER = (s: string) => `https://t3.storage.dev/wild-bird-2039/fixtergeek/posters/${s}.png`;

const contenido = wrapEmailHtml(
  `<p>Ya sabes qué viaja por el cable. Ahora, quién decide.</p>

   <p>Una sesión se abre con una carpeta y te devuelve un identificador. El turno
   es <strong>una sola petición</strong> que no se resuelve hasta que el agente
   termina — pueden ser segundos o minutos— y mientras tanto te va contando lo
   que hace.</p>

   ${emailVideoCard({
     posterUrl: POSTER("acp-quien-manda"),
     href: VIEWER("acp-quien-manda"),
     title: "Quién manda",
     duration: "3 min",
     label: "Entrega 4",
   })}

   <p>Y entonces se da la vuelta: <strong>el agente te llama a ti</strong>. Te
   pide leer un archivo, te pide escribirlo. Fíjate en quién hace el trabajo — el
   disco lo toca <em>tu</em> proceso, no el suyo.</p>

   ${emailCallout(
     `Un agente puede arrancar aprobándose todo a sí mismo. En el cable grabado de
      la lección se ve tal cual: <code>currentModeId: bypassPermissions</code>. No
      llega ningún aviso, no hay ningún error, y el turno se ve igual que
      cualquier otro. Se corrige con <code>session/set_mode</code>, que viaja por
      el mismo cable.`,
     { title: "El caso que no se ve" }
   )}

   <p>Con un detalle que cuesta caro descubrir solo: los nombres de los modos
   —Auto, Manual, Accept Edits— <strong>no son del protocolo</strong>. Se los
   inventa cada agente y te los dice al abrir la sesión. Nunca los escribas a
   mano.</p>

   <p>El capítulo de esta lección:<br/>
   <a href="https://github.com/blissito/acp-desde-cero/tree/04-permiso" target="_blank" rel="noopener"><code>git checkout 04-permiso</code></a></p>`,
  { preheader: "El agente se detiene y te pasa la decisión." }
);

async function main() {
  const seq = await db.sequence.findUnique({ where: { slug: "acp-desde-cero" }, include: { emails: true } });
  if (!seq) throw new Error("no existe la secuencia");
  const ya = seq.emails.find((e) => e.videoSlug === "acp-quien-manda");
  const base = {
    sequenceId: seq.id, order: 4, schedulingType: "delay",
    subject: "El agente se detiene y te pregunta",
    content: contenido, videoSlug: "acp-quien-manda",
    fromName: "Héctorbliss de FixterGeek", fromEmail: "secuencias@fixtergeek.com",
  };
  if (ya) {
    await db.sequenceEmail.update({ where: { id: ya.id }, data: base });
    console.log(`✏️  #4 actualizado (espera intacta: ${ya.delayDays}d)`);
  } else {
    await db.sequenceEmail.create({ data: { ...base, delayDays: 2 } });
    console.log("✅ #4 +2d — El agente se detiene y te pregunta");
  }
  const todos = await db.sequenceEmail.findMany({ where: { sequenceId: seq.id }, orderBy: { order: "asc" } });
  for (const e of todos) console.log(`  #${e.order} +${e.delayDays}d ${e.videoSlug} — ${e.subject}`);
  console.log(`\n→ /secuencias/${seq.id}`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
