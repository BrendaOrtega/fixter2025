/**
 * Envía el correo especial 🎁 con la API key de EasyBits a cada alumno del
 * taller Sistemas Agénticos. Individual (cada quien su key) e idempotente:
 * marca el tag `sistemas-key-entregada` en el Subscriber y se salta a quien
 * ya lo tiene, así se puede re-correr sin duplicar.
 *
 * Uso:
 *   1. Crea un JSON con las asignaciones: [{ "email": "...", "key": "eb_sk_live_..." }, ...]
 *   2. npx tsx --env-file=.env scripts/send-sistemas-keys.ts ruta/al/keys.json
 */
import { readFileSync } from "fs";
import { db } from "../app/.server/db";
import { sendSistemasKey } from "../app/mailSenders/sendSistemasKey";

const DELIVERED_TAG = "sistemas-key-entregada";

type KeyRow = { email: string; key: string };

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("Falta el archivo: npx tsx --env-file=.env scripts/send-sistemas-keys.ts keys.json");
    process.exit(1);
  }

  const rows: KeyRow[] = JSON.parse(readFileSync(path, "utf-8"));
  console.log(`${rows.length} keys por entregar…`);

  for (const { email, key } of rows) {
    const normalized = email.toLowerCase().trim();
    const subscriber = await db.subscriber.findUnique({
      where: { email: normalized },
    });

    if (subscriber?.tags?.includes(DELIVERED_TAG)) {
      console.log(`⏭  ${normalized}: ya tiene su key, me la salto`);
      continue;
    }

    const user = await db.user.findUnique({ where: { email: normalized } });
    try {
      await sendSistemasKey({
        to: normalized,
        userName: user?.displayName || subscriber?.name,
        apiKey: key,
      });
      if (subscriber) {
        await db.subscriber.update({
          where: { id: subscriber.id },
          data: { tags: { push: DELIVERED_TAG } },
        });
      }
      console.log(`✓ ${normalized}: key enviada`);
    } catch (error) {
      console.error(`✗ ${normalized}: falló el envío —`, error);
    }
    // mismo rate limit que el motor de secuencias
    await new Promise((r) => setTimeout(r, 500));
  }
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error(e);
    db.$disconnect();
    process.exit(1);
  });
