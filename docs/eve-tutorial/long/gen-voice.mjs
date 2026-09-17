// Lee SCRIPT.md, sintetiza cada frase con Kokoro (em_santa) y arma voice.wav con silencios explícitos.
// Escribe marks.json: [{ch, i, text, start, dur}] — la timeline del video sale de aquí.
import fs from "node:fs";
import { execSync } from "node:child_process";
const GAP = 0.45, PAUSE = 1.0, CH_GAP = 1.6;
// anglicismos fonéticos para el motor (en pantalla va la ortografía normal)
const PH = [[/\beve\b/g, "ib"], [/Vercel/g, "Vércel"], [/Postgres/g, "Póstgres"], [/Docker/g, "Dóquer"], [/EasyBits/g, "Ísibits"], [/YouTube/g, "yutub"], [/framework/g, "freimwork"], [/Ghosty/g, "Gósti"], [/fixtergeek/g, "fixterguic"], [/Firecracker/g, "Fáiercraquer"], [/Workflow/g, "Uórkflou"], [/workflow/g, "uórkflou"], [/step/g, "step"], [/Slack/g, "Eslac"], [/WhatsApp/g, "Guatsap"], [/Zod/g, "Zod"], [/Nitro/g, "Nitro"], [/SDK/g, "ese de ka"], [/MCP/g, "eme ce pe"], [/HTTP/g, "ache te te pe"], [/API/g, "a pe i"], [/CSV/g, "ce ese ve"], [/URL/g, "u erre ele"], [/npm/g, "ene pe eme"], [/Node/g, "Noud"], [/bash/g, "bash"], [/Restate/g, "Ristéit"], [/Temporal/g, "Temporal"], [/Caddy/g, "Cadi"], [/graphile worker/g, "gráfail uórquer"], [/skip locked/g, "esquip locd"], [/listen notify/g, "lísen nótifai"], [/Cloudflare Durable Objects/g, "Claudfler Diúrabol Óbyects"], [/NATS/g, "nats"], [/SurrealDB/g, "Surrial de be"], [/Upstash/g, "Ápstash"], [/MongoDB/g, "Mongo de be"], [/MySQL/g, "mai ese cu ele"], [/microsandbox/g, "maicro sandbox"], [/just bash/g, "yast bash"], [/Chat SDK/g, "chat ese de ka"], [/AI Gateway/g, "ei ai guéituei"], [/Vercel Connect/g, "Vércel Conect"], [/Discord/g, "Díscord"], [/Telegram/g, "Telegram"], [/Teams/g, "Tims"], [/cron/g, "cron"], [/Apache/g, "Apache"], [/health/g, "jelz"], [/well known/g, "uel noun"], [/prewarm/g, "pri uorm"], [/create/g, "criéit"], [/stop/g, "estop"], [/resume/g, "risiúm"], [/fork/g, "forc"], [/snapshot/g, "esnápshot"], [/deny all/g, "dinái ol"], [/allow all/g, "aláu ol"], [/exit code/g, "éxit coud"], [/stdout/g, "estándar aut"], [/stderr/g, "estándar érror"], [/write file/g, "ráit fail"], [/read text file/g, "rid text fail"], [/write text file/g, "ráit text fail"], [/capture state/g, "cápchur estéit"], [/Sandbox Backend/g, "sandbox bákend"], [/Storage/g, "estórech"], [/Queue/g, "quiú"], [/Streamer/g, "estrímer"], [/World/g, "uorld"], [/world/g, "uorld"], [/hooks/g, "jucs"], [/streams/g, "estrims"], [/waits/g, "uéits"], [/runs/g, "rans"], [/events/g, "ivents"], [/run step/g, "ran step"], [/use step/g, "iús step"], [/use workflow/g, "iús uórkflou"], [/define workflow tool/g, "difáin uórkflou tul"], [/sleep/g, "eslip"], [/Math random/g, "maz rándom"], [/process env/g, "próces env"], [/Date/g, "déit"], [/approval/g, "aprúval"], [/ctx punto ask/g, "ce te equis punto asc"], [/tools/g, "tuls"], [/tool/g, "tul"], [/skills/g, "esquils"], [/channels/g, "chánels"], [/schedules/g, "esquédiuls"], [/memory/g, "mémori"], [/instructions/g, "instrákshons"], [/get weather/g, "guet uéder"], [/system prompt/g, "sístem prompt"], [/checkpoints/g, "chécpoints"], [/checkpoint/g, "chécpoint"], [/Build/g, "Bild"], [/start/g, "estart"], [/latest/g, "léitest"], [/beta/g, "beta"], [/bootstrap/g, "bútstrap"], [/stream chunks/g, "estrim chancs"], [/agent punto ts/g, "éiyent punto te ese"], [/sandbox punto ts/g, "sandbox punto te ese"], [/proxy/g, "próxi"], [/redeploy/g, "ridiplói"], [/polling/g, "póling"], [/select for update/g, "select for ápdeit"], [/journal/g, "yórnal"], [/self hosting/g, "self jósting"], [/Python/g, "páiton"], [/workspace/g, "uórkspeis"], [/app runtime/g, "ap rántaim"], [/runtime/g, "rántaim"], [/pid/g, "pid"], [/log/g, "log"], [/id único/g, "aidí único"], [/kill/g, "kil"]];
const ph = (t) => PH.reduce((a, [r, s]) => a.replace(r, s), t);
const lines = fs.readFileSync("SCRIPT.md", "utf8").split("\n");
let ch = -1, i = 0, t = 0; const marks = []; const list = [];
fs.mkdirSync("voice", { recursive: true });
const sil = (name, d) => { execSync(`ffmpeg -y -loglevel error -f lavfi -i anullsrc=r=24000:cl=mono -t ${d} voice/${name}.wav`); list.push(name); };
for (const raw of lines) {
  const l = raw.trim();
  if (l.startsWith("## ")) { ch = parseInt(l.slice(3)); if (ch > 0) { sil(`chgap${ch}`, CH_GAP); t += CH_GAP; } continue; }
  if (l === ">") { sil(`pause${i}`, PAUSE); t += PAUSE; continue; }
  if (!l || l.startsWith("#") || l.startsWith("Una frase") || l.startsWith("Anglicismos")) continue;
  const n = String(i).padStart(3, "0");
  if (!fs.existsSync(`voice/${n}.wav`)) execSync(`npx hyperframes@0.8.44 tts -v em_santa -l es -o voice/${n}.wav ${JSON.stringify(ph(l))}`, { stdio: "ignore" });
  const dur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 voice/${n}.wav`).toString());
  marks.push({ ch, i, text: l, start: +t.toFixed(2), dur: +dur.toFixed(2) });
  list.push(n); t += dur; sil(`gap${n}`, GAP); t += GAP; i++;
  process.stdout.write(`${n} ch${ch} ${t.toFixed(1)}s ${l.slice(0, 60)}\n`);
}
fs.writeFileSync("voice/list.txt", list.map((f) => `file '${f}.wav'`).join("\n"));
execSync(`cd voice && ffmpeg -y -loglevel error -f concat -safe 0 -i list.txt -ar 48000 -ac 2 voice.wav`);
fs.writeFileSync("marks.json", JSON.stringify(marks, null, 1));
console.log("TOTAL", t.toFixed(1), "s ·", marks.length, "frases");
