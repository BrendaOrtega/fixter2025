/** Genera un preview HTML del recordatorio del webinar (no envía nada). */
import { writeFileSync } from "node:fs";
import { WEBINAR_SLOTS } from "../app/utils/webinarDates";

process.env.PREVIEW_ONLY = "1";
const { previewSistemasWebinarReminder } = await import(
  "../app/mailSenders/sendSistemasWebinarReminder"
);

const out = "/tmp/webinar-reminder-preview.html";
writeFileSync(out, previewSistemasWebinarReminder({ userName: "Jose Luis Pacheco Soto", slot: WEBINAR_SLOTS[0] }));
console.log(out);
