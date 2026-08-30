// Previsualiza el correo de setup del taller en el navegador
import { writeFileSync } from "fs";
import { buildTallerTrialSetupHtml } from "../app/mailSenders/sendTallerTrialSetup";

const out = "/tmp/trial-setup.html";
writeFileSync(out, buildTallerTrialSetupHtml({ userName: "Héctor" }));
console.log(out);
