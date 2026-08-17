#!/usr/bin/env npx tsx
/**
 * Recorta los correos de la secuencia de preparación al formato corto.
 *
 * La regla: el video lleva el contenido y el correo solo lo enmarca. Antes cada
 * entrega repetía en texto lo que el video ya explica —con bloques de código
 * incluidos— y salía un correo de scroll infinito.
 *
 * Formato: saludo → gancho de dos o tres líneas → {{video}} → bullets → una
 * frase de cierre. Cabecera, barra de progreso y pie se conservan tal cual del
 * cuerpo que ya está en la base: solo se sustituye lo que va entre el saludo y
 * el separador final.
 *
 * Idempotente: si el cuerpo nuevo ya está guardado, no hace nada.
 *
 *   npx tsx --env-file=.env scripts/simplificar-correos-preparacion.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const P = `<p style="margin:0 0 16px;">`;
const FUERTE = `<strong style="color:#E8F1EF;">`;

/** Los bullets con la flechita menta, que es como quedaron en el correo 3. */
function bullets(items: string[]): string {
  const filas = items
    .map(
      (t, i) =>
        `  <tr><td style="padding:0 0 ${i === items.length - 1 ? "0" : "8"}px 0;color:#E8F1EF;font-size:15px;line-height:1.5;"><span style="color:#85DDCB;">▸</span> ${t}</td></tr>`
    )
    .join("\n");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px 0;">\n${filas}\n</table>`;
}

const CUERPOS: Record<string, string> = {
  // #1 — El loop del agente
  "6a7a496344caa1db8e558fc4": `<p style="margin:0 0 14px;">Hola Geek 👋🏼</p>

${P}Un workflow es código orquestando pasos previstos. Un agente es un loop: el modelo decide, se ejecuta la herramienta, el resultado vuelve, el historial crece. Ese cuarto paso es el que cambia los números. 🎬</p>

{{video}}

<p style="margin:0 0 10px;">Lo que hay que sacar de ahí:</p>

${bullets([
  `En cada vuelta se reenvía el historial completo, así que cada llamada paga también todas las anteriores.`,
  `Un agente de doce llamadas cuesta doce historiales, cada uno más largo que el anterior.`,
  `Por eso buena parte de diseñar agentes hoy es decidir qué ${FUERTE}NO</strong> va en el historial.`,
])}

${P}Para leer, 15 minutos: ${FUERTE}Building effective agents</strong>, de Anthropic. Corto, y la referencia que usa medio mundo. Cuentan que dedicaron más tiempo a afinar las herramientas que los prompts.</p>

${P}Nos vemos el 1 de septiembre. En la sesión 1 construimos este loop desde cero, con tus primeras tools. 🔧🤖</p>

`,

  // #2 — El ZIP de 113 MB
  "6a7a4e597f3a352906a318e0": `<p style="margin:0 0 14px;">Hola Geek 👋🏼</p>

${P}Un cliente mandó un ZIP de 113 MB por WhatsApp. El agente lo leyó completo, la API respondió "Prompt is too long", el turno abortó y el cliente vio ese error en su chat, en inglés, tal cual. 🤦🏻‍♂️</p>

${P}Los 113 MB fueron el detalle menor. Lo que faltaba era una forma de decidir qué merecía entrar al contexto. 🎬</p>

{{video}}

<p style="margin:0 0 10px;">Los cuatro movimientos, que son los mismos que hace cualquiera que trabaje con material grande:</p>

${bullets([
  `${FUERTE}Leer la lista, no los archivos.</strong> Ver los cuarenta y siete nombres del ZIP cuesta unas líneas; abrirlos todos cuesta el turno.`,
  `${FUERTE}Buscar en el manual, no leerlo.</strong> Busca la palabra, lee el párrafo, cierra el manual.`,
  `${FUERTE}Quedarse con la conclusión.</strong> Cuarenta mensajes caben en tres líneas de acuerdos.`,
  `${FUERTE}Guardar el resultado y pasar la dirección.</strong> Lo largo va a un archivo; en la conversación solo dice dónde quedó.`,
])}

${P}Un agente que sabe dónde están las cosas trabaja indefinidamente. Uno que carga todo tiene fecha de caducidad medida en mensajes. En el taller lo aterrizamos contra un ZIP real. 📦🔍🤖</p>

`,

  // #4 — Los hooks
  "6a7a4e5a7f3a352906a318e1": `<p style="margin:0 0 14px;">Hola Geek 👋🏼</p>

${P}Escribes una regla en el system prompt y el modelo la lee, la considera y luego la ignora. Estos dos minutos son sobre cómo obligarlo a obedecer. 🎬</p>

{{video}}

<p style="margin:0 0 10px;">En corto:</p>

${bullets([
  `El ${FUERTE}hook</strong> es el punto del ciclo donde corre tu código. El ${FUERTE}guardrail</strong> es la regla que escribes dentro.`,
  `Es el único control que no depende de que el modelo obedezca.`,
  `Existe en los tres grandes: Claude Code lo llama <code style="background:#0F191D;padding:1px 5px;border-radius:3px;color:#85DDCB;">PreToolUse</code>, LangGraph <code style="background:#0F191D;padding:1px 5px;border-radius:3px;color:#85DDCB;">wrap_tool_call</code>, el OpenAI Agents SDK <code style="background:#0F191D;padding:1px 5px;border-radius:3px;color:#85DDCB;">on_tool_start</code>.`,
])}

${P}En el taller escribimos los nuestros: el que valida antes de tocar disco, el que registra cada llamada y el que corta el loop cuando se sale de presupuesto. 🪝🛡️🤖</p>

`,
};

const INICIO = `<p style="margin:0 0 14px;">Hola`;
const SEPARADOR = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;">`;

async function main() {
  for (const [id, cuerpo] of Object.entries(CUERPOS)) {
    const email = await db.sequenceEmail.findUniqueOrThrow({ where: { id } });
    const viejo = email.content || "";

    const i = viejo.indexOf(INICIO);
    const j = viejo.indexOf(SEPARADOR);
    if (i === -1 || j === -1 || j < i) {
      console.log(`⚠️  #${email.order} no encaja en la plantilla — se deja igual`);
      continue;
    }

    const nuevo = viejo.slice(0, i) + cuerpo + viejo.slice(j);
    if (!nuevo.includes("{{video}}")) {
      throw new Error(`#${email.order}: el cuerpo nuevo perdió {{video}}`);
    }
    if (nuevo === viejo) {
      console.log(`⏭️  #${email.order} ya estaba recortado`);
      continue;
    }

    await db.sequenceEmail.update({ where: { id }, data: { content: nuevo } });
    console.log(
      `✂️  #${email.order} "${email.subject}" · ${viejo.length} → ${nuevo.length} chars`
    );
  }
}

main().finally(() => db.$disconnect());
