/**
 * Secuencia "ACP desde cero" — el módulo 2 del curso, dos entregas.
 *
 * Se crea aparte y no se cuelga de la secuencia de "Introducción a los agentes
 * de IA": son módulos distintos del mismo curso, y quien entra por ACP no
 * tiene por qué recibir las cuatro entregas del módulo anterior.
 *
 * ⚠️ `delayDays` NO se toca al ACTUALIZAR: es lo que se acomoda a mano desde el
 * riel de /secuencias/:id, y pisarlo aquí borra ese ajuste en silencio.
 *
 * Idempotente: upsert por `order`.
 *   npx tsx --env-file=.env scripts/create-acp-sequence.ts
 */
import { db } from "../app/.server/db";
import { wrapEmailHtml, emailVideoCard, emailCallout } from "../app/utils/emailShell";

const SLUG = "acp-desde-cero";
const COMMUNITY_ID = "6a7df90ae5a1dfc09e842fd5";
const OWNER_ID = "696e73051ae91a16706ac103";
const FROM_NAME = "Héctorbliss de FixterGeek";
const FROM_EMAIL = "secuencias@fixtergeek.com";

const REPO = "https://github.com/blissito/acp-desde-cero";
const VIEWER = (s: string) =>
  `https://www.fixtergeek.com/cursos/sistemas-agenticos/viewer?videoSlug=${s}`;
const POSTER = (s: string) =>
  `https://t3.storage.dev/wild-bird-2039/fixtergeek/posters/${s}.png`;

const entrega1 = wrapEmailHtml(
  `<p>El repositorio del módulo tiene <strong>cero dependencias</strong>. Corres
   <code>ls</code> y no hay <code>node_modules</code>. Es fácil pensar que ya
   tienes todo lo necesario.</p>

   <p>No lo tienes. Falta el agente — y el agente <strong>no puede</strong> venir
   en el repo, porque no es una librería que importas: es un programa aparte que
   instalas tú y que corre por su cuenta. Cuando lo instalas verás el número que
   lo explica todo: <strong>105 paquetes</strong>. Ése es el agente. El cliente
   que vas a escribir sigue en cero.</p>

   ${emailVideoCard({
     posterUrl: POSTER("acp-desde-cero"),
     href: VIEWER("acp-desde-cero"),
     title: "Preparando el agente",
     duration: "2 min",
     label: "Entrega 1",
   })}

   <p>En el video se prueban <strong>tres agentes distintos</strong> —Claude,
   Codex y DeepSeek— con el mismo cliente, sin cambiarle una línea. Si no tienes
   cuenta de uno, usas otro.</p>

   ${emailCallout(
     `Los tres contestan al mismo saludo, y contestan <strong>distinto</strong>:
      Claude devuelve su lista de autenticación vacía porque ya estás firmado en
      la máquina; Codex devuelve tres formas de entrar. Eso no es un problema del
      protocolo — <em>es</em> el protocolo. Se negocia, no se supone.`,
     { title: "Lo que se ve en vivo" }
   )}

   <p>El repo, con los cinco capítulos etiquetados:<br/>
   <a href="${REPO}" target="_blank" rel="noopener">github.com/blissito/acp-desde-cero</a></p>`,
  { preheader: "El agente no viene en el repo — y no puede venir." }
);

const entrega2 = wrapEmailHtml(
  `<p>Ya tienes el agente. Ahora lo que viaja entre los dos.</p>

   <p>ACP es <strong>JSON-RPC 2.0</strong>, una línea por mensaje. Sin el
   encabezado <code>Content-Length</code> que usa LSP: aquí <strong>el salto de
   línea es la frontera</strong>, y ése es el primer error que uno espera
   cometer.</p>

   ${emailVideoCard({
     posterUrl: POSTER("acp-el-cable"),
     href: VIEWER("acp-el-cable"),
     title: "El cable",
     duration: "5 min",
     label: "Entrega 2",
   })}

   <p>Se recorre el capítulo <code>02-initialize</code> línea por línea: arrancar
   al agente, escribir en el cable, y leer — que es donde se equivoca todo el
   mundo, porque <strong>los trozos que llegan no respetan los mensajes</strong>.
   Puede llegar medio, o dos y medio.</p>

   ${emailCallout(
     `Trece métodos del lado del agente, once del lado del cliente. Pero el
      núcleo son cinco, y con esos cinco ya tienes un cliente que sirve.`,
     { title: "La superficie real del protocolo" }
   )}

   <p>Y la asimetría que casi nadie cuenta: <strong>el agente también te llama a
   ti</strong>. Te pide leer un archivo, te pide permiso antes de tocar nada. No
   es un servidor que contesta — son dos pares que se hablan.</p>`,
  { preheader: "Una línea por mensaje, y el salto de línea es la frontera." }
);

const entregas = [
  { order: 1, subject: "El agente no viene en el repo", content: entrega1, delayDays: 0, videoSlug: "acp-desde-cero" },
  { order: 2, subject: "Una línea por mensaje", content: entrega2, delayDays: 2, videoSlug: "acp-el-cable" },
];

async function main() {
  let seq = await db.sequence.findUnique({ where: { slug: SLUG }, include: { emails: true } });
  if (!seq) {
    const creada = await db.sequence.create({
      data: {
        name: "ACP desde cero",
        slug: SLUG,
        description: "Escribes el cliente del protocolo a mano, sin dependencias, y al final lo conectas a un agente que no está en tu máquina.",
        trigger: "MANUAL",
        isActive: true,
        isPrivate: false,
        illustration: "envelope",
        communityId: COMMUNITY_ID,
        ownerId: OWNER_ID,
      },
    });
    seq = { ...creada, emails: [] } as typeof seq;
    console.log(`✅ secuencia creada: ${creada.name} (${creada.id})`);
  } else {
    console.log(`▸ secuencia existente: ${seq.name} (${seq.id})`);
  }

  for (const e of entregas) {
    const existente = seq!.emails.find((x) => x.order === e.order);
    const data = {
      sequenceId: seq!.id,
      order: e.order,
      schedulingType: "delay",
      delayDays: e.delayDays,
      subject: e.subject,
      content: e.content,
      videoSlug: e.videoSlug,
      fromName: FROM_NAME,
      fromEmail: FROM_EMAIL,
    };
    if (existente) {
      const { delayDays: _, ...sinEspera } = data;
      await db.sequenceEmail.update({ where: { id: existente.id }, data: sinEspera });
      console.log(`✏️  #${e.order} ${e.subject} (espera intacta: ${existente.delayDays}d)`);
    } else {
      await db.sequenceEmail.create({ data });
      console.log(`✅ #${e.order} +${e.delayDays}d — ${e.subject}`);
    }
  }
  const total = await db.sequenceEmail.count({ where: { sequenceId: seq!.id } });
  console.log(`\nLa secuencia queda con ${total} correos. → /secuencias/${seq!.id}`);
}

main().then(() => process.exit(0));
