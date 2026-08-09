/**
 * Crea la secuencia de seguimiento del taller "Diseño de sistemas agénticos"
 * (1ª edición) con sus 4 correos en fechas fijas. Idempotente: si ya existe
 * por nombre, no la duplica. Correr con: npx tsx scripts/create-sistemas-sequence.ts
 *
 * El webhook inscribe a cada comprador (enrollSubscriberInSequence); el motor
 * envía con from secuencias@fixtergeek.com y reemplaza {{unsubscribe}}.
 */
import { db } from "../app/.server/db";
import { wrapEmailHtml, emailButton } from "../app/utils/emailShell";

const SEQUENCE_NAME = "Taller Sistemas Agénticos — 1ª edición";

// 10:00 AM CDMX (UTC-6 fijo, sin DST) = 16:00Z
const dates = {
  prepara: new Date("2026-08-26T16:00:00Z"),
  manana: new Date("2026-08-31T16:00:00Z"),
  grabaciones: new Date("2026-09-11T16:00:00Z"),
  certificado: new Date("2026-09-17T16:00:00Z"),
};

const whats = `<p style="color:#64748B;font-size:14px;margin:24px 0 8px 0;">¿Dudas? Escríbeme por <a href="https://wa.me/527712412825" style="color:#37AB93;">WhatsApp</a>.</p>`;
const firma = `<p style="color:#19262A;margin:16px 0 4px 0;">Abrazo. bliss.</p>`;

const emails = [
  {
    order: 1,
    specificDate: dates.prepara,
    subject: "Prepara tu entorno para el taller (toma 2 minutos)",
    content: wrapEmailHtml(
      `
<h1 style="font-size:24px;margin:0 0 12px 0;color:#19262A;">Falta poco 👀</h1>
<p style="margin:0 0 16px 0;">El martes 1 de septiembre arrancamos <strong>Diseño de sistemas agénticos</strong>. Para llegar con todo listo:</p>
<ol style="margin:0 0 20px 0;padding-left:20px;color:#475569;line-height:1.8;">
  <li><strong>Instala GhostyCode</strong> — sigue la guía de 3 pasos: ${emailButton("Instalar GhostyCode →", "https://www.fixtergeek.com/sistemas-agenticos#instalar")}</li>
  <li><strong>Acepta tu invitación a Ghosty Teams</strong> — ya debió llegar a este correo. Ahí vive la comunidad y ahí ocurren las sesiones en vivo. ¿No la ves? Escríbeme por WhatsApp y te la reenvío.</li>
  <li><strong>Tu API key con los tokens de DeepSeek v4 Pro</strong> llega en un correo especial en los próximos días — con ella no pagas ninguna API del taller.</li>
</ol>
<p style="margin:0 0 8px 0;color:#475569;">Nos vemos el martes a las 8:00 PM (CDMX).</p>
${firma}`,
      { preheader: "Instala GhostyCode, únete a Ghosty Teams y espera tu key — arrancamos el 1 de septiembre." }
    ),
  },
  {
    order: 2,
    specificDate: dates.manana,
    subject: "Mañana arrancamos 🚀 (checklist de 1 minuto)",
    content: wrapEmailHtml(
      `
<h1 style="font-size:24px;margin:0 0 12px 0;color:#19262A;">Mañana a las 8:00 PM</h1>
<p style="margin:0 0 16px 0;">Sesión 1: <strong>El harness — anatomía de un agente</strong>. La sala se abre en Ghosty Teams 10 minutos antes.</p>
<p style="margin:0 0 8px 0;color:#19262A;"><strong>Checklist:</strong></p>
<ul style="margin:0 0 20px 0;padding-left:20px;color:#475569;line-height:1.8;">
  <li><code style="font-family:Menlo,Consolas,monospace;">ghosty doctor</code> sale en verde</li>
  <li>Ya entraste a Ghosty Teams (ahí es la sala de la llamada)</li>
  <li>Tu key de EasyBits está conectada (revisa el correo del 🎁)</li>
</ul>
<p style="margin:0 0 16px 0;color:#475569;">Saldrás de la sesión 1 con tu agente personal respondiendo en la UI inicial que te damos — con tools de verdad, no un chat pelón.</p>
<p style="margin:0 0 8px 0;color:#475569;">Si no puedes llegar en vivo, la grabación queda en tu viewer al día siguiente.</p>
${whats}
${firma}`,
      { preheader: "Sesión 1 mañana 8:00 PM CDMX — la sala se abre en Ghosty Teams 10 min antes." }
    ),
  },
  {
    order: 3,
    specificDate: dates.grabaciones,
    subject: "Las 4 grabaciones ya están en tu viewer",
    content: wrapEmailHtml(
      `
<h1 style="font-size:24px;margin:0 0 12px 0;color:#19262A;">Lo lograste 👏</h1>
<p style="margin:0 0 16px 0;">Las 4 sesiones del taller ya viven en tu viewer, tuyas para siempre:</p>
<div style="margin:0 0 20px 0;">${emailButton("Ver mis grabaciones", "https://www.fixtergeek.com/cursos/sistemas-agenticos/viewer")}</div>
<p style="margin:0 0 16px 0;color:#475569;">Tu agente ya corre con harness, memoria, checkpoints y una interfaz que muestra lo que hace. Sigue iterándolo en Ghosty Teams — la comunidad no se cierra.</p>
<p style="margin:0 0 8px 0;color:#475569;"><strong>¿Me ayudas con 2 minutos?</strong> Tu opinión define la siguiente edición:</p>
<div style="margin:0 0 20px 0;">${emailButton("Calificar el taller", "https://www.fixtergeek.com/cursos/sistemas-agenticos/rating")}</div>
${whats}
${firma}`,
      { preheader: "Tus 4 grabaciones quedaron en el viewer — y una petición de 2 minutos." }
    ),
  },
  {
    order: 4,
    specificDate: dates.certificado,
    subject: "Tu certificado + lo que sigue",
    content: wrapEmailHtml(
      `
<h1 style="font-size:24px;margin:0 0 12px 0;color:#19262A;">Eres de la primera edición 🏆</h1>
<p style="margin:0 0 16px 0;">Tu certificado de <strong>Diseño de sistemas agénticos</strong> ya está disponible desde tu perfil:</p>
<div style="margin:0 0 20px 0;">${emailButton("Ver mi certificado", "https://www.fixtergeek.com/perfil")}</div>
<p style="margin:0 0 16px 0;color:#475569;">Compártelo en LinkedIn y etiqueta a <strong>@FixterGeek</strong> — los proyectos de los alumnos son la mejor carta de presentación del taller (y la tuya).</p>
<p style="margin:0 0 16px 0;color:#475569;">La siguiente edición será a <strong>$3,490 MXN</strong>. Si conoces a alguien que deba tomarlo, tu recomendación vale más que cualquier anuncio.</p>
<p style="margin:0 0 8px 0;color:#475569;">Gracias por construir con nosotros. Esto apenas empieza.</p>
${whats}
${firma}`,
      { preheader: "Tu certificado está listo — y un favor de primera edición." }
    ),
  },
];

async function main() {
  const existing = await db.sequence.findFirst({ where: { name: SEQUENCE_NAME } });
  if (existing) {
    console.log("Ya existe:", existing.id);
    return existing.id;
  }

  const sequence = await db.sequence.create({
    data: {
      name: SEQUENCE_NAME,
      description:
        "Seguimiento pre y post del taller (1-10 sep 2026). Inscripción automática desde el webhook de Stripe (sistemas-agenticos-workshop).",
      trigger: "MANUAL",
      isActive: true,
      isFeatured: false,
      emails: {
        create: emails.map((e) => ({
          order: e.order,
          schedulingType: "specific_date",
          specificDate: e.specificDate,
          subject: e.subject,
          content: e.content,
          fromName: "FixterGeek",
          fromEmail: "secuencias@fixtergeek.com",
        })),
      },
    },
  });
  console.log("Secuencia creada:", sequence.id);
  return sequence.id;
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error(e);
    db.$disconnect();
    process.exit(1);
  });
