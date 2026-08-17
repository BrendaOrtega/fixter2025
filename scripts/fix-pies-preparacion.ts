#!/usr/bin/env npx tsx
/**
 * Alinea los pies de "En el siguiente correo" con el orden real de la secuencia
 * de preparación, y pone la firma oficial.
 *
 * Los correos 1 y 2 anunciaban entregas que ya no existen —el 2 anunciaba "Cómo
 * sabes que tu agente sirve", que nunca se escribió— y esperas que no coincidían
 * con el `delayDays` de la base. Al meter el SDK como entrega 3 había que
 * rehacerlos de todas formas.
 *
 * Idempotente: cada reemplazo solo aplica si encuentra el texto viejo.
 *
 *   npx tsx --env-file=.env scripts/fix-pies-preparacion.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const CAMBIOS: { id: string; de: string; a: string }[] = [
  {
    // #1 El loop → el siguiente llega en 1 día, no en 2.
    id: "6a7a496344caa1db8e558fc4",
    de: `<span style="color:#85DDCB;">En 2 días</span> · El ZIP de 113 MB que tumbó al bot.`,
    a: `<span style="color:#85DDCB;">En 1 día</span> · El ZIP de 113 MB que tumbó al bot.`,
  },
  {
    // #2 El ZIP → anunciaba un correo que nunca se escribió.
    id: "6a7a4e597f3a352906a318e0",
    de: `<span style="color:#85DDCB;">En 3 días</span> · Cómo sabes que tu agente sirve.`,
    a: `<span style="color:#85DDCB;">En 2 días</span> · El día que tiré mi propio arnés.`,
  },
];

// La firma oficial cambió el 15 de agosto de 2026 y estos dos se quedaron con
// la vieja.
const FIRMA_VIEJA = "Abrazo. bliss.";
const FIRMA = "Abrazo. Blissmo. 🤓";

async function main() {
  for (const c of CAMBIOS) {
    const email = await db.sequenceEmail.findUniqueOrThrow({ where: { id: c.id } });
    let content = email.content || "";
    const teniaPie = content.includes(c.de);
    const teniaFirma = content.includes(FIRMA_VIEJA);

    if (teniaPie) content = content.replace(c.de, c.a);
    if (teniaFirma) content = content.replace(FIRMA_VIEJA, FIRMA);

    if (!teniaPie && !teniaFirma) {
      console.log(`⏭️  #${email.order} ya estaba al día`);
      continue;
    }
    await db.sequenceEmail.update({ where: { id: c.id }, data: { content } });
    console.log(
      `✅ #${email.order} "${email.subject}" · pie=${teniaPie ? "corregido" : "ok"} · firma=${teniaFirma ? "corregida" : "ok"}`
    );
  }
}

main().finally(() => db.$disconnect());
