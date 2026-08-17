#!/usr/bin/env npx tsx
/**
 * Renderiza el correo 3 tal como saldría enviado y lo escribe en /tmp para
 * abrirlo en el navegador.
 *
 * Sirve sobre todo para comprobar que la tarjeta del video queda DENTRO del
 * <body> —donde está el marcador {{video}}— y no pegada después de </html>,
 * que es donde el motor la manda cuando falta el marcador y donde Gmail la
 * descarta sin avisar.
 *
 *   npx tsx --env-file=.env scripts/preview-correo-3-sdk.ts
 */
import { PrismaClient } from "@prisma/client";
import { renderSequenceEmail } from "../app/.server/sequences";
import { writeFileSync } from "fs";

const db = new PrismaClient();
const EMAIL_ID = "6a7a4e5a7f3a352906a318e2";

async function main() {
  const email = await db.sequenceEmail.findUniqueOrThrow({ where: { id: EMAIL_ID } });
  const enrollment = await db.sequenceEnrollment.findFirstOrThrow({
    where: { sequenceId: email.sequenceId },
  });

  const { subject, html } = await renderSequenceEmail({
    email: email as any,
    enrollmentId: enrollment.id,
    emailId: email.id,
  });

  const cierre = html.indexOf("</body>");
  const tarjeta = html.indexOf("Ver el video");
  const salida = "/tmp/correo-3-sdk.html";
  writeFileSync(salida, html);

  console.log(`✉️  "${subject}" · ${html.length} chars → ${salida}`);
  console.log(
    tarjeta === -1
      ? "⚠️  no se encontró la tarjeta del video"
      : tarjeta < cierre
        ? "✅ la tarjeta del video quedó dentro del <body>"
        : "❌ la tarjeta quedó FUERA del <body> — falta {{video}}"
  );
}

main().finally(() => db.$disconnect());
