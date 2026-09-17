import fs from "node:fs";
import { EasybitsClient } from "@easybits.cloud/sdk";
const env = Object.fromEntries(fs.readFileSync(process.env.HOME + "/nanoclaw/.env", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }));
const eb = new EasybitsClient({ apiKey: env.EASYBITS_API_KEY });
const state = JSON.parse(fs.readFileSync("state.json"));
const sbx = await eb.sandboxes.get(state.sandboxId);
const r = await sbx.exec("which docker || (apt-get install -y -qq docker.io > /tmp/dk.log 2>&1; tail -2 /tmp/dk.log); (dockerd --storage-driver=vfs --iptables=false > /tmp/dockerd.log 2>&1 &); sleep 8; docker version --format '{{.Server.Version}}' 2>&1 | head -2; docker run --rm alpine:3.20 echo hola-desde-docker 2>&1 | tail -3; tail -3 /tmp/dockerd.log", { cwd: "/data", timeoutSeconds: 600 });
console.log(r.stdout, "\n[stderr]", r.stderr.slice(-800), "\n[exit]", r.exitCode);
