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
let sbx = await eb.sandboxes.get(state.sandboxId); console.log("estado", sbx.status); if (sbx.status === "suspended") { await sbx.resume(); }
const step = process.argv[2];
if (step === "img") {
  await sh(sbx, "pgrep -x dockerd >/dev/null || echo 'dockerd no corre'; free -h | head -2; docker pull -q debian:bookworm-slim 2>&1 | tail -1; docker run --rm debian:bookworm-slim bash -c 'echo bash-ok && id' 2>&1 | tail -2", "19-docker-pull.txt", { cwd: "/data" });
  await sbx.files.write("/data/eve-demo/agent/sandbox.ts", `import { defineSandbox } from "eve/sandbox";
import { docker } from "eve/sandbox/docker";

// Un contenedor por sesión, sin salida a internet: el modelo corre bash aquí, no en el app runtime
export default defineSandbox({
  backend: docker({ image: "debian:bookworm-slim", networkPolicy: "deny-all" }),
});
`);
  await sh(sbx, "cat agent/sandbox.ts && npx eve build 2>&1 | tail -1", "20-docker-sandbox.txt");
}
if (step === "turn") {
  const AUTH = `-u ghosty:${PW}`;
  const r = await sh(sbx, `curl -s ${AUTH} -X POST http://127.0.0.1:3000/eve/v1/session -H 'content-type: application/json' -d '{"message":"Con bash: crea /workspace/nota.txt con el texto hola, luego ejecuta hostname && cat /workspace/nota.txt && ( (exec 3<>/dev/tcp/example.com/443) 2>/dev/null && echo internet-ok || echo internet-bloqueado ). Devuélveme la salida tal cual."}'`, "21-session-docker.txt");
  const sid = JSON.parse(r.stdout).sessionId;
  await new Promise((res) => setTimeout(res, 75000));
  await sh(sbx, `docker ps --format 'table {{.ID}}\\t{{.Image}}\\t{{.Status}}\\t{{.Names}}'`, "22-docker-ps.txt");
  const s = await sh(sbx, `curl -s -m 8 ${AUTH} 'http://127.0.0.1:3000/eve/v1/session/${sid}/stream?startIndex=0'`, null);
  let msg = ""; const tools = [];
  for (const l of s.stdout.split("\n")) { try { const e = JSON.parse(l); if (e.type === "message.appended") msg += e.data.messageDelta || ""; if (e.type === "actions.requested" || e.type === "action.result") tools.push(`${e.type}  ${JSON.stringify(e.data).slice(0, 420)}`); } catch {} }
  log("23-stream-docker.txt", ["$ stream de la sesión " + sid, ...tools, "", "── respuesta del agente:", msg].join("\n"));
  await sh(sbx, `tail -6 /data/eve-start.log`, "24-log-docker.txt");
}
