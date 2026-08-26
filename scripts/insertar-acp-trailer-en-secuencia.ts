/**
 * Mete el tráiler como la entrega 0 de la secuencia "ACP desde cero".
 *
 * ⚠️ Esto es un REORDENAMIENTO, no una actualización de contenido. Las dos
 * entregas que ya existían bajan un lugar (1→2, 2→3) y el tráiler ocupa el 1.
 * Por eso aquí SÍ se escribe `delayDays`, al revés que en
 * `create-acp-sequence.ts`: si no, la entrega que hereda el orden 1 se queda
 * con la espera de 0 días del tráiler y las dos salen el mismo día.
 *
 * Las esperas quedan: tráiler +0 · «El agente no viene en el repo» +2 ·
 * «Una línea por mensaje» +2. Se pueden reacomodar desde el riel después.
 *
 * Se corre UNA vez. Volver a correrlo es idempotente (upsert por `order`).
 *
 *   npx tsx --env-file=.env scripts/insertar-acp-trailer-en-secuencia.ts
 */
import { db } from "../app/.server/db";
import { wrapEmailHtml, emailVideoCard, emailCallout } from "../app/utils/emailShell";

const SLUG = "acp-desde-cero";
const FROM_NAME = "Héctorbliss de FixterGeek";
const FROM_EMAIL = "secuencias@fixtergeek.com";
const REPO = "https://github.com/blissito/acp-desde-cero";
const VIEWER = (s: string) =>
  `https://www.fixtergeek.com/cursos/sistemas-agenticos/viewer?videoSlug=${s}`;
const POSTER = (s: string) =>
  `https://t3.storage.dev/wild-bird-2039/fixtergeek/posters/${s}.png`;

const entrega0 = wrapEmailHtml(
  `<p>Te acabas de inscribir a <strong>ACP desde cero</strong>. Antes de la
   primera entrega, un minuto para que sepas exactamente a qué le vas a dedicar
   las próximas semanas.</p>

   ${emailVideoCard({
     posterUrl: `https://t3.storage.dev/wild-bird-2039/fixtergeek/posters/acp-trailer-v2.png`,
     href: VIEWER("acp-trailer"),
     title: "El módulo en un minuto",
     duration: "1 min",
     label: "Bienvenida",
   })}

   <p>El resumen, por si prefieres leerlo: este módulo no va de qué modelo es más
   listo. Va de lo que hay <strong>alrededor</strong> del modelo — quién le da
   las herramientas, quién decide si puede borrar un archivo, dónde corre cuando
   el trabajo es de verdad. Ese alrededor tiene nombre: el <strong>arnés</strong>,
   y a diferencia del modelo, ése sí lo construyes tú.</p>

   ${emailCallout(
     `Vas a escribir a mano el cliente del protocolo con el que un editor le
      habla a un agente. Sin dependencias, en Node, y al final lo vas a conectar
      a un agente que <strong>no está en tu máquina</strong>.`,
     { title: "Lo que sales sabiendo hacer" }
   )}

   <p>El repositorio, con cada capítulo en su propia etiqueta de git — el temario
   <em>es</em> el historial:<br/>
   <a href="${REPO}" target="_blank" rel="noopener">github.com/blissito/acp-desde-cero</a></p>

   <p>La primera entrega te llega en un par de días. Empieza donde todo el mundo
   se atora: el agente no viene en el repo.</p>`,
  { preheader: "Un minuto para saber a qué le vas a dedicar las próximas semanas." }
);

async function main() {
  const seq = await db.sequence.findUnique({
    where: { slug: SLUG },
    include: { emails: { orderBy: { order: "asc" } } },
  });
  if (!seq) throw new Error(`No existe la secuencia ${SLUG}`);
  console.log(`▸ ${seq.name} (${seq.id})`);

  // De abajo hacia arriba, o el 1→2 pisaría al 2 que todavía no se movió.
  const aMover = seq.emails.filter((e) => e.videoSlug !== "acp-trailer").sort((a, b) => b.order - a.order);
  const destino: Record<string, number> = { "acp-el-cable": 3, "acp-desde-cero": 2 };
  for (const e of aMover) {
    const nuevo = destino[e.videoSlug ?? ""];
    if (!nuevo || e.order === nuevo) { console.log(`✔️  #${e.order} ${e.videoSlug} ya está en su sitio`); continue; }
    await db.sequenceEmail.update({
      where: { id: e.id },
      data: { order: nuevo, delayDays: 2 },
    });
    console.log(`↪️  ${e.videoSlug}: #${e.order} → #${nuevo} (+2d)`);
  }

  const ya = seq.emails.find((e) => e.videoSlug === "acp-trailer");
  const data = {
    sequenceId: seq.id,
    order: 1,
    schedulingType: "delay",
    delayDays: 0,
    subject: "Bienvenido: el módulo en un minuto",
    content: entrega0,
    videoSlug: "acp-trailer",
    fromName: FROM_NAME,
    fromEmail: FROM_EMAIL,
  };
  if (ya) {
    await db.sequenceEmail.update({ where: { id: ya.id }, data });
    console.log(`✏️  #1 tráiler actualizado`);
  } else {
    await db.sequenceEmail.create({ data });
    console.log(`✅ #1 +0d — ${data.subject}`);
  }

  const final = await db.sequenceEmail.findMany({ where: { sequenceId: seq.id }, orderBy: { order: "asc" } });
  console.log("\n— la secuencia queda —");
  for (const e of final) console.log(`  #${e.order} +${e.delayDays}d ${e.videoSlug} — ${e.subject}`);
  console.log(`\n→ /secuencias/${seq.id}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
