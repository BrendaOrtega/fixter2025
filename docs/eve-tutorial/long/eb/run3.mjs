import fs from "node:fs";
import { EasybitsClient } from "@easybits.cloud/sdk";
const env = Object.fromEntries(fs.readFileSync(process.env.HOME + "/nanoclaw/.env", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }));
const anth = fs.readFileSync(process.env.HOME + "/fixter2025/.env", "utf8").match(/^ANTHROPIC_API_KEY=(.*)$/m)[1].replace(/^"|"$/g, "");
const eb = new EasybitsClient({ apiKey: env.EASYBITS_API_KEY });
const CAP = "../captures/";
const log = (name, s) => { fs.writeFileSync(CAP + name, s); console.log("──", name); console.log(s.slice(0, 1800)); };
const PW = "tutorial-eve-2026";
const E = { EASYBITS_API_KEY: env.EASYBITS_API_KEY, ANTHROPIC_API_KEY: anth, WORKFLOW_POSTGRES_URL: "postgres://eve:eve@127.0.0.1:5432/eve_demo", ROUTE_AUTH_USER: "ghosty", ROUTE_AUTH_PASSWORD: PW };
const sh = async (sbx, cmd, name, opts = {}) => { const r = await sbx.exec(cmd, { cwd: "/data/eve-demo", timeoutSeconds: 600, env: E, ...opts }); const out = `$ ${cmd}\n${r.stdout}${r.stderr ? "\n[stderr]\n" + r.stderr : ""}\n[exit ${r.exitCode}]`; if (name) log(name, out); return r; };
const state = JSON.parse(fs.readFileSync("state.json"));
const sbx = await eb.sandboxes.get(state.sandboxId); if (sbx.status === "suspended") await sbx.resume();
// auth de producción: Basic con usuario/contraseña del entorno (como el ejemplo oficial)
await sbx.files.write("/data/eve-demo/agent/channels/eve.ts", `import { eveChannel } from "eve/channels/eve";
import { httpBasic, localDev } from "eve/channels/auth";

// En producción eve rechaza todo si no hay un autenticador: aquí, usuario y contraseña del entorno
export default eveChannel({
  auth: [
    localDev(),
    httpBasic({ username: process.env.ROUTE_AUTH_USER!, password: process.env.ROUTE_AUTH_PASSWORD! }),
  ],
});
`);
if (!fs.existsSync(CAP + "05b-build-auth.txt")) await sh(sbx, "cat agent/channels/eve.ts && npx eve build 2>&1 | tail -2", "05b-build-auth.txt");
await sh(sbx, "pkill -f '[o]utput/server' ; sleep 1; echo ok", null);
await sbx.execBackground("cd /data/eve-demo && PORT=3000 npx eve start --host 0.0.0.0 > /data/eve-start.log 2>&1", { env: E });
await new Promise((res) => setTimeout(res, 25000));
const AUTH = `-u ghosty:${PW}`;
await sh(sbx, `curl -s ${state.url}/eve/v1/health; echo; curl -s -o /dev/null -w 'sin credenciales: %{http_code}\\n' ${state.url}/eve/v1/info; curl -s -o /dev/null -w 'con credenciales: %{http_code}\\n' ${AUTH} ${state.url}/eve/v1/info`, "08-health-publico.txt", { cwd: "/data" });
const r = await sh(sbx, `curl -s ${AUTH} -X POST ${state.url}/eve/v1/session -H 'content-type: application/json' -d '{"message":"Con bash, ejecuta: uname -a && hostname && cat /etc/os-release | head -2. Devuélveme la salida tal cual."}'`, "09-session.txt", { cwd: "/data" });
const sid = JSON.parse(r.stdout).sessionId;
await new Promise((res) => setTimeout(res, 60000));
await sh(sbx, `curl -s -m 8 ${AUTH} '${state.url}/eve/v1/session/${sid}/stream?startIndex=0' | grep -E '"type":"(tool|message)' | cut -c1-500 | tail -14`, "10-stream.txt", { cwd: "/data" });
await sh(sbx, `tail -25 /data/eve-start.log`, "11-log.txt");
await sh(sbx, `PGPASSWORD=eve psql -h 127.0.0.1 -U eve -d eve_demo -c "select id, status, started_at::time from workflow.workflow_runs order by started_at" -c "select count(*) as steps, count(*) filter (where status='completed') as done from workflow.workflow_steps"`, "12-tablas.txt");
const list = await eb.sandboxes.list();
log("13-cajas.txt", "$ eb.sandboxes.list()\n" + list.filter((s) => s.template === "eve-nitro" || (s.metadata || {}).eve_session || (s.name || "").startsWith("eve-")).map((s) => `${s.sandboxId}  ${s.template.padEnd(10)}  ${s.status.padEnd(10)}  ${(s.name || "").padEnd(22)}  ${JSON.stringify(s.metadata || {}).slice(0, 90)}`).join("\n"));
