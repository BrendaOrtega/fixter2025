import fs from "node:fs";
import { EasybitsClient } from "@easybits.cloud/sdk";
const env = Object.fromEntries(fs.readFileSync(process.env.HOME + "/nanoclaw/.env", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }));
const anth = fs.readFileSync(process.env.HOME + "/fixter2025/.env", "utf8").match(/^ANTHROPIC_API_KEY=(.*)$/m)[1].replace(/^"|"$/g, "");
const eb = new EasybitsClient({ apiKey: env.EASYBITS_API_KEY });
const CAP = "../captures/";
const log = (name, s) => { fs.writeFileSync(CAP + name, s); console.log("──", name); console.log(s.slice(0, 1500)); };
const E = { EASYBITS_API_KEY: env.EASYBITS_API_KEY, ANTHROPIC_API_KEY: anth, WORKFLOW_POSTGRES_URL: "postgres://eve:eve@127.0.0.1:5432/eve_demo" };
const sh = async (sbx, cmd, name, opts = {}) => { const r = await sbx.exec(cmd, { cwd: "/data/eve-demo", timeoutSeconds: 600, env: E, ...opts }); const out = `$ ${cmd}\n${r.stdout}${r.stderr ? "\n[stderr]\n" + r.stderr : ""}\n[exit ${r.exitCode}]`; if (name) log(name, out); return r; };
const state = JSON.parse(fs.readFileSync("state.json"));
const sbx = await eb.sandboxes.get(state.sandboxId); if (sbx.status === "suspended") await sbx.resume();
const step = process.argv[2];
if (step === "pg") {
  await sh(sbx, "whoami; which psql || (apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql > /dev/null 2>&1); service postgresql start; su postgres -c \"psql -c \\\"create user eve with password 'eve';\\\"\"; su postgres -c 'psql -c \"create database eve_demo owner eve;\"'; su postgres -c 'psql -Atc \"select version()\"'", "03-postgres.txt");
  await sh(sbx, "node node_modules/@workflow/world-postgres/bin/setup.js 2>&1 | tail -4 && PGPASSWORD=eve psql -h 127.0.0.1 -U eve -d eve_demo -Atc \"select schemaname||'.'||tablename from pg_tables where schemaname in ('workflow','graphile_worker') order by 1\"", "04-bootstrap.txt");
}
if (step === "start") {
  await sbx.execBackground("cd /data/eve-demo && PORT=3000 npx eve start --host 0.0.0.0 > /data/eve-start.log 2>&1", { env: E });
  await new Promise((res) => setTimeout(res, 25000));
  await sh(sbx, "tail -6 /data/eve-start.log; echo; curl -s http://127.0.0.1:3000/eve/v1/health", "06-health.txt");
  await sh(sbx, `curl -s ${state.url}/eve/v1/health; echo; curl -s -o /dev/null -w '%{http_code}\\n' ${state.url}/eve/v1/info`, "08-health-publico.txt", { cwd: "/data" });
}
if (step === "turn") {
  const r = await sh(sbx, `curl -s -X POST http://127.0.0.1:3000/eve/v1/session -H 'content-type: application/json' -d '{"message":"Con bash, ejecuta: uname -a && hostname && cat /etc/os-release | head -2. Devuélveme la salida tal cual."}'`, "09-session.txt");
  const sid = JSON.parse(r.stdout).sessionId;
  await new Promise((res) => setTimeout(res, 40000));
  await sh(sbx, `curl -s -m 5 'http://127.0.0.1:3000/eve/v1/session/${sid}/stream?startIndex=0' | grep -E 'tool|message' | cut -c1-400 | tail -12`, "10-stream.txt");
  await sh(sbx, `tail -20 /data/eve-start.log`, "11-log.txt");
  await sh(sbx, `PGPASSWORD=eve psql -h 127.0.0.1 -U eve -d eve_demo -c "select id, status, started_at::time from workflow.workflow_runs order by started_at" -c "select count(*) as steps, count(*) filter (where status='completed') as done from workflow.workflow_steps"`, "12-tablas.txt");
}
if (step === "hijas") {
  const list = await eb.sandboxes.list();
  log("13-cajas.txt", "$ eb.sandboxes.list()\n" + list.map((s) => `${s.sandboxId}  ${s.template.padEnd(10)}  ${s.status.padEnd(10)}  ${s.name || ""}  ${JSON.stringify(s.metadata || {}).slice(0, 80)}`).join("\n"));
}
