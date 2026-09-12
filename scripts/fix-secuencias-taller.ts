/**
 * Arreglos tras la auditoría del 12 sep 2026:
 * 1. Preparación #6 estaba vacío y 9 alumnos lo esperaban → se escribe.
 * 2. Contadores desnormalizados en cero → recount.
 * 3. Webinar 20 ago: 2 inscritos sin confirmar vencidos → completed.
 * 4. Webinar 27 ago: nunca salió, 0 inscritos → inactiva.
 */
import { PrismaClient } from "@prisma/client";
import { recountSequenceEmail } from "../app/.server/sequenceEvents";
const db = new PrismaClient();

const PREP = "6a7a496344caa1db8e558fc3";

async function main() {
  // 1. Correo #6, con la misma plantilla del #5
  const e5 = await db.sequenceEmail.findFirstOrThrow({ where: { sequenceId: PREP, order: 5 } });
  const e6 = await db.sequenceEmail.findFirstOrThrow({ where: { sequenceId: PREP, order: 6 } });
  let html = e5.content;
  // Cabecera y barra: 6 de 6, último segmento encendido
  html = html.replace("Preparación · 5 de 6", "Preparación · 6 de 6").replace("background:#223035;border-radius:3px;", "background:#85DDCB;border-radius:3px;");
  html = html.replace("Doscientas tools no caben en el contexto. Escribir código, sí.", "Todo el programa ya está en tu visor: 15 horas, repos y materiales.");
  // Cuerpo: del título al separador final
  const start = html.indexOf('<tr><td style="color:#E8F1EF;font-size:26px;');
  const end = html.indexOf('<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;">');
  const body = `<tr><td style="color:#E8F1EF;font-size:26px;line-height:1.25;font-weight:bold;">Lo que ya construiste</td></tr>
</table>

<p style="margin:0 0 14px;">Hola Geek 👋🏼</p>

<p style="margin:0 0 16px;">Este es el último correo de preparación, y llega cuando el taller ya casi cierra. Así que en vez de contarte lo que viene, te cuento dónde quedó todo. 📦</p>

<p style="margin:0 0 10px;">En tu visor ya está el programa completo:</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px 0;">
  <tr><td style="padding:0 0 8px 0;color:#E8F1EF;font-size:15px;line-height:1.5;"><span style="color:#85DDCB;">▸</span> <strong style="color:#E8F1EF;">Las 4 sesiones grabadas</strong> (8 h): de stdio a la caja, la UI y su caja, los 4 tipos de memoria, permisos y MCP. La 5 se sube el 15 de septiembre.</td></tr>
  <tr><td style="padding:0 0 8px 0;color:#E8F1EF;font-size:15px;line-height:1.5;"><span style="color:#85DDCB;">▸</span> <strong style="color:#E8F1EF;">Los 3 webinars</strong> (4 h) y las <strong style="color:#E8F1EF;">4 lecciones de preparación</strong> que te llegaron por aquí.</td></tr>
  <tr><td style="padding:0 0 8px 0;color:#E8F1EF;font-size:15px;line-height:1.5;"><span style="color:#85DDCB;">▸</span> <strong style="color:#E8F1EF;">ACP desde cero</strong>: 6 lecciones cortas con el cable grabado, trama por trama.</td></tr>
  <tr><td style="padding:0 0 8px 0;color:#E8F1EF;font-size:15px;line-height:1.5;"><span style="color:#85DDCB;">▸</span> <strong style="color:#E8F1EF;">33 materiales</strong>: repos con un tag por lección, slides y el PDF de las seis piezas.</td></tr>
</table>

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
  <tr><td style="background:#85DDCB;border-radius:8px;">
    <a href="https://www.fixtergeek.com/cursos/sistemas-agenticos/viewer" target="_blank" rel="noopener" style="display:inline-block;padding:12px 22px;color:#0B1114;font-weight:bold;text-decoration:none;font-size:15px;">Entrar al programa →</a>
  </td></tr>
</table>

<p style="margin:0 0 16px;">Una cosa más: estoy juntando testimonios en video de quienes tomaron esta primera edición. Si el taller te sirvió, un minuto con tu cámara me ayuda muchísimo; mándamelo por WhatsApp cuando puedas. 🎥</p>

<p style="margin:0 0 16px;">Nos seguimos viendo en Ghosty Teams. 🤖⚙️🚀</p>

<p style="margin:0;">Abrazo. Blissmo. 🤓</p>

`;
  html = html.slice(0, start) + body + html.slice(end);
  // Sin bloque "en el siguiente correo": este es el último
  const nextStart = html.indexOf('<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 4px 0;">');
  const nextEnd = html.indexOf("</table>", nextStart) + "</table>".length;
  if (nextStart > 0) html = html.slice(0, nextStart) + html.slice(nextEnd);
  await db.sequenceEmail.update({ where: { id: e6.id }, data: { content: html, subject: "Lo que ya construiste (y dónde quedó todo)" } });
  console.log("#6 escrito:", html.length, "chars");

  // 2. Recount de contadores en todas las secuencias del taller
  const emails = await db.sequenceEmail.findMany({ where: { sequence: { name: { contains: "Sistemas Agénticos" } } }, select: { id: true } });
  for (const e of emails) await recountSequenceEmail(e.id);
  console.log("recount:", emails.length, "correos");

  // 3. Webinar 20 ago: inscritos sin confirmar con envío vencido → completed
  const stuck = await db.sequenceEnrollment.updateMany({
    where: { sequenceId: "6a790a151d99ed94a4258d67", status: "active", subscriber: { confirmed: false } },
    data: { status: "completed", completedAt: new Date() },
  });
  console.log("webinar 20 ago atorados cerrados:", stuck.count);

  // 4. Webinar 27 ago: nunca salió
  await db.sequence.update({ where: { id: "6a790a151d99ed94a4258d6b" }, data: { isActive: false } });
  console.log("webinar 27 ago inactiva");
}
main().finally(() => db.$disconnect());
