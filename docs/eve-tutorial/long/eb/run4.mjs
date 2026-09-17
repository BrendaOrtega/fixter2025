import fs from "node:fs";
import { EasybitsClient } from "@easybits.cloud/sdk";
const env = Object.fromEntries(fs.readFileSync(process.env.HOME + "/nanoclaw/.env", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }));
const eb = new EasybitsClient({ apiKey: env.EASYBITS_API_KEY });
const state = JSON.parse(fs.readFileSync("state.json"));
const sid = process.argv[2];
const res = await fetch(`${state.url}/eve/v1/session/${sid}/stream?startIndex=0`, { headers: { Authorization: "Basic " + Buffer.from("ghosty:tutorial-eve-2026").toString("base64") }, signal: AbortSignal.timeout(8000) }).catch((e) => null);
const txt = res ? await res.text().catch(() => "") : "";
const evs = txt.split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
let msg = ""; const tools = [];
for (const e of evs) { if (e.type === "message.appended") msg += e.data.messageDelta || ""; if (/^tool\./.test(e.type)) tools.push(e); }
const out = ["$ stream de la sesión " + sid, ...tools.map((e) => `${e.type}  ${JSON.stringify(e.data).slice(0, 300)}`), "", "── respuesta del agente:", msg].join("\n");
fs.writeFileSync("../captures/10-stream.txt", out); console.log(out.slice(0, 2500));
// caja hija de esa sesión
const list = await eb.sandboxes.list();
const child = list.find((s) => (s.metadata || {}).eve_session && (s.name || "").includes(sid.slice(0, 8)) ) || list.find((s) => (s.metadata||{}).agent === "eve-demo");
if (child) { fs.writeFileSync("../captures/14-hija.txt", `$ eb.sandboxes.get("${child.sandboxId}")\ntemplate: ${child.template}\nstatus: ${child.status}\nname: ${child.name}\nmetadata: ${JSON.stringify(child.metadata, null, 2)}`); console.log("hija", child.sandboxId, child.status); }
