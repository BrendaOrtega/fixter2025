/**
 * Aviso puntual a quienes recibieron la entrega 4 ANTES de que el video existiera.
 *
 * Los 11 la recibieron entre el 22 y el 25 de agosto, con el cuerpo anterior y
 * la card en placeholder («El video de esta entrega está en edición»). El cuerpo
 * del correo 4 ya se corrigió, pero eso solo alcanza a quien entre de ahora en
 * adelante: lo que ya salió, salió.
 *
 * Va como envío suelto, NO como un correo más de la secuencia: agregarlo al riel
 * se lo mandaría también a quien todavía no llega al 4 y que sí va a recibir la
 * versión buena.
 *
 * La lista está escrita a mano, sacada de los eventos `sent` del correo 4, para
 * que no haya forma de que un cambio en la consulta se lo mande a alguien más.
 *
 *   npx tsx --env-file=.env scripts/send-memoria-video-aviso.ts          # prueba
 *   npx tsx --env-file=.env scripts/send-memoria-video-aviso.ts --send   # de verdad
 */
import { wrapEmailHtml, emailVideoCard } from "../app/utils/emailShell";
import { sendSesEmailDirect } from "../app/utils/sesTransport";

// El remitente de las secuencias: un From @gmail rompe DMARC en SES y el correo
// se pierde en Gmail sin avisar.
const FROM = "Héctorbliss de FixterGeek <secuencias@fixtergeek.com>";

const SUBJECT = "Ya está el video de la última entrega";

const DESTINATARIOS = [
  "juancarlosromesanm@gmail.com",
  "cosmoduende@hotmail.com",
  "muffin_point@hotmail.com",
  "consultor@4fase4.com",
  "ferbock10@gmail.com",
  "bremin11.20.93@gmail.com",
  "marcarrimor@gmail.com",
  "deivguerrero@gmail.com",
  "davidduranvaldes8512@gmail.com",
  "oswaldinho963@gmail.com",
  "foglzerika@gmail.com",
];

const VIEWER = "https://www.fixtergeek.com/cursos/sistemas-agenticos/memoria-sqlite";
const SLIDES = "https://www.fixtergeek.com/memoria/slides";
const REPO = "https://github.com/blissito/taller-arnes-grok/tree/main/entregas/04-memoria";
const POSTER = "https://wild-bird-2039.t3.storage.dev/videos/posters/memoria-sqlite-v2.jpg";

const p = (html: string) =>
  `<p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#19262A;">${html}</p>`;
const link = (t: string, h: string) =>
  `<a href="${h}" target="_blank" rel="noopener" style="color:#37AB93;font-weight:bold;text-decoration:underline;">${t}</a>`;

const html = wrapEmailHtml(
  [
    `<h1 style="margin:0 0 16px 0;font-size:26px;line-height:1.25;color:#19262A;">Ya está el video 🎬</h1>`,
    p(
      `Cuando te mandé la entrega 4 todavía la estaba editando, así que te llegó sin video. Aquí está, y son 45 minutos.`
    ),
    emailVideoCard(
      {
        posterUrl: POSTER,
        href: VIEWER,
        title: "Dónde vive lo que el agente recuerda",
        duration: "45 min",
      },
      "light"
    ),
    p(
      `Lleva capítulos, así que puedes saltar directo a lo que te interese: las dos búsquedas —léxica y semántica— empiezan en el minuto 30, y lo del sandbox efímero en el 22.`
    ),
    p(
      `También quedaron ${link("las slides", SLIDES)} y ${link("el código de la entrega", REPO)}, con el patrón completo escrito.`
    ),
    p(
      `Con esto se cierra el curso: el loop, la interfaz, el SDK y la memoria. Gracias por llegar hasta la última. 🤓`
    ),
    `<p style="margin:24px 0 0 0;font-size:16px;line-height:1.6;color:#19262A;">Abrazo.<br/>Blissmo. 🤓</p>`,
  ].join("\n"),
  {
    preheader: "45 minutos: markdown en disco, SQLite como índice y vectores incluidos.",
    theme: "light",
  }
);

async function main() {
  const send = process.argv.includes("--send");
  console.log(`${send ? "📮 ENVIANDO" : "🧪 PRUEBA (usa --send para enviar)"}`);
  console.log(`   asunto: ${SUBJECT}`);
  console.log(`   de:     ${FROM}`);
  console.log(`   para:   ${DESTINATARIOS.length} personas\n`);

  if (!send) {
    for (const to of DESTINATARIOS) console.log(`   · ${to}`);
    const salida = "/tmp/aviso-memoria.html";
    await import("fs").then((fs) => fs.writeFileSync(salida, html));
    console.log(`\n   vista previa: ${salida}`);
    return;
  }

  for (const to of DESTINATARIOS) {
    try {
      const r = await sendSesEmailDirect({ to, subject: SUBJECT, htmlBody: html, from: FROM });
      console.log(`   ✅ ${to}  ${r.MessageId}`);
    } catch (e: any) {
      console.log(`   ❌ ${to}  ${e.message}`);
    }
    // SES tiene límite por segundo; con once no hay prisa.
    await new Promise((r) => setTimeout(r, 400));
  }
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exitCode = 1;
  })
  .finally(() => process.exit(0));
