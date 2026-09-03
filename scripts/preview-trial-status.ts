// Previsualiza los dos correos de estado del trial en el navegador
import { writeFileSync } from "fs";
import { buildTallerTrialPendienteHtml } from "../app/mailSenders/sendTallerTrialPendiente";
import { buildTallerTrialActivoHtml } from "../app/mailSenders/sendTallerTrialActivo";

writeFileSync("/tmp/trial-pendiente.html", buildTallerTrialPendienteHtml({ userName: "Héctor" }));
writeFileSync("/tmp/trial-activo.html", buildTallerTrialActivoHtml({ userName: "Héctor" }));
console.log("/tmp/trial-pendiente.html\n/tmp/trial-activo.html");
