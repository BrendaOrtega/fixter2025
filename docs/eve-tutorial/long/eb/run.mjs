// Corre eve self-hosted dentro de una caja eve-nitro de EasyBits, con Postgres adentro y
// sandboxes en cajas hijas (@easybits.cloud/eve-sandbox). Guarda cada salida en ../captures/.
import fs from "node:fs";
import { EasybitsClient } from "@easybits.cloud/sdk";
const env = Object.fromEntries(fs.readFileSync(process.env.HOME + "/nanoclaw/.env", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }));
const anth = fs.readFileSync(process.env.HOME + "/fixter2025/.env", "utf8").match(/^ANTHROPIC_API_KEY=(.*)$/m)[1].replace(/^"|"$/g, "");
const eb = new EasybitsClient({ apiKey: env.EASYBITS_API_KEY });
const CAP = "../captures/"; fs.mkdirSync(CAP, { recursive: true });
const log = (name, s) => { fs.writeFileSync(CAP + name, s); console.log("──", name); console.log(s.slice(0, 1200)); };
const sh = async (sbx, cmd, name, opts = {}) => { const r = await sbx.exec(cmd, { cwd: "/data/eve-demo", timeoutSeconds: 600, env: { EASYBITS_API_KEY: env.EASYBITS_API_KEY, ANTHROPIC_API_KEY: anth, WORKFLOW_POSTGRES_URL: "postgres://eve:eve@127.0.0.1:5432/eve_demo", ...opts.env }, ...opts }); const out = `$ ${cmd}\n${r.stdout}${r.stderr ? "\n[stderr]\n" + r.stderr : ""}\n[exit ${r.exitCode}]`; if (name) log(name, out); return r; };

const state = fs.existsSync("state.json") ? JSON.parse(fs.readFileSync("state.json")) : {};
let sbx;
if (state.sandboxId) { sbx = await eb.sandboxes.get(state.sandboxId); if (sbx.status === "suspended") await sbx.resume(); }
else { sbx = await eb.sandboxes.create({ template: "eve-nitro", timeoutSeconds: 7200, name: "eve-tutorial-madre", metadata: { proyecto: "tutorial-eve" } }); state.sandboxId = sbx.sandboxId; fs.writeFileSync("state.json", JSON.stringify(state)); }
log("00-caja.txt", `$ eb.sandboxes.create({ template: "eve-nitro" })\nsandboxId: ${sbx.sandboxId}\nstatus: ${sbx.status}\ntemplate: ${sbx.template}`);
await sh(sbx, "node -v && npx eve --version 2>/dev/null | tail -1 && nproc && free -h | head -2 && df -h /data | tail -1", "01-versiones.txt", { cwd: "/data" });

// proyecto demo: copiar fuentes (sin node_modules)
await sh(sbx, "mkdir -p /data/eve-demo/agent/tools", null, { cwd: "/data" });
for (const f of ["package.json", "tsconfig.json", "agent/agent.ts", "agent/instructions.md", "agent/tools/process_batch.ts", "agent/channels/eve.ts"]) {
  await sbx.files.write("/data/eve-demo/" + f, fs.readFileSync(process.env.HOME + "/eve-demo/" + f, "utf8"));
}
await sbx.files.write("/data/eve-demo/agent/sandbox.ts", `import { defineSandbox } from "eve/sandbox";
import { easybits } from "@easybits.cloud/eve-sandbox";

// Cada sesión del agente corre su bash en una caja hija de EasyBits (fork de un snapshot)
export default defineSandbox({
  backend: easybits({ template: "node" }),
});
`);
await sh(sbx, "cat agent/sandbox.ts && npm i @easybits.cloud/eve-sandbox @workflow/world-postgres@5.0.0-beta.44 2>&1 | tail -3", "02-instalar.txt");

// Postgres dentro de la misma caja
await sh(sbx, "which psql || (sudo apt-get update -qq && sudo apt-get install -y -qq postgresql > /dev/null 2>&1); sudo service postgresql start; sudo -u postgres psql -c \"create user eve with password 'eve';\" ; sudo -u postgres psql -c 'create database eve_demo owner eve;'; sudo -u postgres psql -Atc 'select version()'", "03-postgres.txt");
await sh(sbx, "node node_modules/@workflow/world-postgres/bin/setup.js 2>&1 | tail -4 && PGPASSWORD=eve psql -h 127.0.0.1 -U eve -d eve_demo -Atc \"select schemaname||'.'||tablename from pg_tables where schemaname in ('workflow','graphile_worker') order by 1\"", "04-bootstrap.txt");

// build + start (fondo) + expose
await sh(sbx, "npx eve build 2>&1 | tail -5", "05-build.txt");
const bg = await sbx.execBackground("cd /data/eve-demo && PORT=3000 EASYBITS_API_KEY=$EASYBITS_API_KEY ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY WORKFLOW_POSTGRES_URL=postgres://eve:eve@127.0.0.1:5432/eve_demo npx eve start --host 0.0.0.0 > /data/eve-start.log 2>&1", { env: { EASYBITS_API_KEY: env.EASYBITS_API_KEY, ANTHROPIC_API_KEY: anth } });
state.bg = bg; fs.writeFileSync("state.json", JSON.stringify(state));
await new Promise((r) => setTimeout(r, 25000));
await sh(sbx, "tail -5 /data/eve-start.log; curl -s http://127.0.0.1:3000/eve/v1/health", "06-health.txt", { cwd: "/data" });
const exp = await sbx.exposePort(3000);
log("07-expose.txt", `$ sbx.exposePort(3000)\n${JSON.stringify(exp, null, 2)}`);
const url = exp.url || exp.publicUrl || JSON.stringify(exp);
state.url = url; fs.writeFileSync("state.json", JSON.stringify(state));
console.log("URL", url);
